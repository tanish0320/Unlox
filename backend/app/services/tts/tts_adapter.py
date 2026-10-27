"""
Modular Local TTS Adapter Interface and Implementations for Blu Visual Teacher.
Status: Person 1 Owned.

Provides:
1. BaseTTSAdapter interface (pure abstraction).
2. LocalNeuralTTSAdapter: High-quality local offline neural synthesis (Piper ONNX) for Hindi and Indian languages.
3. WindowsLocalTTSAdapter: Synthesizes real WAV audio using offline Windows SAPI5/Desktop voices.
4. MockTTSAdapter: Fast deterministic waveform generator strictly for isolated mock tests.
5. LocalTTSDispatcher: Unified orchestrator with strict voice enforcement and zero tone/English substitution.
"""

from abc import ABC, abstractmethod
import math
import os
from pathlib import Path
import struct
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional, Tuple
import wave

from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.provisional_lesson import LessonPlan


class MissingLocalVoiceError(RuntimeError):
    """Raised when no genuine local speech voice is available for the requested language."""
    pass


def measure_wav_duration(wav_path: Path) -> float:
    """Measures exact audio duration in seconds directly from WAV RIFF headers."""
    with wave.open(str(wav_path), "rb") as wf:
        n_frames = wf.getnframes()
        rate = wf.getframerate()
        if rate == 0:
            raise ValueError(f"Invalid frame rate (0) in WAV file: {wav_path}")
        return round(n_frames / float(rate), 3)


class BaseTTSAdapter(ABC):
    @abstractmethod
    def synthesize_scene(
        self,
        scene_id: str,
        text: str,
        language: str,
        output_path: Path,
    ) -> Tuple[SceneAudioEntry, bool]:
        """
        Synthesizes text for a given scene into output_path.
        Returns (SceneAudioEntry, fallback_used).
        """
        pass

    @abstractmethod
    def is_language_supported(self, language: str) -> bool:
        """Returns True if the engine has a verified voice for this language."""
        pass


