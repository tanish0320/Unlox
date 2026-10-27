"""
Asynchronous Pipeline Orchestrator for Blu Visual Teacher.
Person 2 Owned.

Coordinates the end-to-end local generation job:
1. Reuses Person 1's MockPipeline components (planner, translation, TTS).
2. Updates job lifecycle states progressively: planning -> translating -> synthesizing -> generating_notes -> completed.
3. Propagates fallback usage metadata cleanly.
4. Transforms provisional outputs into Canonical LessonPlan v1.0 using Phase 2A adapters.
5. Captures all errors safely to mark jobs as 'failed' without crashing the server.
"""

from pathlib import Path
import time
from typing import Optional

from backend.app.schemas.adapters import provisional_to_canonical
from backend.app.schemas.api_models import LessonGenerateRequest
from backend.app.services.job_manager import JobManager
from backend.app.services.mock_pipeline import MockPipeline
from backend.app.services.notes_generator import generate_study_notes


def execute_lesson_generation(
    lesson_id: str,
    request: LessonGenerateRequest,
    job_manager: JobManager,
    output_dir: Optional[Path] = None,
    simulate_pipeline_error: Optional[str] = None,
    export_video: bool = True,
) -> None:
    """
    Executes the generation stages asynchronously.
    Catches all internal exceptions to guarantee clean 'failed' status reporting.
    """
    try:
        # Determine output folder for generated audio and job metadata
        out_base = output_dir or (Path("outputs") / "jobs" / lesson_id)
        out_audio = out_base / "audio"
        out_audio.mkdir(parents=True, exist_ok=True)

        pipeline = MockPipeline(output_dir=out_audio)
        fallback_flags = []

        # ---------------------------------------------------------
        # Stage 1: Lesson Planning
        # ---------------------------------------------------------
        job_manager.update_status(
            lesson_id=lesson_id,
            status="running",
            stage="planning",
            progress_percent=20,
            message=f"Planning lesson on '{request.topic}'...",
        )

        t_plan = time.perf_counter()
        plan, plan_fallback = pipeline.planner.plan_lesson(
            topic=request.topic,
            level=request.level,
            language="en",
            target_duration_seconds=request.target_duration_seconds,
            simulate_error=simulate_pipeline_error,
        )
        job_manager.record_stage_timing(lesson_id, "planning", (time.perf_counter() - t_plan) * 1000)
        fallback_flags.append(plan_fallback)

        # ---------------------------------------------------------
        # Stage 2: Translation (if target language is not English)
        # ---------------------------------------------------------
        if request.language != "en":
            job_manager.update_status(
                lesson_id=lesson_id,
                status="running",
                stage="translating",
                progress_percent=45,
                message=f"Translating lesson narration into '{request.language}'...",
            )
            t_trans = time.perf_counter()
            translated_plan, trans_fallback = pipeline.translator.translate_lesson(
                lesson=plan,
                target_language=request.language,
            )
            job_manager.record_stage_timing(lesson_id, "translating", (time.perf_counter() - t_trans) * 1000)
            fallback_flags.append(trans_fallback)
        else:
            translated_plan = plan

        # ---------------------------------------------------------
        # Stage 3: Audio Narration & Duration Measurement
        # ---------------------------------------------------------
        job_manager.update_status(
            lesson_id=lesson_id,
            status="running",
            stage="synthesizing",
            progress_percent=70,
            message="Synthesizing narration audio and computing timestamps...",
        )
        t_synth = time.perf_counter()
        manifest = pipeline.tts.synthesize_lesson(
            lesson=translated_plan,
            lesson_id=lesson_id,
        )
        job_manager.record_stage_timing(lesson_id, "synthesizing", (time.perf_counter() - t_synth) * 1000)
        fallback_flags.append(manifest.fallback_used)

        overall_fallback = any(fallback_flags)

        # ---------------------------------------------------------
        # Stage 4: Educational Study Notes
        # ---------------------------------------------------------
        job_manager.update_status(
            lesson_id=lesson_id,
            status="running",
            stage="generating_notes",
            progress_percent=80,
            message="Generating structured study notes...",
        )
        t_notes = time.perf_counter()
        notes = generate_study_notes(
            lesson=translated_plan,
            manifest=manifest,
            fallback_used=overall_fallback,
        )
        job_manager.record_stage_timing(lesson_id, "generating_notes", (time.perf_counter() - t_notes) * 1000)

        notes_file = out_base / "lesson-notes.json"
        import json
        notes_file.write_text(
            json.dumps(notes.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # ---------------------------------------------------------
        # Stage 5: Canonical v1.0 Transformation
        # ---------------------------------------------------------
        canonical_plan = provisional_to_canonical(
            provisional=translated_plan,
            notes=notes,
            source_language="en",
        )

        # ---------------------------------------------------------
        # Stage 6: Video & Subtitle Export (Phase 2C)
        # ---------------------------------------------------------
        video_path_str = None
        subtitles_path_str = None

        if export_video:
            from backend.app.services.export.video_exporter import export_lesson_video

            def handle_export_progress(pct: int, msg: str):
                stg = "rendering" if pct < 93 else "exporting"
                job_manager.update_status(
                    lesson_id=lesson_id,
                    status="running",
                    stage=stg,
                    progress_percent=pct,
                    message=msg,
                )

            t_export = time.perf_counter()
            artifacts = export_lesson_video(
                lesson_id=lesson_id,
                canonical_plan=canonical_plan,
                audio_manifest=manifest,
                output_dir=out_base,
                notes_path=notes_file,
                on_progress=handle_export_progress,
            )
            job_manager.record_stage_timing(lesson_id, "exporting", (time.perf_counter() - t_export) * 1000)
            video_path_str = str(artifacts.video_path)
            subtitles_path_str = str(artifacts.subtitles_path)

        # Attach artifacts and complete
        job_manager.set_result(
            lesson_id=lesson_id,
            provisional_plan=translated_plan,
            canonical_plan=canonical_plan,
            audio_manifest=manifest,
            study_notes=notes,
            video_path=video_path_str,
            notes_path=str(notes_file),
            subtitles_path=subtitles_path_str,
        )

        warnings = []
        if overall_fallback:
            warnings.append("Fallback content or synthesis was used during generation")

        job_manager.update_status(
            lesson_id=lesson_id,
            status="completed",
            stage="completed",
            progress_percent=100,
            message="Lesson generation completed successfully",
            fallback_used=overall_fallback,
            warnings=warnings,
        )

    except Exception as exc:
        job_manager.update_status(
            lesson_id=lesson_id,
            status="failed",
            stage="failed",
            error=str(exc),
            message=f"Generation failed: {str(exc)}",
        )
