"""
Focused Unit Tests for Phase 2A: API Schemas, Canonical Lesson v1.0, Adapters, and FastAPI Entry Point.
Person 2 Owned.
"""

import json
from pathlib import Path
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.canonical_lesson import (
    CanonicalLessonPlan,
    CodeWalkthroughScene,
    DiagramArrow,
    DiagramScene,
    TitleCardScene,
)
from backend.app.schemas.api_models import (
    HealthResponse,
    JobStatusResponse,
    LessonDetailResponse,
    LessonGenerateRequest,
    LessonGenerateResponse,
)
from backend.app.schemas.adapters import (
    canonical_to_notes,
    canonical_to_provisional,
    provisional_to_canonical,
)
from backend.app.schemas.provisional_lesson import (
    CodeWalkthroughScene as ProvisionalCodeScene,
    DiagramScene as ProvisionalDiagramScene,
    LessonPlan as ProvisionalLessonPlan,
    TitleCardScene as ProvisionalTitleScene,
)
from backend.app.schemas.lesson_notes import LessonNotes


FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-lesson.json"
NOTES_FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-notes.json"


# ==========================================
# 1. LessonGenerateRequest Validation Tests
# ==========================================

def test_generate_request_valid_defaults():
    req = LessonGenerateRequest(topic="Photosynthesis")
    assert req.topic == "Photosynthesis"
    assert req.level == "beginner"
    assert req.language == "en"
    assert req.target_duration_seconds == 60


def test_generate_request_topic_bounds():
    # Valid boundaries (2 and 200 chars)
    req_min = LessonGenerateRequest(topic="AI")
    assert req_min.topic == "AI"

    req_max = LessonGenerateRequest(topic="A" * 200)
    assert len(req_max.topic) == 200

    # Invalid: 1 char (too short)
    with pytest.raises(ValidationError):
        LessonGenerateRequest(topic="A")

    # Invalid: 201 chars (too long)
    with pytest.raises(ValidationError):
        LessonGenerateRequest(topic="A" * 201)


def test_generate_request_level_validation():
    req1 = LessonGenerateRequest(topic="Loops", level="beginner")
    assert req1.level == "beginner"

    req2 = LessonGenerateRequest(topic="Loops", level="intermediate")
    assert req2.level == "intermediate"

    with pytest.raises(ValidationError):
        LessonGenerateRequest(topic="Loops", level="advanced")  # type: ignore


def test_generate_request_language_validation():
    # Valid 2-3 lowercase letter language codes
    for lang in ["en", "hi", "ta", "te", "kn", "mr", "bn"]:
        req = LessonGenerateRequest(topic="Topic", language=lang)
        assert req.language == lang

    # Invalid languages (uppercase, too long, digits)
    for bad_lang in ["EN", "english", "12", "h1", ""]:
        with pytest.raises(ValidationError):
            LessonGenerateRequest(topic="Topic", language=bad_lang)


def test_generate_request_duration_bounds():
    # Valid boundaries: 30 and 90 seconds
    assert LessonGenerateRequest(topic="Topic", target_duration_seconds=30).target_duration_seconds == 30
    assert LessonGenerateRequest(topic="Topic", target_duration_seconds=90).target_duration_seconds == 90

    # Invalid: 29s (too short)
    with pytest.raises(ValidationError):
        LessonGenerateRequest(topic="Topic", target_duration_seconds=29)

    # Invalid: 91s (too long)
    with pytest.raises(ValidationError):
        LessonGenerateRequest(topic="Topic", target_duration_seconds=91)


def test_generate_request_rejects_extra_fields():
    with pytest.raises(ValidationError) as exc:
        LessonGenerateRequest(topic="Topic", extra_unsupported_field="attack")  # type: ignore
    assert "Extra inputs are not permitted" in str(exc.value)


# ==========================================
# 2. Canonical LessonPlan v1.0 Tests
# ==========================================

def test_canonical_lesson_strict_version():
    valid_data = {
        "schema_version": "1.0",
        "title": "Title",
        "language": "en",
        "target_duration_seconds": 60,
        "scenes": [
            {"id": "s1", "type": "title_card", "heading": "Heading 1", "narration": "Narration text 1"},
            {"id": "s2", "type": "title_card", "heading": "Heading 2", "narration": "Narration text 2"},
            {"id": "s3", "type": "title_card", "heading": "Heading 3", "narration": "Narration text 3"},
        ],
    }
    plan = CanonicalLessonPlan.model_validate(valid_data)
    assert plan.schema_version == "1.0"

    # Reject version "1.0.0" at canonical boundary
    bad_data = dict(valid_data, schema_version="1.0.0")
    with pytest.raises(ValidationError):
        CanonicalLessonPlan.model_validate(bad_data)


