"""
Lesson Notes Schema for Blu Visual Teacher.
Status: PROVISIONAL (Awaiting confirmation from Person 2 and Person 4).

Generates lesson-notes.json directly derived from validated canonical lesson data.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class KeyConcept(BaseModel):
    term: str = Field(..., min_length=1, max_length=100)
    definition: str = Field(..., min_length=5, max_length=500)


class LessonExample(BaseModel):
    description: str = Field(..., min_length=2, max_length=300)
    code: Optional[str] = Field(None, max_length=1000)
    output: Optional[str] = Field(None, max_length=500)


class RevisionQuestion(BaseModel):
    question: str = Field(..., min_length=5, max_length=300)
    answer: str = Field(..., min_length=1, max_length=500)


class ArtifactRef(BaseModel):
    type: str = Field(..., description="'video', 'notes', or 'subtitles'")
    filename: str = Field(...)


class ModelMetadata(BaseModel):
    planner: str = Field(default="mock-planner")
    translator: Optional[str] = Field(default=None)
    tts: str = Field(default="mock-tts")
    fallback_used: bool = Field(default=False)


class LessonNotes(BaseModel):
    schema_version: str = Field(default="1.0.0")
    title: str = Field(..., min_length=3)
    topic: str = Field(..., min_length=2)
    language: str = Field(default="en")
    level: str = Field(default="beginner")
    summary: str = Field(..., min_length=10)
    learning_objectives: List[str] = Field(..., min_length=1)
    key_concepts: List[KeyConcept] = Field(default_factory=list)
    step_by_step_explanation: List[str] = Field(..., min_length=1)
    examples: List[LessonExample] = Field(default_factory=list)
    key_takeaways: List[str] = Field(..., min_length=1)
    revision_questions: List[RevisionQuestion] = Field(default_factory=list)
    generated_artifacts: List[ArtifactRef] = Field(default_factory=list)
    model_metadata: ModelMetadata = Field(default_factory=ModelMetadata)
