"""
Unit Tests for Ollama Lesson Planner Adapter.
Tests mocked Ollama HTTP responses (valid JSON, malformed JSON, schema retry, timeout, offline).
"""

import json
from pathlib import Path
import httpx
import pytest

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.ollama_planner import OllamaLessonPlanner


FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample-lesson.json"


def test_ollama_planner_mocked_success(monkeypatch):
    """Verify successful Ollama generation and schema parsing."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        valid_json_text = f.read()

    def mock_post(self, url, **kwargs):
        return httpx.Response(
            status_code=200,
            json={"response": valid_json_text},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    planner = OllamaLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    plan, fallback_used, err = planner.plan_lesson(topic="How does a Python loop work?")

    assert not fallback_used
    assert err is None
    assert plan.title == "How a Python loop works"
    assert len(plan.scenes) == 3


def test_ollama_planner_retry_succeeds(monkeypatch):
    """Verify bounded retry when first response is malformed but retry succeeds."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        valid_json_text = f.read()

    call_count = {"count": 0}

    def mock_post(self, url, **kwargs):
        call_count["count"] += 1
        if call_count["count"] == 1:
            # First attempt returns truncated/malformed JSON
            return httpx.Response(
                status_code=200,
                json={"response": '{"title": "Broken JSON...'},
                request=httpx.Request("POST", url),
            )
        # Second attempt (retry) returns valid JSON
        return httpx.Response(
            status_code=200,
            json={"response": valid_json_text},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    planner = OllamaLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    plan, fallback_used, err = planner.plan_lesson(topic="How does a Python loop work?")

    assert call_count["count"] == 2
    assert not fallback_used
    assert err is None
    assert plan.title == "How a Python loop works"


def test_ollama_planner_retry_exhausted_falls_back(monkeypatch):
    """Verify deterministic fallback when both attempts fail validation."""
    call_count = {"count": 0}

    def mock_post(self, url, **kwargs):
        call_count["count"] += 1
        # Returns JSON missing required fields
        return httpx.Response(
            status_code=200,
            json={"response": '{"topic": "Invalid lesson without scenes"}'},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    planner = OllamaLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    plan, fallback_used, err = planner.plan_lesson(topic="Failing Topic")

    assert call_count["count"] == 2
    assert fallback_used
    assert "Validation failed after retry" in err
    # Confirm fallback lesson is returned with requested topic
    assert plan.topic == "Failing Topic"
    assert len(plan.scenes) == 3


def test_ollama_planner_timeout_falls_back(monkeypatch):
    """Verify timeout triggers immediate graceful fallback."""
    def mock_post(self, url, **kwargs):
        raise httpx.TimeoutException("Mocked gateway timeout")

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    planner = OllamaLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    plan, fallback_used, err = planner.plan_lesson(topic="Timeout Topic")

    assert fallback_used
    assert "Timeout" in err
    assert plan.topic == "Timeout Topic"


def test_ollama_planner_connection_error_falls_back(monkeypatch):
    """Verify connection refusal (Ollama offline) triggers immediate graceful fallback."""
    def mock_post(self, url, **kwargs):
        raise httpx.ConnectError("Connection refused on 127.0.0.1:11434")

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    planner = OllamaLessonPlanner(fallback_fixture_path=FIXTURE_PATH)
    plan, fallback_used, err = planner.plan_lesson(topic="Offline Topic")

    assert fallback_used
    assert "Could not connect" in err
    assert plan.topic == "Offline Topic"


def test_ollama_is_available_when_offline():
    """Verify is_available() correctly reports False when Ollama server is not running."""
    planner = OllamaLessonPlanner(base_url="http://127.0.0.1:99999")
    assert not planner.is_available()
