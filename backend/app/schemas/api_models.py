"""
API Request and Response Models for Blu Visual Teacher.
Person 2 Owned.

Enforces strict boundary contracts:
- Rejects unexpected extra fields (extra="forbid")
- Validates topic length: 2–200 characters
- Validates difficulty level: beginner or intermediate
- Validates target language: 2–3 lowercase letters
- Validates target duration: 30–90 seconds
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.canonical_lesson import CanonicalLessonPlan


class LessonGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Lesson topic or concept to teach (2–200 characters)",
    )
    level: Literal["beginner", "intermediate"] = Field(
        default="beginner",
        description="Audience difficulty level",
    )
    language: str = Field(
        default="en",
        pattern=r"^[a-z]{2,3}$",
        description="Target language code (2–3 lowercase letters, e.g. 'en', 'hi', 'ta', 'te')",
    )
    target_duration_seconds: int = Field(
        default=60,
        ge=30,
        le=90,
        description="Target video duration in seconds (30–90 seconds)",
    )


class LessonGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(..., description="Unique generated job identifier")
    status: Literal[
        "queued", "running", "planning", "translating", "synthesizing", "rendering", "exporting", "completed", "failed"
    ] = Field(default="queued", description="Initial lifecycle state")
    message: str = Field(default="Lesson generation queued")


class JobStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: str
    status: Literal[
        "queued", "running", "planning", "translating", "synthesizing", "rendering", "exporting", "completed", "failed"
    ]
    stage: str
    progress_percent: int = Field(ge=0, le=100)
    message: str
    warnings: List[str] = Field(default_factory=list)
    fallback_used: bool = False
    error: Optional[str] = None


class ArtifactManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    video: Optional[str] = None
    notes: Optional[str] = None
    subtitles: Optional[str] = None


class LessonDetailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: str
    lesson_plan: Optional[CanonicalLessonPlan] = None
    study_notes: Optional[Dict[str, Any]] = None
    artifact_manifest: ArtifactManifest = Field(default_factory=ArtifactManifest)
    warnings: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str = "ok"
    ffmpeg_available: bool
    fallback_video_exists: bool
    version: str = "1.0.0"


# Re-export Phase 3A compatibility models
from backend.app.schemas.jobs_models import (  # noqa: E402
    AudioArtifactModel,
    CompatArtifactManifestModel,
    CompatJobStatusResponse,
    CompatLessonResponse,
    JobGenerateRequest,
    JobGenerateResponse,
)
