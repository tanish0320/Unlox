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
                    "heading": "Step 2: Proportional Scaling Table",
                    "diagram_type": "proportion_table",
                    "proportion_table": {
                        "headers": ["Quantity A", "Quantity B"],
                        "rows": [
                            {"values": [3.0, 4.0]},
                            {"values": [6.0, 8.0]},
                            {"values": [9.0, 12.0]},
                        ],
                        "scale_factor_label": "Constant ratio factor: 3 : 4",
                    },
                    "fraction_bar": {
                        "total_units": 7.0,
                        "segments": [
                            {"label": "Part A", "units": 3.0, "color": "#38BDF8", "fraction_text": "3/7"},
                            {"label": "Part B", "units": 4.0, "color": "#34D399", "fraction_text": "4/7"},
                        ],
                        "comparison_label": "3 : 4 = 6 : 8 = 9 : 12",
                    },
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
        elif any(k in topic_lower for k in ['photo', 'science', 'plant', 'cell', 'biology', 'cycle']):
            scenes = [
                {
                    "id": "scene_01",
                    "type": "title_card",
                    "heading": f"Introduction to {topic}",
                    "subtitle": f"Key mechanisms for {level} learners",
                    "key_points": [
                        "Biological Inputs & Energy capture",
                        "Chemical transformation steps",
                        "Vital outputs sustaining life",
                    ],
                    "narration": f"Welcome to our study of {topic}. Today we explore the primary biological elements and how energy transforms within living systems.",
                },
                {
                    "id": "scene_02",
                    "type": "diagram",
                    "heading": "Biological Process & Key Components",
                    "diagram_type": "science_diagram",
                    "science_diagram": {
                        "subject": topic.title(),
                        "elements": [
                            {"name": "Sunlight (Photons)", "role": "Excites chlorophyll electrons", "x": 20, "y": 25},
                            {"name": "Water (H2O)", "role": "Splits via photolysis releasing O2", "x": 20, "y": 70},
                            {"name": "Chloroplast Thylakoid", "role": "Converts light into ATP & NADPH", "x": 50, "y": 48},
                            {"name": "Carbon Dioxide (CO2)", "role": "Calvin Cycle fixation in stroma", "x": 80, "y": 25},
                            {"name": "Glucose (C6H12O6)", "role": "Stores synthesized chemical energy", "x": 80, "y": 70},
                        ],
                        "process_flow": [
                            "Photons absorbed by Chlorophyll",
                            "Water split releasing Oxygen",
                            "ATP and NADPH created in light reactions",
                            "Carbon fixation yields Glucose in Calvin Cycle",
                        ],
                    },
                    "items": [
                        "Light Absorption",
                        "Photolysis",
                        "Electron Transport",
                        "Calvin Cycle",
                    ],
                    "layout": "horizontal",
                    "narration": "In photosynthesis, light energy and water initiate electron transport in the thylakoid, ultimately producing glucose and releasing vital oxygen.",
                },
                {
                    "id": "scene_03",
                    "type": "code_walkthrough",
                    "heading": "Chemical Equation & Stoichiometry",
                    "code": "# Photosynthesis stoichiometric balance\n# 6 CO2 + 6 H2O + Light Energy -> C6H12O6 + 6 O2\ninputs = {'CO2': 6, 'H2O': 6}\noutputs = {'Glucose': 1, 'O2': 6}\nprint('Balanced equation:', inputs, '->', outputs)",
                    "code_language": "python",
                    "highlight_lines": [2, 3, 4],
                    "expected_output": "Balanced equation: {'CO2': 6, 'H2O': 6} -> {'Glucose': 1, 'O2': 6}",
                    "narration": "Stoichiometrically, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen.",
                },
            ]
        elif any(k in topic_lower for k in ['number', 'integer', 'fraction', 'addition', 'subtraction']):
            scenes = [
                {
                    "id": "scene_01",
                    "type": "title_card",
                    "heading": f"Introduction to {topic}",
                    "subtitle": f"Visualizing values on a number line",
                    "key_points": [
                        "Understanding origin and orientation",
                        "Visualizing increments and distances",
                        "Tracking operations with interval jumps",
                    ],
                    "narration": f"Welcome to our lesson on {topic}. Number lines provide an intuitive geometric representation of numbers and relationships.",
                },
                {
                    "id": "scene_02",
                    "type": "diagram",
                    "heading": "Values on the Number Line",
                    "diagram_type": "number_line",
                    "number_line": {
                        "min_val": 0.0,
                        "max_val": 10.0,
                        "step": 1.0,
                        "points": [
                            {"val": 2.0, "label": "Start: 2", "color": "#38BDF8"},
                            {"val": 7.0, "label": "Target: 7", "color": "#10B981"},
                        ],
                        "highlight_interval": [2.0, 7.0],
                    },
                    "fraction_bar": {
                        "total_units": 10.0,
                        "segments": [
                            {"label": "Passed", "units": 5.0, "color": "#38BDF8", "fraction_text": "5/10"},
                            {"label": "Remaining", "units": 5.0, "color": "#94A3B8", "fraction_text": "5/10"},
                        ],
                        "comparison_label": "Jump distance = 5 units (50% of range)",
                    },
                    "items": ["Origin (0)", "Start Point (2)", "Interval Jump (+5)", "End Point (7)"],
                    "layout": "horizontal",
                    "narration": "Moving along the number line from 2 to 7 represents an interval jump of five positive units.",
                },
                {
                    "id": "scene_03",
                    "type": "code_walkthrough",
                    "heading": "Calculating Coordinate Distances",
                    "code": "# Python: Distance between points on a number line\nstart, target = 2, 7\ndistance = abs(target - start)\nprint(f'Interval distance: {distance}')",
                    "code_language": "python",
                    "highlight_lines": [2, 3],
                    "expected_output": "Interval distance: 5",
                    "narration": "We calculate the distance between coordinates by taking the absolute value of their difference.",
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
