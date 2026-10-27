"""
Canonical LessonPlan v1.0 Schema for Blu Visual Teacher.
Person 2 Owned.

Contract Specifications:
1. schema_version is strictly "1.0".
2. Title length is 1–120 characters.
3. Level is 'beginner' or 'intermediate'.
4. Language is 2–3 lowercase letters (ISO-639-1 / ISO-639-2).
5. Source language defaults to "en".
6. Target duration is 30–90 seconds.
7. Scenes count is 3–6 with unique IDs.
8. Discriminated union on scene 'type': title_card, diagram, code_walkthrough.
9. Strict field validation: extra="forbid" rejects all unknown fields.
10. Validates diagram items and arrow indexes.
11. Validates code highlight lines against code line count.
12. Embedded optional educational metadata: summary, learning_objectives,
    key_takeaways, glossary, revision_questions.
"""

from typing import Annotated, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CanonicalBaseScene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., min_length=1, max_length=50, description="Unique scene identifier")
    heading: str = Field(..., min_length=2, max_length=120, description="On-screen title/heading")
    narration: str = Field(..., min_length=5, max_length=500, description="Spoken narration script")

    @field_validator("narration", "heading")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field must not be empty or whitespace only")
        return s


class TitleCardScene(CanonicalBaseScene):
    type: Literal["title_card"] = "title_card"
    subtitle: Optional[str] = Field(None, max_length=200, description="Optional secondary tagline")
    key_points: List[str] = Field(default_factory=list, max_length=4, description="Optional bullet highlights")


class DiagramArrow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_index: int = Field(..., ge=0, description="0-indexed source item index")
    to_index: int = Field(..., ge=0, description="0-indexed target item index")
    label: Optional[str] = Field(None, max_length=100, description="Optional relationship label")


class DiagramItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(..., min_length=1, max_length=100)
    detail: Optional[str] = Field(None, max_length=200)


class DiagramScene(CanonicalBaseScene):
    type: Literal["diagram"] = "diagram"
    items: List[str] = Field(..., min_length=2, max_length=8, description="Ordered steps or conceptual nodes")
    layout: Literal["horizontal", "vertical", "cycle"] = Field(
        default="horizontal", description="Visual arrangement of diagram nodes"
    )
    arrows: Optional[List[DiagramArrow]] = Field(
        default=None, description="Optional directed connections between items"
    )
    structured_nodes: Optional[List[DiagramItem]] = Field(
        default=None, description="Optional detailed nodes for diagram renderers with metadata"
    )

    @model_validator(mode="after")
    def validate_arrow_indexes(self) -> "DiagramScene":
        if self.arrows:
            n_items = len(self.items)
            for idx, arrow in enumerate(self.arrows):
                if arrow.from_index >= n_items or arrow.to_index >= n_items:
                    raise ValueError(
                        f"Diagram arrow at index {idx} has invalid index: "
                        f"from_index={arrow.from_index}, to_index={arrow.to_index} "
                        f"for items array of length {n_items} (valid indices: 0 to {n_items - 1})"
                    )
        return self


class CodeWalkthroughScene(CanonicalBaseScene):
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


CanonicalSceneVariant = Annotated[
    Union[TitleCardScene, DiagramScene, CodeWalkthroughScene],
    Field(discriminator="type"),
]


class GlossaryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    term: str = Field(..., min_length=1, max_length=100)
    definition: str = Field(..., min_length=5, max_length=500)


class RevisionQuestionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=5, max_length=300)
    answer: str = Field(..., min_length=1, max_length=500)


class CanonicalLessonPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"] = "1.0"
    title: str = Field(..., min_length=1, max_length=120, description="Main lesson title (1–120 chars)")
    topic: Optional[str] = Field(None, min_length=2, max_length=200, description="Subject concept")
    level: Literal["beginner", "intermediate"] = Field(
        default="beginner", description="Audience proficiency level"
    )
    language: str = Field(
        ..., pattern=r"^[a-z]{2,3}$", description="Target language code (2–3 lowercase letters)"
    )
    source_language: str = Field(
        default="en", pattern=r"^[a-z]{2,3}$", description="Source language code (default 'en')"
    )
    target_duration_seconds: int = Field(
        default=60, ge=30, le=90, description="Target duration hint in seconds (30–90s)"
    )
    scenes: List[CanonicalSceneVariant] = Field(
        ..., min_length=3, max_length=6, description="Sequence of 3 to 6 animated scenes"
    )

    # Optional educational metadata embedded directly in LessonPlan
    summary: Optional[str] = Field(None, min_length=10, description="High-level lesson summary")
    learning_objectives: Optional[List[str]] = Field(None, description="Key learning objectives")
    key_takeaways: Optional[List[str]] = Field(None, description="Main takeaways")
    glossary: Optional[List[GlossaryItem]] = Field(None, description="Glossary of terms")
    revision_questions: Optional[List[RevisionQuestionItem]] = Field(None, description="Self-check questions")

    @field_validator("scenes")
    @classmethod
    def validate_scene_ids_unique(cls, scenes: List[CanonicalSceneVariant]) -> List[CanonicalSceneVariant]:
        ids = [s.id for s in scenes]
        if len(ids) != len(set(ids)):
            raise ValueError(f"Scene IDs must be unique. Found duplicates: {ids}")
        return scenes
