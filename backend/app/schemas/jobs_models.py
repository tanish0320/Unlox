"""
API Models for Person 3 Frontend Compatibility (/jobs).
Provides schemas matching frontend/src/api/types.ts and frontend/src/adapters/normalize.ts.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.api_models import LessonGenerateRequest


class JobGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    topic: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Lesson topic or concept to teach",
    )
    level: Literal["beginner", "intermediate"] = Field(
        default="beginner",
        description="Audience difficulty level",
    )
    language: Optional[str] = Field(
        default=None,
        pattern=r"^[a-z]{2,3}$",
        description="Target language code (e.g. 'en', 'hi')",
    )
    target_language: Optional[str] = Field(
        default=None,
        pattern=r"^[a-z]{2,3}$",
        description="Alternative field name for target language code",
    )
    target_duration_seconds: int = Field(
        default=60,
        ge=30,
        le=90,
        description="Target duration hint in seconds",
    )

    def to_lesson_request(self) -> LessonGenerateRequest:
        lang = self.language or self.target_language or "en"
        return LessonGenerateRequest(
            topic=self.topic,
            level=self.level,
            language=lang,
            target_duration_seconds=self.target_duration_seconds,
        )


class JobGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    job_id: str = Field(..., description="Unique generated job identifier")
    lesson_id: str = Field(..., description="Canonical lesson job identifier")
    status: Literal["queued", "running", "ready", "failed"] = Field(
        default="queued", description="Initial lifecycle state"
    )
    message: str = Field(default="Lesson generation queued")


class CompatJobStatusResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["queued", "running", "ready", "failed"]
    stage: str
    progress_percent: int = Field(ge=0, le=100)
    message: str
    fallback_used: bool = False
    job_id: Optional[str] = None
    lesson_id: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class AudioArtifactModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scene_id: str
    audio_url: str = ""
    duration_seconds: float = Field(ge=0.0)


class CompatArtifactManifestModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    audio: List[AudioArtifactModel] = Field(default_factory=list)
    timings_by_stage: Dict[str, float] = Field(default_factory=dict)
    video_url: Optional[str] = None
    notes_url: Optional[str] = None
    subtitles_url: Optional[str] = None


class CompatLessonResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lesson_plan: Dict[str, Any]
    notes: str
    artifact_manifest: CompatArtifactManifestModel
