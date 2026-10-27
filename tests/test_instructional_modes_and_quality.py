"""
Regression and quality tests verifying instructional mode detection,
scene type matching, conversational Hindi narration, and duration scaling.
"""

import pytest
from pydantic import ValidationError
from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.instructional_modes import detect_instructional_mode
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.translation.translation_adapter import LocalTranslationDispatcher


def test_instructional_mode_detection():
    """Verify instructional mode detection matches user intent."""
    assert detect_instructional_mode("Explain Ratio and proportion") == "math"
    assert detect_instructional_mode("Understanding Fractions and Decimals") == "math"
    assert detect_instructional_mode("How does photosynthesis work in plants?") == "science"
    assert detect_instructional_mode("How does a Python loop work?") == "programming"
    assert detect_instructional_mode("Introduction to JavaScript functions") == "programming"
    assert detect_instructional_mode("How trade routes shaped civilization") == "social_studies"


def test_ratio_and_proportion_has_zero_code_scenes():
    """Verify non-programming math topic does NOT contain code_walkthrough scenes."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="Explain Ratio and proportion",
        level="beginner",
        language="en",
        target_duration_seconds=60,
    )

    assert plan.topic == "Explain Ratio and proportion"
    assert len(plan.scenes) >= 3
    scene_types = [s.type for s in plan.scenes]
    assert "code_walkthrough" not in scene_types
    assert "title_card" in scene_types
    assert "diagram" in scene_types

    # Ensure diagram types are mathematical models
    diagram_scenes = [s for s in plan.scenes if s.type == "diagram"]
    diag_types = [s.diagram_type for s in diagram_scenes]
    assert "fraction_bar" in diag_types or "proportion_table" in diag_types


def test_programming_topic_has_code_walkthrough():
    """Verify programming topics explicitly include code_walkthrough scenes."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="How does a Python loop work?",
        level="beginner",
        language="en",
        target_duration_seconds=60,
    )

    scene_types = [s.type for s in plan.scenes]
    assert "code_walkthrough" in scene_types
    code_scenes = [s for s in plan.scenes if s.type == "code_walkthrough"]
    assert len(code_scenes) >= 1
    assert "for" in code_scenes[0].code or "def" in code_scenes[0].code


def test_science_topic_has_science_diagram():
    """Verify science topics include structured science_diagram scenes."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="How do plants use photosynthesis?",
        level="beginner",
        language="en",
        target_duration_seconds=60,
    )

    diagram_scenes = [s for s in plan.scenes if s.type == "diagram"]
    assert any(s.diagram_type == "science_diagram" for s in diagram_scenes)


def test_duration_scaling_scenes_and_word_count():
    """Verify that requested durations (60s to 300s) scale appropriately in scene count."""
    planner = MockLessonPlanner()

    # 1 minute -> 3 scenes
    plan_60, _ = planner.plan_lesson("Explain Ratio and proportion", target_duration_seconds=60)
    assert len(plan_60.scenes) == 3

    # 2 minutes -> 4 scenes
    plan_120, _ = planner.plan_lesson("Explain Ratio and proportion", target_duration_seconds=120)
    assert len(plan_120.scenes) == 4

    # 3 minutes -> 5 scenes
    plan_180, _ = planner.plan_lesson("Explain Ratio and proportion", target_duration_seconds=180)
    assert len(plan_180.scenes) == 5

    # 4 to 5 minutes -> 6 scenes
    plan_300, _ = planner.plan_lesson("Explain Ratio and proportion", target_duration_seconds=300)
    assert len(plan_300.scenes) == 6

    # Verify duration field is preserved
    assert plan_300.target_duration_seconds == 300


def test_conversational_hindi_narration_naturalness():
    """Verify Hindi ratio narration uses natural conversational language without Python references."""
    planner = MockLessonPlanner()
    lesson, _ = planner.plan_lesson("Explain Ratio and proportion", language="en")

    dispatcher = LocalTranslationDispatcher()
    translated, _, _ = dispatcher.translate(lesson, target_language="hi")

    assert translated.language == "hi"
    all_narration = " ".join(s.narration for s in translated.scenes)

    # Conversational teacher opening
    assert "नमस्ते बच्चों" in all_narration
    assert "अनुपात और समानुपात" in all_narration

    # Verify no programming artifacts
    assert "python" not in all_narration.lower()
    assert "code" not in all_narration.lower()
    assert "import" not in all_narration.lower()
    assert "def " not in all_narration.lower()

    # Verify no hyper-formal Sanskritized terms
    assert "महत्तम समापवर्तक" not in all_narration


def test_lesson_plan_schema_duration_validation():
    """Verify LessonPlan schema accepts 30s to 300s (1 to 5 mins) and rejects > 300s."""
    planner = MockLessonPlanner()
    base_plan, _ = planner.plan_lesson("Explain Ratio and proportion")

    valid_dict = base_plan.model_dump()
    valid_dict["target_duration_seconds"] = 300
    plan_300 = LessonPlan.model_validate(valid_dict)
    assert plan_300.target_duration_seconds == 300

    invalid_dict = base_plan.model_dump()
    invalid_dict["target_duration_seconds"] = 301
    with pytest.raises(ValidationError):
        LessonPlan.model_validate(invalid_dict)
