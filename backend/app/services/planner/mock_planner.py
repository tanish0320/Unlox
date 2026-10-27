"""
Mock Planner Service for Blu Visual Teacher.
Status: Person 1 Owned.

Provides deterministic lesson planning, validation against provisional schema,
bounded retry, and fallback to the canonical sample lesson.
"""

import json
from pathlib import Path
from typing import Optional, Tuple
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan


class MockLessonPlanner:
    def __init__(self, fallback_fixture_path: Optional[Path] = None):
        if fallback_fixture_path is not None:
            self.fallback_fixture_path = fallback_fixture_path
        else:
            # Search upwards for fixtures/sample-lesson.json
            found_path = None
            for p in Path(__file__).resolve().parents:
                candidate = p / "fixtures" / "sample-lesson.json"
                if candidate.exists():
                    found_path = candidate
                    break
            self.fallback_fixture_path = found_path or (Path("fixtures") / "sample-lesson.json")

        self._cached_fallback: Optional[LessonPlan] = None

    def get_fallback_lesson(self) -> LessonPlan:
        """Loads and returns the verified deterministic fallback lesson fixture."""
        if self._cached_fallback is None:
            with open(self.fallback_fixture_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._cached_fallback = LessonPlan.model_validate(data)
        return self._cached_fallback.model_copy(deep=True)

    def plan_lesson(
        self,
        topic: str,
        level: str = "beginner",
        language: str = "en",
        target_duration_seconds: int = 60,
        simulate_error: Optional[str] = None,
    ) -> Tuple[LessonPlan, bool]:
        """
        Plans a lesson. Returns (LessonPlan, fallback_used).
        If simulate_error is set ('malformed', 'schema_violation', 'timeout'),
        triggers retry and ultimate fallback.
        """
        if simulate_error:
            # Simulate retry once, then fallback
            return self._handle_generation_failure(
                error_type=simulate_error,
                topic=topic,
                level=level,
                language=language,
                target_duration_seconds=target_duration_seconds,
            )

        # Generate a standard mock lesson structured around the requested topic
        # Uses the canonical 3-scene structure
        topic_lower = topic.lower()
        if "ratio" in topic_lower or "proportion" in topic_lower:
            scenes = [
                {
                    "id": "scene_01",
                    "type": "title_card",
                    "heading": f"Introduction to {topic}",
                    "subtitle": f"Comparing quantities for {level} learners",
                    "key_points": [
                        "What is a ratio?",
                        "Understanding proportions (a:b = c:d)",
                        "Real-world problem solving",
                    ],
                    "narration": f"Welcome to this lesson on {topic}. A ratio compares two quantities by division, while a proportion states that two ratios are equal.",
                },
                {
                    "id": "scene_02",
                    "type": "code_walkthrough",
                    "heading": "Step 1: Calculating and Simplifying Ratios",
                    "code": "# Python example: Simplifying a ratio\nimport math\na, b = 12, 16\ngcd = math.gcd(a, b)\nprint(f'Simplified ratio: {a // gcd}:{b // gcd}')",
                    "code_language": "python",
                    "highlight_lines": [4, 5],
                    "expected_output": "Simplified ratio: 3:4",
                    "narration": "In code, we can simplify a ratio by dividing both numbers by their greatest common divisor.",
                },
                {
                    "id": "scene_03",
                    "type": "diagram",
                    "heading": "Step 2: Proportional Scaling",
                    "items": [
                        "Base Ratio (3:4)",
                        "Multiply by Factor 2",
                        "Scaled Proportion (6:8)",
                        "Constant Relationship",
                    ],
                    "layout": "horizontal",
                    "narration": "A proportion means the relationship remains constant as quantities scale up or down proportionally.",
                },
            ]
        else:
            scenes = [
                {
                    "id": "scene_01",
                    "type": "title_card",
                    "heading": f"Introduction to {topic}",
                    "subtitle": f"Core concepts for {level} learners",
                    "key_points": [
                        "Foundational principles",
                        "Practical syntax and logic",
                        "Step-by-step mental model",
                    ],
                    "narration": f"Welcome to this lesson on {topic}. We will break down the essential concepts step by step.",
                },
                {
                    "id": "scene_02",
                    "type": "code_walkthrough",
                    "heading": f"Step 1: Implementing {topic}",
                    "code": f"# Python example for {topic}\nval = 42\nprint('Concept: ' + str(val))",
                    "code_language": "python",
                    "highlight_lines": [2, 3],
                    "expected_output": "Concept: 42",
                    "narration": f"Here is how the core logic of {topic} operates in practical execution.",
                },
                {
                    "id": "scene_03",
                    "type": "diagram",
                    "heading": "Step 2: Execution Flow",
                    "items": [
                        "Input Evaluation",
                        "State Transition",
                        "Output Generation",
                    ],
                    "layout": "horizontal",
                    "narration": "The diagram displays how execution advances sequentially from evaluation to output.",
                },
            ]

        lesson_data = {
            "schema_version": "1.0.0",
            "title": f"Understanding {topic}",
            "topic": topic,
            "level": level if level in ["beginner", "intermediate"] else "beginner",
            "language": language,
            "target_duration_seconds": target_duration_seconds,
            "scenes": scenes,
        }

        try:
            validated_plan = LessonPlan.model_validate(lesson_data)
            return validated_plan, False
        except ValidationError:
            # Fallback if validation unexpectedly fails
            return self.get_fallback_lesson(), True

    def _handle_generation_failure(
        self,
        error_type: str,
        topic: str,
        level: str,
        language: str,
        target_duration_seconds: int,
    ) -> Tuple[LessonPlan, bool]:
        """Bounded 1-retry handler; on persistent error returns deterministic fallback."""
        # Simulated retry: In real Ollama adapter, retry with corrective prompt
        # If simulated retry still fails:
        fallback = self.get_fallback_lesson()
        # Adapt topic and language metadata to request while retaining vetted content
        fallback.topic = topic
        fallback.language = language
        return fallback, True
