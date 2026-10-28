"""
Audio Manifest Schema for Blu Visual Teacher.
Associates synthesized or fallback narration audio with each scene and language,
storing measured durations, scene-relative caption segments, and lesson-global timeline data.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class CaptionSegment(BaseModel):
    # Scene-relative timestamps start at 0.0 for each scene.
    start_seconds: float = Field(
        ..., ge=0.0, description="Scene-relative start offset in seconds"
    )
    end_seconds: float = Field(
        ..., gt=0.0, description="Scene-relative end offset in seconds"
    )
    # Lesson-global timestamps are measured from the start of the video.
    global_start_seconds: Optional[float] = Field(
        None, ge=0.0, description="Lesson-global start offset in seconds"
    )
    global_end_seconds: Optional[float] = Field(
        None, gt=0.0, description="Lesson-global end offset in seconds"
    )
    text: str = Field(..., min_length=1, description="Caption text in native script")


class SceneAudioEntry(BaseModel):
    scene_id: str = Field(..., description="Target scene ID matching LessonPlan.scenes[i].id")
    audio_file: str = Field(
        ..., description="Audio path relative to workspace root, using forward slashes"
    )
    duration_seconds: float = Field(..., gt=0.0, description="Measured audio duration in seconds")
    language: str = Field(..., description="Language code, e.g. en, hi, ta")
    voice_id: str = Field(..., description="Identifier of the synthesis voice")
    sample_rate: int = Field(default=24000, ge=8000, le=48000, description="Audio sample rate in Hz")
    fallback_used: bool = Field(default=False, description="Whether fallback audio was used")
    caption_segments: List[CaptionSegment] = Field(
        default_factory=list, description="Timed caption segments for synchronization"
    )


class AudioManifest(BaseModel):
    schema_version: str = Field(default="1.0.0")
    lesson_id: str
    language: str
    total_duration_seconds: float = Field(
        ..., gt=0.0, description="Sum of raw spoken audio durations across all scenes"
    )
    total_timeline_duration_seconds: Optional[float] = Field(
        None, gt=0.0, description="Full timeline duration including inter-scene gaps"
    )
    entries: List[SceneAudioEntry] = Field(..., min_length=1)
    fallback_used: bool = False

    @field_validator("entries")
    @classmethod
    def validate_entries_order(cls, entries: List[SceneAudioEntry]) -> List[SceneAudioEntry]:
        ids = [entry.scene_id for entry in entries]
        if len(ids) != len(set(ids)):
            raise ValueError(f"Duplicate scene_id entries in audio manifest: {ids}")
        return entries

    def compute_global_timeline(
        self, scene_pause_padding: float = 0.3
    ) -> "AudioManifest":
        """
        Calculate lesson-global caption timestamps.
        Add pause padding only between scenes, never after the last scene.
        """
        cumulative = 0.0

        for i, entry in enumerate(self.entries):
            scene_start = cumulative

            for cap in entry.caption_segments:
                cap.global_start_seconds = round(
                    scene_start + cap.start_seconds, 3
                )
                cap.global_end_seconds = round(
                    scene_start + cap.end_seconds, 3
                )

            cumulative += entry.duration_seconds

            if i < len(self.entries) - 1:
                cumulative += scene_pause_padding

        self.total_timeline_duration_seconds = round(cumulative, 3)
        return self

    def create_sub_manifest(
        self, scene_ids: List[str], scene_pause_padding: float = 0.3
    ) -> "AudioManifest":
        """
        Creates an independent sub-manifest for a given subset of scene IDs (e.g., an individual part),
        preserving audio file references while recalculating timestamps relative to the part start.
        """
        filtered_entries = []
        for sid in scene_ids:
            for entry in self.entries:
                if entry.scene_id == sid or entry.scene_id.startswith(f"{sid}_"):
                    cp = entry.model_copy(deep=True)
                    cp.scene_id = sid  # Normalize to canonical scene_id
                    filtered_entries.append(cp)
                    break

        if not filtered_entries:
            raise ValueError(f"No audio entries found matching scene IDs: {scene_ids}")

        raw_duration = sum(e.duration_seconds for e in filtered_entries)
        sub_manifest = AudioManifest(
            schema_version=self.schema_version,
            lesson_id=self.lesson_id,
            language=self.language,
            total_duration_seconds=round(raw_duration, 3),
            entries=filtered_entries,
            fallback_used=any(e.fallback_used for e in filtered_entries),
        )
        return sub_manifest.compute_global_timeline(scene_pause_padding=scene_pause_padding)


class MultiLanguageAudioManifest(BaseModel):
    """Container for multi-language lessons."""
    schema_version: str = Field(default="1.0.0")
    lesson_id: str
    default_language: str = "en"
    manifests: Dict[str, AudioManifest] = Field(default_factory=dict)