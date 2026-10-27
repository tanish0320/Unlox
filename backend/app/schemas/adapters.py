"""
Schema Compatibility Adapters for Blu Visual Teacher.
Person 2 Owned.

Provides bidirectional transformation between:
1. Canonical LessonPlan v1.0 (with embedded educational metadata)
2. Person 1 Provisional LessonPlan (v1.0.0) + LessonNotes

Preserves:
- Native scripts and Unicode text (Hindi, Tamil, Telugu, Kannada).
- Code formatting and exact line numbering.
- Audio synchronization metadata.
"""

from typing import List, Optional

from backend.app.schemas.canonical_lesson import (
    CanonicalLessonPlan,
    CodeWalkthroughScene as CanonicalCodeScene,
    DiagramItem as CanonicalDiagramItem,
    DiagramScene as CanonicalDiagramScene,
    GlossaryItem,
    RevisionQuestionItem,
    TitleCardScene as CanonicalTitleScene,
)
from backend.app.schemas.lesson_notes import (
    ArtifactRef,
    KeyConcept,
    LessonExample,
    LessonNotes,
    ModelMetadata,
    RevisionQuestion,
)
from backend.app.schemas.provisional_lesson import (
    CodeWalkthroughScene as ProvisionalCodeScene,
    DiagramItem as ProvisionalDiagramItem,
    DiagramScene as ProvisionalDiagramScene,
    LessonPlan as ProvisionalLessonPlan,
    TitleCardScene as ProvisionalTitleScene,
)


def provisional_to_canonical(
    provisional: ProvisionalLessonPlan,
    notes: Optional[LessonNotes] = None,
    source_language: str = "en",
) -> CanonicalLessonPlan:
    """
    Transforms Person 1's Provisional LessonPlan and optional LessonNotes
    into the strict Canonical LessonPlan v1.0 model.
    """
    canonical_scenes = []

    for scene in provisional.scenes:
        if scene.type == "title_card":
            canonical_scenes.append(
                CanonicalTitleScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    subtitle=scene.subtitle,
                    key_points=list(scene.key_points),
                )
            )
        elif scene.type == "diagram":
            structured_nodes = None
            if scene.structured_nodes:
                structured_nodes = [
                    CanonicalDiagramItem(label=node.label, detail=node.detail)
                    for node in scene.structured_nodes
                ]
            canonical_scenes.append(
                CanonicalDiagramScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    items=list(scene.items),
                    layout=scene.layout,
                    structured_nodes=structured_nodes,
                )
            )
        elif scene.type == "code_walkthrough":
            canonical_scenes.append(
                CanonicalCodeScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    code=scene.code,
                    code_language=scene.code_language,
                    highlight_lines=list(scene.highlight_lines),
                    expected_output=scene.expected_output,
                )
            )

    # Normalize duration within [30, 90]
    target_duration = provisional.target_duration_seconds or 60
    target_duration = max(30, min(90, target_duration))

    # Normalize title to max 120 chars
    title = provisional.title[:120].strip()

    # Normalize language to 2-3 lowercase chars
    lang = provisional.language.lower()[:3]

    # Map educational metadata if provided from notes
    summary = notes.summary if notes else None
    objectives = list(notes.learning_objectives) if notes else None
    takeaways = list(notes.key_takeaways) if notes else None
    glossary = (
        [GlossaryItem(term=kc.term, definition=kc.definition) for kc in notes.key_concepts]
        if notes
        else None
    )
    revision_questions = (
        [
            RevisionQuestionItem(question=rq.question, answer=rq.answer)
            for rq in notes.revision_questions
        ]
        if notes
        else None
    )

    return CanonicalLessonPlan(
        schema_version="1.0",
        title=title,
        topic=provisional.topic,
        level=provisional.level,
        language=lang,
        source_language=source_language.lower()[:3],
        target_duration_seconds=target_duration,
        scenes=canonical_scenes,
        summary=summary,
        learning_objectives=objectives,
        key_takeaways=takeaways,
        glossary=glossary,
        revision_questions=revision_questions,
    )


