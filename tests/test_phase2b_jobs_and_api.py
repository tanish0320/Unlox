"""
Focused Unit Tests for Phase 2B: Job Store, Generation Endpoint, and Status Endpoint.
Person 2 Owned.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.api_models import LessonGenerateRequest
from backend.app.services.job_manager import JobManager, job_manager
from backend.app.services.pipeline_orchestrator import execute_lesson_generation


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_job_store():
    """Ensure a clean job store for each test."""
    job_manager.clear()
    yield
    job_manager.clear()


# ========================================================
# 1. POST /api/lessons/generate & Validation
# ========================================================

def test_generate_endpoint_valid_request_returns_202():
    payload = {
        "topic": "Binary Search Algorithm",
        "level": "intermediate",
        "language": "en",
        "target_duration_seconds": 60,
    }
    response = client.post("/api/lessons/generate", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "lesson_id" in data
    assert data["lesson_id"].startswith("lesson_")
    assert data["status"] == "queued"
    assert "queued" in data["message"].lower()

    # Verify job was registered in store
    job = job_manager.get_job(data["lesson_id"])
    assert job is not None
    assert job.request.topic == "Binary Search Algorithm"


def test_generate_endpoint_rejects_invalid_inputs_no_job_created():
    # 1. Topic too short (1 char)
    res1 = client.post("/api/lessons/generate", json={"topic": "A"})
    assert res1.status_code == 422

    # 2. Topic too long (> 200 chars)
    res2 = client.post("/api/lessons/generate", json={"topic": "T" * 201})
    assert res2.status_code == 422

    # 3. Invalid level
    res3 = client.post("/api/lessons/generate", json={"topic": "Recursion", "level": "expert"})
    assert res3.status_code == 422

    # 4. Target duration out of bounds (95s > 90s max)
    res4 = client.post(
        "/api/lessons/generate", json={"topic": "Recursion", "target_duration_seconds": 95}
    )
    assert res4.status_code == 422

    # 5. Invalid language code (uppercase or invalid format)
    res5 = client.post("/api/lessons/generate", json={"topic": "Recursion", "language": "EN"})
    assert res5.status_code == 422

    # 6. Extra unsupported fields (extra="forbid")
    res6 = client.post(
        "/api/lessons/generate", json={"topic": "Recursion", "unsupported_extra": "hack"}
    )
    assert res6.status_code == 422

    # Verify zero jobs were queued
    assert len(job_manager.list_jobs()) == 0


# ========================================================
# 2. GET /api/lessons/{lesson_id}/status & 404 Handling
# ========================================================

def test_status_endpoint_returns_404_for_unknown_lesson():
    response = client.get("/api/lessons/unknown_lesson_12345/status")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_status_endpoint_returns_initial_queued_status():
    req = LessonGenerateRequest(topic="Photosynthesis", level="beginner", language="en")
    job = job_manager.create_job(req, lesson_id="lesson_init_test")

    response = client.get(f"/api/lessons/{job.lesson_id}/status")
    assert response.status_code == 200
    data = response.json()
    assert data["lesson_id"] == "lesson_init_test"
    assert data["status"] == "queued"
    assert data["stage"] == "queued"
    assert data["progress_percent"] == 0
    assert data["fallback_used"] is False
    assert data["error"] is None


# ========================================================
# 3. Job Manager State Machine & Invariant Checks
# ========================================================

def test_job_manager_valid_state_transitions():
    req = LessonGenerateRequest(topic="Sorting")
    job = job_manager.create_job(req, lesson_id="job_trans_test")

    # queued -> running
    job_manager.update_status(job.lesson_id, status="running", stage="planning", progress_percent=20)
    assert job.status == "running"
    assert job.progress_percent == 20

    # running -> completed
    job_manager.update_status(job.lesson_id, status="completed", stage="completed", progress_percent=100)
    assert job.status == "completed"
    assert job.progress_percent == 100


def test_job_manager_rejects_invalid_state_transitions():
    req = LessonGenerateRequest(topic="Sorting")
    job = job_manager.create_job(req, lesson_id="job_invalid_test")

    # Cannot transition directly from queued to completed
    with pytest.raises(ValueError) as exc:
        job_manager.update_status(job.lesson_id, status="completed")
    assert "Invalid status transition" in str(exc.value)

    # Move to completed via running
    job_manager.update_status(job.lesson_id, status="running")
    job_manager.update_status(job.lesson_id, status="completed")

    # Terminal state: cannot transition from completed back to running or queued
    with pytest.raises(ValueError):
        job_manager.update_status(job.lesson_id, status="running")
    with pytest.raises(ValueError):
        job_manager.update_status(job.lesson_id, status="queued")


# ========================================================
# 4. Pipeline Execution & Artifact Attachment
# ========================================================

def test_pipeline_execution_completes_job_and_attaches_canonical_plan(tmp_path: Path):
    req = LessonGenerateRequest(
        topic="How does a Python loop work?",
        level="beginner",
        language="en",
        target_duration_seconds=60,
    )
    job = job_manager.create_job(req, lesson_id="e2e_job_test")

    # Run the orchestrator synchronously for deterministic testing
    execute_lesson_generation(
        lesson_id=job.lesson_id,
        request=req,
        job_manager=job_manager,
        output_dir=tmp_path,
    )

    updated_job = job_manager.get_job(job.lesson_id)
    assert updated_job.status == "completed"
    assert updated_job.stage == "completed"
    assert updated_job.progress_percent == 100
    assert updated_job.error is None

    # Verify attached Canonical LessonPlan v1.0
    assert updated_job.canonical_plan is not None
    assert updated_job.canonical_plan.schema_version == "1.0"
    assert len(updated_job.canonical_plan.scenes) >= 3

    # Verify AudioManifest
    assert updated_job.audio_manifest is not None
    assert len(updated_job.audio_manifest.entries) >= 3
    assert updated_job.audio_manifest.total_duration_seconds > 0.0

    # Verify Study Notes
    assert updated_job.study_notes is not None
    assert len(updated_job.study_notes.learning_objectives) >= 1

    # Verify GET /api/lessons/{id}/status endpoint reflects completed state
    status_res = client.get(f"/api/lessons/{job.lesson_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "completed"
    assert status_res.json()["progress_percent"] == 100


def test_pipeline_multilingual_hindi_execution(tmp_path: Path):
    req = LessonGenerateRequest(
        topic="How does a Python loop work?",
        level="beginner",
        language="hi",
        target_duration_seconds=60,
    )
    job = job_manager.create_job(req, lesson_id="hindi_job_test")

    execute_lesson_generation(
        lesson_id=job.lesson_id,
        request=req,
        job_manager=job_manager,
        output_dir=tmp_path,
    )

    updated_job = job_manager.get_job(job.lesson_id)
    assert updated_job.status == "completed"
    assert updated_job.canonical_plan.language == "hi"
    assert updated_job.audio_manifest.language == "hi"


# ========================================================
# 5. Pipeline Exception Handling & Failure Reporting
# ========================================================

def test_pipeline_catches_unhandled_exception_and_marks_job_failed(monkeypatch):
    req = LessonGenerateRequest(topic="Broken Topic")
    job = job_manager.create_job(req, lesson_id="failed_job_test")

    # Simulate an unexpected critical crash inside planner
    from backend.app.services.mock_pipeline import MockPipeline

    def crashing_planner(*args, **kwargs):
        raise RuntimeError("Simulated unhandled hardware error in pipeline")

    monkeypatch.setattr(MockPipeline, "run", crashing_planner)
    monkeypatch.setattr("backend.app.services.planner.mock_planner.MockLessonPlanner.plan_lesson", crashing_planner)

    execute_lesson_generation(
        lesson_id=job.lesson_id,
        request=req,
        job_manager=job_manager,
    )

    failed_job = job_manager.get_job(job.lesson_id)
    assert failed_job.status == "failed"
    assert failed_job.stage == "failed"
    assert "Simulated unhandled hardware error" in failed_job.error
    assert "Generation failed" in failed_job.message

    # Endpoint must report status="failed" cleanly
    res = client.get(f"/api/lessons/{job.lesson_id}/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "failed"
    assert "Simulated unhandled hardware error" in data["error"]


# ========================================================
# 6. Concurrent & Repeated Status Reads
# ========================================================

def test_concurrent_status_reads_thread_safety():
    req = LessonGenerateRequest(topic="Concurrency Test")
    job = job_manager.create_job(req, lesson_id="concurrent_job_test")

    def fetch_status():
        res = client.get(f"/api/lessons/{job.lesson_id}/status")
        assert res.status_code == 200
        return res.json()["status"]

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda _: fetch_status(), range(40)))

    assert len(results) == 40
    assert all(s == "queued" for s in results)


def test_generate_endpoint_triggers_background_pipeline():
    payload = {
        "topic": "Python Conditionals",
        "level": "beginner",
        "language": "en",
        "target_duration_seconds": 60,
    }
    # TestClient processes background tasks before response returns
    res = client.post("/api/lessons/generate", json=payload)
    assert res.status_code == 202
    lesson_id = res.json()["lesson_id"]

    # Status should now be completed
    status_res = client.get(f"/api/lessons/{lesson_id}/status")
    assert status_res.status_code == 200
    data = status_res.json()
    assert data["status"] == "completed"
    assert data["stage"] == "completed"
    assert data["progress_percent"] == 100
    assert data["fallback_used"] is False
