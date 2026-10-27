"""
Automated Unit and Integration Tests for Person 1 Mock Pipeline.
Tests strict Pydantic schema validation, planner retry/fallback,
translation code preservation, audio duration measurement, and notes generation.
"""

import json
import wave
from pathlib import Path
import pytest
from pydantic import ValidationError

from backend.app.schemas.audio_manifest import AudioManifest, SceneAudioEntry
from backend.app.schemas.lesson_notes import LessonNotes
from backend.app.schemas.provisional_lesson import (
    CodeWalkthroughScene,
    DiagramScene,
    LessonPlan,
    TitleCardScene,
)
from backend.app.services.mock_pipeline import MockPipeline
from backend.app.services.notes_generator import generate_study_notes
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.translation.mock_translation import MockTranslationService
from backend.app.services.tts.mock_tts import MockTTSService, generate_synthetic_wav


FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-lesson.json"
NOTES_FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-notes.json"


def test_sample_lesson_fixture_valid():
    """Verify that fixtures/sample-lesson.json parses cleanly against LessonPlan schema."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    plan = LessonPlan.model_validate(data)
    assert plan.title == "How a Python loop works"
    assert len(plan.scenes) == 3
    assert plan.scenes[0].type == "title_card"
    assert plan.scenes[1].type == "code_walkthrough"
    assert plan.scenes[2].type == "diagram"


def test_sample_notes_fixture_valid():
    """Verify that fixtures/sample-notes.json parses cleanly against LessonNotes schema."""
    with open(NOTES_FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    notes = LessonNotes.model_validate(data)
    assert notes.topic == "How does a Python loop work?"
    assert len(notes.learning_objectives) >= 1
    assert len(notes.step_by_step_explanation) >= 1


def test_schema_rejects_invalid_scene_count():
    """Verify that lessons with < 3 scenes or > 6 scenes are rejected."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 2 scenes (too few)
    bad_data_few = dict(data)
    bad_data_few["scenes"] = data["scenes"][:2]
    with pytest.raises(ValidationError):
        LessonPlan.model_validate(bad_data_few)

    # 7 scenes (too many)
    bad_data_many = dict(data)
    bad_data_many["scenes"] = data["scenes"] * 3
    with pytest.raises(ValidationError):
        LessonPlan.model_validate(bad_data_many)


