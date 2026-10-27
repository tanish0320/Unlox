"""
Integration Fixture Generator for Blu Visual Teacher.
Generates complete realistic 3-scene integration bundles for English (real Windows TTS)
and Hindi (audited translation + mock TTS), measuring exact audio durations and writing
manifests and study notes to disk for Person 2 and Person 4.
"""

import json
from pathlib import Path
import sys
import time
import wave

# Ensure workspace root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.notes_generator import generate_study_notes
from backend.app.services.translation.translation_adapter import DictionaryFallbackTranslationAdapter
from backend.app.services.tts.tts_adapter import MockTTSAdapter, WindowsLocalTTSAdapter, measure_wav_duration


def build_english_integration_bundle(
    lesson_plan_path: Path,
    output_dir: Path,
) -> dict:
    """Builds English integration bundle using REAL offline Windows SAPI5 TTS."""
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(lesson_plan_path, "r", encoding="utf-8") as f:
        lesson_data = json.load(f)
    lesson = LessonPlan.model_validate(lesson_data)

    win_tts = WindowsLocalTTSAdapter()
    mock_tts = MockTTSAdapter()

    entries = []
    total_duration = 0.0
    synth_stats = []

    for scene in lesson.scenes:
        wav_path = output_dir / f"{scene.id}_en.wav"
        rel_audio_path = wav_path.relative_to(root_dir).as_posix()
        t0 = time.time()
        fallback_used = False

        # If already generated and valid, reuse
        if wav_path.exists() and wav_path.stat().st_size > 1000:
            duration = measure_wav_duration(wav_path)
            entry = SceneAudioEntry(
                scene_id=scene.id,
                audio_file=rel_audio_path,
                duration_seconds=duration,
                language="en",
                voice_id="win_sapi5_desktop",
                sample_rate=22050,
                fallback_used=False,
                caption_segments=[
                    CaptionSegment(
                        start_seconds=0.0,
                        end_seconds=duration,
                        text=scene.narration,
                    )
                ],
            )
        else:
            try:
                entry, fallback_used = win_tts.synthesize_scene(
                    scene_id=scene.id,
                    text=scene.narration,
                    language="en",
                    output_path=wav_path,
                )
                entry.audio_file = rel_audio_path
            except Exception:
                entry, fallback_used = mock_tts.synthesize_scene(
                    scene_id=scene.id,
                    text=scene.narration,
                    language="en",
                    output_path=wav_path,
                )
                entry.audio_file = rel_audio_path

        dt = round(time.time() - t0, 3)
        entries.append(entry)
        total_duration += entry.duration_seconds
        synth_stats.append({
            "scene_id": scene.id,
            "wav_file": rel_audio_path,
            "duration_seconds": entry.duration_seconds,
            "voice_id": entry.voice_id,
            "real_synthesis_time": dt,
            "fallback_used": fallback_used,
            "file_size_bytes": wav_path.stat().st_size,
        })

    manifest = AudioManifest(
        schema_version="1.0.0",
        lesson_id="integration_sample_en",
        language="en",
        total_duration_seconds=round(total_duration, 3),
        entries=entries,
        fallback_used=any(e.fallback_used for e in entries),
    )
    manifest.compute_global_timeline(scene_pause_padding=0.3)

    # Save manifest
    manifest_path = output_dir / "audio_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(manifest.model_dump_json(indent=2))

    # Generate and save notes
    notes = generate_study_notes(
        lesson=lesson,
        manifest=manifest,
        fallback_used=manifest.fallback_used,
        video_filename="lesson_en.mp4",
    )
    notes_path = output_dir / "lesson-notes.json"
    with open(notes_path, "w", encoding="utf-8") as f:
        f.write(notes.model_dump_json(indent=2))

    # Save validated lesson plan copy
    plan_path = output_dir / "lesson_plan.json"
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(lesson.model_dump_json(indent=2))

    return {
        "language": "en",
        "output_dir": str(output_dir.as_posix()),
        "total_duration": manifest.total_duration_seconds,
        "manifest_path": str(manifest_path.as_posix()),
        "notes_path": str(notes_path.as_posix()),
        "scenes": synth_stats,
    }


def build_hindi_integration_bundle(
    lesson_plan_path: Path,
    output_dir: Path,
) -> dict:
    """Builds Hindi integration bundle using audited native-script translation + mock TTS."""
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(lesson_plan_path, "r", encoding="utf-8") as f:
        lesson_data = json.load(f)
    lesson = LessonPlan.model_validate(lesson_data)

    translator = DictionaryFallbackTranslationAdapter()
    lesson_hi, trans_fallback, _ = translator.translate_lesson(lesson, "en", "hi")

    mock_tts = MockTTSAdapter()
    entries = []
    total_duration = 0.0
    synth_stats = []

    for scene in lesson_hi.scenes:
        wav_path = output_dir / f"{scene.id}_hi.wav"
        rel_audio_path = wav_path.relative_to(root_dir).as_posix()
        t0 = time.time()
        entry, _ = mock_tts.synthesize_scene(
            scene_id=scene.id,
            text=scene.narration,
            language="hi",
            output_path=wav_path,
        )
        entry.audio_file = rel_audio_path
        dt = round(time.time() - t0, 3)
        entries.append(entry)
        total_duration += entry.duration_seconds
        synth_stats.append({
            "scene_id": scene.id,
            "wav_file": rel_audio_path,
            "duration_seconds": entry.duration_seconds,
            "voice_id": entry.voice_id,
            "synthesis_time": dt,
            "fallback_used": True,
            "file_size_bytes": wav_path.stat().st_size,
        })

    manifest = AudioManifest(
        schema_version="1.0.0",
        lesson_id="integration_sample_hi",
        language="hi",
        total_duration_seconds=round(total_duration, 3),
        entries=entries,
        fallback_used=True,  # Mock TTS used for Hindi
    )
    manifest.compute_global_timeline(scene_pause_padding=0.3)

    manifest_path = output_dir / "audio_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(manifest.model_dump_json(indent=2))

    notes = generate_study_notes(
        lesson=lesson_hi,
        manifest=manifest,
        fallback_used=True,
        video_filename="lesson_hi.mp4",
    )
    notes_path = output_dir / "lesson-notes.json"
    with open(notes_path, "w", encoding="utf-8") as f:
        f.write(notes.model_dump_json(indent=2))

    plan_path = output_dir / "lesson_plan.json"
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(lesson_hi.model_dump_json(indent=2))

    return {
        "language": "hi",
        "output_dir": str(output_dir.as_posix()),
        "total_duration": manifest.total_duration_seconds,
        "manifest_path": str(manifest_path.as_posix()),
        "notes_path": str(notes_path.as_posix()),
        "scenes": synth_stats,
    }


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    sample_plan = root / "fixtures" / "sample-lesson.json"

    print("=== Generating English Integration Bundle (Real Windows SAPI5 TTS) ===")
    en_res = build_english_integration_bundle(
        sample_plan, root / "outputs" / "integration_fixtures" / "en"
    )
    print(json.dumps(en_res, indent=2))

    print("\n=== Generating Hindi Integration Bundle (Audited Script + Fallback TTS) ===")
    hi_res = build_hindi_integration_bundle(
        sample_plan, root / "outputs" / "integration_fixtures" / "hi"
    )
    print(json.dumps(hi_res, indent=2))
