"""
Deterministic Mock Lesson Planner for Blu Visual Teacher.
Status: Person 1 Owned.

Provides deterministic curriculum lesson generation when Ollama or offline
models are unreachable. Supports instructional modes (math, science, programming,
social studies, general) with local SQLite FTS5 evidence grounding, authoritative
topic preservation, and verified structured quiz questions.
Dynamically scales narration depth and scene count to match the requested target duration (60s, 120s, 180s, 240s, 300s).
"""

from typing import Any, Optional, Tuple, List, Dict
import re
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan, EvidenceSource, QuizQuestion
from backend.app.services.planner.instructional_modes import detect_instructional_mode
from backend.app.services.knowledge.offline_knowledge import get_knowledge_base


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
        Plans a lesson according to the detected instructional mode and topic.
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

        # Retrieve grounded evidence from local SQLite FTS5 store
        kb = get_knowledge_base()
        passages = kb.search(topic_clean, limit=4)
        evidence_sources = [
            EvidenceSource(
                source_name=p.source_name,
                page_number=p.page_number,
                excerpt=p.excerpt,
                verified=p.verified,
            )
            for p in passages
        ]

        if mode == "math":
            scenes, quiz_questions = self._build_math_scenes(topic_clean, level, target_sec, evidence_sources)
        elif mode == "science":
            scenes, quiz_questions = self._build_science_scenes(topic_clean, level, target_sec, evidence_sources)
        elif mode == "programming":
            scenes, quiz_questions = self._build_programming_scenes(topic_clean, level, target_sec, evidence_sources)
        elif mode == "social_studies":
            scenes, quiz_questions = self._build_social_scenes(topic_clean, level, target_sec, evidence_sources)
        else:
            scenes, quiz_questions = self._build_general_scenes(topic_clean, level, target_sec, evidence_sources)

        scenes = self._calibrate_scenes_for_duration(scenes, target_sec)

        revision_questions = [
            {"question": q.question, "answer": q.options[q.correct_index]}
            for q in quiz_questions
        ]

        lesson_data = {
            "schema_version": "1.0.0",
            "title": f"Understanding {topic_clean}",
            "topic": topic_clean,
            "level": level if level in ["beginner", "intermediate"] else "beginner",
            "language": language,
            "target_duration_seconds": target_sec,
            "scenes": scenes,
            "evidence_sources": evidence_sources,
            "quiz_questions": quiz_questions,
            "revision_questions": revision_questions,
        }

        try:
            validated_plan = LessonPlan.model_validate(lesson_data)
            return validated_plan, False
        except ValidationError as err:
            return self.get_fallback_lesson(topic_clean, target_duration_seconds=target_sec), True

    def _calibrate_scenes_for_duration(self, scenes: list, target_sec: int) -> list:
        """Calibrates scene count and narration word bounds for all target presets."""
        if target_sec <= 30:
            target_count = 3
            target_words = 18
            max_words = 24
            min_words = 15
        elif target_sec <= 45:
            target_count = 3
            target_words = 29
            max_words = 34
            min_words = 24
        elif target_sec <= 60:
            target_count = 3
            target_words = 42
            max_words = 48
            min_words = 36
        elif target_sec <= 90:
            target_count = 4
            target_words = 48
            max_words = 54
            min_words = 42
        elif target_sec <= 120:
            target_count = 4
            target_words = 68
            max_words = 74
            min_words = 64
        elif target_sec <= 180:
            target_count = 5
            target_words = 80
            max_words = 85
            min_words = 77
        else:  # 240s+
            target_count = 6
            target_words = 88
            max_words = 94
            min_words = 84

        target_scenes = scenes[:target_count]
        calibrated = []

        for idx, s in enumerate(target_scenes):
            s_copy = dict(s)
            text = s_copy.get("narration", "")
            words = text.split()

            # Trimming if exceeding max_words
            if len(words) > max_words + 2:
                sentences = re.split(r'(?<=[.!?])\s+', text)
                kept = []
                cnt = 0
                for sent in sentences:
                    w_cnt = len(sent.split())
                    if cnt + w_cnt <= max_words + 3 or not kept:
                        kept.append(sent)
                        cnt += w_cnt
                    elif cnt < min_words:
                        kept.append(sent)
                        cnt += w_cnt
                        break
                    else:
                        break
                text = " ".join(kept)
                words = text.split()

            # Expansion if below min_words (only for presets >= 60s)
            if target_sec >= 60 and len(words) < min_words:
                heading = s_copy.get("heading", "this core principle")
                pool = [
                    f"Examining {heading} with precision highlights how these fundamental elements maintain structural balance.",
                    "Tracking each stage methodically allows us to connect core definitions directly to observable outcomes.",
                    "This systematic progression reinforces lasting conceptual retention and reliable problem-solving clarity.",
                    "By verifying every intermediate step, we ensure complete alignment with established principles.",
                ]
                for sentence in pool:
                    if len(words) >= target_words - 2:
                        break
                    text = f"{text.rstrip('.')}! {sentence}" if not text.endswith(('.', '!', '?')) else f"{text} {sentence}"
                    words = text.split()

                if len(words) > max_words + 3:
                    sentences = re.split(r'(?<=[.!?])\s+', text)
                    if len(sentences) > 1:
                        trimmed = " ".join(sentences[:-1])
                        if len(trimmed.split()) >= min_words - 3:
                            text = trimmed

            s_copy["narration"] = text
            calibrated.append(s_copy)

        return calibrated

    def _build_math_scenes(self, topic: str, level: str, target_sec: int, evidence: List[EvidenceSource]) -> Tuple[list, List[QuizQuestion]]:
        """Generates pure visual mathematical scenes (NO code scenes by default)."""
        t_low = topic.lower()
        is_pythagoras = any(k in t_low for k in ["pythagor", "hypotenuse", "right triangle", "a^2 + b^2", "a² + b²"])
        is_ratio = any(k in t_low for k in ["ratio", "proportion", "अनुपात", "समानुपात"])

        if is_pythagoras:
            return self._build_pythagoras_scenes(topic, level, target_sec)
        elif is_ratio:
            return self._build_ratio_scenes(topic, level, target_sec)
        else:
            return self._build_arbitrary_math_scenes(topic, level, target_sec)

    def _build_pythagoras_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Generates geometric and algebraic Pythagorean theorem scenes with area proofs."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our geometry masterclass on {topic}. "
                "In Euclidean geometry, right-angled triangles form the indispensable bridge between geometric space and algebraic calculation. "
                "The side directly opposite the ninety-degree right angle is universally designated as the hypotenuse, representing the longest side. "
                "The other two perpendicular boundaries are known as legs, commonly labeled 'a' and 'b'. "
                "By exploring this timeless geometric relationship, you will unlock fundamental tools used in physics, navigation, architecture, and computer graphics."
            )
            s2 = (
                "The Pythagorean Theorem establishes that the square of the hypotenuse equals the sum of the squares of the legs: a² + b² = c². "
                "Geometrically, if we construct physical squares extending outward from all three edges of the triangle, "
                "the combined surface area of the squares on legs 'a' and 'b' perfectly equals the surface area of the large square on hypotenuse 'c'. "
                "This remarkable visual invariance guarantees that no matter how we orient the triangle, area equivalence is strictly preserved."
            )
            s3 = (
                "Let us demonstrate this with the celebrated three-four-five primitive Pythagorean triple. "
                "With perpendicular legs measuring three and four units, we square each term: three squared equals nine, and four squared equals sixteen. "
                "Summing the two areas yields twenty-five square units. Extracting the principal square root reveals a hypotenuse of exactly five units. "
                "Similarly, doubling these dimensions produces the proportional triple six, eight, ten, proving how scaling preserves theorem equality."
            )
        elif target_sec >= 240:
            s1 = (
                f"Welcome to our comprehensive geometry masterclass exploring {topic}. "
                "In classical Euclidean geometry, right-angled triangles form the foundational bridge connecting physical spatial forms to rigorous algebraic calculation. "
                "The longest side positioned directly opposite the ninety-degree right angle is universally designated as the hypotenuse, labeled 'c', "
                "while the two perpendicular adjacent sides forming the right angle are known as legs, traditionally labeled 'a' and 'b'. "
                "This geometric structure provides the essential framework underpinning surveying, architecture, and navigation."
            )
            s2 = (
                "The Pythagorean Theorem establishes that in every right-angled triangle, the square of the hypotenuse equals the sum of the squares of the two perpendicular legs: a² + b² = c². "
                "Geometrically, if a physical square is constructed extending outward upon each of the triangle's three boundary edges, "
                "the surface area of the square resting on hypotenuse 'c' exactly balances the combined surface areas of the squares resting on legs 'a' and 'b'. "
                "This area conservation holds true across all planar Euclidean coordinates, regardless of orientation or scale."
            )
            s3 = (
                "Let us examine a worked numerical demonstration using perpendicular legs measuring three and four units. "
                "First, square each leg length: three squared equals nine, and four squared equals sixteen. "
                "Next, compute their sum: nine plus sixteen yields twenty-five square units. "
                "Finally, extracting the principal square root of twenty-five yields a hypotenuse of exactly five units, establishing the three-four-five integer Pythagorean triple. "
                "Doubling both legs to six and eight units produces a hypotenuse of ten, proving that proportional scaling strictly preserves geometric equality."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our geometry masterclass on {topic}. "
                "In Euclidean geometry, right-angled triangles connect spatial forms to algebraic calculation. "
                "The side directly opposite the ninety-degree right angle is the hypotenuse, the longest side of the triangle. "
                "The two perpendicular sides are called legs, labeled 'a' and 'b'. "
                "Today we explore how this relationship underpins navigation, architectural engineering, and coordinate mathematics."
            )
            s2 = (
                "The Pythagorean Theorem states that the square of the hypotenuse equals the sum of the squares of the other two sides: a² + b² = c². "
                "Geometrically, if a square is constructed on each side of the right triangle, "
                "the area of the square on hypotenuse 'c' exactly equals the sum of the areas of the squares on legs 'a' and 'b'. "
                "This area invariance provides an intuitive visual proof of the theorem."
            )
            s3 = (
                "Consider a worked example with perpendicular legs of three and four units. "
                "First, square both leg lengths: three squared is nine, and four squared is sixteen. "
                "Next, add the two squares together: nine plus sixteen equals twenty-five. "
                "Finally, taking the square root of twenty-five yields a hypotenuse of exactly five units, forming the famous three-four-five integer triple."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our geometry masterclass on {topic}. "
                "In Euclidean geometry, a right-angled triangle contains one angle measuring exactly ninety degrees. "
                "The longest side directly opposite this right angle is called the hypotenuse, while the other two sides are called legs. "
                "This fundamental shape allows us to calculate distances and angles across science, architecture, and navigation."
            )
            s2 = (
                "The Pythagorean Theorem establishes that in any right triangle, a² + b² = c², where 'c' is the hypotenuse. "
                "Visually, the area of a square built on hypotenuse 'c' exactly balances the combined areas of the squares built on legs 'a' and 'b'. "
                "This geometric area equivalence holds true across all Euclidean coordinate planes."
            )
            s3 = (
                "Let us solve a worked numerical example with legs of length three and four. "
                "Squaring three gives nine, and squaring four gives sixteen. Adding nine and sixteen yields twenty-five. "
                "Taking the square root of twenty-five gives a hypotenuse of five. "
                "If we scale the legs to six and eight, thirty-six plus sixty-four equals one hundred, yielding a hypotenuse of ten."
            )
        else:
            s1 = (
                f"Welcome to our lesson exploring {topic}. "
                "In a right triangle, the longest side opposite the ninety-degree right angle is called the hypotenuse. "
                "The Pythagorean Theorem states that the square of the hypotenuse equals the sum of the squares of the other two legs."
            )
            s2 = (
                "Algebraically, this is written as a² + b² = c². "
                "If we construct squares on each side, the area of the hypotenuse square matches the sum of the areas of the leg squares. "
                "For legs three and four, nine plus sixteen equals twenty-five, whose square root gives a hypotenuse of five."
            )
            s3 = (
                "To find an unknown hypotenuse, square both leg lengths, add them together, and calculate the square root. "
                "This universal formula powers modern coordinate geometry, GPS navigation, and architectural surveying."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Introduction to {topic}",
                "subtitle": f"Right triangles and the hypotenuse for {level} students",
                "key_points": [
                    "Right-angled triangle anatomy (Legs 'a', 'b', and Hypotenuse 'c')",
                    "Fundamental equation: a² + b² = c²",
                    "Geometric interpretation as area equivalence of squares",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Geometric Proof: Square Area Equivalence",
                "diagram_type": "proportion_table",
                "proportion_table": {
                    "headers": ["Triangle Side", "Length", "Square Area"],
                    "rows": [
                        {"values": [1.0, 3.0, 9.0]},
                        {"values": [2.0, 4.0, 16.0]},
                        {"values": [3.0, 5.0, 25.0]},
                    ],
                    "scale_factor_label": "Area Invariant: a² + b² = 9 + 16 = 25 = c²",
                },
                "items": [
                    "Identify Right Angle (90°)",
                    "Leg a Square Area (a²)",
                    "Leg b Square Area (b²)",
                    "Hypotenuse Square Area (c²)",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Worked Demonstration: Solving Unknown Hypotenuse",
                "diagram_type": "number_line",
                "number_line": {
                    "min_val": 0.0,
                    "max_val": 30.0,
                    "step": 5.0,
                    "marked_points": [
                        {"val": 9.0, "label": "a² (9)", "color": "#234E3C"},
                        {"val": 16.0, "label": "b² (16)", "color": "#1B4332"},
                        {"val": 25.0, "label": "c² (25)", "color": "#F59E0B"},
                    ],
                },
                "items": [
                    "Square Leg a (3² = 9)",
                    "Square Leg b (4² = 16)",
                    "Sum Areas (9 + 16 = 25)",
                    "Extract Square Root (√25 = 5)",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Coordinate Geometry & Distance Formula",
                "diagram_type": "flowchart",
                "items": [
                    "Horizontal Distance (Δx = x₂ - x₁)",
                    "Vertical Distance (Δy = y₂ - y₁)",
                    "Sum of Squares (Δx² + Δy²)",
                    "Euclidean Distance (d = √(Δx² + Δy²))",
                ],
                "layout": "horizontal",
                "narration": (
                    "In Cartesian coordinate geometry, the Pythagorean Theorem directly yields the Euclidean distance formula. "
                    "To find the straight-line distance between any two coordinate points, we calculate the horizontal change delta x and vertical change delta y. "
                    "These two perpendicular offsets form the legs of an imaginary right triangle. "
                    "Taking the square root of delta x squared plus delta y squared gives the exact straight-line distance separating the two locations."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Primitive Pythagorean Triples & Scaling",
                "diagram_type": "flowchart",
                "items": [
                    "Base Triple (3, 4, 5)",
                    "Double Scale (6, 8, 10)",
                    "Triple Scale (9, 12, 15)",
                    "Other Integer Primitives (5, 12, 13)",
                ],
                "layout": "horizontal",
                "narration": (
                    "A set of three positive integers that perfectly satisfy the algebraic relation a² plus b² equals c² is formally defined as a Pythagorean triple. "
                    "When the three positive integers share no common divisor other than one, such as three, four, and five, they constitute a primitive Pythagorean triple. "
                    "Multiplying a primitive triple by any positive scalar integer generates another geometrically similar right triangle with identical interior angle proportions. "
                    "Surveyors, architectural builders, and civil engineers rely on these exact integer proportions on construction job sites to lay out flawless ninety-degree foundation corners without electronic optical instruments."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Geometric Synthesis & Practical Mastery",
                "diagram_type": "flowchart",
                "items": [
                    "Confirm Right Angle (90°)",
                    "Isolate Target Variable",
                    "Compute Squares & Sum",
                    "Extract Principal Square Root",
                ],
                "layout": "horizontal",
                "narration": (
                    "To consolidate your lasting geometric mastery of the Pythagorean theorem across all mathematics and physics studies, always execute this four-step procedure with precision. "
                    "First, inspect the geometric figure carefully to verify that the triangle possesses a genuine ninety-degree perpendicular right angle. "
                    "Second, clearly identify whether you are solving for the unknown hypotenuse 'c' or isolating one of the shorter perpendicular legs 'a' or 'b'. "
                    "Third, substitute given numerical values into the governing area equation and square the known dimensions sequentially. "
                    "Finally, isolate the target variable and calculate the principal square root, remembering that physical Euclidean distances represent strictly positive magnitudes."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="In the Pythagorean theorem (a² + b² = c²), what does 'c' represent?",
                options=[
                    "The hypotenuse opposite the right angle",
                    "The shortest perpendicular leg",
                    "The perimeter of the triangle",
                    "The total interior angle sum",
                ],
                correct_index=0,
                explanation="In any right-angled triangle, 'c' designates the hypotenuse, which is the longest side directly opposite the 90-degree right angle.",
                hint="It is the longest side opposite the 90-degree angle.",
                concept_reference="Hypotenuse Definition",
            ),
            QuizQuestion(
                question="If a right triangle has perpendicular legs of lengths 3 and 4, what is the length of its hypotenuse?",
                options=["5", "7", "12", "25"],
                correct_index=0,
                explanation="3² + 4² = 9 + 16 = 25. The principal square root of 25 is 5, forming the standard (3, 4, 5) Pythagorean triple.",
                hint="Calculate 3 squared plus 4 squared, then take the square root of the sum.",
                concept_reference="Pythagorean Triple Calculation",
            ),
        ]
        return scenes, quizzes

    def _build_ratio_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Preserves ratio & proportion scenes with calibrated timing."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our comprehensive mathematics masterclass exploring {topic}. "
                "In fundamental mathematics, a ratio is an intuitive yet immensely powerful conceptual tool for comparing two or more quantities through division. "
                "It tells us precisely how much of one element exists relative to another, without altering or distorting the underlying systemic balance. "
                "When two separate ratios maintain the exact same mathematical relationship across scaling, we establish an enduring, rigorous, and verifiable proportion. "
                "Throughout this masterclass, we will see how proportions maintain structural equilibrium in culinary recipes, architectural blueprints, financial modeling, chemical solutions, and advanced scientific calculations. "
                "By understanding the deep geometric relationship between individual parts and the complete whole, you will master the analytical tools to solve complex quantitative scaling challenges with complete confidence and precision."
            )
            s2 = (
                "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar model. "
                "Imagine preparing a chef's delicate recipe or mixing vibrant artist pigment where you take three parts of rich cobalt pigment and four parts of terracotta base. "
                "Across all seven total equal units in the entire system, Quantity A occupies exactly three-sevenths, while Quantity B occupies four-sevenths. "
                "Notice that the ratio directly compares the two individual quantities to each other, while also relating each distinct component back to the complete whole. "
                "This invariant relationship remains perfectly constant even when scaling the physical quantities up or down to any industrial magnitude, guaranteeing consistent quality."
            )
            s3 = (
                "A proportion formally asserts that two separate ratios are completely equal in quantitative value. "
                "When we multiply both quantities by the same non-zero scaling factor, the core proportional balance remains completely invariant. "
                "As demonstrated in our scaling table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                "Engineers, financial analysts, cartographers, physicists, and industrial chemists rely on this constant scale factor every single day to scale physical blueprints and economic projections with precision. "
                "No matter how large the numeric values grow, their internal structural proportion remains identical and perfectly balanced."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our mathematics masterclass exploring {topic}. "
                "In fundamental mathematics, a ratio is an intuitive yet powerful tool for comparing two or more quantities through division. "
                "It tells us precisely how much of one element exists relative to another, without altering the underlying balance. "
                "When two ratios maintain the exact same mathematical relationship across scaling, we establish a proportion. "
                "Throughout this lesson, we will see how proportions maintain balance in everyday recipes, architectural models, and scientific calculations."
            )
            s2 = (
                "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar. "
                "Imagine preparing a chef's recipe or mixing vibrant artist pigment where you take three parts of rich blue pigment and four parts of base. "
                "Across all seven total units in the system, Quantity A occupies exactly three-sevenths, while Quantity B occupies four-sevenths. "
                "Notice that the ratio directly compares the two distinct quantities to each other, while also relating each component back to the complete whole. "
                "This invariant relationship remains perfectly constant even when scaling up."
            )
            s3 = (
                "A proportion formally asserts that two separate ratios are completely equal in value. "
                "When we multiply both quantities by the same non-zero scaling factor, the core proportional balance remains completely invariant. "
                "As shown in our scaling table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                "Engineers, financial analysts, and cartographers rely on this constant scale factor every day to scale blueprints and economic projections with precision."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our mathematics masterclass exploring {topic}. "
                "In mathematics, a ratio is an intuitive and foundational tool for comparing two or more quantities through division to show their relative sizes. "
                "When two distinct ratios maintain the exact same mathematical relationship across scaling, we define them as proportional. "
                "Throughout this lesson, we will see how proportions maintain structural balance in everyday culinary recipes, architectural models, and scientific calculations."
            )
            s2 = (
                "Let us visualize a concrete mathematical ratio of three to four using a partitioned fraction bar. "
                "Imagine preparing a chef's recipe or mixing artist pigment where you blend three parts of rich blue pigment with four parts of terracotta base. "
                "Across all seven total equal parts in the complete system, Quantity A occupies exactly three-sevenths, while Quantity B occupies four-sevenths. "
                "Notice that the ratio directly compares the two individual quantities while preserving the enduring balance of the entire whole."
            )
            s3 = (
                "A proportion formally asserts that two separate ratios are completely equal in value. "
                "When we multiply both quantities by the same non-zero scaling factor, the core proportional balance remains completely invariant. "
                "As shown in our scaling table, three to four is identically equal to six to eight, nine to twelve, and fifteen to twenty. "
                "Engineers and architects rely on this constant scale factor every day to scale blueprints and mechanical models with absolute precision."
            )
        else:
            s1 = (
                f"Welcome to our mathematics lesson exploring {topic}. "
                "In foundational mathematics, a ratio compares two or more numbers indicating their relative sizes through division. "
                "When two distinct ratios represent the exact same mathematical relationship, they are formally defined as a proportion. "
                "Today we explore how ratios scale predictably across science and daily calculations."
            )
            s2 = (
                "Let us visualize a concrete ratio of three to four using a partitioned fraction bar. "
                "In a total of seven equal parts, the first quantity represents three-sevenths and the second represents four-sevenths. "
                "This fractional bar visualizes how both quantities relate directly to each other while preserving the balance of the whole system."
            )
            s3 = (
                "A proportion formally asserts that two separate ratios are completely equal in value. "
                "When we multiply both sides of three to four by two, we obtain six to eight. "
                "Multiplying by three yields nine to twelve, proving that the underlying proportional relationship remains invariant."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Mastering {topic}",
                "subtitle": f"A foundational exploration for {level} students",
                "key_points": [
                    "Core definitions: Ratios as comparisons and proportions as equality",
                    "Visual representation using fraction bars and part-to-whole models",
                    "Practical scaling rules and real-world problem solving",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Visualizing Ratios: The Fraction Bar Model",
                "diagram_type": "fraction_bar",
                "fraction_bar": {
                    "total_units": 7.0,
                    "segments": [
                        {"label": "Quantity A", "units": 3.0, "color": "#234E3C", "fraction_text": "3/7"},
                        {"label": "Quantity B", "units": 4.0, "color": "#D97757", "fraction_text": "4/7"},
                    ],
                    "comparison_label": "Ratio 3 : 4 (Total 7 Parts)",
                },
                "items": [
                    "Quantity A (3 Units)",
                    "Quantity B (4 Units)",
                    "Total System (7 Parts)",
                    "Part-to-Whole Relationship",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Step 2: Proportions and Equivalent Scaling",
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
                "narration": s3,
            },
        ]

        if target_sec >= 90:
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
                    "Now let us examine a worked demonstration to solve for an unknown quantity in a proportion. "
                    "Suppose we know that three parts corresponds to four parts, and we need to determine how many parts correspond to sixteen. "
                    "Because four was multiplied by a scale factor of four to reach sixteen, we multiply three by that exact same factor to obtain twelve. "
                    "Cross-multiplying confirms that three times sixteen equals forty-eight, which perfectly balances four times twelve. "
                    "This algebraic technique reliably isolates unknown variables across physics, chemistry, engineering, and finance."
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
                        {"val": 9.0, "label": "3x Scale (9)", "color": "#234E3C"},
                        {"val": 12.0, "label": "4x Target (12)", "color": "#D97757"},
                    ],
                    "highlight_range": [3.0, 12.0],
                },
                "items": [
                    "Base Unit Marker",
                    "Linear Scaled Step",
                    "Interval Expansion",
                    "Continuous Coordinate Mapping",
                ],
                "layout": "horizontal",
                "narration": (
                    "We can also chart proportions continuously along a geometric number line. "
                    "Observe how each repeated step maintains the exact proportional gap between successive iterations. "
                    "As we advance from three to six, and then from six to twelve, each jump expands by an exact constant multiplier. "
                    "This continuous spatial mapping demonstrates how linear functions and proportional growth operate together in calculus and coordinate geometry. "
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
                    "First, identify what two quantities are being compared and express them as a simplified fraction. "
                    "Second, determine the shared constant scaling multiplier connecting the known terms together. "
                    "Third, scale the corresponding quantity by multiplying or dividing by that exact factor. "
                    "Finally, verify your solution by checking that cross-multiplication produces identical products on both sides. "
                    "By following this consistent framework, you can solve complex scaling questions with complete confidence, speed, and accuracy."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="If two quantities maintain the ratio 3:4 and the second quantity is scaled to 16, what is the first quantity?",
                options=["12", "9", "15", "8"],
                correct_index=0,
                explanation="The scale multiplier connecting 4 to 16 is 4 (16 / 4 = 4). Multiplying the first quantity by 4 yields 3 * 4 = 12.",
                hint="Find the scaling factor by dividing 16 by 4, then multiply 3 by that factor.",
                concept_reference="Proportion Scaling",
            ),
            QuizQuestion(
                question="What defines a mathematical proportion between two ratios?",
                options=[
                    "Two ratios being exactly equal in value",
                    "Two ratios adding up to 100",
                    "One ratio being strictly larger than another",
                    "A comparison between two unrelated dimensions",
                ],
                correct_index=0,
                explanation="A proportion is an explicit mathematical equation stating that two distinct ratios represent the same quantitative value.",
                hint="Think about the equality relationship between two fractions.",
                concept_reference="Proportion Definition",
            ),
        ]
        return scenes, quizzes

    def _build_arbitrary_math_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Handles arbitrary mathematics topics with rigorous step-by-step reasoning."""
        if target_sec >= 120:
            s1 = (
                f"Welcome to our mathematics walkthrough exploring {topic}. "
                "Mathematics provides a systematic language to quantify structures, spatial relationships, and universal patterns. "
                "In this visual lesson, we establish foundational definitions and progress through structured mathematical principles. "
                "By connecting numeric calculations with visual models, we build deep intuition for rigorous problem solving."
            )
            s2 = (
                f"To understand {topic}, we begin by identifying the core mathematical definitions and governing relations. "
                "Every quantitative relationship operates under strict logical rules of equivalence, balance, and invariance. "
                "When analyzing mathematical structures, breaking complex expressions into manageable subcomponents clarifies how operations interact. "
                "This systematic decomposition prevents calculation errors and lays the groundwork for step-by-step deduction."
            )
            s3 = (
                f"Now let us examine a worked demonstration applying {topic} to solve a concrete problem. "
                "By substituting given values into our governing formula and executing operations in proper sequence, we isolate the target quantity. "
                "Notice that both sides of the mathematical equality remain perfectly balanced at every step. "
                "Checking intermediate solutions against known physical or numeric constraints guarantees precision and verified accuracy."
            )
        else:
            s1 = (
                f"Welcome to our mathematics lesson on {topic}. "
                "Mathematics gives us precise tools to model quantities, patterns, and logical relationships with certainty. "
                "In this lesson, we break down core rules and walk through clear visual steps."
            )
            s2 = (
                f"The core principle of {topic} relies on identifying fundamental rules of equivalence and algebraic balance. "
                "Breaking complex expressions into clear stages allows us to track numerical changes with complete confidence."
            )
            s3 = (
                f"Applying these rules to a worked problem demonstrates how {topic} operates in practice. "
                "Executing each step systematically verifies our final result and reinforces lasting conceptual understanding."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"Foundational mathematical principles for {level} learners",
                "key_points": [
                    f"Core definitions and governing formulas of {topic}",
                    "Visual step-by-step decomposition of mathematical relations",
                    "Worked problem demonstration and verification techniques",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Conceptual Principles & Governing Invariants",
                "diagram_type": "flowchart",
                "items": [
                    f"Core Definitions of {topic}",
                    "Operational Equivalence & Rules",
                    "Decomposition of Terms",
                    "Invariant Balance of Equality",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Step-by-Step Problem Solving & Verification",
                "diagram_type": "flowchart",
                "items": [
                    "Isolate Target Variable",
                    "Substitute Known Quantities",
                    "Execute Sequential Operations",
                    "Verify Balanced Equality",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Practical Applications & Computational Models",
                "diagram_type": "flowchart",
                "items": [
                    "Formulate Problem Statement",
                    "Map Parameters to Model",
                    "Compute Exact Value",
                    "Validate Physical Bounds",
                ],
                "layout": "horizontal",
                "narration": (
                    f"The principles governing {topic} extend directly to real-world modeling in science, engineering, and data analysis. "
                    "When solving practical problems, we first translate observed conditions into structured mathematical variables. "
                    "Next, we apply the appropriate algorithms to compute exact numeric outputs. "
                    "Finally, we validate that the calculated values satisfy the boundary constraints of the physical system."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Analytical Nuances & Error Prevention",
                "diagram_type": "flowchart",
                "items": [
                    "Sign & Direction Conventions",
                    "Order of Operations Priority",
                    "Dimensional Unit Consistency",
                    "Cross-Check Invariants",
                ],
                "layout": "horizontal",
                "narration": (
                    f"When working with advanced problems in {topic}, avoiding common analytical pitfalls requires disciplined checks. "
                    "Always track positive and negative signs carefully, especially when rearranging terms across an equality. "
                    "Maintain strict adherence to the standard order of operations and verify that dimensional units match throughout. "
                    "These systematic verification habits prevent algebraic mistakes and foster lasting mathematical rigor."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Mathematical Synthesis & Mastery Framework",
                "diagram_type": "flowchart",
                "items": [
                    "State Core Axioms",
                    "Execute Derivation Steps",
                    "Evaluate Edge Cases",
                    "Synthesize Universal Law",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To master {topic} across all educational levels, keep these four mathematical cornerstones in mind. "
                    "First, internalize the core definitions and axiomatic relationships that define the concept. "
                    "Second, practice deriving solutions step-by-step without skipping intermediate algebraic stages. "
                    "Third, test your conclusions against extreme or boundary values to confirm general validity. "
                    "These four foundational pillars empower you to solve complex quantitative challenges with lasting confidence."
                ),
            })

        quizzes = [
            QuizQuestion(
                question=f"What is the foundational objective when analyzing problems in {topic}?",
                options=[
                    "Applying balanced rules of equivalence and verified formulas",
                    "Guessing an approximate numerical result without verification",
                    "Discarding all intermediate algebraic steps",
                    "Changing units arbitrarily during calculation",
                ],
                correct_index=0,
                explanation=f"Mathematical problem-solving in {topic} requires disciplined execution of operational rules while preserving balanced equality.",
                hint="Think about how equations must maintain equality on both sides.",
                concept_reference="Algebraic Balance",
            ),
            QuizQuestion(
                question="Why is it important to verify solutions against boundary constraints?",
                options=[
                    "To confirm the result satisfies real-world physical and mathematical rules",
                    "To make the calculation take as long as possible",
                    "Because numbers change their value randomly",
                    "To replace the original equation with a different problem",
                ],
                correct_index=0,
                explanation="Checking boundary conditions verifies that the computed solution remains mathematically valid and physically sensible.",
                hint="Consider what happens if an answer violates reality or the problem setup.",
                concept_reference="Boundary Verification",
            ),
        ]
        return scenes, quizzes

    def _build_social_scenes(self, topic: str, level: str, target_sec: int, evidence: List[EvidenceSource]) -> Tuple[list, List[QuizQuestion]]:
        """Generates humanities and social studies visual scenes with duration scaling."""
        t_low = topic.lower()
        is_ancient_civ = any(k in t_low for k in ["ancient", "civilization", "river valley", "indus", "harappa", "mesopotamia", "nile", "egypt", "tigris", "euphrates", "yellow river"])

        if is_ancient_civ:
            return self._build_ancient_civilizations_scenes(topic, level, target_sec)
        else:
            return self._build_arbitrary_social_scenes(topic, level, target_sec)

    def _build_ancient_civilizations_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Generates rich, factual scenes on Ancient River Valley Civilizations."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our historical investigation into {topic}. "
                "The dawn of complex urban civilization emerged not in isolation, but along four great river systems across Afro-Eurasia. "
                "These included the Nile River in Egypt, the Tigris and Euphrates rivers in Mesopotamia, "
                "the Indus and Saraswati rivers in South Asia, and the Yellow River, or Huang He, in ancient China. "
                "Seasonal floods deposited fertile alluvial silt along these floodplains, providing the fresh water and rich soil "
                "necessary to produce agricultural surpluses that freed communities to develop specialized crafts, architecture, and governance."
            )
            s2 = (
                "In the Indus Valley Civilization, during the mature Harappan phase around 2600 to 1900 BCE, "
                "cities such as Harappa and Mohenjo-daro achieved unprecedented standards of civil engineering and urban planning. "
                "Streets were laid out in a disciplined orthogonal grid oriented precisely to cardinal directions. "
                "Residential homes and public facilities were constructed from standardized kiln-baked bricks with consistent dimensional ratios. "
                "Most impressively, beneath the paved streets ran advanced covered drainage networks equipped with inspection manholes and soak pits."
            )
            s3 = (
                "Further west in Mesopotamia, the unpredictable flooding of the Tigris and Euphrates required coordinated communal labor "
                "to dig, maintain, and regulate extensive irrigation canal networks. "
                "This collective hydraulic management stimulated the rise of centralized city-states, the invention of cuneiform writing on clay tablets for economic records, "
                "and the codification of formal statutory law, famously embodied in the Code of Hammurabi. "
                "These legal and civic innovations fostered widespread commerce, linking Mesopotamian ports with Indus Valley traders who exported carnelian, copper, and textiles."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our deep historical investigation exploring {topic}. "
                "The earliest complex urban civilizations developed along four primary river systems: the fertile Nile in Egypt, the Tigris and Euphrates in Mesopotamia, "
                "the vast Indus and Saraswati valleys in South Asia, and the Yellow River basin in northern China. "
                "Annual seasonal floods deposited rich alluvial silt across these vast floodplains, providing dependable water and exceptionally fertile soil. "
                "These reliable agricultural yields created substantial food surpluses, allowing human societies to sustain dense populations and cultivate specialized scholarship, architecture, and governance."
            )
            s2 = (
                "In the mature Indus Valley Civilization, cities such as Harappa and Mohenjo-daro demonstrated peerless urban planning and civic engineering. "
                "Their streets were methodically aligned in an orthogonal grid oriented strictly to cardinal directions to facilitate cooling crosswinds. "
                "Homes and civic buildings were constructed from kiln-baked bricks adhering to an exact standardized four-two-one dimensional proportion. "
                "Furthermore, sophisticated covered municipal drainage systems collected wastewater from private bathrooms and routed it outside city walls, ensuring superior public hygiene."
            )
            s3 = (
                "In Mesopotamia, controlling the turbulent and unpredictable floodwaters of the Tigris and Euphrates demanded continuous communal cooperation to construct and maintain canals. "
                "This hydraulic management stimulated the formation of organized city-states, the creation of cuneiform writing on clay tablets for trade ledgers, "
                "and the codification of foundational statutory legal systems, most prominently the Code of Hammurabi. "
                "These institutional achievements protected commercial contracts, regulated civic obligations, and laid the permanent groundwork for modern civil law."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our historical investigation exploring {topic}. "
                "The earliest human civilizations developed along four primary river valleys: the Nile River in Egypt, the Tigris and Euphrates in Mesopotamia, "
                "the Indus Valley in South Asia, and the Yellow River in northern China. "
                "Annual seasonal floods reliably deposited nutrient-rich alluvial silt across these vast floodplains, enabling agricultural surpluses that sustained growing cities."
            )
            s2 = (
                "In the mature Indus Valley Civilization, prominent cities such as Harappa and Mohenjo-daro achieved unprecedented civil engineering and urban planning. "
                "Streets followed a disciplined orthogonal grid, buildings used standardized kiln-baked bricks, and covered drainage networks served private dwellings. "
                "Harappan merchants engaged in extensive maritime and coastal trade with Mesopotamia, exchanging carnelian beads, copper, and textiles."
            )
            s3 = (
                "In Mesopotamia, managing irrigation along the Tigris and Euphrates spurred centralized civic administration and the invention of cuneiform script on clay tablets. "
                "Codified statutory laws, such as the Code of Hammurabi, established enforceable civic contracts and commercial standards. "
                "These river valley institutions demonstrated how cooperative engineering and codified law create enduring societal stability."
            )
        else:
            s1 = (
                f"Welcome to our lesson exploring {topic}. "
                "Human civilization began along major river valleys: the Nile, Tigris-Euphrates, Indus, and Yellow River. "
                "Fertile alluvial silt deposited by annual floods provided the agricultural foundation for city life."
            )
            s2 = (
                "In the Indus Valley, cities like Harappa and Mohenjo-daro featured grid-planned streets, standardized baked bricks, and underground drainage. "
                "Harappan merchants traded goods across the Arabian Sea with Mesopotamia."
            )
            s3 = (
                "Cooperative canal management in Mesopotamia inspired cuneiform writing and written legal codes like the Code of Hammurabi. "
                "These river valley innovations established the civic and economic structures that shape human history."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"The four cradles of urban society for {level} students",
                "key_points": [
                    "The 4 River Cradles: Nile, Tigris-Euphrates, Indus, and Yellow River",
                    "Alluvial silt, agricultural surplus, and the emergence of cities",
                    "Cooperative hydraulic engineering, trade networks, and codified law",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Urban Engineering: The Harappan Grid & Drainage",
                "diagram_type": "flowchart",
                "items": [
                    "Orthogonal Street Grid (Cardinal Alignment)",
                    "Standardized Kiln-Baked Bricks",
                    "Covered Underground Drains & Manholes",
                    "Maritime Trade with Mesopotamia (Meluhha)",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Civic Administration: Law, Irrigation & Writing",
                "diagram_type": "flowchart",
                "items": [
                    "Canal Irrigation Management",
                    "Cuneiform Accounting & Tablets",
                    "Statutory Law (Code of Hammurabi)",
                    "Inter-Regional Commerce Networks",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Comparative Analysis: Hydraulic Societies",
                "diagram_type": "flowchart",
                "items": [
                    "Predictable Nile Flooding (Egypt)",
                    "Dynamic Hydraulic Canals (Mesopotamia)",
                    "Standardized Urban Sanity (Indus Valley)",
                    "Terraced Flood Basins (Yellow River)",
                ],
                "layout": "horizontal",
                "narration": (
                    "Comparing these four river valleys reveals how geography directly shaped institutional culture. "
                    "In Egypt, predictable Nile floods fostered an optimistic worldview centered on regular cosmic cycles and monumental architecture. "
                    "In Mesopotamia, violent, irregular floods prompted an anxious reliance on protective deities and strict statutory legal codes. "
                    "In the Indus Valley, uniform baked bricks and civil sanitation pointed to civic governance focused on commerce and public welfare."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Long-Distance Bronze Age Commerce",
                "diagram_type": "flowchart",
                "items": [
                    "Indus Coastal Ports (Lothal Dockyard)",
                    "Arabian Sea Coastal Dhow Navigation",
                    "Mesopotamian Dilmun Trade Entrepôts",
                    "Diffusion of Weights, Measures & Seals",
                ],
                "layout": "horizontal",
                "narration": (
                    "Extensive Bronze Age commerce between the Indus Valley and Mesopotamia confirms that these ancient civilizations were deeply interconnected through thriving maritime and overland trade routes. "
                    "At the pioneering coastal port city of Lothal in modern Gujarat, Harappan maritime engineers constructed a massive tidal dockyard equipped with sluice gates to berth seafaring dhows. "
                    "Royal Mesopotamian administrative cuneiform tablets frequently record substantial imports of fine timber, lapis lazuli, gold, and carnelian gemstones from Meluhha, their official name for the Indus region. "
                    "The discovery of standardized cubical chert weights and distinctive Indus stamp seals across Gulf trading posts confirms mutually accepted standards of international commerce."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Enduring Legacy: Foundations of Modern Civilization",
                "diagram_type": "flowchart",
                "items": [
                    "Standardized Urban Planning & Sanitation",
                    "Codified Legal Rights & Contracts",
                    "Written Record-Keeping & Mathematics",
                    "Sustainable Resource Management",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To conclude our comprehensive investigation of {topic}, recognize that our modern urban world directly rests upon these ancient river valley foundations. "
                    "From disciplined street grid planning, underground sewage management, and standardized building materials to written statutory contracts, economic accounting, and intercontinental maritime commerce, "
                    "these pioneering river societies devised the essential institutional tools necessary for large-scale human coexistence. "
                    "By studying how they thrived through cooperative hydraulic engineering and adapted to shifting environmental conditions, we gain vital historical perspective to build more resilient, well-planned cities for our own collective future."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="Which ancient river valley civilization developed sophisticated grid-planned cities with standardized baked bricks and underground drainage?",
                options=[
                    "Indus Valley Civilization",
                    "The Roman Republic",
                    "Medieval England",
                    "The Inca Empire",
                ],
                correct_index=0,
                explanation="The Indus Valley Civilization (Harappa and Mohenjo-daro) is renowned for its standardized baked bricks, orthogonal street grids, and covered drainage systems.",
                hint="This civilization flourished along the Indus and Saraswati river basins in South Asia.",
                concept_reference="Harappan Urban Engineering",
            ),
            QuizQuestion(
                question="Why did the earliest major human civilizations develop along fertile river valleys?",
                options=[
                    "Rich alluvial silt and freshwater supported agriculture",
                    "Access to deep underground coal mines",
                    "Isolation from all other human groups",
                    "Cool polar weather conditions",
                ],
                correct_index=0,
                explanation="River valleys deposited nutrient-rich silt through seasonal flooding, providing fertile soil and fresh water necessary for agricultural surpluses.",
                hint="Think about what natural resource enabled farmers to grow abundant crops.",
                concept_reference="Alluvial Agriculture",
            ),
        ]
        return scenes, quizzes

    def _build_arbitrary_social_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Handles arbitrary history, geography, and social studies topics with factual framing."""
        if target_sec >= 120:
            s1 = (
                f"Welcome to our social studies exploration of {topic}. "
                "Human societies organize themselves through evolving geographic networks, economic trade routes, and systems of civic governance. "
                "To understand why historical and modern institutions function as they do, we must examine their origin, development, and social context. "
                "Today we analyze how foundational structures emerged and why they continue to influence contemporary civic life."
            )
            s2 = (
                f"The historical development of {topic} was shaped by key geographic, social, and economic conditions. "
                "As communities grew in scale and complexity, informal traditions evolved into structured public institutions. "
                "These collective arrangements created formal mechanisms to resolve conflicts, organize shared resources, and protect civic welfare. "
                "Studying these institutional adaptations illuminates the diverse ways human groups navigate challenges across eras."
            )
            s3 = (
                f"Across different regions, the principles embedded within {topic} transformed daily life and social organization. "
                "Codified standards and shared cultural norms fostered trust among citizens and facilitated inter-regional exchange. "
                "These historical developments demonstrate that enduring institutional stability depends on public transparency and cooperative effort. "
                "Reflecting on these historical dynamics empowers us to engage as informed, responsible participants in modern civic society."
            )
        else:
            s1 = (
                f"Welcome to our lesson exploring {topic}. "
                "Human societies develop through interconnected geographic, economic, and institutional systems. "
                "Today we analyze the core principles and historical significance of this subject."
            )
            s2 = (
                f"The evolution of {topic} reflects how communities adapt to social needs and organize shared governance. "
                "Structured institutions established order, promoted trade, and defined rights across expanding populations."
            )
            s3 = (
                f"The enduring impact of {topic} continues to shape contemporary social, political, and cultural frameworks. "
                "Understanding these historical roots provides vital context for participating in an evolving global society."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"Historical and institutional perspectives for {level} learners",
                "key_points": [
                    f"Origin, geography, and historical context of {topic}",
                    "Core institutional structures and social developments",
                    "Long-term significance and contemporary civic relevance",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Historical Context & Structural Evolution",
                "diagram_type": "flowchart",
                "items": [
                    "Geographic & Environmental Setting",
                    "Social Organization & Institutions",
                    "Economic & Cultural Exchange",
                    "Civic Governance Frameworks",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Societal Impact & Enduring Legacy",
                "diagram_type": "flowchart",
                "items": [
                    "Codification of Standards",
                    "Inter-Regional Cooperation",
                    "Civic Rights & Responsibilities",
                    "Modern Institutional Heritage",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Institutional Mechanisms & Civil Dynamics",
                "diagram_type": "flowchart",
                "items": [
                    "Public Decision-Making Bodies",
                    "Legal Standards & Contracts",
                    "Economic Resource Distribution",
                    "Conflict Resolution Protocols",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Analyzing {topic} requires examining how public authority and resource management were balanced. "
                    "When societies establish clear legal standards and fair dispute resolution, economic commerce and civic trust flourish. "
                    "These institutional checks protect individual rights while ensuring that collective civic projects can be completed successfully."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Cross-Cultural Exchange & Diffusion",
                "diagram_type": "flowchart",
                "items": [
                    "Trade Conduits & Overland Routes",
                    "Technological & Scientific Sharing",
                    "Philosophical & Legal Adaptations",
                    "Pluralistic Social Integration",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Throughout history, developments related to {topic} did not remain confined within isolated borders. "
                    "Commercial trade routes and migration corridors served as vital channels for cultural and technological diffusion. "
                    "Ideas, alphabets, scientific inventions, and legal traditions traveled across regions, catalyzing societal innovation worldwide."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Historical Synthesis & Civic Takeaways",
                "diagram_type": "flowchart",
                "items": [
                    "Evaluate Primary Evidence",
                    "Trace Institutional Continuity",
                    "Identify Historical Causation",
                    "Apply Lessons to Modern Society",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To summarize our investigation into {topic}, always keep these historical principles in mind. "
                    "First, observe how physical geography shapes the initial settlement and economic specialization of communities. "
                    "Second, recognize that enduring stability requires codified laws, transparent governance, and active civic participation. "
                    "These timeless insights empower us to engage thoughtfully as informed citizens in an interconnected global community."
                ),
            })

        quizzes = [
            QuizQuestion(
                question=f"What is a primary factor in how societies develop institutions regarding {topic}?",
                options=[
                    "Adapting governance and legal frameworks to social and environmental needs",
                    "Relying entirely on random unorganized actions",
                    "Isolating completely from all forms of cooperation",
                    "Abolishing all written records and rules",
                ],
                correct_index=0,
                explanation=f"Societies develop structured civic and legal institutions in {topic} to manage resources, resolve disputes, and maintain stability.",
                hint="Consider how laws and institutions help groups work together peacefully.",
                concept_reference="Institutional Evolution",
            ),
            QuizQuestion(
                question="Why is cross-cultural exchange historically significant in societal development?",
                options=[
                    "It diffuses scientific, technological, and legal innovations across regions",
                    "It prevents all technological advancements from spreading",
                    "It causes all human languages to disappear",
                    "It eliminates all forms of maritime trade",
                ],
                correct_index=0,
                explanation="Trade routes and communication channels facilitate the sharing of knowledge, tools, and ideas, accelerating societal progress.",
                hint="Think about how trading goods also leads to trading ideas.",
                concept_reference="Cultural Diffusion",
            ),
        ]
        return scenes, quizzes

    def _build_science_scenes(self, topic: str, level: str, target_sec: int, evidence: List[EvidenceSource]) -> Tuple[list, List[QuizQuestion]]:
        """Generates science scenes: specialized Newton/Photosynthesis or grounded arbitrary science."""
        t_low = topic.lower()
        is_newton = any(k in t_low for k in ["newton", "motion", "inertia", "f = ma", "f=ma", "mechanics", "force"])
        is_photosynthesis = any(k in t_low for k in ["photosynthesis", "plant", "chloroplast", "chlorophyll", "calvin"])

        if is_newton:
            return self._build_newton_scenes(topic, level, target_sec)
        elif is_photosynthesis:
            return self._build_photosynthesis_scenes(topic, level, target_sec)
        else:
            return self._build_arbitrary_science_scenes(topic, level, target_sec)

    def _build_newton_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Generates classical mechanics and Newton's Laws of Motion scenes."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our physics masterclass on {topic}. "
                "Classical mechanics provides the mathematical foundation for understanding how physical forces govern the motion of all material objects. "
                "In 1687, Sir Isaac Newton formulated three universal laws of motion that unified terrestrial mechanics with celestial orbits. "
                "These principles explain why apples fall from trees, how vehicles accelerate, and why planets maintain stable orbits around the Sun. "
                "Today we explore each law step-by-step with quantitative formulas and real-world demonstrations."
            )
            s2 = (
                "Newton's First Law, the Law of Inertia, states that an object at rest remains at rest, "
                "and an object in uniform motion continues moving at constant velocity in a straight line, unless acted upon by a non-zero net external force. "
                "Inertia is the inherent property of matter that resists changes in velocity, directly proportional to the object's mass. "
                "In deep space, far from gravitational fields and atmospheric friction, a spacecraft coasts indefinitely with zero fuel consumption."
            )
            s3 = (
                "Newton's Second Law quantifies the relationship between force, mass, and acceleration: F_net = m · a. "
                "Net force measured in Newtons equals inertial mass in kilograms multiplied by the resulting acceleration in meters per second squared. "
                "For example, applying a ten Newton net force to a two kilogram block produces an acceleration of exactly five meters per second squared. "
                "Doubling the mass to four kilograms with the same ten Newton force cuts the acceleration in half to two point five meters per second squared."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our physics masterclass exploring {topic}. "
                "In sixteen eighty-seven, Sir Isaac Newton formulated three universal laws of motion that establish classical mechanics throughout our physical universe. "
                "From accelerating motor vehicles to orbiting satellites and planetary bodies, these laws explain how applied net forces cause velocity changes. "
                "Today we systematically unpack inertia, the quantitative force-mass-acceleration formula, and simultaneous action-reaction interaction pairs."
            )
            s2 = (
                "Newton's First Law, the Law of Inertia, establishes that any physical body persists in uniform straight-line motion unless an unbalanced net force intervenes. "
                "Inertia represents the intrinsic resistance of matter to acceleration, determined entirely by its inertial mass. "
                "Heavier masses possess greater inertia, demanding larger applied forces to alter their trajectory. "
                "In the vacuum of deep space, an interstellar coasting probe travels perpetually without consuming engine propellant."
            )
            s3 = (
                "Newton's Second Law defines force quantitatively through the iconic relation: net force equals mass times acceleration, or F equals m times a. "
                "When a net force of ten Newtons acts upon a two-kilogram mass, the body accelerates at exactly five meters per second squared. "
                "Doubling the mass to four kilograms with the same ten Newton force cuts the acceleration in half to two point five meters per second squared. "
                "Aerospace engineers apply this proportional law daily to calculate rocket thrust and orbital trajectories."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our physics masterclass investigating {topic}. "
                "In 1687, Sir Isaac Newton published the three fundamental laws of motion that govern physical dynamics throughout our universe. "
                "From falling apples and accelerating vehicles to deep planetary orbits, these laws explain precisely how physical forces dictate changes in velocity. "
                "Today we analyze how net forces accelerate masses, how inertia preserves motion, and how momentum is conserved across mechanical systems."
            )
            s2 = (
                "Newton's First Law, the Law of Inertia, states that every physical object remains in a state of rest or continues in uniform straight-line motion, "
                "unless compelled to change that state by a non-zero net external force. "
                "Inertia is the natural resistance of any material body to changes in its velocity, directly proportional to its mass. "
                "On Earth, ubiquitous friction and air resistance conceal inertia, but a deep-space probe coasts perpetually with zero engine thrust."
            )
            s3 = (
                "Newton's Second Law defines force quantitatively through the iconic relation: net force equals mass times acceleration, or F equals m times a. "
                "Applying a net force of ten Newtons to a two-kilogram mass produces an acceleration of exactly five meters per second squared. "
                "If we double the mass to four kilograms while keeping the same ten Newton force, the resulting acceleration is cut in half to two point five meters per second squared."
            )
        else:
            s1 = (
                f"Welcome to our lesson exploring {topic}. "
                "Newton's three laws of motion govern how forces change the velocity of physical objects. "
                "Understanding these laws unlocks mechanics, rocketry, and everyday engineering."
            )
            s2 = (
                "The First Law of Inertia states that objects resist changes in motion without an external force. "
                "The Second Law establishes that net force equals mass times acceleration: F = ma. "
                "Applying ten Newtons to two kilograms yields five meters per second squared."
            )
            s3 = (
                "The Third Law states that every action force has an equal and opposite reaction force. "
                "Together, these three laws provide a complete mathematical framework for classical physics."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Mastering {topic}",
                "subtitle": f"Classical mechanics and dynamics for {level} students",
                "key_points": [
                    "Newton's 1st Law: Inertia and natural states of motion",
                    "Newton's 2nd Law: The quantitative dynamic formula F = ma",
                    "Newton's 3rd Law: Action-reaction interaction pairs",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Newton's First Law: The Principle of Inertia",
                "diagram_type": "flowchart",
                "items": [
                    "State of Rest (v = 0 m/s)",
                    "Uniform Velocity (v = constant)",
                    "Unbalanced External Force (F_net ≠ 0)",
                    "Change in Motion (Acceleration)",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Newton's Second Law: Force, Mass & Acceleration",
                "diagram_type": "proportion_table",
                "proportion_table": {
                    "headers": ["Mass (kg)", "Net Force (N)", "Acceleration (m/s²)"],
                    "rows": [
                        {"values": [2.0, 10.0, 5.0]},
                        {"values": [4.0, 10.0, 2.5]},
                        {"values": [2.0, 20.0, 10.0]},
                        {"values": [5.0, 25.0, 5.0]},
                    ],
                    "scale_factor_label": "Dynamic Formula: a = F_net / m",
                },
                "items": [
                    "Apply Net Force (F)",
                    "Measure Inertial Mass (m)",
                    "Calculate Acceleration (a = F/m)",
                    "Verify Proportional Dynamics",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Newton's Third Law: Action-Reaction Pairs",
                "diagram_type": "flowchart",
                "items": [
                    "Object A Exerts Force on Object B (F_AB)",
                    "Object B Exerts Equal Opposite Force (F_BA)",
                    "Simultaneous Contact Interaction",
                    "Conservation of Linear Momentum",
                ],
                "layout": "horizontal",
                "narration": (
                    "Newton's Third Law establishes that whenever one physical body exerts a contact or field force on a second body, "
                    "the second body simultaneously exerts an equal magnitude force in the exact opposite direction back onto the first body: F of A on B equals minus F of B on A. "
                    "Crucially, action and reaction forces act upon two distinct interacting bodies, which is why they never cancel each other out internally. "
                    "This principle governs aeronautical jet engines and rocket propulsion, where expelling high-velocity combustion gases downward creates an equal upward reaction force pushing the rocket skyward."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Free-Body Diagrams & Vector Resolution",
                "diagram_type": "flowchart",
                "items": [
                    "Identify Gravitational Force (Weight = mg)",
                    "Normal Contact Force (Perpendicular Surface)",
                    "Frictional Retardation Force",
                    "Net Resultant Vector (F_net = ΣF)",
                ],
                "layout": "horizontal",
                "narration": (
                    "In advanced physics and mechanical engineering, practitioners construct free-body diagrams to isolate and resolve all competing vector forces acting upon a system. "
                    "We decompose forces along orthogonal horizontal and vertical axes, balancing downward gravitational weight against upward normal surface contact forces. "
                    "When the vector sum of all forces equals zero, the body remains in perfect translational equilibrium with zero acceleration. "
                    "However, whenever an unbalanced net resultant force remains, the object accelerates along the precise directional vector of that net force, governed strictly by F equals m times a."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Dynamics Synthesis & Real-World Mechanics",
                "diagram_type": "flowchart",
                "items": [
                    "Identify All Interacting Bodies",
                    "Calculate Net Vector Force",
                    "Apply F = ma Acceleration",
                    "Verify Conservation of Momentum",
                ],
                "layout": "horizontal",
                "narration": (
                    "To consolidate our mastery of Newton's laws of motion, keep these three unifying principles firmly in mind across all problem solving. "
                    "First, inertia preserves an object's velocity completely constant until an unbalanced net external force intervenes. "
                    "Second, acceleration is directly proportional to net force and inversely proportional to inertial mass, dictating dynamic changes along the vector of the force. "
                    "Third, forces never exist in isolation; they always arise in mutual, equal, and opposite interaction pairs acting on distinct bodies. "
                    "These three foundational laws empower humanity to navigate ocean vessels, construct earthquake-resistant skyscrapers, safely land interplanetary rovers, and decode the mechanical workings of the physical universe."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="According to Newton's Second Law of Motion, how is net force calculated?",
                options=[
                    "Force equals mass times acceleration (F = ma)",
                    "Force equals mass divided by velocity",
                    "Force equals speed times time",
                    "Force equals energy divided by distance",
                ],
                correct_index=0,
                explanation="Newton's Second Law establishes that net force is directly proportional to mass and acceleration: F = ma.",
                hint="Think about multiplying how heavy something is by how quickly its speed changes.",
                concept_reference="Newton's Second Law",
            ),
            QuizQuestion(
                question="What does Newton's First Law (Law of Inertia) state about an object moving at constant velocity?",
                options=[
                    "It maintains uniform velocity unless an external force acts on it",
                    "It immediately stops without any friction",
                    "It accelerates continuously on its own",
                    "It spontaneously changes direction every second",
                ],
                correct_index=0,
                explanation="The Law of Inertia states that an object continues in its state of rest or uniform straight-line motion unless acted on by an unbalanced net external force.",
                hint="Inertia means resistance to changes in speed or direction.",
                concept_reference="Law of Inertia",
            ),
        ]
        return scenes, quizzes

    def _build_photosynthesis_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Preserves photosynthesis scenes with full biochemical detail."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our scientific investigation into {topic}. "
                "Living systems and physical processes capture energy from their environment and convert it into stable, useful forms. "
                "To understand how these transformations function, we must track the flow of energy and matter across microscopic structures. "
                "Today we will follow each stage of this essential biological mechanism to see how nature sustains life on our planet."
            )
            s2 = (
                "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                "This excitation energy drives the splitting of water molecules through photolysis, releasing breathable oxygen into the atmosphere. "
                "Simultaneously, ATP and NADPH transfer chemical energy directly to the stroma, where carbon dioxide is fixed into energy-rich glucose. "
                "Every molecular component plays a specialized role in this highly synchronized biochemical dance."
            )
            s3 = (
                "From a chemical perspective, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                "Every single atom of carbon, hydrogen, and oxygen is conserved throughout this transformation, illustrating the law of conservation of mass. "
                "The synthesized glucose supplies vital metabolic energy not only to the plant itself, but to the entire ecological food chain. "
                "Without this continuous energetic conversion, complex life as we know it could not exist."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our comprehensive scientific masterclass exploring {topic}. "
                "Living systems and biological cells constantly capture radiant energy from their environment and convert it into stable chemical bonds. "
                "To understand how these vital energetic transformations function across ecosystems, we must track the flow of energy, matter, and electrons across microscopic thylakoid membranes. "
                "Today we will follow each step of this biological mechanism to see how nature sustains all complex life on our planet."
            )
            s2 = (
                "Within the thylakoid membranes of chloroplasts, specialized chlorophyll pigments absorb incoming photons of solar radiation. "
                "This excitation energy drives the splitting of water molecules through photolysis, releasing breathable oxygen directly into the atmosphere as a vital byproduct. "
                "Simultaneously, energized electrons generate adenosine triphosphate and NADPH, which transfer chemical potential energy directly into the stroma for carbon fixation. "
                "Every molecular protein complex operates with synchronized precision to power this essential biological engine."
            )
            s3 = (
                "From a stoichiometric chemical perspective, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                "Every single atom of carbon, hydrogen, and oxygen is strictly conserved throughout this multi-step enzymatic transformation, demonstrating the universal law of conservation of mass. "
                "The synthesized glucose supplies essential cellular energy to the plant while fueling the entire global ecological food web. "
                "Without this continuous metabolic conversion, aerobic organisms could not survive on Earth."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our scientific investigation into {topic}. "
                "Living systems and physical processes capture energy from their environment and convert it into stable, useful forms. "
                "To understand how these transformations function, we must track the flow of energy and matter across microscopic structures. "
                "Today we will follow each stage of this essential biological mechanism to see how nature sustains life on our planet."
            )
            s2 = (
                "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                "This excitation energy drives the splitting of water molecules through photolysis, releasing breathable oxygen into the atmosphere. "
                "Simultaneously, ATP and NADPH transfer chemical energy directly to the stroma, where carbon dioxide is fixed into energy-rich glucose. "
                "Every molecular component plays a specialized role in this highly synchronized biochemical dance."
            )
            s3 = (
                "From a chemical perspective, six molecules of carbon dioxide and six molecules of water yield one molecule of glucose and six molecules of oxygen. "
                "Every single atom of carbon, hydrogen, and oxygen is conserved throughout this transformation, illustrating the law of conservation of mass. "
                "The synthesized glucose supplies vital metabolic energy not only to the plant itself, but to the entire ecological food chain. "
                "Without this continuous energetic conversion, complex life as we know it could not exist."
            )
        else:
            s1 = (
                f"Welcome to our scientific investigation into {topic}. "
                "Living systems capture energy from their environment and convert it into stable chemical bonds. "
                "Today we will track how molecules interact across microscopic boundaries to sustain life on Earth."
            )
            s2 = (
                "Within the thylakoid membranes of plant cells, chlorophyll pigments absorb incoming photons of sunlight. "
                "This excitation energy drives the splitting of water molecules, releasing oxygen into the atmosphere. "
                "Simultaneously, ATP and NADPH transfer chemical energy to the stroma, where carbon dioxide is fixed into glucose."
            )
            s3 = (
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
                    "Input capture and molecular ingredients (Light, H₂O, CO₂)",
                    "Chemical and energetic transformation phases (Light Reactions & Calvin Cycle)",
                    "Vital biological outputs sustaining ecosystems (Glucose & O₂)",
                ],
                "narration": s1,
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
                    "Water Photolysis & Oxygen Release",
                    "ATP & NADPH Synthesis",
                    "Stromal Carbon Fixation (Glucose)",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Chemical Transformation & Atomic Balance",
                "diagram_type": "proportion_table",
                "proportion_table": {
                    "headers": ["Reactant Inputs", "Product Outputs"],
                    "rows": [
                        {"values": [6.0, 1.0]},
                        {"values": [6.0, 6.0]},
                    ],
                    "scale_factor_label": "Conservation Law: 6 CO2 + 6 H2O -> 1 C6H12O6 + 6 O2",
                },
                "items": [
                    "Carbon Dioxide Input (6 CO₂)",
                    "Water Molecule Input (6 H₂O)",
                    "Glucose Molecule Output (1 C₆H₁₂O₆)",
                    "Oxygen Molecule Output (6 O₂)",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Global Ecological Synthesis & Planetary Cycles",
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
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Scientific Synthesis & Planetary Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Input Molecule Capture",
                    "Biochemical Energy Transformation",
                    "Stoichiometric Conservation",
                    "Ecological Sustenance",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To summarize our investigation into {topic}, always keep these four scientific pillars in mind. "
                    "First, observe the initial inputs of radiant solar energy, water, and atmospheric carbon dioxide. "
                    "Second, trace the biochemical pathways where photon absorption splits water and powers the Calvin Cycle. "
                    "Third, verify the atomic conservation that yields glucose and breathable oxygen in precise stoichiometry. "
                    "Finally, recognize how this continuous energetic loop underpins global climate regulation and food webs worldwide."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="What gas is released into the atmosphere as a byproduct during the light reactions of photosynthesis?",
                options=["Oxygen (O₂)", "Carbon dioxide (CO₂)", "Methane (CH₄)", "Nitrogen (N₂)"],
                correct_index=0,
                explanation="During photolysis in thylakoid membranes, light energy splits water molecules (H₂O), releasing oxygen gas (O₂) into the atmosphere.",
                hint="It is the essential gas required by humans and animals for aerobic respiration.",
                concept_reference="Water Photolysis",
            ),
            QuizQuestion(
                question="In which cell organelle does photosynthesis take place in plant cells?",
                options=["Chloroplast", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
                correct_index=0,
                explanation="Photosynthesis takes place inside chloroplasts, which house thylakoid membranes and stromal enzymes like RuBisCO.",
                hint="This organelle contains green chlorophyll pigments.",
                concept_reference="Chloroplast Structure",
            ),
        ]
        return scenes, quizzes

    def _build_arbitrary_science_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Handles arbitrary science topics with authentic scientific principles."""
        if target_sec >= 120:
            s1 = (
                f"Welcome to our scientific investigation into {topic}. "
                "Science advances by observing natural phenomena, formulating precise hypotheses, and testing physical and chemical mechanisms. "
                "In this lesson, we explore the governing laws and experimental principles that explain this topic. "
                "By analyzing cause and effect across physical boundaries, we develop an evidence-based understanding of the natural world."
            )
            s2 = (
                f"To understand {topic}, we examine the underlying physical or chemical processes that drive the system. "
                "Every scientific mechanism operates through interactions of energy, matter, and fundamental forces. "
                "By tracking how inputs transform into observable outputs, we uncover predictable relationships and natural constants. "
                "Controlled empirical experimentation confirms that these principles remain consistent across varying environmental conditions."
            )
            s3 = (
                f"The broader implications of {topic} demonstrate how scientific understanding translates into technological innovation. "
                "From materials science to ecological modeling and space exploration, these principles provide actionable engineering tools. "
                "Validating hypotheses with quantitative measurements ensures that our models reflect empirical physical reality. "
                "Understanding these core mechanisms deepens our appreciation for the elegant laws governing our universe."
            )
        else:
            s1 = (
                f"Welcome to our scientific lesson on {topic}. "
                "Science investigates how matter, energy, and physical forces interact across natural systems. "
                "In this walkthrough, we examine the core principles and observable mechanisms of this topic."
            )
            s2 = (
                f"The governing mechanism of {topic} explains how inputs interact to produce measurable physical outcomes. "
                "Empirical testing verifies that energy and matter are conserved throughout these natural transformations."
            )
            s3 = (
                f"Applying the principles of {topic} enables researchers to model real-world phenomena with high predictive accuracy. "
                "Scientific inquiry transforms curiosity into reliable, evidence-based knowledge."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Investigating {topic}",
                "subtitle": f"Empirical principles and mechanisms for {level} students",
                "key_points": [
                    f"Observation and physical definitions of {topic}",
                    "Energy and matter transformation pathways",
                    "Experimental validation and real-world significance",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Physical Mechanism & Energy Dynamics",
                "diagram_type": "flowchart",
                "items": [
                    "Input Conditions & Variables",
                    "Primary Physical/Chemical Interaction",
                    "Energy Transfer & Conservation",
                    "Measurable Output State",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Empirical Verification & Invariant Principles",
                "diagram_type": "flowchart",
                "items": [
                    "Hypothesis Formulation",
                    "Controlled Variable Measurement",
                    "Quantitative Data Collection",
                    "Scientific Law Validation",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Quantitative Modeling & Predictive Applications",
                "diagram_type": "flowchart",
                "items": [
                    "Mathematical System Formulation",
                    "Computational Simulation",
                    "Error Margin & Uncertainty Analysis",
                    "Practical Engineering Deployment",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Quantitative modeling enables scientists to apply the laws of {topic} to predict system behavior. "
                    "By expressing empirical observations as mathematical relationships, we can simulate complex processes under diverse conditions. "
                    "Analyzing experimental uncertainty and error margins ensures that our models remain reliable when deployed in technology."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Interdisciplinary Connections & Research Frontiers",
                "diagram_type": "flowchart",
                "items": [
                    "Cross-Disciplinary Integration",
                    "Advanced Sensor Technology",
                    "Emerging Experimental Paradigms",
                    "Global Environmental Impact",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Modern research into {topic} frequently bridges physics, chemistry, biology, and computational engineering. "
                    "Advances in precision instrumentation allow researchers to observe microscopic and macroscopic dynamics with unprecedented clarity. "
                    "These discoveries drive cleaner energy, sustainable materials, and deeper understanding of planetary systems."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Scientific Synthesis & Core Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Fundamental Conservation Laws",
                    "Thermodynamic Equilibrium",
                    "Reproducible Experimental Evidence",
                    "Unified Conceptual Paradigm",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To conclude our scientific investigation into {topic}, always remember the core invariants of empirical science. "
                    "First, observe nature objectively without preconceptions. "
                    "Second, recognize that energy, mass, and charge are governed by strict conservation laws. "
                    "Third, insist upon reproducible experimental evidence before accepting theoretical conclusions. "
                    "These timeless scientific habits equip you to explore the universe with curiosity, skepticism, and rigor."
                ),
            })

        quizzes = [
            QuizQuestion(
                question=f"What is a fundamental requirement when evaluating scientific claims in {topic}?",
                options=[
                    "Reproducible empirical evidence and controlled observation",
                    "Unverified personal intuition without measurement",
                    "Ignoring contradictory experimental data",
                    "Changing physical constants arbitrarily",
                ],
                correct_index=0,
                explanation=f"Scientific investigation of {topic} relies on objective observation, controlled testing, and repeatable measurement.",
                hint="Think about what distinguishes science from speculation.",
                concept_reference="Empirical Methodology",
            ),
            QuizQuestion(
                question="Why are conservation laws fundamental across all physical sciences?",
                options=[
                    "Because total energy and matter remain constant across closed systems",
                    "Because energy is destroyed whenever an object moves",
                    "Because physical rules change depending on the time of day",
                    "Because measurements cannot be repeated",
                ],
                correct_index=0,
                explanation="Conservation laws (energy, mass, momentum) form invariant physical constraints that govern all physical and chemical processes.",
                hint="Consider the principle that energy cannot be created or destroyed.",
                concept_reference="Conservation Laws",
            ),
        ]
        return scenes, quizzes

    def _build_programming_scenes(self, topic: str, level: str, target_sec: int, evidence: List[EvidenceSource]) -> Tuple[list, List[QuizQuestion]]:
        """Generates coding scenes: specialized Python loops or grounded arbitrary programming."""
        t_low = topic.lower()
        is_loop = any(k in t_low for k in ["loop", "for loop", "while", "iteration"])

        if is_loop:
            return self._build_loop_scenes(topic, level, target_sec)
        else:
            return self._build_arbitrary_programming_scenes(topic, level, target_sec)

    def _build_loop_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Preserves Python loop scenes with interactive code walkthroughs."""
        if target_sec >= 300:
            s1 = (
                f"Welcome to our software engineering masterclass on {topic}. "
                "In computer programming, iteration is the foundational technique that allows a machine to execute a set of instructions repeatedly with speed and precision. "
                "Instead of manually writing redundant lines of code, programmers use loops to automate repetitive calculations, parse complex data collections, and manage system events. "
                "Python provides elegant for and while loops designed for readable, maintainable, and bug-free execution. "
                "Today we will inspect how Python loops manage state, trace loop counter variables, and optimize memory usage in production software."
            )
            s2 = (
                "Let us examine how a standard Python for loop operates step-by-step using the built-in range function. "
                "When you write 'for i in range(3):', Python generates a half-open sequence starting at index zero and stopping strictly before three. "
                "On the very first iteration, the loop counter variable 'i' is assigned the value zero, and the body executes. "
                "On the second iteration, 'i' advances to one. On the third iteration, 'i' reaches two. "
                "Once the sequence is exhausted, the loop automatically terminates cleanly without manual counter increments."
            )
            s3 = (
                "A common architectural pattern in software engineering is using an accumulator variable inside a loop to aggregate running totals. "
                "Before the loop begins, we initialize a variable like 'total' to zero. "
                "Inside the loop body, we add the current item or calculated value to the accumulator on every iteration. "
                "This pattern forms the basis of statistical algorithms, financial ledgers, and database query aggregations worldwide. "
                "By decoupling the traversal of data from the business logic applied to each element, your code remains clean, modular, and easy to test."
            )
        elif target_sec >= 180:
            s1 = (
                f"Welcome to our software engineering masterclass on {topic}. "
                "In computer programming, iteration is the foundational technique that allows a machine to execute instructions repeatedly. "
                "Instead of manually duplicating code, programmers use loops to automate repetitive tasks and process collections of data. "
                "Today we inspect how Python loops manage state, trace counter variables, and terminate safely."
            )
            s2 = (
                "Let us examine how a standard Python for loop operates step-by-step using the range function. "
                "When you write 'for i in range(3):', Python creates an iterable sequence generating zero, one, and two. "
                "On the first iteration, 'i' is assigned zero, and the print statement displays zero. "
                "On the second iteration, 'i' becomes one, and on the third, 'i' becomes two. "
                "Once the sequence ends, Python exits the loop body and continues executing the remainder of the script."
            )
            s3 = (
                "A common architectural pattern in software engineering is using an accumulator variable inside a loop. "
                "Before the loop begins, we initialize 'total' to zero. "
                "During each pass, we add the loop index or item value to 'total'. "
                "This fundamental pattern powers algorithms from calculating shopping cart sums to running machine learning weight updates."
            )
        elif target_sec >= 120:
            s1 = (
                f"Welcome to our programming masterclass on {topic}. "
                "In computer programming, iteration allows a computer to repeat instructions automatically without code duplication. "
                "Python provides elegant for loops that iterate cleanly over sequences, lists, and numerical ranges. "
                "Today we will walk through a concrete Python snippet line by line to understand how loop counters and execution flow work."
            )
            s2 = (
                "Let us analyze our Python loop walkthrough. "
                "The statement 'for i in range(3):' instructs Python to generate values starting at zero and ending before three. "
                "On the first iteration, variable 'i' receives zero, and the loop body executes. "
                "On subsequent iterations, 'i' takes the values one and two. "
                "Understanding zero-based indexing is vital for working with arrays, lists, and data structures."
            )
            s3 = (
                "Inside the loop body, statements execute sequentially for every item in the sequence. "
                "Here, the indented print call displays the current loop index alongside a status message. "
                "Accumulator variables, conditional checks, and data transformations all occur within this repeated block. "
                "Once range three is exhausted, execution drops out of the loop and completes the script."
            )
        else:
            s1 = (
                f"Welcome to our programming lesson on {topic}. "
                "Loops allow programs to repeat instructions efficiently without manual code duplication. "
                "In Python, the for loop is the standard tool for iterating over sequences."
            )
            s2 = (
                "In 'for i in range(3):', the variable 'i' takes values 0, 1, and 2 in sequence. "
                "Each iteration executes the indented body, printing the current step. "
                "Once the range completes, the loop terminates automatically."
            )
            s3 = (
                "Loops power everything from summing numbers to searching databases and animating games. "
                "Mastering loop flow and variable state is the first major milestone in becoming a programmer."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Introduction to {topic}",
                "subtitle": f"Automating iteration and control flow for {level} coders",
                "key_points": [
                    "Why loops exist: Eliminating manual repetition and DRY code design",
                    "The range(n) generator: Zero-indexed half-open intervals",
                    "Tracing the loop counter variable 'i' across iterations",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "code_walkthrough",
                "heading": "Code Walkthrough: The Python For Loop",
                "code": "# Python iteration walkthrough\ntotal = 0\nfor i in range(3):\n    total += i\n    print(f'Step {i}: total={total}')\nprint('Done!')",
                "code_language": "python",
                "highlight_lines": [3, 4],
                "expected_output": "Step 0: total=0\nStep 1: total=1\nStep 2: total=3\nDone!",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Execution Lifecycle of an Iteration Loop",
                "diagram_type": "flowchart",
                "items": [
                    "Initialize Sequence / range(n)",
                    "Check Termination Condition",
                    "Execute Body Statements",
                    "Advance Counter / Exit",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "State Tracking & Loop Invariants",
                "diagram_type": "flowchart",
                "items": [
                    "Pre-Loop Setup (total = 0)",
                    "Iteration 0 (total = 0 + 0 = 0)",
                    "Iteration 1 (total = 0 + 1 = 1)",
                    "Iteration 2 (total = 1 + 2 = 3)",
                ],
                "layout": "horizontal",
                "narration": (
                    "To understand algorithms deeply, developers trace state variables using a trace table. "
                    "At the start, 'total' is zero. In the first pass, adding zero leaves 'total' at zero. "
                    "In the second pass, adding one increases 'total' to one. "
                    "In the third pass, adding two brings 'total' to three. "
                    "Verifying these step-by-step state transitions guarantees that your loops produce mathematically correct outputs."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Defensive Programming: Preventing Infinite Loops",
                "diagram_type": "flowchart",
                "items": [
                    "Define Clear Exit Condition",
                    "Ensure Loop Variable Updates",
                    "Set Safety Boundary Limits",
                    "Handle Empty Collections",
                ],
                "layout": "horizontal",
                "narration": (
                    "When writing while loops or complex recursive iterations, defensive programming is essential to prevent infinite loops. "
                    "Always ensure that the condition governing loop execution is guaranteed to evaluate to False after a finite number of steps. "
                    "Make certain that the loop control variable is modified during every pass. "
                    "Setting maximum iteration ceilings protects production servers from unresponsive freezes and memory exhaustion."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Algorithmic Complexity & Big-O Notation",
                "diagram_type": "flowchart",
                "items": [
                    "Single Loop: Linear Time O(N)",
                    "Nested Loops: Quadratic Time O(N²)",
                    "Early Exit with Break Statements",
                    "Optimizing Iterative Pipelines",
                ],
                "layout": "horizontal",
                "narration": (
                    "In professional computer science, loop design directly dictates software performance and runtime complexity. "
                    "A single loop processing N items runs in linear time, denoted as Big-O of N. "
                    "Nesting a loop inside another loop scales quadratically to Big-O of N squared, which can severely slow down large data pipelines. "
                    "Using early break statements, hash lookups, and generator expressions helps keep your software responsive, lean, and fast."
                ),
            })

        quizzes = [
            QuizQuestion(
                question="In Python, what exact sequence of numbers is generated by 'range(3)'?",
                options=["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "3, 2, 1"],
                correct_index=0,
                explanation="Python's range(n) produces half-open intervals starting at index 0 and stopping strictly before n, yielding 0, 1, and 2.",
                hint="Remember that Python uses zero-based indexing and stops before the specified stop value.",
                concept_reference="Python range() Function",
            ),
            QuizQuestion(
                question="Why do software engineers use loops instead of repeating lines of code?",
                options=[
                    "To automate repetitive operations and maintain DRY code",
                    "To make the computer CPU run slower",
                    "To erase variables from computer memory",
                    "To avoid using functions altogether",
                ],
                correct_index=0,
                explanation="Loops prevent manual copy-pasting of code, automate repetitive tasks, and adhere to Don't Repeat Yourself (DRY) principles.",
                hint="Think about efficiency and avoiding redundant copy-paste errors.",
                concept_reference="Code Automation & DRY",
            ),
        ]
        return scenes, quizzes

    def _build_arbitrary_programming_scenes(self, topic: str, level: str, target_sec: int) -> Tuple[list, List[QuizQuestion]]:
        """Handles arbitrary programming and computer science topics."""
        if target_sec >= 120:
            s1 = (
                f"Welcome to our software engineering masterclass exploring {topic}. "
                "Modern software development relies on clean algorithmic logic, modular data structures, and predictable execution flow. "
                "In this lesson, we break down code syntax, explain underlying memory management, and demonstrate practical programming patterns. "
                "Writing clean, tested code enables developers to build scalable systems that solve complex real-world problems."
            )
            s2 = (
                f"To understand {topic}, let us examine the syntax and operational flow of the code. "
                "When a program runs, the interpreter or compiler parses statements sequentially, allocating variables and executing functions. "
                "Keeping functions focused on a single responsibility makes algorithms easier to debug and maintain. "
                "Careful error handling and input validation protect your software from unexpected runtime exceptions."
            )
            s3 = (
                f"Applying {topic} to a production problem highlights the importance of clean architecture. "
                "By modularizing logic and decoupling components, codebases can scale smoothly without accumulating technical debt. "
                "Automated unit testing and code reviews guarantee that features operate reliably across diverse runtime environments."
            )
        else:
            s1 = (
                f"Welcome to our coding walkthrough on {topic}. "
                "Programming turns logical instructions into working applications. "
                "Today we analyze the core syntax and execution flow of this topic."
            )
            s2 = (
                f"Understanding how {topic} executes helps developers write clean, maintainable software. "
                "Tracing variable state and control structures ensures predictable program behavior."
            )
            s3 = (
                f"Applying these coding principles allows you to build reliable, high-performance software. "
                "Consistent practice transforms basic syntax into confident software craftsmanship."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Mastering {topic}",
                "subtitle": f"Software engineering concepts for {level} developers",
                "key_points": [
                    f"Core syntax and semantics of {topic}",
                    "Algorithmic structure and state management",
                    "Best practices for testing and maintainability",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "code_walkthrough",
                "heading": f"Code Implementation: {topic}",
                "code": f"# Implementation of {topic}\ndef execute_task(data):\n    result = [item.strip() for item in data]\n    return result\n\noutput = execute_task(['alpha', 'beta'])\nprint('Result:', output)",
                "code_language": "python",
                "highlight_lines": [2, 3],
                "expected_output": "Result: ['alpha', 'beta']",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Execution Flow & Data Transformation",
                "diagram_type": "flowchart",
                "items": [
                    "Input Parameter Validation",
                    "Data Processing & Logic",
                    "State Mutation / Mapping",
                    "Return Validated Output",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Modular Design & Testing Strategies",
                "diagram_type": "flowchart",
                "items": [
                    "Decoupled Component Architecture",
                    "Automated Unit Test Coverage",
                    "Mock External Dependencies",
                    "Continuous Integration Gate",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Writing reliable code for {topic} requires separating business logic from I/O and external dependencies. "
                    "When components are isolated, engineers can write fast, deterministic unit tests that verify edge cases. "
                    "Running tests automatically on every change catches regressions before software reaches production users."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Error Handling & Defensive Coding",
                "diagram_type": "flowchart",
                "items": [
                    "Catch Specific Exceptions",
                    "Graceful Degradation Paths",
                    "Structured Logging & Auditing",
                    "Clean Resource Cleanup",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Defensive programming ensures that implementations of {topic} remain resilient when unexpected data arrives. "
                    "Rather than catching generic errors, handle specific exception types with actionable fallbacks. "
                    "Always ensure files, database connections, and memory buffers are safely closed after execution."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Engineering Synthesis & Code Quality",
                "diagram_type": "flowchart",
                "items": [
                    "Readability & PEP Conventions",
                    "Algorithmic Efficiency Review",
                    "Comprehensive Documentation",
                    "Production Deployment Readiness",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To master {topic} as a software engineer, prioritize readability, maintainability, and testing. "
                    "Code is read far more often than it is written; clear variable naming and concise comments save days of future debugging. "
                    "By combining clean architecture with disciplined testing, you build software that stands the test of time."
                ),
            })

        quizzes = [
            QuizQuestion(
                question=f"What is a primary engineering goal when writing code for {topic}?",
                options=[
                    "Writing modular, readable, and testable functions",
                    "Writing code on a single line without indentation",
                    "Avoiding all testing and error handling",
                    "Using random variable names that obscure meaning",
                ],
                correct_index=0,
                explanation=f"Clean code in {topic} emphasizes readability, modularity, and thorough automated testing to ensure long-term reliability.",
                hint="Think about making code easy for other engineers to understand and maintain.",
                concept_reference="Clean Code Principles",
            ),
            QuizQuestion(
                question="Why is automated unit testing critical in software development?",
                options=[
                    "It verifies that functions work correctly and catches regressions early",
                    "It permanently prevents the program from compiling",
                    "It replaces the need to write working code",
                    "It slows down computer boot time",
                ],
                correct_index=0,
                explanation="Unit tests give developers confidence that code behaves as expected and that new changes do not break existing features.",
                hint="Consider how you verify that your code works before releasing it.",
                concept_reference="Automated Testing",
            ),
        ]
        return scenes, quizzes

    def _build_general_scenes(self, topic: str, level: str, target_sec: int, evidence: List[EvidenceSource]) -> Tuple[list, List[QuizQuestion]]:
        """Handles completely arbitrary topics with honest, grounded conceptual lessons."""
        provenance_note = ""
        if evidence:
            provenance_note = f" (Referencing local source: {evidence[0].source_name})"

        if target_sec >= 120:
            s1 = (
                f"Welcome to our visual exploration of {topic}{provenance_note}. "
                "Every subject possesses foundational concepts, functional mechanisms, and practical applications that connect it to the wider world. "
                "In this lesson, we break down core principles and explore step-by-step developments. "
                "This foundational overview provides essential knowledge; for specialized mastery, you can import reference materials into your local library."
            )
            s2 = (
                f"At the heart of {topic} lies a structured relationship between core elements and observable outcomes. "
                "Understanding any system requires identifying its primary components, tracing how they interact, and observing key constraints. "
                "By analyzing these relationships step by step, we uncover consistent patterns that clarify how the subject functions in practice."
            )
            s3 = (
                f"Applying our understanding of {topic} reveals why it holds practical value across everyday life and academic study. "
                "Examining concrete examples helps ground abstract ideas into tangible insights. "
                "By connecting core definitions with real-world applications, we build durable knowledge that can be adapted to new challenges."
            )
        else:
            s1 = (
                f"Welcome to our lesson on {topic}{provenance_note}. "
                "Every subject can be understood by breaking down its foundational definitions and practical mechanisms. "
                "Today we explore the essential principles that define this topic."
            )
            s2 = (
                f"Understanding {topic} begins by analyzing how its primary components interact. "
                "Tracing these steps reveals consistent patterns and practical relationships."
            )
            s3 = (
                f"Connecting the principles of {topic} to real-world applications clarifies its lasting value. "
                "Systematic exploration transforms unfamiliar concepts into lasting understanding."
            )

        scenes = [
            {
                "id": "scene_01",
                "type": "title_card",
                "heading": f"Understanding {topic}",
                "subtitle": f"A structured foundational overview for {level} learners",
                "key_points": [
                    f"Core definitions and scope of {topic}",
                    "Key components and dynamic interactions",
                    "Practical applications and real-world significance",
                ],
                "narration": s1,
            },
            {
                "id": "scene_02",
                "type": "diagram",
                "heading": "Core Components & Structural Framework",
                "diagram_type": "flowchart",
                "items": [
                    f"Primary Concepts of {topic}",
                    "Internal Mechanisms & Interactions",
                    "Guiding Constraints & Principles",
                    "Observable Outcomes & Balance",
                ],
                "layout": "horizontal",
                "narration": s2,
            },
            {
                "id": "scene_03",
                "type": "diagram",
                "heading": "Practical Applications & Case Study",
                "diagram_type": "flowchart",
                "items": [
                    "Identify Initial Context",
                    "Apply Structural Principles",
                    "Observe Practical Results",
                    "Synthesize Key Learnings",
                ],
                "layout": "horizontal",
                "narration": s3,
            },
        ]

        if target_sec >= 90:
            scenes.append({
                "id": "scene_04",
                "type": "diagram",
                "heading": "Systematic Analysis & Real-World Nuance",
                "diagram_type": "flowchart",
                "items": [
                    "Evaluate Underlying Assumptions",
                    "Analyze Boundary Limitations",
                    "Examine Environmental Variables",
                    "Refine Conceptual Model",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Deeper investigation into {topic} requires examining boundary conditions and underlying assumptions. "
                    "No system operates in total isolation; environmental factors and operational constraints shape final outcomes. "
                    "Refining our understanding to account for these nuances ensures that our conclusions remain accurate and practical."
                ),
            })
        if target_sec >= 180:
            scenes.append({
                "id": "scene_05",
                "type": "diagram",
                "heading": "Interdisciplinary Insights & Connections",
                "diagram_type": "flowchart",
                "items": [
                    "Connect Related Subject Fields",
                    "Identify Cross-Disciplinary Patterns",
                    "Leverage Shared Analytical Methods",
                    "Formulate Integrated Perspectives",
                ],
                "layout": "horizontal",
                "narration": (
                    f"Insights gained from studying {topic} frequently connect with broader academic and scientific disciplines. "
                    "Recognizing shared patterns across different fields enhances creative problem solving and analytical thinking. "
                    "These cross-disciplinary connections foster a versatile, adaptable intellectual framework."
                ),
            })
        if target_sec >= 240:
            scenes.append({
                "id": "scene_06",
                "type": "diagram",
                "heading": "Conceptual Synthesis & Lifelong Mastery",
                "diagram_type": "flowchart",
                "items": [
                    "Internalize Core Principles",
                    "Practice Structured Application",
                    "Evaluate Complex Scenarios",
                    "Pursue Deeper Inquiry",
                ],
                "layout": "horizontal",
                "narration": (
                    f"To summarize our exploration of {topic}, focus on three enduring principles. "
                    "First, master the foundational definitions and structural relationships that form the subject's core. "
                    "Second, apply these concepts systematically when analyzing new scenarios. "
                    "Third, continue exploring through local reference materials to deepen your expertise and curiosity."
                ),
            })

        quizzes = [
            QuizQuestion(
                question=f"What is the first step when developing understanding of {topic}?",
                options=[
                    "Mastering foundational definitions and structural relationships",
                    "Memorizing isolated facts without understanding their connections",
                    "Ignoring how components interact with each other",
                    "Assuming every topic follows identical identical rules",
                ],
                correct_index=0,
                explanation=f"Building solid understanding in {topic} begins by mastering fundamental concepts and tracing how internal elements interact.",
                hint="Think about the foundation needed before solving complex problems.",
                concept_reference="Foundational Principles",
            ),
            QuizQuestion(
                question="Why is it important to connect abstract principles to real-world applications?",
                options=[
                    "It builds durable, practical knowledge that can be adapted to new problems",
                    "It makes the subject impossible to apply in practice",
                    "It eliminates the need to understand basic definitions",
                    "It ensures that no further learning is necessary",
                ],
                correct_index=0,
                explanation="Grounding concepts in practical examples reinforces understanding and helps learners apply ideas in unfamiliar contexts.",
                hint="Consider how seeing an example makes a definition clearer.",
                concept_reference="Practical Application",
            ),
        ]
        return scenes, quizzes

    def _handle_generation_failure(
        self,
        error_type: str,
        topic: str,
        level: str,
        language: str,
        target_duration_seconds: int,
    ) -> Tuple[LessonPlan, bool]:
        """Simulates generation error handling for test suite coverage."""
        return self.get_fallback_lesson(topic, target_duration_seconds=target_duration_seconds, level=level, language=language), True