def test_schema_rejects_duplicate_scene_ids():
    """Verify that duplicate scene IDs are caught by validator."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["scenes"][1]["id"] = data["scenes"][0]["id"]
    with pytest.raises(ValidationError) as exc:
        LessonPlan.model_validate(data)
    assert "Scene IDs must be unique" in str(exc.value)


def test_code_walkthrough_highlight_lines_validation():
    """Verify out-of-bounds highlight lines are rejected."""
    code = "x = 10\nprint(x)"  # 2 lines total
    # Valid highlight
    valid_scene = CodeWalkthroughScene(
        id="scene_c",
        heading="Valid",
        narration="Valid highlight",
        code=code,
        highlight_lines=[1, 2],
    )
    assert valid_scene.highlight_lines == [1, 2]

    # Invalid highlight (line 3 does not exist)
    with pytest.raises(ValidationError) as exc:
        CodeWalkthroughScene(
            id="scene_c_bad",
            heading="Invalid",
            narration="Invalid highlight",
            code=code,
            highlight_lines=[3],
        )
    assert "out of bounds" in str(exc.value)


def test_planner_normal_and_fallback():
    """Verify MockLessonPlanner generates valid plans and gracefully falls back on error."""
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)

    # Normal planning
    plan, fallback_used = planner.plan_lesson(topic="Recursion", level="intermediate")
    assert not fallback_used
    assert plan.topic == "Recursion"
    assert len(plan.scenes) == 3

    # Simulated planner failure triggers fallback
    fallback_plan, fallback_used = planner.plan_lesson(
        topic="Recursion", simulate_error="timeout"
    )
    assert fallback_used
    assert fallback_plan.topic == "Recursion"
    assert len(fallback_plan.scenes) == 3
    # Check that fallback scene content is valid
    assert fallback_plan.scenes[0].type == "title_card"


def test_translation_preserves_code_and_keys():
    """Verify translation translates narration while leaving code blocks and schema keys intact."""
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    sample_plan = planner.get_fallback_lesson()
    translator = MockTranslationService()

    # Translate to Hindi
    hi_plan, fallback_used = translator.translate_lesson(sample_plan, target_language="hi")
    assert hi_plan.language == "hi"

    # Verify code scene: code is strictly untouched
    code_scene_en = sample_plan.scenes[1]
    code_scene_hi = hi_plan.scenes[1]
    assert isinstance(code_scene_hi, CodeWalkthroughScene)
    assert code_scene_hi.code == code_scene_en.code
    assert code_scene_hi.highlight_lines == code_scene_en.highlight_lines

    # Verify Hindi translation occurred for narration
    assert "range" in code_scene_hi.narration
    assert code_scene_hi.narration != code_scene_en.narration


def test_tts_audio_generation_and_duration_measurement(tmp_path: Path):
    """Verify synthetic WAV audio generation and real duration measurement from file."""
    wav_path = tmp_path / "test_tone.wav"
    measured_duration = generate_synthetic_wav(
        output_path=wav_path,
        duration_seconds=3.25,
        sample_rate=24000,
        frequency=440.0,
    )
    assert abs(measured_duration - 3.25) < 0.05
    assert wav_path.exists()

    # Inspect WAV header directly
    with wave.open(str(wav_path), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        assert wf.getframerate() == 24000
        assert wf.getnframes() == int(3.25 * 24000)

    # Test TTSService synthesis
    tts_service = MockTTSService(output_dir=tmp_path)
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    lesson = planner.get_fallback_lesson()

    manifest = tts_service.synthesize_lesson(lesson=lesson, lesson_id="unit_test_lesson")
    assert isinstance(manifest, AudioManifest)
    assert len(manifest.entries) == 3
    assert manifest.total_duration_seconds > 0.0
    for entry in manifest.entries:
        assert Path(entry.audio_file).exists()
        assert entry.duration_seconds > 0.0
        assert entry.sample_rate == 24000


def test_study_notes_generation(tmp_path: Path):
    """Verify lesson notes generation is consistent with lesson plan and manifest."""
    planner = MockLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    lesson = planner.get_fallback_lesson()
    tts_service = MockTTSService(output_dir=tmp_path)
    manifest = tts_service.synthesize_lesson(lesson=lesson)

    notes = generate_study_notes(lesson=lesson, manifest=manifest, fallback_used=False)
    assert notes.title == lesson.title
    assert notes.topic == lesson.topic
    assert notes.language == lesson.language
    assert len(notes.step_by_step_explanation) == len(lesson.scenes)
    assert len(notes.examples) == 1
    assert notes.examples[0].code == lesson.scenes[1].code


def test_full_mock_pipeline_e2e(tmp_path: Path):
    """Verify the entire mock pipeline executes smoothly end-to-end."""
    pipeline = MockPipeline(output_dir=tmp_path)

    # 1. Standard run in English
    result_en = pipeline.run(
        topic="Binary Search",
        level="intermediate",
        language="en",
        lesson_id="test_e2e_en",
    )
    assert not result_en.fallback_used
    assert result_en.lesson_plan.topic == "Binary Search"
    assert len(result_en.audio_manifest.entries) == 3
    assert result_en.audio_manifest.total_duration_seconds > 0
    assert result_en.study_notes.topic == "Binary Search"

    # 2. Multilingual run in Hindi
    result_hi = pipeline.run(
        topic="How does a Python loop work?",
        level="beginner",
        language="hi",
        lesson_id="test_e2e_hi",
    )
    assert result_hi.lesson_plan.language == "hi"
    assert result_hi.audio_manifest.language == "hi"
    assert result_hi.study_notes.language == "hi"

    # 3. Simulated failure triggers fallback cleanly
    result_fail = pipeline.run(
        topic="Quantum Computing",
        level="beginner",
        language="en",
        lesson_id="test_e2e_fallback",
        simulate_planner_error="malformed_json",
    )
    assert result_fail.fallback_used
    assert result_fail.study_notes.model_metadata.fallback_used
