"""
Centralized Schemas for Blu Visual Teacher.
Exports both Canonical v1.0 and Provisional models, plus API contract schemas.
"""

from backend.app.schemas.adapters import (
    canonical_to_notes,
    canonical_to_provisional,
    provisional_to_canonical,
)
from backend.app.schemas.api_models import (
    ArtifactManifest,
    HealthResponse,
    JobStatusResponse,
    LessonDetailResponse,
    LessonGenerateRequest,
    LessonGenerateResponse,
)
from backend.app.schemas.audio_manifest import (
    AudioManifest,
    CaptionSegment,
    MultiLanguageAudioManifest,
    SceneAudioEntry,
)
from backend.app.schemas.canonical_lesson import (
    CanonicalBaseScene,
    CanonicalLessonPlan,
    CanonicalSceneVariant,
    CodeWalkthroughScene as CanonicalCodeScene,
    DiagramArrow,
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

__all__ = [
    "CanonicalLessonPlan",
    "CanonicalSceneVariant",
    "CanonicalTitleScene",
    "CanonicalDiagramScene",
    "CanonicalCodeScene",
    "DiagramArrow",
    "CanonicalDiagramItem",
    "GlossaryItem",
    "RevisionQuestionItem",
    "LessonGenerateRequest",
    "LessonGenerateResponse",
    "JobStatusResponse",
    "LessonDetailResponse",
    "HealthResponse",
    "ArtifactManifest",
    "provisional_to_canonical",
    "canonical_to_provisional",
    "canonical_to_notes",
    "AudioManifest",
    "CaptionSegment",
    "SceneAudioEntry",
    "MultiLanguageAudioManifest",
    "LessonNotes",
    "KeyConcept",
    "LessonExample",
    "RevisionQuestion",
    "ArtifactRef",
    "ModelMetadata",
    "ProvisionalLessonPlan",
    "ProvisionalTitleScene",
    "ProvisionalDiagramScene",
    "ProvisionalCodeScene",
    "ProvisionalDiagramItem",
]
