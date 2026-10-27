"""
Lesson Management API Router for Blu Visual Teacher.
Person 2 Owned.

Implements Phase 2B Endpoints:
- POST /api/lessons/generate: Validates request, creates queued job, returns HTTP 202.
- GET /api/lessons/{lesson_id}/status: Returns current lifecycle status or HTTP 404.
"""

from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse

from backend.app.schemas.api_models import (
    ArtifactManifest,
    JobStatusResponse,
    LessonDetailResponse,
    LessonGenerateRequest,
    LessonGenerateResponse,
)
from backend.app.services.job_manager import job_manager
from backend.app.services.pipeline_orchestrator import execute_lesson_generation

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.post(
    "/generate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=LessonGenerateResponse,
    summary="Queue a new lesson generation job",
    description="Validates lesson parameters, registers an asynchronous generation task, and returns HTTP 202.",
)
async def generate_lesson(
    request: LessonGenerateRequest,
    background_tasks: BackgroundTasks,
) -> LessonGenerateResponse:
    """
    Asynchronously triggers the lesson generation pipeline.
    Request validation is strictly enforced before queuing.
    """
    job = job_manager.create_job(request)

    # Dispatch generation in background
    background_tasks.add_task(
        execute_lesson_generation,
        lesson_id=job.lesson_id,
        request=request,
        job_manager=job_manager,
    )

    return LessonGenerateResponse(
        lesson_id=job.lesson_id,
        status="queued",
        message="Lesson generation queued successfully",
    )


@router.get(
    "/{lesson_id}/status",
    status_code=status.HTTP_200_OK,
    response_model=JobStatusResponse,
    summary="Check status and progress of a lesson generation job",
    description="Returns current status, stage, progress percent, and fallback usage for a lesson ID.",
)
async def get_lesson_status(lesson_id: str) -> JobStatusResponse:
    """
    Retrieves the lifecycle state for the requested lesson_id.
    Returns HTTP 404 if the lesson_id is unknown.
    """
    job = job_manager.get_job(lesson_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson ID '{lesson_id}' not found",
        )

    return job.to_status_response()


@router.get(
    "/{lesson_id}",
    status_code=status.HTTP_200_OK,
    response_model=LessonDetailResponse,
    summary="Retrieve lesson plan, study notes, and artifact manifest",
    description="Returns full canonical lesson structure and artifact download URLs.",
)
async def get_lesson_detail(lesson_id: str) -> LessonDetailResponse:
    """
    Returns the canonical lesson plan, structured study notes, and artifact manifest.
    Used by Person 4's /render route and Person 3's client.
    """
    job = job_manager.get_job(lesson_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson ID '{lesson_id}' not found",
        )

    video_url = (
        f"/api/lessons/{lesson_id}/video"
        if (job.video_path and Path(job.video_path).is_file())
        else None
    )
    notes_url = (
        f"/api/lessons/{lesson_id}/notes"
        if (job.notes_path and Path(job.notes_path).is_file())
        else None
    )
    subtitles_url = (
        f"/api/lessons/{lesson_id}/subtitles"
        if (job.subtitles_path and Path(job.subtitles_path).is_file())
        else None
    )

    notes_dict = job.study_notes.model_dump() if job.study_notes else None

    return LessonDetailResponse(
        lesson_id=job.lesson_id,
        lesson_plan=job.canonical_plan,
        study_notes=notes_dict,
        artifact_manifest=ArtifactManifest(
            video=video_url,
            notes=notes_url,
            subtitles=subtitles_url,
        ),
        warnings=list(job.warnings),
    )


@router.get(
    "/{lesson_id}/video",
    summary="Download or stream the generated MP4 lesson video",
    description="Returns the H.264/AAC MP4 video artifact with +faststart.",
)
async def get_lesson_video(lesson_id: str):
    """
    Returns the generated MP4 file as a streamable binary attachment.
    """
    job = job_manager.get_job(lesson_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson ID '{lesson_id}' not found",
        )

    if not job.video_path or not Path(job.video_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video artifact for lesson '{lesson_id}' is not yet available",
        )

    return FileResponse(
        path=job.video_path,
        media_type="video/mp4",
        filename=f"{lesson_id}.mp4",
    )


@router.get(
    "/{lesson_id}/notes",
    summary="Download structured educational study notes",
    description="Returns the lesson notes JSON file.",
)
async def get_lesson_notes(lesson_id: str):
    """
    Returns the study notes JSON document.
    """
    job = job_manager.get_job(lesson_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson ID '{lesson_id}' not found",
        )

    if job.notes_path and Path(job.notes_path).is_file():
        return FileResponse(
            path=job.notes_path,
            media_type="application/json",
            filename=f"{lesson_id}_notes.json",
        )

    if job.study_notes:
        return job.study_notes.model_dump()

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Study notes for lesson '{lesson_id}' are not yet available",
    )


@router.get(
    "/{lesson_id}/subtitles",
    summary="Download synchronized SubRip (.srt) subtitles",
    description="Returns the SubRip (.srt) subtitle file.",
)
async def get_lesson_subtitles(lesson_id: str):
    """
    Returns the SubRip (.srt) subtitle text file.
    """
    job = job_manager.get_job(lesson_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson ID '{lesson_id}' not found",
        )

    if not job.subtitles_path or not Path(job.subtitles_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtitles for lesson '{lesson_id}' are not yet available",
        )

    return FileResponse(
        path=job.subtitles_path,
        media_type="text/plain; charset=utf-8",
        filename=f"{lesson_id}.srt",
    )
