"""
Provisional LessonPlan schema for Blu Visual Teacher.
Status: PROVISIONAL (Awaiting confirmation from Person 2 and Person 4).

Contract Rules:
1. Strict discriminated union on scene 'type'.
2. Allowed scene types: title_card, diagram, code_walkthrough.
3. Scene count constrained to [3, 6].
4. No executable code payloads.
"""

from typing import List, Literal, Optional, Union, Annotated
from pydantic import BaseModel, Field, field_validator, model_validator


class BaseScene(BaseModel):
    id: str = Field(..., description="Unique scene identifier, e.g. 'scene_1'")
    heading: str = Field(..., min_length=2, max_length=120, description="On-screen title/heading")
    narration: str = Field(..., min_length=5, max_length=500, description="Spoken narration script")

    @field_validator("narration", "heading")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field must not be empty or whitespace only")
        return s


class TitleCardScene(BaseScene):
    type: Literal["title_card"] = "title_card"
    subtitle: Optional[str] = Field(None, max_length=200, description="Optional secondary tagline")
    key_points: List[str] = Field(default_factory=list, max_length=4, description="Optional bullet highlights")


class DiagramItem(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    detail: Optional[str] = Field(None, max_length=200)


class DiagramScene(BaseScene):
    type: Literal["diagram"] = "diagram"
    items: List[str] = Field(..., min_length=2, max_length=8, description="Ordered steps or conceptual nodes")
    layout: Literal["horizontal", "vertical", "cycle"] = Field(
        default="horizontal", description="Visual arrangement of diagram nodes"
    )
    structured_nodes: Optional[List[DiagramItem]] = Field(
        None, description="Optional detailed nodes for diagram renderers with metadata"
    )


class CodeWalkthroughScene(BaseScene):
    type: Literal["code_walkthrough"] = "code_walkthrough"
    code: str = Field(..., min_length=2, max_length=1000, description="Code snippet to display")
    code_language: str = Field(default="python", description="Language syntax identifier (e.g. python, js)")
    highlight_lines: List[int] = Field(
        default_factory=list, description="1-indexed line numbers to visually highlight"
    )
    expected_output: Optional[str] = Field(None, max_length=500, description="Terminal / console output preview")

    @model_validator(mode="after")
    def validate_highlight_lines(self) -> "CodeWalkthroughScene":
        total_lines = len(self.code.splitlines())
        for line_num in self.highlight_lines:
            if line_num < 1 or line_num > total_lines:
                raise ValueError(
                    f"highlight_line {line_num} is out of bounds for code with {total_lines} lines"
                )
        return self


SceneVariant = Annotated[
    Union[TitleCardScene, DiagramScene, CodeWalkthroughScene],
    Field(discriminator="type")
]


class LessonPlan(BaseModel):
    schema_version: str = Field(default="1.0.0", description="SemVer schema specification")
    title: str = Field(..., min_length=3, max_length=150, description="Main lesson title")
    topic: str = Field(..., min_length=2, max_length=150, description="Original requested topic")
    level: Literal["beginner", "intermediate"] = Field(
        default="beginner", description="Audience proficiency level"
    )
    language: str = Field(
        default="en", description="Target ISO-639-1 language code (e.g., 'en', 'hi', 'ta', 'te')"
    )
    target_duration_seconds: Optional[int] = Field(
        default=60, ge=30, le=120, description="Requested target duration hint (30-120s)"
    )
    scenes: List[SceneVariant] = Field(
        ..., min_length=3, max_length=6, description="Sequence of 3 to 6 animated scenes"
    )

    @field_validator("scenes")
    @classmethod
    def validate_scene_ids_unique(cls, scenes: List[SceneVariant]) -> List[SceneVariant]:
        ids = [s.id for s in scenes]
        if len(ids) != len(set(ids)):
            raise ValueError(f"Scene IDs must be unique. Found duplicates: {ids}")
        return scenes
