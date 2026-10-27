"""
Notes Generator Service for Blu Visual Teacher.
Status: Person 1 Owned.

Derives LessonNotes strictly from canonical validated LessonPlan and audio manifest.
Ensures zero contradiction between video narration and study notes.
"""

from typing import List
from backend.app.schemas.audio_manifest import AudioManifest
from backend.app.schemas.lesson_notes import (
    ArtifactRef,
    KeyConcept,
    LessonExample,
    LessonNotes,
    ModelMetadata,
    RevisionQuestion,
)
from backend.app.schemas.provisional_lesson import (
    CodeWalkthroughScene,
    DiagramScene,
    LessonPlan,
    TitleCardScene,
)


def generate_study_notes(
    lesson: LessonPlan,
    manifest: AudioManifest,
    fallback_used: bool = False,
    video_filename: str = "lesson.mp4",
) -> LessonNotes:
    """
    Builds structured LessonNotes from the canonical lesson data.
    """
    # 1. Objectives
    objectives: List[str] = []
    key_points: List[str] = []
    examples: List[LessonExample] = []
    step_explanations: List[str] = []

    for i, scene in enumerate(lesson.scenes, start=1):
        step_explanations.append(f"Step {i} ({scene.heading}): {scene.narration}")

        if isinstance(scene, TitleCardScene) and scene.key_points:
            key_points.extend(scene.key_points)

        elif isinstance(scene, CodeWalkthroughScene):
            examples.append(
                LessonExample(
                    description=scene.heading,
                    code=scene.code,
                    output=scene.expected_output,
                )
            )

        elif isinstance(scene, DiagramScene):
            for item in scene.items:
                key_points.append(f"Diagram flow: {item}")

    if not objectives:
        objectives = [
            f"Understand core principles of {lesson.topic}",
            f"Analyze step-by-step logic in {lesson.language} narration",
            "Synthesize practical conceptual takeaways",
        ]

    # 2. Key concepts
    concepts = [
        KeyConcept(
            term=lesson.topic,
            definition=f"Primary subject matter of this {lesson.level} instructional unit.",
        ),
        KeyConcept(
            term="Sequential Flow",
            definition="Progression across scenes synchronized with voice narration.",
        ),
    ]

    # 3. Revision questions
    revision_questions = [
        RevisionQuestion(
            question=f"What is the main takeaway regarding {lesson.topic}?",
            answer=lesson.scenes[0].narration,
        ),
        RevisionQuestion(
            question=f"How many distinct steps were covered in this lesson?",
            answer=f"{len(lesson.scenes)} steps were demonstrated in sequence.",
        ),
    ]

    summary = (
        f"This {lesson.level} lesson on '{lesson.topic}' provides a {manifest.total_duration_seconds}s "
        f"guided exploration in {lesson.language}, covering {len(lesson.scenes)} animated stages."
    )

    artifacts = [
        ArtifactRef(type="video", filename=video_filename),
        ArtifactRef(type="notes", filename="lesson-notes.json"),
    ]

    notes = LessonNotes(
        schema_version="1.0.0",
        title=lesson.title,
        topic=lesson.topic,
        language=lesson.language,
        level=lesson.level,
        summary=summary,
        learning_objectives=objectives,
        key_concepts=concepts,
        step_by_step_explanation=step_explanations,
        examples=examples,
        key_takeaways=key_points or [f"Mastery of {lesson.topic}"],
        revision_questions=revision_questions,
        generated_artifacts=artifacts,
        model_metadata=ModelMetadata(
            planner="mock-planner",
            translator="mock-translator" if lesson.language != "en" else None,
            tts="mock-tts",
            fallback_used=fallback_used or manifest.fallback_used,
        ),
    )
    return notes
