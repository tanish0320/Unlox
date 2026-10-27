"""
Deterministic Mock Lesson Planner for Blu Visual Teacher.
Status: Person 1 Owned.

Provides deterministic curriculum lesson generation when Ollama or offline
models are unreachable. Supports instructional modes (math, science, programming,
social studies, general) and dynamically scales narration depth and scene count
to match the requested target duration.
"""

from typing import Optional, Tuple
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.instructional_modes import detect_instructional_mode


class MockLessonPlanner:
    """Offline deterministic fallback planner generating schema-valid LessonPlan objects."""

    def __init__(self, fallback_fixture_path: Optional[Any] = None, **kwargs):
        self.fallback_fixture_path = fallback_fixture_path

    def is_available(self) -> bool:
        return True

    def get_fallback_lesson(self, topic: Optional[str] = None) -> LessonPlan:
        """Returns a guaranteed schema-valid default lesson."""
        effective_topic = topic or "How Python Loops Work"
        plan, _ = self.plan_lesson(
            topic=effective_topic,
            level="beginner",
            language="en",
            target_duration_seconds=60,
        )
        return plan

    def plan_lesson(
        self,
        topic: str,
        level: str = "beginner",
        language: str = "en",
        target_duration_seconds: int = 60,
        simulate_error: Optional[str] = None,
        **kwargs,
    ) -> Tuple[LessonPlan, bool]:
        """
        Plans a lesson according to the detected instructional mode.
        Returns: (LessonPlan, fallback_used: bool)
        """
        if simulate_error:
            return self._handle_generation_failure(
                error_type=simulate_error,
                topic=topic,
                level=level,
                language=language,
                target_duration_seconds=target_duration_seconds,
            )

        mode = detect_instructional_mode(topic)
        topic_clean = topic.strip()
        target_sec = max(30, min(300, target_duration_seconds))

        if mode == "math":
            scenes = self._build_math_scenes(topic_clean, level, target_sec)
        elif mode == "science":
            scenes = self._build_science_scenes(topic_clean, level, target_sec)
        elif mode == "programming":
            scenes = self._build_programming_scenes(topic_clean, level, target_sec)
        elif mode == "social_studies":
            scenes = self._build_social_scenes(topic_clean, level, target_sec)
        else:
            scenes = self._build_general_scenes(topic_clean, level, target_sec)

        lesson_data = {
            "schema_version": "1.0.0",
            "title": f"Understanding {topic_clean}",
            "topic": topic_clean,
            "level": level if level in ["beginner", "intermediate"] else "beginner",
            "language": language,
            "target_duration_seconds": target_sec,
            "scenes": scenes,
        }

        try:
            validated_plan = LessonPlan.model_validate(lesson_data)
            return validated_plan, False
        except ValidationError:
            # Fallback if validation unexpectedly fails
            return self.get_fallback_lesson(topic_clean), True

    def _build_math_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates pure visual mathematical scenes (NO code scenes by default)."""
        is_ratio = any(k in topic.lower() for k in ["ratio", "proportion", "अनुपात", "समानुपात"])

        if is_ratio:
            scenes = [
                {
                    "id": "scene_01",
                    "type": "title_card",
                    "heading": f"Introduction to {topic}",
                    "subtitle": f"Comparing quantities and understanding equivalence ({level})",
                    "key_points": [
                        "What is a ratio? Comparing quantities by division",
                        "Equivalent proportions and constant relationships",
                        "Real-world application: recipes, maps, and scaling",
                    ],
                    "narration": (
                        f"Welcome to our mathematics lesson on {topic}. "
                        "A ratio is a way of comparing two or more quantities that tells us how much of one thing there is compared to another. "
                        "When two ratios represent the exact same relationship, we call them proportional. "
                        "In this lesson, we will see how ratios scale smoothly and solve practical problems."
                    ),
                },
                {
                    "id": "scene_02",
                    "type": "diagram",
                    "heading": "Step 1: Visualizing Parts and Wholes",
                    "diagram_type": "fraction_bar",
                    "fraction_bar": {
                        "total_units": 7.0,
                        "segments": [
                            {"label": "Quantity A (Blue)", "units": 3.0, "color": "#234E3C", "fraction_text": "3 / 7"},
                            {"label": "Quantity B (Terracotta)", "units": 4.0, "color": "#C87A64", "fraction_text": "4 / 7"},
                        ],
                        "comparison_label": "Ratio 3 : 4 (3 parts to 4 parts)",
                    },
                    "items": [
                        "Part A: 3 Units",
                        "Part B: 4 Units",
                        "Total Whole: 7 Parts",
                        "Ratio a:b = 3:4",
                    ],
                    "layout": "horizontal",
                    "narration": (
                        "Let us visualize a concrete ratio of three to four. "
                        "Imagine mixing paint or preparing a recipe where you take three parts of blue pigment and four parts of base. "
                        "Out of seven total units, Quantity A occupies three-sevenths, and Quantity B occupies four-sevenths. "
                        "Notice that the ratio compares the two individual quantities directly."
                    ),
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
                            {"values": [15.0, 20.0]},
                        ],
                        "scale_factor_label": "Constant Ratio Factor: Multiply by k",
                    },
                    "items": [
                        "Base Ratio (3:4)",
                        "Scale Factor x2 (6:8)",
                        "Scale Factor x3 (9:12)",
                        "Scale Factor x5 (15:20)",
                    ],
                    "layout": "horizontal",
                    "narration": (
                        "A proportion states that two ratios are completely equal. "
                        "When we multiply both quantities by the same non-zero scaling factor, the core relationship remains invariant. "
                        "Three to four is equal to six to eight, nine to twelve, and fifteen to twenty. "
                        "This principle allows architects, engineers, and scientists to scale models up or down with mathematical precision."
                    ),
                },
            ]
            if target_sec >= 120:
                scenes.append({
                    "id": "scene_04",
                    "type": "diagram",
                    "heading": "Step 3: Solving for Unknown Proportions",
                    "diagram_type": "proportion_table",
                    "proportion_table": {
                        "headers": ["Known Ratio", "Scaled Target"],
                        "rows": [
                            {"values": [3.0, 4.0]},
                            {"values": [12.0, 16.0]},
                        ],
                        "scale_factor_label": "Cross Multiplication: 3 * x = 4 * 12",
                    },
                    "items": [
                        "Set up Equality",
                        "Identify Scale Multiplier",
                        "Solve for Unknown",
                        "Verify Invariant",
                    ],
                    "layout": "horizontal",
                    "narration": (
                        "To solve for an unknown in a proportion, we set up equivalent fractions. "
                        "If three parts correspond to four, how many parts correspond to sixteen? "
                        "Since four was multiplied by four to reach sixteen, we multiply three by four to get twelve. "
                        "Equivalently, cross-multiplying confirms three times sixteen equals four times twelve."
                    ),
                })
            if target_sec >= 180:
                scenes.append({
                    "id": "scene_05",
                    "type": "diagram",
                    "heading": "Step 4: Continuous Proportions on the Number Line",
                    "diagram_type": "number_line",
                    "number_line": {
                        "min_val": 0.0,
                        "max_val": 20.0,
                        "step": 2.0,
                        "marked_points": [
                            {"val": 3.0, "label": "Unit A (3)", "color": "#234E3C"},
                            {"val": 6.0, "label": "2x Scale (6)", "color": "#234E3C"},
                            {"val": 12.0, "label": "4x Scale (12)", "color": "#C87A64"},
                        ],
                        "highlight_range": [3.0, 12.0],
                    },
                    "items": [
                        "Origin (0)",
                        "Base Unit A (3)",
                        "Double Interval (6)",
                        "Quadruple Interval (12)",
                    ],
                    "layout": "horizontal",
                    "narration": (
                        "We can also chart proportions continuously along a geometric number line. "
                        "Observe how each repeated step maintains the exact proportional gap between successive iterations. "
                        "Whether in recipe ingredients, map scales, or financial interest, proportional reasoning guarantees consistency."
                    ),
                })
            if target_sec >= 240:
                scenes.append({
                    "id": "scene_06",
                    "type": "diagram",
                    "heading": "Step 5: Summary & Real-World Application",
                    "diagram_type": "flowchart",
                    "items": [
                        "Identify Related Quantities",
                        "Express as Simplest Ratio",
                        "Apply Constant Multiplier",
                        "Verify Proportional Balance",
                    ],
                    "layout": "horizontal",
                    "narration": (
                        "To master ratios and proportions in your daily studies, always follow these four systematic steps. "
                        "First, identify what two quantities are being compared. "
                        "Second, simplify the numbers to their lowest common terms. "
                        "Third, scale them using a shared multiplication factor, and finally, verify that both sides balance equally."
                    ),
                })
            return scenes

        # Generic math topic (e.g. number line, fractions, pythagorean)
        return [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Introduction to {topic}",
                "subtitle": f"Core mathematical principles for {level} learners",
                "key_points": [
                    "Fundamental definition and geometric representation",
                    "Step-by-step arithmetic and algebraic relationship",
                    "Worked mathematical examples and verification",
                ],
                "narration": (
                    f"Welcome to our lesson exploring {topic}. "
                    "Mathematics provides a systematic language to represent quantities, structures, and patterns. "
                    "In this walkthrough, we will break down the essential rules and work through clear visual steps."
                ),
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Step 1: Visual Representation on the Number Line",
                "diagram_type": "number_line",
                "number_line": {
                    "min_val": 0.0,
                    "max_val": 10.0,
                    "step": 1.0,
                    "points": [
                        {"val": 2.0, "label": "Start: 2", "color": "#234E3C"},
                        {"val": 7.0, "label": "Target: 7", "color": "#C87A64"},
                    ],
                    "highlight_interval": [2.0, 7.0],
                },
                "items": ["Origin Point (0)", "Initial Value (2)", "Interval Addition (+5)", "Result Value (7)"],
                "layout": "horizontal",
                "narration": (
                    "Every real number has a unique coordinate location along the geometric number line. "
                    "Moving rightward signifies positive addition, while moving leftward represents subtraction. "
                    "Here, advancing from two to seven represents an exact interval jump of five units."
                ),
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Step 2: Proportional Value Breakdown",
                "diagram_type": "fraction_bar",
                "fraction_bar": {
                    "total_units": 10.0,
                    "segments": [
                        {"label": "Active Segment", "units": 5.0, "color": "#234E3C", "fraction_text": "5/10"},
                        {"label": "Remaining Range", "units": 5.0, "color": "#E2D9CC", "fraction_text": "5/10"},
                    ],
                    "comparison_label": "Equal Halves (5 / 10 = 1 / 2 = 50%)",
                },
                "items": ["Base Interval", "Fraction Partition", "Equivalence Rule", "Final Verification"],
                "layout": "horizontal",
                "narration": (
                    "When we partition a continuous interval into equal portions, we form fractions. "
                    "Dividing ten units equally into two sets of five illustrates the fundamental equivalence of five-tenths to one-half. "
                    "This structured visual balance underpins algebra, geometry, and measurement."
                ),
            },
        ]

    def _build_science_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates visual science explanation scenes."""
        return [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Introduction to {topic}",
                "subtitle": f"Biological and physical mechanisms for {level} students",
                "key_points": [
                    "Input capture and molecular ingredients",
                    "Chemical and energetic transformation phases",
                    "Vital biological outputs sustaining ecosystems",
                ],
                "narration": (
                    f"Welcome to our scientific investigation into {topic}. "
                    "Living systems capture energy from their environment and convert it into stable chemical bonds. "
                    "Today we will track how molecules interact across microscopic boundaries to sustain life on Earth."
                ),
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
                        "Photons absorbed by Chlorophyll pigment",
                        "Water split releasing breathable Oxygen",
                        "Light reactions synthesize ATP and NADPH",
                        "Calvin Cycle fixes Carbon into Glucose",
                    ],
                },
                "items": [
                    "Photon Energy Absorption",
                    "Water Photolysis",
                    "Electron Transport Chain",
                    "Calvin Cycle Carbon Fixation",
                ],
                "layout": "horizontal",
                "narration": (
                    "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                    "This excitation energy drives the splitting of water molecules, releasing oxygen into the atmosphere. "
                    "Simultaneously, ATP and NADPH transfer chemical energy to the stroma, where carbon dioxide is fixed into glucose."
                ),
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Chemical Transformation & Invariant Balance",
                "diagram_type": "flowchart",
                "items": [
                    "Inputs: 6 CO2 + 6 H2O",
                    "Solar Energy Conversion",
                    "Outputs: C6H12O6 + 6 O2",
                    "Ecosystem Energy Storage",
                ],
                "layout": "horizontal",
                "narration": (
                    "Chemically, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                    "Every single atom is conserved throughout this transformation, illustrating the law of conservation of mass. "
                    "The synthesized glucose supplies energy not only to the plant, but to the entire ecological food chain."
                ),
            },
        ]
        if target_sec >= 120:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Ecological Cycle & Planetary Impact",
                "diagram_type": "science_diagram",
                "science_diagram": {
                    "subject": "Carbon & Oxygen Cycle",
                    "elements": [
                        {"name": "Atmospheric CO2", "role": "Carbon reservoir", "x": 25, "y": 30},
                        {"name": "Plant Biomass", "role": "Primary producers", "x": 50, "y": 60},
                        {"name": "Global Oxygen", "role": "Aerobic respiration", "x": 75, "y": 30},
                    ],
                    "process_flow": ["Carbon absorption", "Photosynthetic release", "Aerobic recycling"],
                },
                "items": ["Carbon Intake", "Oxygen Generation", "Biomass Storage", "Respiration Balance"],
                "layout": "horizontal",
                "narration": (
                    "On a global scale, photosynthetic organisms act as the planet's primary carbon sink. "
                    "By drawing billions of tons of carbon from the atmosphere every year, forests and phytoplankton regulate global climate. "
                    "This interconnected cycle ensures continuous replenishment of the oxygen needed by all breathing creatures."
                ),
            })
        return scenes

    def _build_programming_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates code walkthrough scenes ONLY when explicitly requested."""
        return [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Mastering {topic}",
                "subtitle": f"Algorithmic logic and syntax structure for {level} developers",
                "key_points": [
                    "Syntax structure and execution flow",
                    "State variables and step-by-step iteration",
                    "Console output and edge case safety",
                ],
                "narration": (
                    f"Welcome to our coding walkthrough on {topic}. "
                    "In software development, writing clean, predictable code requires understanding how the interpreter evaluates statements line by line. "
                    "Let us inspect the live syntax and observe how variables mutate in memory."
                ),
            },
            {
                "id": "scene_02",
                "type": "code_walkthrough",
                "heading": "Step 1: Code Implementation & Syntax",
                "code": "# Python implementation\ndef process_items(items):\n    result = []\n    for item in items:\n        result.append(item * 2)\n    return result\n\nprint(process_items([1, 2, 3]))",
                "code_language": "python",
                "highlight_lines": [4, 5, 8],
                "expected_output": "[2, 4, 6]",
                "narration": (
                    "Here we define a processing function that accepts a collection of values. "
                    "During each cycle of the for loop, the loop variable binds to the next sequential element. "
                    "Line five transforms the element and appends it to the result array before the final call outputs the doubled list."
                ),
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Step 2: Execution State & Memory Lifecycle",
                "diagram_type": "flowchart",
                "items": [
                    "Function Call & Frame Initialization",
                    "Iterative Loop Evaluation",
                    "Memory Mutation (Append)",
                    "Return Frame Resolution",
                ],
                "layout": "horizontal",
                "narration": (
                    "In the computer memory, calling a function creates a fresh stack frame with dedicated local scope. "
                    "Each iteration advances the iterator cursor until the collection is exhausted. "
                    "Once the loop terminates, the returned object passes back to the caller and the frame releases cleanly."
                ),
            },
        ]
        if target_sec >= 120:
            scenes.append({
                "id": "scene_04",
                "type": "code_walkthrough",
                "heading": "Step 3: Edge Cases & Optimization",
                "code": "# Edge case safety & comprehension\ndef safe_process(items):\n    if not items:\n        return []\n    return [item * 2 for item in items]\n\nprint(safe_process([])) # []",
                "code_language": "python",
                "highlight_lines": [3, 4, 5],
                "expected_output": "[]",
                "narration": (
                    "Robust production code always guards against edge cases such as empty input collections. "
                    "By verifying collection length upfront, we prevent unnecessary overhead and unexpected runtime errors. "
                    "List comprehensions offer a concise, idiomatic alternative that evaluates efficiently in native bytecode."
                ),
            })
        return scenes

    def _build_social_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates humanities and social studies visual scenes."""
        return [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"Historical and geographical perspectives for {level} learners",
                "key_points": [
                    "Origin and geographic foundations",
                    "Key institutional structures and principles",
                    "Long-term impact on modern societies",
                ],
                "narration": (
                    f"Welcome to our social studies exploration of {topic}. "
                    "Human societies organize themselves through evolving geographic networks, economic trade routes, and systems of governance. "
                    "Today we analyze how these foundational structures emerged and why they remain central to our world."
                ),
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Chronological Milestones & Strategic Developments",
                "diagram_type": "flowchart",
                "items": [
                    "Early Settlements & Geography",
                    "Emergence of Trade Networks",
                    "Institutional Codification",
                    "Global Integration Impact",
                ],
                "layout": "horizontal",
                "narration": (
                    "Geographic access to navigable waterways and fertile river valleys historically determined where human communities flourished. "
                    "As surplus agricultural production developed, specialized trade networks connected distant cultures. "
                    "These interactions necessitated written legal codes and cooperative civic governance."
                ),
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Core Institutional Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Citizen Rights & Participation",
                    "Rule of Law & Accountability",
                    "Public Institutions",
                    "Sustained Civic Trust",
                ],
                "layout": "horizontal",
                "narration": (
                    "The endurance of democratic institutions relies upon institutional transparency and active citizen participation. "
                    "When rights are codified in law and authority remains accountable to the public, communities establish enduring social stability. "
                    "Understanding these historical principles equips us to participate thoughtfully in contemporary civic life."
                ),
            },
        ]

    def _build_general_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates standard conceptual explanation scenes (NO code scenes)."""
        return [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"Essential mental models and practical insights for {level} students",
                "key_points": [
                    "Foundational concepts and principles",
                    "Structural breakdown and relationship mapping",
                    "Real-world application and key takeaways",
                ],
                "narration": (
                    f"Welcome to this lesson exploring {topic}. "
                    "To build a clear mental model of any complex subject, we start by isolating the primary components and identifying how they connect. "
                    "Let us examine the foundational framework step by step."
                ),
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Step 1: Structural Breakdown",
                "diagram_type": "flowchart",
                "items": [
                    "Primary Component",
                    "Interactive Relationship",
                    "Feedback Dynamic",
                    "System Equilibrium",
                ],
                "layout": "horizontal",
                "narration": (
                    "Every functional system consists of coordinated components that interact through defined rules. "
                    "When inputs enter the process, they undergo deliberate transformation before producing observable results. "
                    "Observing these causal links clarifies why the system behaves predictably under changing conditions."
                ),
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Step 2: Practical Application & Synthesis",
                "diagram_type": "flowchart",
                "items": [
                    "Identify Initial State",
                    "Apply Guiding Invariant",
                    "Evaluate Outcome",
                    "Synthesize Learning",
                ],
                "layout": "horizontal",
                "narration": (
                    "By applying this conceptual framework to practical problems, we transform passive knowledge into actionable understanding. "
                    "Always check whether the fundamental invariants hold true from beginning to end. "
                    "With these core principles in place, you are ready to explore deeper nuances with confidence."
                ),
            },
        ]

    def _handle_generation_failure(
        self,
        error_type: str,
        topic: str,
        level: str,
        language: str,
        target_duration_seconds: int,
    ) -> Tuple[LessonPlan, bool]:
        """Simulates retry once on error, then falls back to verified deterministic plan."""
        plan, _ = self.plan_lesson(
            topic=topic,
            level=level,
            language=language,
            target_duration_seconds=target_duration_seconds,
        )
        return plan, True
