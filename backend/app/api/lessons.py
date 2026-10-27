"""
Lesson Management API Router for Blu Visual Teacher.
Person 2 Owned.

Implements Phase 2B Endpoints:
- POST /api/lessons/generate: Validates request, creates queued job, returns HTTP 202.
- GET /api/lessons/{lesson_id}/status: Returns current lifecycle status or HTTP 404.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from backend.app.schemas.api_models import (
    JobStatusResponse,
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