def test_canonical_diagram_arrows_validation():
    items = ["Node A", "Node B", "Node C"]  # 3 items: indices 0, 1, 2

    # Valid arrows
    valid_scene = DiagramScene(
        id="d1",
        heading="Flowchart",
        narration="Here is the flow of operations.",
        items=items,
        arrows=[
            DiagramArrow(from_index=0, to_index=1, label="Step 1 to 2"),
            DiagramArrow(from_index=1, to_index=2, label="Step 2 to 3"),
        ],
    )
    assert len(valid_scene.arrows) == 2

    # Invalid arrow (to_index=3 is out of bounds for 3 items)
    with pytest.raises(ValidationError) as exc:
        DiagramScene(
            id="d2",
            heading="Flowchart",
            narration="Here is the flow of operations.",
            items=items,
            arrows=[DiagramArrow(from_index=0, to_index=3)],
        )
    assert "invalid index" in str(exc.value)


def test_canonical_code_highlight_validation():
    code = "def add(a, b):\n    return a + b"  # 2 lines

    # Valid highlight
    scene = CodeWalkthroughScene(
        id="c1",
        heading="Function",
        narration="Here is an addition function.",
        code=code,
        highlight_lines=[1, 2],
    )
    assert scene.highlight_lines == [1, 2]

    # Out-of-bounds highlight
    with pytest.raises(ValidationError) as exc:
        CodeWalkthroughScene(
            id="c2",
            heading="Function",
            narration="Here is an addition function.",
            code=code,
            highlight_lines=[3],
        )
    assert "out of bounds" in str(exc.value)


def test_canonical_rejects_extra_fields():
    with pytest.raises(ValidationError) as exc:
        TitleCardScene(
            id="t1",
            heading="Heading",
            narration="Narration text here",
            unknown_property="not_allowed",  # type: ignore
        )
    assert "Extra inputs are not permitted" in str(exc.value)


# ==========================================
# 3. Schema Adapter Bidirectional Tests
# ==========================================

def test_provisional_to_canonical_adapter_with_fixtures():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        lesson_data = json.load(f)
    with open(NOTES_FIXTURE_PATH, "r", encoding="utf-8") as f:
        notes_data = json.load(f)

    provisional_plan = ProvisionalLessonPlan.model_validate(lesson_data)
    provisional_notes = LessonNotes.model_validate(notes_data)

    # Convert to canonical
    canonical = provisional_to_canonical(provisional_plan, provisional_notes)

    assert canonical.schema_version == "1.0"
    assert canonical.title == provisional_plan.title
    assert len(canonical.scenes) == len(provisional_plan.scenes)
    assert canonical.summary == provisional_notes.summary
    assert canonical.learning_objectives == provisional_notes.learning_objectives
    assert canonical.key_takeaways == provisional_notes.key_takeaways
    assert len(canonical.glossary) == len(provisional_notes.key_concepts)
    assert len(canonical.revision_questions) == len(provisional_notes.revision_questions)

    # Convert back to provisional
    back_to_provisional = canonical_to_provisional(canonical)
    assert back_to_provisional.schema_version == "1.0.0"
    assert back_to_provisional.title == canonical.title
    assert len(back_to_provisional.scenes) == len(canonical.scenes)


def test_adapter_unicode_preservation():
    hindi_title = "पायथन लूप कैसे काम करता है"
    hindi_narration = "एक लूप किसी अनुक्रम में प्रत्येक मान के लिए निर्देश दोहराता है।"

    provisional = ProvisionalLessonPlan(
        schema_version="1.0.0",
        title=hindi_title,
        topic="पायथन लूप",
        level="beginner",
        language="hi",
        target_duration_seconds=60,
        scenes=[
            ProvisionalTitleScene(
                id="s1",
                heading=hindi_title,
                narration=hindi_narration,
            ),
            ProvisionalCodeScene(
                id="s2",
                heading="कोड",
                narration="कोड देखें।",
                code="for i in range(3):\n    print(i)",
                highlight_lines=[1],
            ),
            ProvisionalDiagramScene(
                id="s3",
                heading="आरेख",
                narration="प्रक्रिया का प्रवाह।",
                items=["पहला", "दूसरा", "तीसरा"],
            ),
        ],
    )

    canonical = provisional_to_canonical(provisional)
    assert canonical.title == hindi_title
    assert canonical.scenes[0].narration == hindi_narration
    assert canonical.language == "hi"

    # Notes extraction
    notes = canonical_to_notes(canonical)
    assert notes.language == "hi"
    assert notes.title == hindi_title


# ==========================================
# 4. FastAPI App Startup and CORS Tests
# ==========================================

client = TestClient(app)


def test_root_endpoint_returns_running_status():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Blu Visual Teacher Backend API"
    assert data["status"] == "running"
    assert data["version"] == "1.0.0"


def test_cors_headers_for_frontend():
    # Simulate a request from the Vite frontend
    headers = {"Origin": "http://localhost:5173"}
    response = client.get("/", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"
