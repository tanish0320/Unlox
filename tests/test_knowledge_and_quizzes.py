"""
Regression and verification tests for Offline Knowledge Base,
Authoritative Topic Preservation, and Quiz Question Validation.
"""

import pytest
from backend.app.schemas.provisional_lesson import LessonPlan, QuizQuestion, EvidenceSource
from backend.app.services.knowledge.offline_knowledge import get_knowledge_base, LocalKnowledgeBase
from backend.app.services.planner.mock_planner import MockLessonPlanner


def test_offline_knowledge_fts5_indexing_and_provenance():
    """Verify SQLite FTS5 retrieves grounded evidence with filename and page number."""
    kb = get_knowledge_base()
    stats = kb.get_stats()
    assert stats["total_documents"] >= 5
    assert stats["total_passages"] >= 10
    assert stats["offline_ready"] is True

    # Search for Harappa / Indus Valley
    passages = kb.search("Indus Valley Harappa Mohenjo-daro drainage")
    assert len(passages) >= 1
    top_p = passages[0]
    assert "ancient_civilizations" in top_p.source_name
    assert top_p.page_number is not None
    assert "Indus" in top_p.excerpt or "Harappa" in top_p.excerpt
    assert top_p.verified is True

    # Search for Pythagorean theorem
    pyth_passages = kb.search("Pythagorean theorem hypotenuse square")
    assert len(pyth_passages) >= 1
    assert "pythagoras" in pyth_passages[0].source_name
    assert "hypotenuse" in pyth_passages[0].excerpt.lower()


def test_topic_preservation_ancient_river_valley_civilizations():
    """Verify history request generates ancient river civilizations content, not photosynthesis or code."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="Ancient river valley civilizations",
        level="beginner",
        language="en",
        target_duration_seconds=120,
    )

    assert plan.topic == "Ancient river valley civilizations"
    assert len(plan.scenes) >= 3

    # Check narration mentions real historical facts
    full_narration = " ".join(s.narration for s in plan.scenes).lower()
    assert any(term in full_narration for term in ["indus", "harappa", "nile", "mesopotamia", "river", "agriculture"])
    assert "chloroplast" not in full_narration
    assert "def " not in full_narration

    # Verify evidence sources are attached
    assert len(plan.evidence_sources) >= 1
    assert any("civilization" in src.source_name for src in plan.evidence_sources)

    # Verify quiz questions
    assert len(plan.quiz_questions) >= 1
    q1 = plan.quiz_questions[0]
    assert len(q1.options) == 4
    assert 0 <= q1.correct_index <= 3
    assert q1.options[q1.correct_index] in ["Indus Valley Civilization", "Rich alluvial silt and freshwater supported agriculture", "Rich alluvial silt and freshwater for agriculture"]
    # Ensure no generic filler in options
    for opt in q1.options:
        assert opt not in ["None of the above", "A common misconception", "An alternative unrelated outcome"]


def test_topic_preservation_pythagorean_theorem():
    """Verify mathematics request for Pythagorean theorem generates geometric/hypotenuse explanation."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="The Pythagorean Theorem",
        level="beginner",
        language="en",
        target_duration_seconds=120,
    )

    assert plan.topic == "The Pythagorean Theorem"
    full_narration = " ".join(s.narration for s in plan.scenes).lower()
    assert "hypotenuse" in full_narration
    assert "right" in full_narration or "triangle" in full_narration
    assert "c²" in full_narration or "c^2" in full_narration or "square" in full_narration

    # Must NOT have code walkthrough or photosynthesis
    scene_types = [s.type for s in plan.scenes]
    assert "code_walkthrough" not in scene_types
    assert "chloroplast" not in full_narration

    # Verify quiz questions
    assert len(plan.quiz_questions) >= 1
    for q in plan.quiz_questions:
        assert len(q.options) == 4
        assert 0 <= q.correct_index <= 3
        assert len(q.explanation) > 10


def test_topic_preservation_newtons_laws_physics():
    """Verify science request for Newton's laws generates classical mechanics, NOT photosynthesis."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="Newton's Laws of Motion",
        level="beginner",
        language="en",
        target_duration_seconds=120,
    )

    assert plan.topic == "Newton's Laws of Motion"
    full_narration = " ".join(s.narration for s in plan.scenes).lower()
    assert "force" in full_narration
    assert "acceleration" in full_narration or "inertia" in full_narration or "mass" in full_narration
    assert "photosynthesis" not in full_narration
    assert "chloroplast" not in full_narration

    # Verify quiz questions
    assert len(plan.quiz_questions) >= 1
    for q in plan.quiz_questions:
        assert len(q.options) == 4
        assert 0 <= q.correct_index <= 3


def test_arbitrary_unsupported_topic_does_not_silently_substitute():
    """Verify that an arbitrary topic receives topic-aligned content, NOT hardcoded photosynthesis/loops/ratios."""
    planner = MockLessonPlanner()
    plan, _ = planner.plan_lesson(
        topic="Aerodynamics of Gliders",
        level="beginner",
        language="en",
        target_duration_seconds=120,
    )

    assert plan.topic == "Aerodynamics of Gliders"
    full_narration = " ".join(s.narration for s in plan.scenes).lower()
    assert "aerodynamics" in full_narration or "glider" in full_narration

    # Crucial: Must NOT silently substitute photosynthesis, ratios, or python loops
    assert "chloroplast" not in full_narration
    assert "thylakoid" not in full_narration
    assert "def " not in full_narration
    assert "ratio of three to four" not in full_narration

    # Quiz must be about the topic or general reasoning, never chloroplasts
    assert len(plan.quiz_questions) >= 1
    for q in plan.quiz_questions:
        assert "chloroplast" not in q.question.lower()
        for opt in q.options:
            assert opt not in ["None of the above", "A common misconception", "An alternative unrelated outcome"]


def test_quiz_answers_are_never_narration_paragraphs():
    """Verify quiz answers are concise, verified concepts rather than dumping scene narration."""
    planner = MockLessonPlanner()
    for topic in ["Ancient river valley civilizations", "The Pythagorean Theorem", "Photosynthesis in Plants", "Python Loops"]:
        plan, _ = planner.plan_lesson(topic, target_duration_seconds=60)
        assert len(plan.quiz_questions) >= 1
        for q in plan.quiz_questions:
            correct_ans = q.options[q.correct_index]
            assert len(correct_ans) < 150  # Must be a concise answer, not a 300-word paragraph
            assert correct_ans != plan.scenes[0].narration
