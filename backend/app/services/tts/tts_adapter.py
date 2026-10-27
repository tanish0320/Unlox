"""
Modular Local TTS Adapter Interface and Implementations for Blu Visual Teacher.
Status: Person 1 Owned.

Provides:
1. BaseTTSAdapter interface (pure abstraction).
2. WindowsLocalTTSAdapter: Synthesizes real WAV audio using offline local system voices.
3. MockTTSAdapter: Fast deterministic waveform generator for testing & offline fallback.
4. LocalTTSDispatcher: Unified entry point with duration measurement and fallback handling.
"""

from abc import ABC, abstractmethod
import math
import os
from pathlib import Path
import struct
import time
from typing import List, Optional, Tuple
import wave

from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.provisional_lesson import LessonPlan


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


class WindowsLocalTTSAdapter(BaseTTSAdapter):
    """
    Offline local speech synthesis adapter leveraging Windows SAPI5 / pyttsx3.
    Requires zero internet connection, zero API keys, and runs on CPU.
    """

    def __init__(self):
        self._engine = None
        self._available_voices = {}
        self._initialized = False
        self._init_engine()

    def _init_engine(self):
        try:
            import pyttsx3

            self._engine = pyttsx3.init()
            voices = self._engine.getProperty("voices")
            for v in voices:
                v_name = v.name.lower()
                if "david" in v_name:
                    self._available_voices["en_male"] = v.id
                elif "zira" in v_name:
                    self._available_voices["en_female"] = v.id
                elif "heera" in v_name or "ravi" in v_name:
                    self._available_voices["en_in"] = v.id
            self._initialized = True
        except Exception:
            self._initialized = False

    def is_available(self) -> bool:
        return self._initialized and self._engine is not None

    def is_language_supported(self, language: str) -> bool:
        if not self.is_available():
            return False
        # English is natively supported via Windows desktop voices
        return language.lower() in ["en", "en-us", "en-in"]

    def synthesize_scene(
        self,
        scene_id: str,
        text: str,
        language: str,
        output_path: Path,
    ) -> Tuple[SceneAudioEntry, bool]:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.is_language_supported(language):
            raise ValueError(f"Language '{language}' not supported by WindowsLocalTTSAdapter")

        import subprocess
        import sys

        voice_id = self._available_voices.get(
            "en_female", self._available_voices.get("en_male", "default")
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
            voice_id=f"win_sapi5_{voice_id.split('\\')[-1]}",
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
    Deterministic PCM WAV generator for testing, benchmarking, and guaranteed fallback.
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

        words = len(text.split())
        estimated_duration = max(2.0, round(words / 2.3 + 0.5, 2))
        num_samples = int(estimated_duration * self.sample_rate)

        # Tiled sinusoidal waveform
        cycle_samples = 240  # 100 Hz
        cycle_bytes = bytearray()
        for i in range(cycle_samples):
            val = int(5000 * math.sin(2.0 * math.pi * (i / cycle_samples)))
            cycle_bytes.extend(struct.pack("<h", val))

        repeats = (num_samples // cycle_samples) + 1
        frames = (cycle_bytes * repeats)[: num_samples * 2]

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
    when supported and enabled, falling back gracefully to mock synthesis if unavailable.
    """

    def __init__(self, output_dir: Optional[Path] = None, use_system_tts: bool = False):
        self.output_dir = output_dir or (Path("outputs") / "audio")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.use_system_tts = use_system_tts

        self.windows_adapter = WindowsLocalTTSAdapter()
        self.mock_adapter = MockTTSAdapter()

    def synthesize_scene(
        self, scene_id: str, text: str, language: str
    ) -> Tuple[SceneAudioEntry, bool]:
        out_file = self.output_dir / f"{scene_id}_{language}.wav"

        # Try real offline system voice if explicitly requested for English
        if (
            self.use_system_tts
            and language.lower().startswith("en")
            and self.windows_adapter.is_available()
        ):
            try:
                return self.windows_adapter.synthesize_scene(
                    scene_id=scene_id, text=text, language=language, output_path=out_file
                )
            except Exception:
                pass  # Fall back to mock adapter

        # Default fast, reliable synthesis (Mock/Deterministic adapter)
        return self.mock_adapter.synthesize_scene(
            scene_id=scene_id, text=text, language=language, output_path=out_file
        )

    def synthesize_speech(
        self, text: str, language: str, output_path: Path
    ) -> SceneAudioEntry:
        """Helper allowing direct text synthesis into a specific output path."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        scene_id = output_path.stem
        # Try real offline voice if requested
        if (
            self.use_system_tts
            and language.lower().startswith("en")
            and self.windows_adapter.is_available()
        ):
            try:
                entry, _ = self.windows_adapter.synthesize_scene(
                    scene_id=scene_id, text=text, language=language, output_path=output_path
                )
                return entry
            except Exception:
                pass
        entry, _ = self.mock_adapter.synthesize_scene(
            scene_id=scene_id, text=text, language=language, output_path=output_path
        )
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
        # Compute lesson-global timeline offsets automatically
        manifest.compute_global_timeline()
        return manifest
