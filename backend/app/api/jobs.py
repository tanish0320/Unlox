"""
Jobs Compatibility API Router for Blu Visual Teacher.
Person 3 Frontend Compatibility.

Implements Phase 3A Compatibility Endpoints:
- POST /api/jobs: Validates request, queues lesson generation, returns HTTP 202 with job_id.
- GET /api/jobs/{job_id}: Returns job lifecycle status (mapping completed -> ready).
- GET /api/jobs/{job_id}/lesson: Returns full lesson structure, stringified notes, and artifact manifest.
- GET /api/jobs/{job_id}/video: Returns the MP4 video binary file.
- GET /api/jobs/{job_id}/notes: Returns educational study notes JSON file.
- GET /api/jobs/{job_id}/subtitles: Returns synchronized SubRip (.srt) subtitles file.
- GET /api/jobs/{job_id}/audio/{scene_id}: Returns WAV narration audio file for an individual scene.
"""

from pathlib import Path
import json
from typing import Any, Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse

from backend.app.schemas.jobs_models import (
    CompatJobStatusResponse,
    JobGenerateRequest,
    JobGenerateResponse,
)
from backend.app.services.job_manager import job_manager
from backend.app.services.pipeline_orchestrator import execute_lesson_generation

router = APIRouter(prefix="/jobs", tags=["Jobs Compatibility"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobGenerateResponse,
    summary="Queue a new lesson generation job (Person 3 compatible)",
)
@router.post(
    "/",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobGenerateResponse,
    include_in_schema=False,
)
async def create_job(
    request: JobGenerateRequest,
    background_tasks: BackgroundTasks,
) -> JobGenerateResponse:
    lesson_req = request.to_lesson_request()
    job = job_manager.create_job(lesson_req)

    background_tasks.add_task(
        execute_lesson_generation,
        lesson_id=job.lesson_id,
        request=lesson_req,
        job_manager=job_manager,
    )

    return JobGenerateResponse(
        job_id=job.lesson_id,
        lesson_id=job.lesson_id,
        status="queued",
        message="Lesson generation queued successfully",
    )


@router.get(
    "/{job_id}",
    status_code=status.HTTP_200_OK,
    response_model=CompatJobStatusResponse,
    summary="Check status and progress of a job (Person 3 compatible)",
)
async def get_job_status(job_id: str) -> CompatJobStatusResponse:
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    # Map backend 'completed' -> 'ready' for Person 3 frontend
    compat_status = "ready" if job.status == "completed" else job.status
    compat_stage = "ready" if job.status == "completed" else job.stage

    return CompatJobStatusResponse(
        status=compat_status,
        stage=compat_stage,
        progress_percent=job.progress_percent,
        message=job.message,
        fallback_used=job.fallback_used,
        job_id=job.lesson_id,
        lesson_id=job.lesson_id,
        warnings=list(job.warnings),
        error=job.error,
    )


@router.get(
    "/{job_id}/lesson",
    status_code=status.HTTP_200_OK,
    summary="Retrieve lesson plan, study notes, and artifact manifest (Person 3 compatible)",
)
async def get_job_lesson(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    if job.canonical_plan is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lesson is not ready yet",
        )

    plan = job.canonical_plan

    # Format scenes according to Person 3's normalizeScene contract
    scenes_data = []
    for s in plan.scenes:
        s_dict: Dict[str, Any] = {
            "id": s.id,
            "type": s.type,
            "heading": s.heading,
            "narration": s.narration,
        }
        if s.type == "code_walkthrough":
            code_val = getattr(s, "code", "")
            if code_val is not None:
                s_dict["code"] = code_val
            hl_lines = getattr(s, "highlight_lines", None)
            if hl_lines is not None:
                s_dict["highlight_lines"] = hl_lines
        elif s.type == "diagram":
            items_val = getattr(s, "items", None)
            if items_val is not None:
                s_dict["items"] = items_val
        scenes_data.append(s_dict)

    # Guarantee topic field
    topic = plan.topic or plan.title
    lesson_plan_dict = {
        "topic": topic,
        "title": plan.title,
        "level": plan.level,
        "language": plan.language,
        "target_duration_seconds": plan.target_duration_seconds,
        "scenes": scenes_data,
    }

    # Format notes as a valid JSON string (Person 3 normalizeLessonResponse expects asString(response.notes))
    if job.study_notes:
        notes_raw = job.study_notes.model_dump()
        # Guarantee both 'steps' and 'step_by_step_explanation'
        notes_raw["steps"] = notes_raw.get("step_by_step_explanation", [])
        # Include models metadata for ResultView.tsx modelNames
        if "models" not in notes_raw and hasattr(job.study_notes, "model_metadata"):
            notes_raw["models"] = job.study_notes.model_metadata.model_dump()
        notes_str = json.dumps(notes_raw, ensure_ascii=False)
    elif job.notes_path and Path(job.notes_path).is_file():
        notes_str = Path(job.notes_path).read_text(encoding="utf-8")
    else:
        notes_str = json.dumps({
            "summary": "",
            "key_concepts": [],
            "steps": [],
            "key_takeaways": [],
            "revision_questions": [],
        })

    # Build audio list from audio_manifest
    audio_artifacts = []
    if job.audio_manifest:
        for entry in job.audio_manifest.entries:
            audio_file_exists = (
                Path(entry.audio_file).is_file() if entry.audio_file else False
            )
            # Use real audio URL if file exists, empty string if missing
            audio_url = f"/api/jobs/{job_id}/audio/{entry.scene_id}.wav" if audio_file_exists else ""
            audio_artifacts.append({
                "scene_id": entry.scene_id,
                "audio_url": audio_url,
                "duration_seconds": entry.duration_seconds,
            })

    # Prepare manifest with verified existing artifacts only (omit keys with None value to prevent asString(null) error)
    manifest_dict: Dict[str, Any] = {
        "audio": audio_artifacts,
        "timings_by_stage": dict(job.stage_timings),
    }

    if job.video_path and Path(job.video_path).is_file():
        manifest_dict["video_url"] = f"/api/jobs/{job_id}/video"

    if job.notes_path and Path(job.notes_path).is_file():
        manifest_dict["notes_url"] = f"/api/jobs/{job_id}/notes"

    if job.subtitles_path and Path(job.subtitles_path).is_file():
        manifest_dict["subtitles_url"] = f"/api/jobs/{job_id}/subtitles"

    return {
        "lesson_plan": lesson_plan_dict,
        "notes": notes_str,
        "artifact_manifest": manifest_dict,
    }


@router.get(
    "/{job_id}/video",
    summary="Download or stream the MP4 video (Person 3 compatible)",
)
async def get_job_video(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    if not job.video_path or not Path(job.video_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video artifact for job '{job_id}' is not yet available",
        )

    return FileResponse(
        path=job.video_path,
        media_type="video/mp4",
        filename=f"{job_id}.mp4",
    )


@router.get(
    "/{job_id}/notes",
    summary="Download structured educational study notes (Person 3 compatible)",
)
async def get_job_notes(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    if job.notes_path and Path(job.notes_path).is_file():
        return FileResponse(
            path=job.notes_path,
            media_type="application/json",
            filename=f"{job_id}_notes.json",
        )

    if job.study_notes:
        return job.study_notes.model_dump()

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Study notes for job '{job_id}' are not yet available",
    )


@router.get(
    "/{job_id}/subtitles",
    summary="Download synchronized SubRip (.srt) subtitles (Person 3 compatible)",
)
async def get_job_subtitles(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    if not job.subtitles_path or not Path(job.subtitles_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtitles for job '{job_id}' are not yet available",
        )

    return FileResponse(
        path=job.subtitles_path,
        media_type="text/plain; charset=utf-8",
        filename=f"{job_id}.srt",
    )


@router.get(
    "/{job_id}/audio/{scene_id}",
    summary="Download or stream WAV narration audio for a scene",
)
async def get_job_audio(job_id: str, scene_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found",
        )

    clean_scene_id = scene_id[:-4] if scene_id.endswith(".wav") else scene_id

    if not job.audio_manifest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio manifest for job '{job_id}' is not yet available",
        )

    matching_entry = None
    for entry in job.audio_manifest.entries:
        if entry.scene_id == clean_scene_id:
            matching_entry = entry
            break

    if not matching_entry or not matching_entry.audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio for scene '{clean_scene_id}' in job '{job_id}' not found",
        )

    audio_path = Path(matching_entry.audio_file)
    if not audio_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file for scene '{clean_scene_id}' is not on disk",
        )

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"{clean_scene_id}.wav",
    )
