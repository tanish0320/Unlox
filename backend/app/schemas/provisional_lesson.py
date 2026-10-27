"""
Provisional LessonPlan schema for Blu Visual Teacher.
Status: PROVISIONAL (Awaiting confirmation from Person 2 and Person 4).

Contract Rules:
1. Strict discriminated union on scene 'type'.
2. Allowed scene types: title_card, diagram, code_walkthrough.
3. Scene count constrained to [3, 6].
4. No executable code payloads.
"""

from typing import List, Literal, Optional, Union, Annotated, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class BaseScene(BaseModel):
    id: str = Field(..., description="Unique scene identifier, e.g. 'scene_1'")
    heading: str = Field(..., min_length=2, max_length=120, description="On-screen title/heading")
    narration: str = Field(..., min_length=5, max_length=2000, description="Spoken narration script")

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


class NumberLineSpec(BaseModel):
    min_val: float = Field(default=0.0, description="Minimum number line value")
    max_val: float = Field(default=10.0, description="Maximum number line value")
    step: float = Field(default=1.0, description="Grid step interval")
    marked_points: List[Dict[str, Any]] = Field(default_factory=list, description="Points with value, label, color")
    highlight_range: Optional[List[float]] = Field(default=None, description="Start and end of highlighted interval")


class FractionBarSegment(BaseModel):
    label: str = Field(..., description="Segment description (e.g. 'Part A')")
    units: float = Field(..., gt=0, description="Unit weight/length of this segment")
    color: Optional[str] = Field(default=None, description="Hex color accent")
    fraction_text: Optional[str] = Field(default=None, description="Fraction representation (e.g. '2/5')")


class FractionBarSpec(BaseModel):
    total_units: float = Field(..., gt=0, description="Total units representing the whole bar")
    segments: List[FractionBarSegment] = Field(..., min_length=1, description="Parts composing the bar")
    comparison_label: Optional[str] = Field(default=None, description="Comparison formula e.g. '2 : 3 = 4 : 6'")


class ProportionTableRow(BaseModel):
    values: List[float] = Field(..., min_length=2, max_length=4)


class ProportionTableSpec(BaseModel):
    headers: List[str] = Field(..., min_length=2, max_length=4, description="Table column headings")
    rows: List[ProportionTableRow] = Field(..., min_length=2, description="Equivalent ratio rows")
    scale_factor_label: Optional[str] = Field(default=None, description="Scaling rule e.g. 'Multiply by 2'")


class ScienceElement(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    role: Optional[str] = Field(default=None, max_length=120)
    x: int = Field(default=50, ge=0, le=100, description="Percentage X coordinate on 1280 canvas")
    y: int = Field(default=50, ge=0, le=100, description="Percentage Y coordinate on 720 canvas")


class ScienceDiagramSpec(BaseModel):
    subject: str = Field(..., description="Scientific system name, e.g. 'Photosynthesis', 'Water Cycle'")
    elements: List[ScienceElement] = Field(..., min_length=1, description="Labelled parts/stages")
    process_flow: Optional[List[str]] = Field(default=None, description="Chronological process steps")


class DiagramScene(BaseScene):
    type: Literal["diagram"] = "diagram"
    items: List[str] = Field(..., min_length=2, max_length=8, description="Ordered steps or conceptual nodes")
    layout: Literal["horizontal", "vertical", "cycle"] = Field(
        default="horizontal", description="Visual arrangement of diagram nodes"
    )
    structured_nodes: Optional[List[DiagramItem]] = Field(
        None, description="Optional detailed nodes for diagram renderers with metadata"
    )
    diagram_type: Optional[Literal["flowchart", "number_line", "fraction_bar", "proportion_table", "science_diagram"]] = Field(
        default="flowchart", description="Visual pedagogical diagram type"
    )
    number_line: Optional[NumberLineSpec] = None
    fraction_bar: Optional[FractionBarSpec] = None
    proportion_table: Optional[ProportionTableSpec] = None
    science_diagram: Optional[ScienceDiagramSpec] = None


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


class EvidenceSource(BaseModel):
    source_name: str = Field(..., description="Document filename or identifier")
    page_number: Optional[int] = Field(None, description="Page number of evidence passage")
    excerpt: str = Field(..., description="Exact textual evidence supporting the lesson")
    verified: bool = Field(default=True, description="True if derived from local indexed source")


class QuizQuestion(BaseModel):
    question: str = Field(..., min_length=5, description="Specific factual or conceptual question")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Four distinct plausible answer options")
    correct_index: int = Field(..., ge=0, le=3, description="0-indexed key of the verified correct answer")
    explanation: str = Field(..., min_length=5, description="Clear pedagogical explanation of why this answer is correct")
    hint: Optional[str] = Field(None, description="Helpful pedagogical clue without giving away the answer")
    concept_reference: Optional[str] = Field(None, description="Specific concept or formula referenced")


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
    source_language: str = Field(
        default="en", description="Source ISO-639-1 language code (e.g., 'en')"
    )
    target_duration_seconds: Optional[int] = Field(
        default=60, ge=30, le=300, description="Requested target duration hint (30-300s, 1-5 mins)"
    )
    scenes: List[SceneVariant] = Field(
        ..., min_length=3, max_length=6, description="Sequence of 3 to 6 animated scenes"
    )
    summary: Optional[str] = Field(
        default=None, description="Concise educational summary of the lesson"
    )
    learning_objectives: Optional[List[str]] = Field(
        default=None, description="Key learning outcomes for the student"
    )
    key_takeaways: Optional[List[str]] = Field(
        default=None, description="Core revision takeaways"
    )
    glossary: Optional[List[dict]] = Field(
        default=None, description="Key terminology definitions [{'term': ..., 'definition': ...}]"
    )
    revision_questions: Optional[List[dict]] = Field(
        default=None, description="Review questions and answers [{'question': ..., 'answer': ...}]"
    )
    evidence_sources: List[EvidenceSource] = Field(
        default_factory=list, description="Verified local source documents grounding this lesson"
    )
    quiz_questions: List[QuizQuestion] = Field(
        default_factory=list, description="Structured 4-option quiz questions grounded in lesson facts"
    )

    @field_validator("scenes")
    @classmethod
    def validate_scene_ids_unique(cls, scenes: List[SceneVariant]) -> List[SceneVariant]:
        ids = [s.id for s in scenes]
        if len(ids) != len(set(ids)):
            raise ValueError(f"Scene IDs must be unique. Found duplicates: {ids}")
        return scenes
