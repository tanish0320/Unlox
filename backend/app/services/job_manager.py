"""
In-Memory Job Manager and State Machine for Blu Visual Teacher.
Person 2 Owned.

Tracks asynchronous lesson generation lifecycle:
- Statuses: queued, running, completed, failed
- Stages: queued, planning, translating, synthesizing, generating_notes, completed, failed
- Progress percent: 0–100
- Thread-safe updates guarded by threading.Lock
- Validated state transitions to prevent inconsistent job progression
"""

from dataclasses import dataclass, field
import threading
import time
from typing import Dict, List, Literal, Optional
import uuid

from backend.app.schemas.api_models import JobStatusResponse, LessonGenerateRequest
from backend.app.schemas.audio_manifest import AudioManifest
from backend.app.schemas.canonical_lesson import CanonicalLessonPlan
from backend.app.schemas.lesson_notes import LessonNotes
from backend.app.schemas.provisional_lesson import LessonPlan as ProvisionalLessonPlan

JobStatusType = Literal["queued", "running", "completed", "failed"]

ALLOWED_TRANSITIONS: Dict[str, set] = {
    "queued": {"running", "failed"},
    "running": {"completed", "failed"},
    "completed": set(),  # Terminal state
    "failed": set(),     # Terminal state
}


@dataclass
class JobRecord:
    lesson_id: str
    status: JobStatusType = "queued"
    stage: str = "queued"
    progress_percent: int = 0
    message: str = "Lesson generation queued"
    warnings: List[str] = field(default_factory=list)
    fallback_used: bool = False
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    request: Optional[LessonGenerateRequest] = None
    canonical_plan: Optional[CanonicalLessonPlan] = None
    provisional_plan: Optional[ProvisionalLessonPlan] = None
    audio_manifest: Optional[AudioManifest] = None
    study_notes: Optional[LessonNotes] = None
    video_path: Optional[str] = None
    notes_path: Optional[str] = None
    subtitles_path: Optional[str] = None
    stage_timings: Dict[str, float] = field(default_factory=dict)

    def to_status_response(self) -> JobStatusResponse:
        return JobStatusResponse(
            lesson_id=self.lesson_id,
            status=self.status,
            stage=self.stage,
            progress_percent=self.progress_percent,
            message=self.message,
            warnings=list(self.warnings),
            fallback_used=self.fallback_used,
            error=self.error,
        )


class JobManager:
    """
    Thread-safe in-memory job store with strict lifecycle transition checking.
    """

    def __init__(self):
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = threading.Lock()

    def generate_lesson_id(self) -> str:
        """Generates a clean, unique lesson identifier."""
        return f"lesson_{uuid.uuid4().hex[:10]}"

    def create_job(
        self,
        request: LessonGenerateRequest,
        lesson_id: Optional[str] = None,
    ) -> JobRecord:
        """
        Initializes and registers a new job in 'queued' status.
        """
        with self._lock:
            lid = lesson_id or self.generate_lesson_id()
            if lid in self._jobs:
                raise ValueError(f"Job with lesson_id '{lid}' already exists")

            job = JobRecord(
                lesson_id=lid,
                status="queued",
                stage="queued",
                progress_percent=0,
                message="Lesson generation queued",
                request=request,
            )
            self._jobs[lid] = job
            return job

    def get_job(self, lesson_id: str) -> Optional[JobRecord]:
        """
        Thread-safe lookup of an existing job. Returns None if not found.
        """
        with self._lock:
            return self._jobs.get(lesson_id)

    def update_status(
        self,
        lesson_id: str,
        status: Optional[JobStatusType] = None,
        stage: Optional[str] = None,
        progress_percent: Optional[int] = None,
        message: Optional[str] = None,
        warnings: Optional[List[str]] = None,
        fallback_used: Optional[bool] = None,
        error: Optional[str] = None,
    ) -> JobRecord:
        """
        Updates job status and metadata with transition validity checks.
        """
        with self._lock:
            job = self._jobs.get(lesson_id)
            if not job:
                raise KeyError(f"Job with lesson_id '{lesson_id}' not found")

            # Check status transition validity if status is changing
            if status is not None and status != job.status:
                allowed = ALLOWED_TRANSITIONS.get(job.status, set())
                if status not in allowed:
                    raise ValueError(
                        f"Invalid status transition from '{job.status}' to '{status}' for job '{lesson_id}'"
                    )
                job.status = status

            if stage is not None:
                job.stage = stage

            if progress_percent is not None:
                job.progress_percent = max(0, min(100, progress_percent))

            if message is not None:
                job.message = message

            if warnings is not None:
                job.warnings.extend(warnings)

            if fallback_used is not None:
                job.fallback_used = fallback_used

            if error is not None:
                job.error = error

            job.updated_at = time.time()
            return job

    def set_result(
        self,
        lesson_id: str,
        provisional_plan: Optional[ProvisionalLessonPlan] = None,
        canonical_plan: Optional[CanonicalLessonPlan] = None,
        audio_manifest: Optional[AudioManifest] = None,
        study_notes: Optional[LessonNotes] = None,
        video_path: Optional[str] = None,
        notes_path: Optional[str] = None,
        subtitles_path: Optional[str] = None,
    ) -> JobRecord:
        """
        Attaches finished generation artifacts to the job.
        """
        with self._lock:
            job = self._jobs.get(lesson_id)
            if not job:
                raise KeyError(f"Job with lesson_id '{lesson_id}' not found")

            if provisional_plan is not None:
                job.provisional_plan = provisional_plan
            if canonical_plan is not None:
                job.canonical_plan = canonical_plan
            if audio_manifest is not None:
                job.audio_manifest = audio_manifest
            if study_notes is not None:
                job.study_notes = study_notes
            if video_path is not None:
                job.video_path = video_path
            if notes_path is not None:
                job.notes_path = notes_path
            if subtitles_path is not None:
                job.subtitles_path = subtitles_path

            job.updated_at = time.time()
            return job

    def list_jobs(self) -> List[JobRecord]:
        with self._lock:
            return list(self._jobs.values())

    def record_stage_timing(self, lesson_id: str, stage: str, duration_ms: float) -> None:
        """Records elapsed time for a given pipeline stage in milliseconds."""
        with self._lock:
            job = self._jobs.get(lesson_id)
            if job:
                job.stage_timings[stage] = round(duration_ms, 1)

    def clear(self) -> None:
        """Clears all jobs (primarily used for unit test isolation)."""
        with self._lock:
            self._jobs.clear()


# Global singleton instance for application use
job_manager = JobManager()
