"""
Mock Pipeline Coordinator for Blu Visual Teacher.
Status: Person 1 Owned.

Demonstrates the deterministic, end-to-end local generation pipeline
without calling external APIs or requiring heavy model weights.
"""

from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.schemas.audio_manifest import AudioManifest
from backend.app.schemas.lesson_notes import LessonNotes
from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.notes_generator import generate_study_notes
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.translation.mock_translation import MockTranslationService
from backend.app.services.tts.mock_tts import MockTTSService


class PipelineResult(BaseModel):
    lesson_id: str
    lesson_plan: LessonPlan
    audio_manifest: AudioManifest
    study_notes: LessonNotes
    fallback_used: bool


class MockPipeline:
    def __init__(self, output_dir: Optional[Path] = None):
        self.planner = MockLessonPlanner()
        self.translator = MockTranslationService()
        self.tts = MockTTSService(output_dir=output_dir)

    def run(
        self,
        topic: str,
        level: str = "beginner",
        language: str = "en",
        target_duration_seconds: int = 60,
        lesson_id: str = "lesson_001",
        simulate_planner_error: Optional[str] = None,
    ) -> PipelineResult:
        """
        Executes the full pipeline:
        Plan -> Translate -> Synthesize Audio -> Notes
        """
        fallback_flags = []

        # 1. Lesson Planning
        plan, plan_fallback = self.planner.plan_lesson(
            topic=topic,
            level=level,
            language="en",  # Base plan always in English
            target_duration_seconds=target_duration_seconds,
            simulate_error=simulate_planner_error,
        )
        fallback_flags.append(plan_fallback)

        # 2. Translation (if target language is not English)
        translated_plan, trans_fallback = self.translator.translate_lesson(
            lesson=plan, target_language=language
        )
        fallback_flags.append(trans_fallback)

        # 3. Audio Narration & Timing
        manifest = self.tts.synthesize_lesson(
            lesson=translated_plan, lesson_id=lesson_id
        )
        fallback_flags.append(manifest.fallback_used)

        overall_fallback = any(fallback_flags)

        # 4. Canonical Study Notes
        notes = generate_study_notes(
            lesson=translated_plan,
            manifest=manifest,
            fallback_used=overall_fallback,
        )

        return PipelineResult(
            lesson_id=lesson_id,
            lesson_plan=translated_plan,
            audio_manifest=manifest,
            study_notes=notes,
            fallback_used=overall_fallback,
        )