def canonical_to_provisional(canonical: CanonicalLessonPlan) -> ProvisionalLessonPlan:
    """
    Transforms a Canonical LessonPlan v1.0 back into Person 1's
    Provisional LessonPlan schema for consumption by Person 1's pipeline.
    """
    provisional_scenes = []

    for scene in canonical.scenes:
        if scene.type == "title_card":
            provisional_scenes.append(
                ProvisionalTitleScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    subtitle=scene.subtitle,
                    key_points=list(scene.key_points),
                )
            )
        elif scene.type == "diagram":
            structured_nodes = None
            if scene.structured_nodes:
                structured_nodes = [
                    ProvisionalDiagramItem(label=node.label, detail=node.detail)
                    for node in scene.structured_nodes
                ]
            provisional_scenes.append(
                ProvisionalDiagramScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    items=list(scene.items),
                    layout=scene.layout,
                    structured_nodes=structured_nodes,
                )
            )
        elif scene.type == "code_walkthrough":
            provisional_scenes.append(
                ProvisionalCodeScene(
                    id=scene.id,
                    heading=scene.heading,
                    narration=scene.narration,
                    code=scene.code,
                    code_language=scene.code_language,
                    highlight_lines=list(scene.highlight_lines),
                    expected_output=scene.expected_output,
                )
            )

    return ProvisionalLessonPlan(
        schema_version="1.0.0",
        title=canonical.title,
        topic=canonical.topic or canonical.title,
        level=canonical.level,
        language=canonical.language,
        target_duration_seconds=canonical.target_duration_seconds,
        scenes=provisional_scenes,
    )


def canonical_to_notes(
    canonical: CanonicalLessonPlan,
    fallback_used: bool = False,
    video_filename: str = "lesson.mp4",
) -> LessonNotes:
    """
    Extracts or builds a LessonNotes instance from a CanonicalLessonPlan.
    """
    topic = canonical.topic or canonical.title

    summary = canonical.summary or (
        f"This {canonical.level} lesson on '{topic}' covers {len(canonical.scenes)} animated stages "
        f"in {canonical.language}."
    )

    objectives = canonical.learning_objectives or [
        f"Understand foundational concepts of {topic}",
        f"Analyze step-by-step logic in {canonical.language}",
        "Review key practical takeaways",
    ]

    key_concepts = (
        [KeyConcept(term=g.term, definition=g.definition) for g in canonical.glossary]
        if canonical.glossary
        else [
            KeyConcept(
                term=topic,
                definition=f"Primary subject of this {canonical.level} lesson.",
            )
        ]
    )

    step_explanations = [
        f"Step {i} ({s.heading}): {s.narration}"
        for i, s in enumerate(canonical.scenes, start=1)
    ]

    examples: List[LessonExample] = []
    for s in canonical.scenes:
        if s.type == "code_walkthrough":
            examples.append(
                LessonExample(
                    description=s.heading,
                    code=s.code,
                    output=s.expected_output,
                )
            )

    takeaways = canonical.key_takeaways or [f"Core understanding of {topic}"]

    revision_questions = (
        [RevisionQuestion(question=rq.question, answer=rq.answer) for rq in canonical.revision_questions]
        if canonical.revision_questions
        else [
            RevisionQuestion(
                question=f"What is the main topic covered in this lesson?",
                answer=f"The lesson explains {topic}.",
            )
        ]
    )

    artifacts = [
        ArtifactRef(type="video", filename=video_filename),
        ArtifactRef(type="notes", filename="lesson-notes.json"),
    ]

    return LessonNotes(
        schema_version="1.0.0",
        title=canonical.title,
        topic=topic,
        language=canonical.language,
        level=canonical.level,
        summary=summary,
        learning_objectives=objectives,
        key_concepts=key_concepts,
        step_by_step_explanation=step_explanations,
        examples=examples,
        key_takeaways=takeaways,
        revision_questions=revision_questions,
        generated_artifacts=artifacts,
        model_metadata=ModelMetadata(
            planner="canonical-adapter",
            translator=None if canonical.language == "en" else "adapter-translator",
            tts="mock-tts",
            fallback_used=fallback_used,
        ),
    )
