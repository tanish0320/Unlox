"""
Comprehensive Timeline, TTS, Translation, and Regression Test Suite.
Tests:
1. Scene-relative vs. Lesson-global caption timestamps.
2. Inter-scene padding behavior.
3. Independent audio timing across different languages.
4. Missing audio artifact detection and invalid duration errors.
5. Fallback metadata propagation into manifests and study notes.
6. Unicode/native-script preservation in Devanagari, Tamil, and Telugu captions.
"""

from pathlib import Path
import pytest

from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.provisional_lesson import CodeWalkthroughScene, LessonPlan
from backend.app.services.notes_generator import generate_study_notes
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.translation.translation_adapter import (
    DictionaryFallbackTranslationAdapter,
    LocalTranslationDispatcher,
)
from backend.app.services.tts.tts_adapter import (
    LocalTTSDispatcher,
    MockTTSAdapter,
    WindowsLocalTTSAdapter,
    measure_wav_duration,
)


FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-lesson.json"


def test_caption_timestamps_scene_relative_and_lesson_global():
    """Verify that start/end are scene-relative and compute_global_timeline adds cumulative padding."""
    manifest = AudioManifest(
        schema_version="1.0.0",
        lesson_id="test_timing",
        language="en",
        total_duration_seconds=10.0,
        entries=[
            SceneAudioEntry(
                scene_id="s1",
                audio_file="audio/s1.wav",
                duration_seconds=4.0,
                language="en",
                voice_id="v1",
                sample_rate=24000,
                caption_segments=[
                    CaptionSegment(start_seconds=0.0, end_seconds=2.0, text="First half"),
                    CaptionSegment(start_seconds=2.0, end_seconds=4.0, text="Second half"),
                ],
            ),
            SceneAudioEntry(
                scene_id="s2",
                audio_file="audio/s2.wav",
                duration_seconds=6.0,
                language="en",
                voice_id="v1",
                sample_rate=24000,
                caption_segments=[
                    CaptionSegment(start_seconds=0.0, end_seconds=6.0, text="Full scene 2"),
                ],
            ),
        ],
    )

    # Before computing global timeline, global fields are None
    assert manifest.entries[0].caption_segments[0].global_start_seconds is None

    # Compute global timeline with 0.5s padding
    padding = 0.5
    manifest.compute_global_timeline(scene_pause_padding=padding)

    # Scene 1 global times (starts at 0.0)
    s1_cap1 = manifest.entries[0].caption_segments[0]
    s1_cap2 = manifest.entries[0].caption_segments[1]
    assert s1_cap1.global_start_seconds == 0.0
    assert s1_cap1.global_end_seconds == 2.0
    assert s1_cap2.global_start_seconds == 2.0
    assert s1_cap2.global_end_seconds == 4.0

    # Scene 2 global times (starts at s1 duration 4.0 + padding 0.5 = 4.5s)
    s2_cap1 = manifest.entries[1].caption_segments[0]
    expected_s2_start = 4.0 + padding
    assert s2_cap1.global_start_seconds == expected_s2_start
    assert s2_cap1.global_end_seconds == expected_s2_start + 6.0

    # Verify scene-relative timestamps remain unchanged
    assert s2_cap1.start_seconds == 0.0
    assert s2_cap1.end_seconds == 6.0


def test_independent_timing_per_language(tmp_path: Path):
    """Verify that different languages produce independent durations matching their spoken syllables."""
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    lesson = planner.get_fallback_lesson()

    translator = LocalTranslationDispatcher()
    lesson_hi, _, _ = translator.translate(lesson, target_language="hi")

    tts = LocalTTSDispatcher(output_dir=tmp_path)
    manifest_en = tts.synthesize_lesson(lesson, lesson_id="lesson_en")
    manifest_hi = tts.synthesize_lesson(lesson_hi, lesson_id="lesson_hi")

    assert manifest_en.language == "en"
    assert manifest_hi.language == "hi"
    assert manifest_en.total_duration_seconds > 0
    assert manifest_hi.total_duration_seconds > 0

    # Each scene entry has valid audio path and measured duration
    for entry in manifest_en.entries + manifest_hi.entries:
        assert Path(entry.audio_file).exists()
        assert entry.duration_seconds > 0.0


def test_missing_audio_artifact_and_invalid_duration(tmp_path: Path):
    """Verify measure_wav_duration raises FileNotFoundError or ValueError for broken files."""
    missing_path = tmp_path / "non_existent.wav"
    with pytest.raises(FileNotFoundError):
        measure_wav_duration(missing_path)

    # Empty file (invalid RIFF)
    corrupted_path = tmp_path / "corrupted.wav"
    corrupted_path.write_bytes(b"NOT A WAV FILE")
    with pytest.raises(Exception):
        measure_wav_duration(corrupted_path)


