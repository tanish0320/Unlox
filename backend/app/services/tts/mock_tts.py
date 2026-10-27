"""
Mock TTS Service for Blu Visual Teacher.
Status: Person 1 Owned.

Generates deterministic, offline WAV audio files with accurate duration measurement
using Python standard wave module, and produces valid AudioManifest instances.
"""

import math
import struct
import wave
from pathlib import Path
from typing import List, Optional, Tuple

from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.provisional_lesson import LessonPlan


def generate_synthetic_wav(
    output_path: Path,
    duration_seconds: float,
    sample_rate: int = 24000,
    frequency: float = 440.0,
) -> float:
    """
    Generates a valid PCM WAV audio file of exact duration.
    Returns verified duration measured from the written file.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    num_samples = int(duration_seconds * sample_rate)

    # Generate audio frames using tiled single-cycle sine wave for speed
    cycle_samples = max(24, int(sample_rate / max(50.0, frequency)))
    cycle_bytes = bytearray()
    amplitude = 6000
    for i in range(cycle_samples):
        val = int(amplitude * math.sin(2.0 * math.pi * (i / cycle_samples)))
        cycle_bytes.extend(struct.pack("<h", val))

    repeats = (num_samples // cycle_samples) + 1
    frames = (cycle_bytes * repeats)[: num_samples * 2]

    with wave.open(str(output_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(frames)

    # Re-open and measure actual duration directly from file headers
    with wave.open(str(output_path), "rb") as verify_file:
        n_frames = verify_file.getnframes()
        rate = verify_file.getframerate()
        actual_duration = round(n_frames / float(rate), 3)

    return actual_duration


class MockTTSService:
    def __init__(self, output_dir: Optional[Path] = None):
        if output_dir is None:
            self.output_dir = Path("outputs") / "audio"
        else:
            self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def get_voice_id_for_language(self, language: str) -> str:
        """Returns standard voice identifier mapped to candidate local models."""
        voice_map = {
            "en": "hf_alpha",  # Kokoro Indian-English
            "hi": "hm_omega",  # Kokoro / Piper Hindi
            "ta": "ta_rasa_female",  # Piper Tamil
            "te": "te_padmavathi",  # Piper Telugu
        }
        return voice_map.get(language, f"generic_{language}_voice")

    def synthesize_scene(
        self,
        scene_id: str,
        narration_text: str,
        language: str,
        sample_rate: int = 24000,
    ) -> SceneAudioEntry:
        """
        Synthesizes audio for a single scene, derives duration from word count,
        writes real WAV, and returns verified SceneAudioEntry.
        """
        # Estimate natural duration: ~140 words per minute -> ~2.33 words per sec
        # Add baseline pause of 0.8s for scene transition
        words = len(narration_text.split())
        estimated_duration = max(2.0, round(words / 2.3 + 0.5, 2))

        wav_filename = f"{scene_id}_{language}.wav"
        wav_path = self.output_dir / wav_filename

        # Generate WAV with a pleasant pitch variance per scene
        freq = 350.0 + (hash(scene_id) % 150)
        actual_duration = generate_synthetic_wav(
            output_path=wav_path,
            duration_seconds=estimated_duration,
            sample_rate=sample_rate,
            frequency=freq,
        )

        voice_id = self.get_voice_id_for_language(language)

        # Baseline scene-level caption segment
        captions = [
            CaptionSegment(
                start_seconds=0.0,
                end_seconds=actual_duration,
                text=narration_text,
            )
        ]

        return SceneAudioEntry(
            scene_id=scene_id,
            audio_file=str(wav_path.as_posix()),
            duration_seconds=actual_duration,
            language=language,
            voice_id=voice_id,
            sample_rate=sample_rate,
            fallback_used=False,
            caption_segments=captions,
        )

    def synthesize_lesson(
        self,
        lesson: LessonPlan,
        lesson_id: str = "mock_lesson_001",
    ) -> AudioManifest:
        """
        Synthesizes audio for all scenes in a lesson plan, producing
        a complete, verified AudioManifest.
        """
        entries: List[SceneAudioEntry] = []
        total_duration = 0.0

        for scene in lesson.scenes:
            entry = self.synthesize_scene(
                scene_id=scene.id,
                narration_text=scene.narration,
                language=lesson.language,
            )
            entries.append(entry)
            total_duration += entry.duration_seconds

        manifest = AudioManifest(
            schema_version="1.0.0",
            lesson_id=lesson_id,
            language=lesson.language,
            total_duration_seconds=round(total_duration, 3),
            entries=entries,
            fallback_used=False,
        )
        return manifest