class LocalNeuralTTSAdapter(BaseTTSAdapter):
    """
    Offline local neural speech synthesizer using Piper ONNX models.
    Runs 100% locally on CPU with zero internet connection required at runtime.
    Synthesizes genuine natural native speech for Hindi, Telugu, and other languages.
    """

    def __init__(self, voices_dir: Optional[Path] = None):
        self.voices_dir = voices_dir or (Path(__file__).resolve().parent / "voices")
        self._loaded_voices: Dict[str, Any] = {}

    def _find_model_files(self, lang: str) -> Tuple[Optional[Path], Optional[Path]]:
        candidates = [
            self.voices_dir / f"{lang}_IN",
            self.voices_dir / lang,
        ]
        for c in candidates:
            if c.is_dir():
                for onnx in c.glob("*.onnx"):
                    json_config = onnx.with_suffix(".onnx.json")
                    if json_config.exists():
                        return onnx, json_config
        return None, None

    def is_language_supported(self, language: str) -> bool:
        lang = language.lower().replace("-", "_").split("_")[0]
        onnx_path, json_path = self._find_model_files(lang)
        return onnx_path is not None and json_path is not None

    def _get_voice(self, lang: str):
        if lang in self._loaded_voices:
            return self._loaded_voices[lang]
        onnx_path, json_path = self._find_model_files(lang)
        if not onnx_path or not json_path:
            raise MissingLocalVoiceError(f"No Piper ONNX voice model found for '{lang}' in {self.voices_dir}")
        from piper import PiperVoice
        voice = PiperVoice.load(onnx_path, config_path=json_path)
        self._loaded_voices[lang] = (voice, onnx_path.stem)
        return self._loaded_voices[lang]

    def synthesize_scene(
        self,
        scene_id: str,
        text: str,
        language: str,
        output_path: Path,
    ) -> Tuple[SceneAudioEntry, bool]:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        lang = language.lower().replace("-", "_").split("_")[0]

        voice, model_name = self._get_voice(lang)

        sample_rate = voice.config.sample_rate
        with wave.open(str(output_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            for chunk in voice.synthesize(text):
                wav_file.writeframes(chunk.audio_int16_bytes)

        duration = measure_wav_duration(output_path)

        entry = SceneAudioEntry(
            scene_id=scene_id,
            audio_file=str(output_path.as_posix()),
            duration_seconds=duration,
            language=language,
            voice_id=f"piper_{model_name}",
            sample_rate=sample_rate,
            fallback_used=False,
            caption_segments=[
                CaptionSegment(
                    start_seconds=0.0,
                    end_seconds=duration,
                    text=text,
                )
            ],
        )
        return entry, False


class WindowsLocalTTSAdapter(BaseTTSAdapter):
    """
    Offline local speech synthesis adapter leveraging Windows SAPI5 / pyttsx3.
    Requires zero internet connection and runs safely in isolated subprocesses.
    """

    def __init__(self):
        self._available_voices: Dict[str, str] = {}
        self._initialized = False
        self._init_engine()

    def _init_engine(self):
        try:
            import pyttsx3

            engine = pyttsx3.init()
            voices = engine.getProperty("voices")
            for v in voices:
                v_name = v.name.lower()
                if "david" in v_name:
                    self._available_voices["en_male"] = v.id
                elif "zira" in v_name:
                    self._available_voices["en_female"] = v.id
                elif "heera" in v_name or "ravi" in v_name:
                    self._available_voices["en_in"] = v.id
                elif "kalpana" in v_name or "hemant" in v_name:
                    self._available_voices["hi"] = v.id
                elif "valluvar" in v_name:
                    self._available_voices["ta"] = v.id
                elif "chitra" in v_name:
                    self._available_voices["te"] = v.id
            self._initialized = True
        except Exception:
            self._initialized = False

    def is_available(self) -> bool:
        return self._initialized and bool(self._available_voices)

    def is_language_supported(self, language: str) -> bool:
        if not self.is_available():
            return False
        lang = language.lower().replace("-", "_").split("_")[0]
        if lang == "en":
            return bool(
                self._available_voices.get("en_female")
                or self._available_voices.get("en_male")
                or self._available_voices.get("en_in")
            )
        return lang in self._available_voices

    def synthesize_scene(
        self,
        scene_id: str,
        text: str,
        language: str,
        output_path: Path,
    ) -> Tuple[SceneAudioEntry, bool]:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        lang = language.lower().replace("-", "_").split("_")[0]

        if not self.is_language_supported(language):
            raise MissingLocalVoiceError(f"Language '{language}' not supported by WindowsLocalTTSAdapter")

        voice_id = self._available_voices.get(
            lang,
            self._available_voices.get(
                "en_female", self._available_voices.get("en_male", "default")
            ),
        )

        worker_script = (
            "import pyttsx3, sys\n"
            "text = sys.argv[1]\n"
            "out = sys.argv[2]\n"
            "voice = sys.argv[3]\n"
            "e = pyttsx3.init()\n"
            "if voice != 'default':\n"
            "    e.setProperty('voice', voice)\n"
            "e.setProperty('rate', 160)\n"
            "e.save_to_file(text, out)\n"
            "e.runAndWait()\n"
        )
        res = subprocess.run(
            [sys.executable, "-c", worker_script, text, str(output_path), voice_id],
            capture_output=True,
            timeout=15.0,
        )
        if res.returncode != 0:
            raise RuntimeError(f"TTS worker failed: {res.stderr.decode('utf-8', errors='ignore')}")

        duration = measure_wav_duration(output_path)

        entry = SceneAudioEntry(
            scene_id=scene_id,
            audio_file=str(output_path.as_posix()),
            duration_seconds=duration,
            language=language,
            voice_id=f"win_sapi5_{voice_id.split(chr(92))[-1]}",
            sample_rate=22050,
            fallback_used=False,
            caption_segments=[
                CaptionSegment(
                    start_seconds=0.0,
                    end_seconds=duration,
                    text=text,
                )
            ],
        )
        return entry, False


class MockTTSAdapter(BaseTTSAdapter):
    """
    Deterministic PCM WAV generator strictly for isolated benchmark tests.
    Must never be used as a production narration fallback for missing voices.
    """

    def __init__(self, sample_rate: int = 24000):
        self.sample_rate = sample_rate

    def is_language_supported(self, language: str) -> bool:
        return True

    def synthesize_scene(
        self,
        scene_id: str,
        text: str,
        language: str,
        output_path: Path,
    ) -> Tuple[SceneAudioEntry, bool]:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # Approximate duration from word count (150 words per minute)
        words = len(text.split())
        est_duration = max(2.0, round((words / 150.0) * 60.0, 2))
        num_samples = int(est_duration * self.sample_rate)

        # 440 Hz diagnostic test waveform
        cycle_len = max(24, int(self.sample_rate / 440.0))
        cycle = bytearray()
        for i in range(cycle_len):
            val = int(4000 * math.sin(2.0 * math.pi * (i / cycle_len)))
            cycle.extend(struct.pack("<h", val))

        repeats = (num_samples // cycle_len) + 1
        frames = (cycle * repeats)[: num_samples * 2]

        with wave.open(str(output_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(frames)

        actual_duration = measure_wav_duration(output_path)

        entry = SceneAudioEntry(
            scene_id=scene_id,
            audio_file=str(output_path.as_posix()),
            duration_seconds=actual_duration,
            language=language,
            voice_id=f"mock_{language}_v1",
            sample_rate=self.sample_rate,
            fallback_used=True,
            caption_segments=[
                CaptionSegment(
                    start_seconds=0.0,
                    end_seconds=actual_duration,
                    text=text,
                )
            ],
        )
        return entry, True


class LocalTTSDispatcher:
    """
    Primary orchestrator for TTS adapters. Dispatches to real local engines
    when supported, enforcing strict speech authenticity:
    - Never uses synthetic tones as narration.
    - Never silently substitutes English for Hindi or other requested languages.
    - Raises actionable MissingLocalVoiceError with setup instructions when a voice is missing.
    """

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        use_system_tts: bool = True,
        allow_mock: bool = False,
    ):
        self.output_dir = output_dir or (Path("outputs") / "audio")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.use_system_tts = use_system_tts
        self.allow_mock = allow_mock

        self.neural_adapter = LocalNeuralTTSAdapter()
        self.windows_adapter = WindowsLocalTTSAdapter()
        self.mock_adapter = MockTTSAdapter()

    def get_supported_voices(self) -> Dict[str, Dict[str, Any]]:
        """Returns verified status and setup instructions for all supported curriculum languages."""
        voices: Dict[str, Dict[str, Any]] = {}
        languages = [
            ("en", "English"),
            ("hi", "Hindi"),
            ("te", "Telugu"),
            ("ta", "Tamil"),
            ("kn", "Kannada"),
        ]

        for lang, name in languages:
            if self.neural_adapter.is_language_supported(lang):
                model_name = self.neural_adapter._find_model_files(lang)[0].stem
                voices[lang] = {
                    "language": lang,
                    "language_name": name,
                    "available": True,
                    "engine": "Local Neural (Piper ONNX)",
                    "voice_id": model_name,
                }
            elif self.windows_adapter.is_language_supported(lang):
                voices[lang] = {
                    "language": lang,
                    "language_name": name,
                    "available": True,
                    "engine": "Windows SAPI5 / Desktop Speech",
                    "voice_id": self.windows_adapter._available_voices.get(lang, "Windows Voice"),
                }
            else:
                instructions = (
                    f"No genuine local speech voice installed for {name} ('{lang}'). "
                    f"To enable offline {name} narration on Windows, install the {name} speech pack via "
                    f"Settings > Time & Language > Speech > 'Add voices' > '{name}', or place a supported "
                    f"Piper ONNX model into backend/app/services/tts/voices/{lang}_IN/."
                )
                voices[lang] = {
                    "language": lang,
                    "language_name": name,
                    "available": False,
                    "engine": None,
                    "error": instructions,
                }
        return voices

    def is_language_supported(self, language: str) -> bool:
        lang = language.lower().replace("-", "_").split("_")[0]
        if self.allow_mock:
            return True
        return self.neural_adapter.is_language_supported(lang) or (
            self.use_system_tts and self.windows_adapter.is_language_supported(lang)
        )

    def synthesize_scene(
        self, scene_id: str, text: str, language: str
    ) -> Tuple[SceneAudioEntry, bool]:
        out_file = self.output_dir / f"{scene_id}_{language}.wav"
        lang = language.lower().replace("-", "_").split("_")[0]

        # 1. Dispatch to Neural TTS (Piper) for verified native neural speech (Hindi, Telugu, etc.)
        if self.neural_adapter.is_language_supported(lang):
            return self.neural_adapter.synthesize_scene(
                scene_id=scene_id, text=text, language=language, output_path=out_file
            )

        # 2. Dispatch to Windows SAPI5 (English, or Windows Hindi if installed)
        if self.use_system_tts and self.windows_adapter.is_language_supported(lang):
            try:
                return self.windows_adapter.synthesize_scene(
                    scene_id=scene_id, text=text, language=language, output_path=out_file
                )
            except Exception:
                pass

        # 3. Isolated Mock Adapter (permitted ONLY when explicitly flagged for unit tests)
        if self.allow_mock:
            return self.mock_adapter.synthesize_scene(
                scene_id=scene_id, text=text, language=language, output_path=out_file
            )

        # 4. Strict Failure: No tones, no silence, no English substitution
        lang_names = {"hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "en": "English"}
        display_name = lang_names.get(lang, language.upper())
        raise MissingLocalVoiceError(
            f"No genuine local speech voice installed for {display_name} ('{language}'). "
            f"Placeholder waveforms, tones, and cross-language English substitutions have been disabled to preserve speech authenticity. "
            f"To enable offline {display_name} audio, install the {display_name} speech pack in Windows Settings "
            f"> Time & Language > Speech > 'Add voices' > '{display_name}', or download a local ONNX model into "
            f"backend/app/services/tts/voices/{lang}_IN/."
        )

    def synthesize(
        self, text: str, language: str, scene_id: str = "temp", output_path: Optional[Path] = None
    ) -> SceneAudioEntry:
        """Direct synthesis helper returning SceneAudioEntry."""
        if output_path is None:
            output_path = self.output_dir / f"{scene_id}_{language}.wav"
        return self.synthesize_speech(text=text, language=language, output_path=output_path)

    def synthesize_speech(
        self, text: str, language: str, output_path: Path
    ) -> SceneAudioEntry:
        """Helper allowing direct text synthesis into a specific output path."""
        scene_id = output_path.stem
        entry, _ = self.synthesize_scene(scene_id=scene_id, text=text, language=language)
        if Path(entry.audio_file) != output_path and Path(entry.audio_file).exists():
            import shutil
            shutil.copyfile(entry.audio_file, output_path)
            entry.audio_file = str(output_path.as_posix())
        return entry

    def synthesize_lesson(
        self, lesson: LessonPlan, lesson_id: str = "lesson_001"
    ) -> AudioManifest:
        entries: List[SceneAudioEntry] = []
        any_fallback = False
        total_duration = 0.0

        for scene in lesson.scenes:
            entry, fallback_used = self.synthesize_scene(
                scene_id=scene.id,
                text=scene.narration,
                language=lesson.language,
            )
            entries.append(entry)
            if fallback_used:
                any_fallback = True
            total_duration += entry.duration_seconds

        manifest = AudioManifest(
            schema_version="1.0.0",
            lesson_id=lesson_id,
            language=lesson.language,
            total_duration_seconds=round(total_duration, 3),
            entries=entries,
            fallback_used=any_fallback,
        )
        manifest.compute_global_timeline()
        return manifest
