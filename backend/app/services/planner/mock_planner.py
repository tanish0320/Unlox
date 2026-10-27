"""
Deterministic Mock Lesson Planner for Blu Visual Teacher.
Status: Person 1 Owned.

Provides deterministic curriculum lesson generation when Ollama or offline
models are unreachable. Supports instructional modes (math, science, programming,
social studies, general) and dynamically scales narration depth and scene count
to match the requested target duration (60s, 120s, 180s, 240s, 300s).
"""

from typing import Any, Optional, Tuple, List
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.instructional_modes import detect_instructional_mode


class MockLessonPlanner:
    """Offline deterministic fallback planner generating schema-valid LessonPlan objects."""

    def __init__(self, fallback_fixture_path: Optional[Any] = None, **kwargs):
        self.fallback_fixture_path = fallback_fixture_path

    def is_available(self) -> bool:
        return True

    def get_fallback_lesson(
        self,
        topic: Optional[str] = None,
        target_duration_seconds: int = 60,
        level: str = "beginner",
        language: str = "en",
    ) -> LessonPlan:
        """Returns a guaranteed schema-valid default lesson with proper duration scaling."""
        effective_topic = topic or "How Python Loops Work"
        plan, _ = self.plan_lesson(
            topic=effective_topic,
            level=level if level in ["beginner", "intermediate"] else "beginner",
            language=language,
            target_duration_seconds=target_duration_seconds,
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
            return self.get_fallback_lesson(topic_clean, target_duration_seconds=target_sec), True

    def _build_math_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates pure visual mathematical scenes (NO code scenes by default)."""
        is_ratio = any(k in topic.lower() for k in ["ratio", "proportion", "अनुपात", "समानुपात"])

        if is_ratio:
            if target_sec >= 300:
                s1_narration = (
                    f"Welcome to our mathematics masterclass exploring {topic}. "
                    "In fundamental mathematics, a ratio is an intuitive yet powerful tool for comparing two or more quantities through division. "
                    "It tells us precisely how much of one element exists relative to another, without altering the underlying balance. "
                    "When two ratios maintain the exact same mathematical relationship across scaling, we establish an enduring proportion. "
                    "Throughout this lesson, we will see how proportions maintain balance in everyday recipes, architectural models, and scientific calculations. "
                    "By understanding the relationship between individual parts and the whole, you will gain the tools to solve complex scaling problems with complete clarity."
                )
                s2_narration = (
                    "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar. "
                    "Imagine preparing a chef's recipe or mixing vibrant artist pigment where you take three parts of rich blue pigment and four parts of terracotta base. "
                    "Across all seven total units in the system, Quantity A occupies exactly three-sevenths, while Quantity B occupies four-sevenths. "
                    "Notice that the ratio directly compares the two distinct quantities to each other, while also relating each component back to the complete whole. "
                    "This invariant relationship remains perfectly constant even when scaling the quantities up or down to any size."
                )
                s3_narration = (
                    "A proportion formally asserts that two separate ratios are completely equal in value. "
                    "When we multiply both quantities by the same non-zero scaling factor, the core proportional balance remains completely invariant. "
                    "As shown in our scaling table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                    "Engineers, financial analysts, and cartographers rely on this constant scale factor every day to scale blueprints and economic projections with precision. "
                    "No matter how large the values grow, their internal ratio remains identical."
                )
            elif target_sec >= 180:
                s1_narration = (
                    f"Welcome to our mathematics masterclass exploring {topic}. "
                    "In fundamental mathematics, a ratio is an intuitive yet powerful tool for comparing two or more quantities through division. "
                    "It tells us precisely how much of one element exists relative to another, without altering the underlying balance. "
                    "When two ratios maintain the exact same mathematical relationship across scaling, we establish a proportion. "
                    "Throughout this lesson, we will see how proportions maintain balance in everyday recipes, architectural models, and scientific calculations."
                )
                s2_narration = (
                    "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar. "
                    "Imagine preparing a chef's recipe or mixing vibrant artist pigment where you take three parts of rich blue pigment and four parts of base. "
                    "Across all seven total units in the system, Quantity A occupies exactly three-sevenths, while Quantity B occupies four-sevenths. "
                    "Notice that the ratio directly compares the two distinct quantities to each other, while also relating each component back to the complete whole. "
                    "This invariant relationship remains perfectly constant even when scaling up."
                )
                s3_narration = (
                    "A proportion formally asserts that two separate ratios are completely equal in value. "
                    "When we multiply both quantities by the same non-zero scaling factor, the core proportional balance remains completely invariant. "
                    "As shown in our scaling table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                    "Engineers, financial analysts, and cartographers rely on this constant scale factor every day to scale blueprints and economic projections with precision."
                )
            elif target_sec >= 120:
                s1_narration = (
                    f"Welcome to our mathematics masterclass exploring {topic}. "
                    "In mathematics, a ratio is an intuitive and foundational tool for comparing two or more quantities through division to show their relative sizes. "
                    "When two distinct ratios maintain the exact same mathematical relationship when scaled, we define them as proportional. "
                    "Throughout this lesson, we will see how proportions maintain balance in everyday recipes, architectural models, and scientific calculations."
                )
                s2_narration = (
                    "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar. "
                    "Imagine preparing a chef's recipe or mixing artist pigment where you mix three parts of blue pigment with four parts of terracotta base. "
                    "Across all seven total equal parts in the complete whole, Quantity A occupies three-sevenths, while Quantity B occupies four-sevenths. "
                    "Notice that the ratio directly compares the two individual quantities while preserving the balance of the whole system."
                )
                s3_narration = (
                    "A proportion formally states that two separate ratios are completely equal in value. "
                    "When we multiply both quantities by the same non-zero scaling multiplier, the core proportional balance remains completely invariant across every term. "
                    "As shown in our table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                    "This constant scaling factor allows engineers, scientists, and architects to scale models up or down with exact mathematical precision."
                )
            else:
                s1_narration = (
                    f"Welcome to our mathematics lesson on {topic}. "
                    "A ratio compares two quantities by division to show their relative sizes. "
                    "When two ratios represent the exact same relationship, they are called proportional. "
                    "In this walkthrough, we will discover how ratios scale smoothly and solve practical problems."
                )
                s2_narration = (
                    "Let us visualize a ratio of three to four using our fraction bar. "
                    "Imagine taking three parts of blue pigment and four parts of terracotta base. "
                    "Out of seven total units, Quantity A is three-sevenths and Quantity B is four-sevenths. "
                    "Notice how the ratio directly compares the two individual quantities."
                )
                s3_narration = (
                    "A proportion states that two ratios are completely equal. "
                    "Multiplying both sides by the same non-zero scale factor keeps the balance constant. "
                    "Three to four equals six to eight, nine to twelve, and fifteen to twenty. "
                    "This fundamental rule lets us scale diagrams and practical formulas with ease."
                )

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
                    "narration": s1_narration,
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
                    "narration": s2_narration,
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
                    "narration": s3_narration,
                },
            ]

            if target_sec >= 120:
                if target_sec >= 300:
                    s4_narration = (
                        "Now let us examine a worked example to solve for an unknown quantity in a proportion. "
                        "Suppose we know that three parts corresponds to four parts, and we need to determine how many parts correspond to sixteen. "
                        "Because the second quantity was scaled by multiplying by four, we multiply the first quantity by that exact same factor to obtain twelve. "
                        "Cross-multiplying confirms that three times sixteen equals forty-eight, which perfectly matches four times twelve. "
                        "This algebraic method ensures consistency across all scientific and engineering formulas, allowing you to solve unknown values quickly and accurately."
                    )
                elif target_sec >= 180:
                    s4_narration = (
                        "Now let us examine a worked example to solve for an unknown quantity in a proportion. "
                        "Suppose we know that three parts corresponds to four parts, and we want to know how many parts correspond to sixteen. "
                        "Because the second quantity grew from four to sixteen by multiplying by four, we multiply the first quantity by four to get twelve. "
                        "Alternatively, cross-multiplying confirms that three times sixteen equals forty-eight, which exactly equals four times twelve. "
                        "This powerful cross-multiplication technique reliably isolates any unknown variable across physics, chemistry, and geometry."
                    )
                else:
                    s4_narration = (
                        "Now let us solve a worked example to find an unknown quantity in a proportion. "
                        "Suppose we know that three parts corresponds to four parts, and we need to determine how many parts correspond to sixteen. "
                        "Because four was multiplied by four to reach sixteen, we multiply three by four to get twelve. "
                        "Cross-multiplying confirms three times sixteen equals forty-eight, which exactly balances four times twelve. "
                        "This reliable cross-multiplication technique lets you isolate unknown variables across science, finance, and geometry."
                    )
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
                    "narration": s4_narration,
                })
            if target_sec >= 180:
                if target_sec >= 300:
                    s5_narration = (
                        "We can also chart proportions continuously along a geometric number line to observe continuous scaling in action. "
                        "Notice how each repeated step maintains the exact proportional gap between successive iterations. "
                        "As we advance from three to six, and then from six to twelve, each interval expands by an identical constant multiplier. "
                        "This continuous spatial mapping demonstrates how linear functions and proportional growth operate together in coordinate geometry and calculus. "
                        "Whether you are working with recipe ingredients, architectural blueprints, map scales, or compound interest, proportional reasoning ensures mathematical stability and precision across every calculation."
                    )
                elif target_sec >= 240:
                    s5_narration = (
                        "We can also chart proportions continuously along a geometric number line to visualize scaling intervals. "
                        "Observe how each repeated step maintains the exact proportional gap between successive iterations. "
                        "As we advance from three to six, and then from six to twelve, each jump expands by an exact constant multiplier. "
                        "This continuous spatial mapping demonstrates how linear functions and proportional growth operate together in calculus and coordinate geometry. "
                        "Whether in recipe ingredients, map scales, or financial interest, proportional reasoning guarantees consistency and prevents calculation errors."
                    )
                else:
                    s5_narration = (
                        "We can also chart proportions continuously along a geometric number line. "
                        "Observe how each repeated step maintains the exact proportional gap between successive iterations. "
                        "As we advance from three to six, and then from six to twelve, each jump expands by an exact constant multiplier. "
                        "This continuous spatial mapping demonstrates how linear functions and proportional growth operate together in calculus and coordinate geometry. "
                        "Whether in recipe ingredients, map scales, or financial interest, proportional reasoning guarantees consistency."
                    )
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
                    "narration": s5_narration,
                })
            if target_sec >= 240:
                if target_sec >= 300:
                    s6_narration = (
                        "To master ratios and proportions across all advanced coursework, let us synthesize the complete foundational curriculum. "
                        "First, always identify what two quantities are being compared, ensuring their physical units match before forming a fraction. "
                        "Second, simplify the numbers to their lowest common terms so the base ratio is crystal clear and manageable. "
                        "Third, determine the shared constant scaling multiplier connecting the initial state to the target problem. "
                        "Fourth, apply that factor across all terms and verify the relationship through rigorous cross-multiplication. "
                        "Remember that proportions form the backbone of trigonometry, chemical stoichiometry, physics formulas, and financial modeling. "
                        "With these four core principles in place, you possess a versatile and reliable toolkit to tackle any quantitative challenge in mathematics and science with lasting confidence and complete mastery."
                    )
                else:
                    s6_narration = (
                        "To master ratios and proportions in your daily studies, always follow these four systematic steps. "
                        "First, identify what two quantities are being compared and express them as a simplified fraction. "
                        "Second, determine the shared constant scaling multiplier connecting the known terms together. "
                        "Third, scale the corresponding quantity by multiplying or dividing by that exact factor. "
                        "Finally, verify your solution by checking that cross-multiplication produces identical products on both sides. "
                        "By following this consistent framework, you can solve complex scaling questions with complete confidence, speed, and accuracy."
                    )
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
                    "narration": s6_narration,
                })
            return scenes

        # Generic math topic (e.g. number line, fractions, pythagorean)
        if target_sec >= 120:
            s1_narration = (
                f"Welcome to our mathematics masterclass exploring {topic}. "
                "Mathematics provides a systematic language to represent quantities, structures, spatial relationships, and universal patterns. "
                "In this visual walkthrough, we will break down the essential definitions and work through clear, step-by-step principles. "
                "By connecting numeric calculations with visual geometric representations, we build an intuitive foundation for problem solving."
            )
            s2_narration = (
                "Every real number has a unique coordinate location along the continuous geometric number line. "
                "Moving rightward from the origin signifies positive addition, while moving leftward represents subtraction. "
                "Here, advancing from two to seven represents an exact interval jump of five units. "
                "Visualizing operations on a number line helps prevent algebraic sign errors and clarifies interval relationships."
            )
            s3_narration = (
                "When we partition a continuous interval into equal portions, we form fractions. "
                "Dividing ten units equally into two sets of five illustrates the fundamental equivalence of five-tenths to one-half. "
                "This structured visual balance underpins algebra, geometry, and real-world measurement. "
                "Understanding part-to-whole relationships allows us to manipulate complex algebraic expressions with ease."
            )
        else:
            s1_narration = (
                f"Welcome to our lesson exploring {topic}. "
                "Mathematics provides a systematic language to represent quantities, structures, and patterns. "
                "In this walkthrough, we will break down the essential rules and work through clear visual steps."
            )
            s2_narration = (
                "Every real number has a unique coordinate location along the geometric number line. "
                "Moving rightward signifies positive addition, while moving leftward represents subtraction. "
                "Here, advancing from two to seven represents an exact interval jump of five units."
            )
            s3_narration = (
                "When we partition a continuous interval into equal portions, we form fractions. "
                "Dividing ten units equally into two sets of five illustrates the fundamental equivalence of five-tenths to one-half. "
                "This structured visual balance underpins algebra, geometry, and measurement."
            )

        scenes = [
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
                "narration": s1_narration,
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
                    "marked_points": [
                        {"val": 2.0, "label": "Start: 2", "color": "#234E3C"},
                        {"val": 7.0, "label": "Target: 7", "color": "#C87A64"},
                    ],
                    "highlight_range": [2.0, 7.0],
                },
                "items": ["Origin Point (0)", "Initial Value (2)", "Interval Addition (+5)", "Result Value (7)"],
                "layout": "horizontal",
                "narration": s2_narration,
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
                "narration": s3_narration,
            },
        ]

        if target_sec >= 120:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Step 3: Worked Problem & Algebraic Balance",
                "diagram_type": "flowchart",
                "items": [
                    "Isolate the Unknown",
                    "Apply Inverse Operations",
                    "Maintain System Balance",
                    "Verify Computed Result",
                ],
                "layout": "horizontal",
                "narration": (
                    "Now let us examine a worked algebraic problem to see how balancing equations works in practice. "
                    "When solving for an unknown variable, whatever mathematical operation we perform on one side must also be applied to the other. "
                    "By methodically subtracting constants and dividing by coefficients, we isolate the unknown without altering equality. "
                    "Substituting the result back into the original expression confirms that both sides evaluate to the exact same value. "
                    "This invariant property of equality guarantees mathematical truth across all levels of algebra."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Step 4: Geometric & Coordinate Modeling",
                "diagram_type": "number_line",
                "number_line": {
                    "min_val": 0.0,
                    "max_val": 20.0,
                    "step": 2.0,
                    "marked_points": [
                        {"val": 4.0, "label": "Point A (4)", "color": "#234E3C"},
                        {"val": 10.0, "label": "Point B (10)", "color": "#234E3C"},
                        {"val": 16.0, "label": "Point C (16)", "color": "#C87A64"},
                    ],
                    "highlight_range": [4.0, 16.0],
                },
                "items": ["Point A (4)", "Midpoint B (10)", "Target Point C (16)", "Equal Intervals (+6)"],
                "layout": "horizontal",
                "narration": (
                    "When we map arithmetic relationships onto a two-dimensional grid or multi-point number line, geometric patterns emerge. "
                    "Notice how the distance between points remains perfectly symmetric when equal intervals are added. "
                    "This geometric symmetry provides an immediate visual proof of arithmetic progressions and linear equations. "
                    "Connecting numerical rules with visual shapes strengthens conceptual understanding and helps retain mathematical principles long term."
                ),
            })
        if target_sec >= 240:
            s6_narration = (
                f"To conclude our study of {topic}, let us review the core procedural workflow. "
                "First, represent the given values visually using a number line or fraction model. "
                "Second, identify the mathematical invariant connecting the known quantities. "
                "Third, perform step-by-step arithmetic while maintaining system balance at every phase. "
                "Finally, double check your solution using inverse operations to confirm accuracy. "
                "Practicing this structured routine turns daunting mathematical challenges into clear, manageable steps."
            ) if target_sec < 300 else (
                f"To conclude our comprehensive masterclass on {topic}, let us review the overarching mathematical principles. "
                "First, translate any word problem or abstract expression into an intuitive visual model such as a coordinate interval or partition diagram. "
                "Second, identify the fundamental invariants that remain constant throughout the transformation. "
                "Third, apply inverse operations methodically to isolate target variables while preserving equality on both sides. "
                "Fourth, substitute calculated values back into initial expressions to rigorously verify correctness. "
                "By combining visual intuition with rigorous algebraic discipline, you can navigate complex mathematical challenges with speed and confidence."
            )
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Step 5: Synthesis & Review Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Formulate Visual Model",
                    "Identify Core Invariant",
                    "Execute Balanced Steps",
                    "Rigorous Verification",
                ],
                "layout": "horizontal",
                "narration": s6_narration,
            })
        return scenes

    def _build_science_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates visual science explanation scenes with duration scaling."""
        if target_sec >= 120:
            s1_narration = (
                f"Welcome to our scientific investigation into {topic}. "
                "Living systems and physical processes capture energy from their environment and convert it into stable, useful forms. "
                "To understand how these transformations function, we must track the flow of energy and matter across microscopic structures. "
                "Today we will follow each stage of this essential biological mechanism to see how nature sustains life on our planet."
            )
            s2_narration = (
                "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                "This excitation energy drives the splitting of water molecules through photolysis, releasing breathable oxygen into the atmosphere. "
                "Simultaneously, ATP and NADPH transfer chemical energy directly to the stroma, where carbon dioxide is fixed into energy-rich glucose. "
                "Every molecular component plays a specialized role in this highly synchronized biochemical dance."
            )
            s3_narration = (
                "From a chemical perspective, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                "Every single atom of carbon, hydrogen, and oxygen is conserved throughout this transformation, illustrating the law of conservation of mass. "
                "The synthesized glucose supplies vital metabolic energy not only to the plant itself, but to the entire ecological food chain. "
                "Without this continuous energetic conversion, complex life as we know it could not exist."
            )
        else:
            s1_narration = (
                f"Welcome to our scientific investigation into {topic}. "
                "Living systems capture energy from their environment and convert it into stable chemical bonds. "
                "Today we will track how molecules interact across microscopic boundaries to sustain life on Earth."
            )
            s2_narration = (
                "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                "This excitation energy drives the splitting of water molecules, releasing oxygen into the atmosphere. "
                "Simultaneously, ATP and NADPH transfer chemical energy to the stroma, where carbon dioxide is fixed into glucose."
            )
            s3_narration = (
                "Chemically, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                "Every single atom is conserved throughout this transformation, illustrating the law of conservation of mass. "
                "The synthesized glucose supplies energy not only to the plant, but to the entire ecological food chain."
            )

        scenes = [
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
                "narration": s1_narration,
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
                "narration": s2_narration,
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
                "narration": s3_narration,
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
                    "On a global scale, photosynthetic organisms act as our planet's primary carbon sink and biological engine. "
                    "By drawing billions of tons of carbon dioxide from the atmosphere every year, forests, grasslands, and marine phytoplankton stabilize the global climate. "
                    "This interconnected cycle continuously replenishes the atmospheric oxygen required for aerobic respiration by animals and humans. "
                    "Protecting these delicate plant ecosystems is fundamental to preserving life, biodiversity, and planetary balance."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Energy Transfer & Trophic Levels",
                "diagram_type": "flowchart",
                "items": [
                    "Solar Radiation Intake",
                    "Primary Producers (Plants)",
                    "Herbivore Consumers",
                    "Apex Predators & Decomposers",
                ],
                "layout": "horizontal",
                "narration": (
                    "The chemical energy captured by plants does not stay isolated within plant tissues; it fuels the entire food web. "
                    "Primary consumers such as herbivores ingest plant biomass to obtain carbohydrates, proteins, and cellular energy. "
                    "Secondary and tertiary predators subsequently consume herbivores, transferring a fraction of that original solar energy up each trophic level. "
                    "Eventually, decomposers break down organic matter and return essential mineral nutrients to the soil, completing a sustainable thermodynamic cycle."
                ),
            })
        if target_sec >= 240:
            s6_narration = (
                f"To summarize our investigation into {topic}, always keep these four scientific pillars in mind. "
                "First, observe the initial inputs of radiant solar energy, water, and atmospheric carbon dioxide. "
                "Second, trace the biochemical pathways where photon absorption splits water and powers the Calvin Cycle. "
                "Third, verify the atomic conservation that yields glucose and breathable oxygen in precise stoichiometry. "
                "Finally, recognize how this continuous energetic loop underpins global climate regulation and food webs worldwide."
            ) if target_sec < 300 else (
                f"To conclude our comprehensive masterclass on {topic}, let us integrate the cellular, chemical, and planetary dimensions. "
                "At the cellular scale, chloroplast thylakoids harvest photons and convert radiant energy into ATP and NADPH. "
                "At the chemical scale, stromal enzymes fix carbon dioxide into glucose while strictly conserving every atom of matter. "
                "At the ecological scale, primary producers generate the biomass and oxygen that support terrestrial and marine ecosystems. "
                "Understanding these interlocking mechanisms gives us deep insight into how energy flows through the biosphere and equips us to protect planetary equilibrium."
            )
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Scientific Synthesis & Planetary Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Input Molecule Capture",
                    "Biochemical Energy Transformation",
                    "Stoichiometric Conservation",
                    "Biosphere Equilibrium",
                ],
                "layout": "horizontal",
                "narration": s6_narration,
            })
        return scenes

    def _build_programming_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates code walkthrough scenes ONLY when explicitly requested."""
        if target_sec >= 120:
            s1_narration = (
                f"Welcome to our coding walkthrough on {topic}. "
                "In software engineering, writing clean, reliable, and predictable code requires understanding how the interpreter evaluates statements line by line. "
                "Rather than memorizing syntax rules in isolation, we focus on mental models of program state, memory allocation, and control flow. "
                "In this lesson, we will inspect real source code and observe how data structures mutate during execution."
            )
            s2_narration = (
                "Here we define a processing function that accepts a collection of values and iterates through them. "
                "During each cycle of the for loop, the loop variable binds sequentially to the next element in the list. "
                "Line five computes the doubled value and appends it to the newly initialized result array. "
                "Once the collection is fully traversed, the function returns the completed list, outputting two, four, and six to the console."
            )
            s3_narration = (
                "Inside the computer's memory, invoking a function allocates a fresh stack frame with dedicated local scope. "
                "Each iteration advances the iterator cursor, modifying local variables without corrupting the surrounding program state. "
                "Once the loop finishes its work, the return value passes back to the caller and the frame is garbage-collected cleanly. "
                "Understanding this execution lifecycle prevents common scope leaks and variable shadowing bugs."
            )
        else:
            s1_narration = (
                f"Welcome to our coding walkthrough on {topic}. "
                "In software development, writing clean code requires understanding how the interpreter evaluates statements line by line. "
                "Let us inspect the live syntax and observe how variables mutate in memory."
            )
            s2_narration = (
                "Here we define a processing function that accepts a collection of values. "
                "During each cycle of the for loop, the loop variable binds to the next sequential element. "
                "Line five transforms the element and appends it to the result array before the final call outputs the doubled list."
            )
            s3_narration = (
                "In the computer memory, calling a function creates a fresh stack frame with dedicated local scope. "
                "Each iteration advances the iterator cursor until the collection is exhausted. "
                "Once the loop terminates, the returned object passes back to the caller and the frame releases cleanly."
            )

        scenes = [
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
                "narration": s1_narration,
            },
            {
                "id": "scene_02",
                "type": "code_walkthrough",
                "heading": "Step 1: Code Implementation & Syntax",
                "code": "# Python implementation\ndef process_items(items):\n    result = []\n    for item in items:\n        result.append(item * 2)\n    return result\n\nprint(process_items([1, 2, 3]))",
                "code_language": "python",
                "highlight_lines": [4, 5, 8],
                "expected_output": "[2, 4, 6]",
                "narration": s2_narration,
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
                "narration": s3_narration,
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
                    "Robust production code always guards against edge cases such as empty input collections or unexpected null pointers. "
                    "By verifying collection presence upfront with a defensive guard clause, we prevent unnecessary computation and avoid runtime exceptions. "
                    "Furthermore, utilizing list comprehensions provides an idiomatic and optimized construct that evaluates in native bytecode. "
                    "Notice how returning an empty list preserves type consistency for all downstream callers."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Step 4: Algorithmic Complexity & Profiling",
                "diagram_type": "flowchart",
                "items": [
                    "Time Complexity: O(n) Linear Scan",
                    "Space Complexity: O(n) Heap Allocation",
                    "Iterator Optimization (Generators)",
                    "Cache Locality & Throughput",
                ],
                "layout": "horizontal",
                "narration": (
                    "When analyzing code efficiency, we evaluate both time and space complexity using Big-O notation. "
                    "Traversing an array of size n requires linear time O(n) because each element must be visited once. "
                    "Creating a new list also demands linear space O(n) on the memory heap. "
                    "For massive datasets containing millions of records, converting to generator expressions enables streaming data with constant O(1) auxiliary memory."
                ),
            })
        if target_sec >= 240:
            s6_narration = (
                f"To build resilient software around {topic}, adhere to these core development principles. "
                "First, define clear functional boundaries and validate input parameters before execution. "
                "Second, keep loop bodies modular and avoid unnecessary mutable state. "
                "Third, write comprehensive unit tests covering edge cases, empty datasets, and boundary values. "
                "By writing readable code and thinking about runtime complexity, you create maintainable systems that scale seamlessly."
            ) if target_sec < 300 else (
                f"To master professional software engineering with {topic}, let us review the end-to-end best practices. "
                "Begin by modeling your data flow clearly and verifying preconditions with guard clauses. "
                "Prefer idiomatic constructs such as list comprehensions or iterators that optimize bytecode execution and memory usage. "
                "Always profile time and space complexity so your algorithms scale gracefully under production load. "
                "Finally, accompany every critical function with deterministic unit tests and clear type annotations to ensure long-term codebase health."
            )
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Step 5: Architectural Best Practices",
                "diagram_type": "flowchart",
                "items": [
                    "Defensive Guard Clauses",
                    "Idiomatic Bytecode Constructs",
                    "Algorithmic Complexity Profiling",
                    "Deterministic Test Verification",
                ],
                "layout": "horizontal",
                "narration": s6_narration,
            })
        return scenes

    def _build_social_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates humanities and social studies visual scenes with duration scaling."""
        if target_sec >= 120:
            s1_narration = (
                f"Welcome to our social studies exploration of {topic}. "
                "Human civilizations have always organized themselves through evolving geographic networks, commercial trade routes, and systems of governance. "
                "To understand why modern nations function as they do, we must examine the historical origins of cooperation, trade, and legal structures. "
                "Today we analyze how these foundational frameworks emerged and why they continue to shape contemporary society."
            )
            s2_narration = (
                "Geographic access to navigable waterways, fertile agricultural valleys, and natural harbors historically determined where civilizations flourished. "
                "As agricultural surpluses grew, communities were freed from subsistence farming and developed specialized crafts, engineering, and commerce. "
                "These expanding trade networks linked distant continents, exchanging not only tangible goods like spices and silk, but also ideas, alphabets, and scientific innovations."
            )
            s3_narration = (
                "As societies expanded in size and economic complexity, informal customs evolved into formal written legal codes and public institutions. "
                "Codified laws established clear civic rights, protected property, and created accountable judicial mechanisms to resolve disputes peacefully. "
                "These institutional safeguards fostered mutual trust, allowing cities to thrive as centers of governance, education, and cultural exchange."
            )
        else:
            s1_narration = (
                f"Welcome to our social studies exploration of {topic}. "
                "Human societies organize themselves through evolving geographic networks, economic trade routes, and systems of governance. "
                "Today we analyze how these foundational structures emerged and why they remain central to our world."
            )
            s2_narration = (
                "Geographic access to navigable waterways and fertile river valleys historically determined where human communities flourished. "
                "As surplus agricultural production developed, specialized trade networks connected distant cultures. "
                "These interactions necessitated written legal codes and cooperative civic governance."
            )
            s3_narration = (
                "The endurance of democratic institutions relies upon institutional transparency and active citizen participation. "
                "When rights are codified in law and authority remains accountable to the public, communities establish enduring social stability. "
                "Understanding these historical principles equips us to participate thoughtfully in contemporary civic life."
            )

        scenes = [
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
                "narration": s1_narration,
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
                "narration": s2_narration,
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
                "narration": s3_narration,
            },
        ]

        if target_sec >= 120:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Economic Systems & Market Exchange",
                "diagram_type": "flowchart",
                "items": [
                    "Resource Scarcity & Division of Labor",
                    "Currency Systems & Capital Flow",
                    "Regulatory Standards & Contracts",
                    "Global Trade Integration",
                ],
                "layout": "horizontal",
                "narration": (
                    "Economic prosperity requires stable systems of currency, clear property rights, and reliable enforcement of contractual agreements. "
                    "When merchants and citizens can trade with confidence that rules will be applied fairly, domestic and international investment expands rapidly. "
                    "Throughout history, nations that championed transparent market frameworks and protected individual enterprise experienced enduring cultural and economic flourishing."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Cultural Exchange & Societal Evolution",
                "diagram_type": "flowchart",
                "items": [
                    "Migration & Cross-Cultural Contact",
                    "Technological & Scientific Diffusion",
                    "Philosophical & Legal Adaptations",
                    "Modern Pluralistic Societies",
                ],
                "layout": "horizontal",
                "narration": (
                    "Beyond material goods, trade routes and global networks served as vital conduits for cross-cultural diffusion and shared human knowledge. "
                    "Mathematical concepts from ancient India and the Islamic Golden Age traveled across Europe, catalyzing the Renaissance and the Scientific Revolution. "
                    "Understanding these dynamic cross-cultural exchanges helps us appreciate how interconnected our modern global civilization truly is."
                ),
            })
        if target_sec >= 240:
            s6_narration = (
                f"To summarize our study of {topic}, keep these foundational principles in mind. "
                "First, observe how physical geography shapes the initial settlement and economic specialization of communities. "
                "Second, recognize that enduring stability requires codified laws, transparent governance, and active civic participation. "
                "Third, reflect on how historical trade and cultural exchange formed the modern interconnected world. "
                "These timeless lessons empower us to engage as informed, responsible citizens in an evolving global society."
            ) if target_sec < 300 else (
                f"To conclude our comprehensive study of {topic}, let us reflect on the enduring trajectory of human social organization. "
                "From river valley settlements to global digital trade, societies prosper when they balance geographic stewardship with fair economic exchange. "
                "Institutional transparency, the rule of law, and active civic responsibility form the bedrock of sustainable peace and human rights. "
                "By studying how past generations navigated crises and integrated new ideas, we gain the foresight needed to build a just, resilient future."
            )
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Civic Synthesis & Modern Perspectives",
                "diagram_type": "flowchart",
                "items": [
                    "Geographic Foundations",
                    "Institutional Transparency",
                    "Cross-Cultural Diffusion",
                    "Active Civic Responsibility",
                ],
                "layout": "horizontal",
                "narration": s6_narration,
            })
        return scenes

    def _build_general_scenes(self, topic: str, level: str, target_sec: int) -> list:
        """Generates standard conceptual explanation scenes (NO code scenes)."""
        if target_sec >= 120:
            s1_narration = (
                f"Welcome to this comprehensive lesson exploring {topic}. "
                "To build a clear and durable mental model of any subject, we begin by identifying the core components and analyzing how they interact. "
                "Rather than getting overwhelmed by isolated details, our goal is to grasp the overarching principles that guide the entire domain. "
                "In this visual walkthrough, we will break down the essential concepts step by step so you can apply them with confidence."
            )
            s2_narration = (
                "Every functional system consists of coordinated components that interact according to defined, predictable principles. "
                "When initial inputs enter the system, they undergo deliberate transformation before producing meaningful and observable outcomes. "
                "Observing these causal links clarifies why the system responds consistently under varying external conditions. "
                "Recognizing these fundamental relationships makes it easy to diagnose challenges and optimize overall performance."
            )
            s3_narration = (
                "By applying this structured framework to real-world scenarios, we turn passive information into actionable practical expertise. "
                "Always verify whether the core invariants and guiding rules hold true from the initial setup to the final evaluation. "
                "When each individual step is grounded in solid reasoning, you achieve consistent, high-quality results across diverse applications."
            )
        else:
            s1_narration = (
                f"Welcome to this lesson exploring {topic}. "
                "To build a clear mental model of any complex subject, we start by isolating the primary components and identifying how they connect. "
                "Let us examine the foundational framework step by step."
            )
            s2_narration = (
                "Every functional system consists of coordinated components that interact through defined rules. "
                "When inputs enter the process, they undergo deliberate transformation before producing observable results. "
                "Observing these causal links clarifies why the system behaves predictably under changing conditions."
            )
            s3_narration = (
                "By applying this conceptual framework to practical problems, we transform passive knowledge into actionable understanding. "
                "Always check whether the fundamental invariants hold true from beginning to end. "
                "With these core principles in place, you are ready to explore deeper nuances with confidence."
            )

        scenes = [
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
                "narration": s1_narration,
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
                "narration": s2_narration,
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
                "narration": s3_narration,
            },
        ]

        if target_sec >= 120:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Step 3: Worked Case Study & Decision Logic",
                "diagram_type": "flowchart",
                "items": [
                    "Define Problem Context",
                    "Evaluate Alternative Paths",
                    "Execute Optimal Strategy",
                    "Measure Empirical Success",
                ],
                "layout": "horizontal",
                "narration": (
                    "Now let us examine a concrete case study to see how these conceptual models resolve real-world dilemmas. "
                    "By methodically weighing trade-offs and evaluating alternative paths against our guiding invariants, we identify the optimal strategy. "
                    "Executing this chosen approach and verifying empirical outcomes validates our initial assumptions. "
                    "This evidence-based decision cycle ensures continuous learning and prevents costly missteps."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Step 4: Systems Thinking & Feedback Loops",
                "diagram_type": "flowchart",
                "items": [
                    "Input Variations",
                    "Amplifying & Balancing Loops",
                    "Systemic Bottlenecks",
                    "Long-Term Equilibrium",
                ],
                "layout": "horizontal",
                "narration": (
                    "In any complex environment, components do not operate in total isolation; they participate in dynamic feedback loops. "
                    "Balancing feedback loops maintain system stability, while amplifying feedback loops accelerate growth or decline. "
                    "Understanding these system dynamics allows you to anticipate unintended consequences and locate high-leverage intervention points. "
                    "Mastering systems thinking enables you to solve root causes rather than merely treating surface-level symptoms."
                ),
            })
        if target_sec >= 240:
            s6_narration = (
                f"To conclude our study of {topic}, let us summarize the four essential principles for practical mastery. "
                "First, define the problem domain clearly and identify the key components and causal links. "
                "Second, rely on verifiable invariants rather than speculative assumptions. "
                "Third, test ideas through iterative execution and monitor feedback loops. "
                "Finally, synthesize your findings into actionable heuristics that guide future decision making with precision."
            ) if target_sec < 300 else (
                f"To conclude our comprehensive masterclass on {topic}, let us review the overarching strategic principles. "
                "True expertise arises when you can translate abstract theories into structured, repeatable mental models. "
                "By breaking complex systems into fundamental components, understanding feedback dynamics, and verifying core invariants, you master any domain. "
                "Continually test your mental models against real-world evidence, adapt to new data, and cultivate a disciplined mindset for lifelong learning."
            )
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Step 5: Master Review & Strategic Heuristics",
                "diagram_type": "flowchart",
                "items": [
                    "Domain Clarification",
                    "Invariant Grounding",
                    "Empirical Validation",
                    "Actionable Heuristics",
                ],
                "layout": "horizontal",
                "narration": s6_narration,
            })
        return scenes

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