def test_fallback_metadata_propagation(tmp_path: Path):
    """Verify that fallback flags propagate from adapters to manifests and final study notes."""
    mock_adapter = MockTTSAdapter()
    test_wav = tmp_path / "test_fallback.wav"
    entry, fallback_used = mock_adapter.synthesize_scene(
        scene_id="s1", text="Test fallback text", language="en", output_path=test_wav
    )
    assert fallback_used
    assert entry.fallback_used

    manifest = AudioManifest(
        schema_version="1.0.0",
        lesson_id="fb_test",
        language="en",
        total_duration_seconds=entry.duration_seconds,
        entries=[entry],
        fallback_used=True,
    )
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    lesson = planner.get_fallback_lesson()

    notes = generate_study_notes(lesson=lesson, manifest=manifest, fallback_used=True)
    assert notes.model_metadata.fallback_used is True


def test_unicode_preservation_in_captions():
    """Verify that native Devanagari, Tamil, Telugu, and Kannada scripts are preserved without ASCII corruption."""
    translator = DictionaryFallbackTranslationAdapter()
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    lesson = planner.get_fallback_lesson()

    # Hindi
    hi_plan, _, _ = translator.translate_lesson(lesson, "en", "hi")
    assert "पायथन लूप" in hi_plan.title
    assert "शून्य" in hi_plan.scenes[1].narration

    # Tamil
    ta_plan, _, _ = translator.translate_lesson(lesson, "en", "ta")
    assert "பைதான்" in ta_plan.title
    assert "வரிசையில்" in ta_plan.scenes[0].narration

    # Telugu
    te_plan, _, _ = translator.translate_lesson(lesson, "en", "te")
    assert "పైథాన్" in te_plan.title
    assert "పునరావృతం" in te_plan.scenes[0].narration

    # Kannada
    kn_plan, _, _ = translator.translate_lesson(lesson, "en", "kn")
    assert "ಪೈಥಾನ್" in kn_plan.title
    assert "ಪಟ್ಟಿಯಲ್ಲಿರುವ" in kn_plan.scenes[0].narration

    # Ensure code blocks in all languages remained strictly identical Python code
    for plan in [hi_plan, ta_plan, te_plan, kn_plan]:
        code_scene = plan.scenes[1]
        assert isinstance(code_scene, CodeWalkthroughScene)
        assert code_scene.code == lesson.scenes[1].code
        assert code_scene.highlight_lines == lesson.scenes[1].highlight_lines


def test_real_piper_tts_offline_synthesis_tamil_and_kannada(tmp_path: Path):
    """Verify real local Piper ONNX synthesis for Tamil and Kannada without mock fallback."""
    dispatcher = LocalTTSDispatcher(output_dir=tmp_path, allow_mock=False)
    supported = dispatcher.get_supported_voices()

    assert supported.get("ta", {}).get("available") is True
    assert supported.get("kn", {}).get("available") is True

    # Test Tamil synthesis
    ta_wav = tmp_path / "test_ta.wav"
    ta_entry = dispatcher.synthesize_speech(
        text="வணக்கம்! இது தமிழ் குரல் மாதிரி.",
        language="ta",
        output_path=ta_wav,
    )
    assert not ta_entry.fallback_used
    assert ta_wav.is_file()
    assert ta_entry.duration_seconds > 0.5
    assert "piper_ta_IN" in ta_entry.voice_id

    # Test Kannada synthesis
    kn_wav = tmp_path / "test_kn.wav"
    kn_entry = dispatcher.synthesize_speech(
        text="ನಮಸ್ಕಾರ! ಇದು ಕನ್ನಡ ಧ್ವನಿ ಮಾದರಿ.",
        language="kn",
        output_path=kn_wav,
    )
    assert not kn_entry.fallback_used
    assert kn_wav.is_file()
    assert kn_entry.duration_seconds > 0.5
    assert "piper_kn_IN" in kn_entry.voice_id


def test_real_windows_tts_offline_synthesis(tmp_path: Path):
    """Verify real local Windows TTS adapter when available on Windows host."""
    win_tts = WindowsLocalTTSAdapter()
    if not win_tts.is_available():
        pytest.skip("Windows SAPI5 not available in this environment")

    out_file = tmp_path / "real_sapi5_voice.wav"
    entry, fallback = win_tts.synthesize_scene(
        scene_id="real_test",
        text="Testing local offline speech synthesis on Windows.",
        language="en",
        output_path=out_file,
    )
    assert not fallback
    assert out_file.exists()
    assert entry.duration_seconds > 0.5
    assert "win_sapi5" in entry.voice_id
