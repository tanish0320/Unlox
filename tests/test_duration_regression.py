"""
Regression and verification tests for video duration scaling across all presets:
60s, 120s, 180s, 240s, 300s.
"""

import pytest
from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.planner.ollama_planner import OllamaLessonPlanner


@pytest.mark.parametrize("preset,expected_scenes,min_words,max_words", [
    (60, 3, 120, 160),
    (120, 4, 260, 320),
    (180, 5, 390, 440),
    (240, 6, 480, 550),
    (300, 6, 580, 680),
])
def test_all_duration_presets_ratio(preset, expected_scenes, min_words, max_words):
    """Verify Ratio lesson scales scenes and word counts across all supported presets."""
    planner = MockLessonPlanner()
    plan, fallback = planner.plan_lesson(
        topic="Explain Ratio and proportion",
        level="beginner",
        language="en",
        target_duration_seconds=preset,
    )
    assert not fallback
    assert plan.target_duration_seconds == preset
    assert len(plan.scenes) == expected_scenes

    total_words = sum(len(s.narration.split()) for s in plan.scenes)
    assert min_words <= total_words <= max_words, (
        f"Preset {preset}s: expected between {min_words} and {max_words} words, got {total_words}"
    )


@pytest.mark.parametrize("preset,expected_scenes", [
    (60, 3),
    (120, 4),
    (180, 5),
    (240, 6),
    (300, 6),
])
@pytest.mark.parametrize("topic", [
    "How do plants use photosynthesis?",
    "How Python loops work",
    "How trade routes shaped civilization",
    "Understanding the Water Cycle",
])
def test_all_duration_presets_all_subjects(preset, expected_scenes, topic):
    """Verify science, programming, social studies, and general topics all scale correctly."""
    planner = MockLessonPlanner()
    plan, fallback = planner.plan_lesson(
        topic=topic,
        level="beginner",
        language="en",
        target_duration_seconds=preset,
    )
    assert not fallback
    assert plan.target_duration_seconds == preset
    assert len(plan.scenes) == expected_scenes

    # Ensure each scene has meaningful educational narration (at least 25 words)
    for scene in plan.scenes:
        assert len(scene.narration.split()) >= 25


def test_ollama_fallback_preserves_target_duration():
    """Verify OllamaLessonPlanner fallback returns properly scaled scenes and preserves target duration."""
    planner = OllamaLessonPlanner(base_url="http://127.0.0.1:99999", timeout_seconds=0.1)

    # 120s fallback test
    plan_120, fallback, err = planner.plan_lesson(
        topic="Explain Ratio and proportion",
        level="beginner",
        target_duration_seconds=120,
    )
    assert fallback is True
    assert plan_120.target_duration_seconds == 120
    assert len(plan_120.scenes) == 4
    total_words_120 = sum(len(s.narration.split()) for s in plan_120.scenes)
    assert 260 <= total_words_120 <= 320

    # 60s fallback test
    plan_60, fallback, err = planner.plan_lesson(
        topic="Explain Ratio and proportion",
        level="beginner",
        target_duration_seconds=60,
    )
    assert fallback is True
    assert plan_60.target_duration_seconds == 60
    assert len(plan_60.scenes) == 3


def test_two_minute_speech_rate_acceptance_range():
    """Verify that a 120s lesson estimated audio duration falls in 115-125s at measured speaking rate."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="Explain Ratio and proportion",
        level="beginner",
        language="en",
        target_duration_seconds=120,
    )
    total_words = sum(len(s.narration.split()) for s in plan.scenes)

    # Measured local TTS rate is ~2.55 words/sec (Windows SAPI5 / Kokoro neural)
    estimated_audio_sec = (total_words / 2.55) + (len(plan.scenes) - 1) * 0.3
    assert 115.0 <= estimated_audio_sec <= 125.0, (
        f"Estimated duration {estimated_audio_sec:.1f}s outside acceptance range 115-125s"
    )
