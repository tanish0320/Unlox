"""
Phase 3A Compatibility Test Suite for Person 3's Frontend.
Tests /api/jobs and root-level /jobs endpoints:
- POST /jobs and POST /api/jobs: job creation, validation, target_language mapping
- GET /jobs/{id} and GET /api/jobs/{id}: status lifecycle, completed -> ready mapping
- GET /jobs/{id}/lesson: Person 3 contract verification (notes string, manifest, audio list, timings)
- GET /jobs/{id}/video, notes, subtitles, audio: artifact streaming and 404 handling
- Verification that /api/lessons endpoints preserve their Phase 2B/2C response contracts
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.api_models import LessonGenerateRequest
from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment, SceneAudioEntry
from backend.app.schemas.canonical_lesson import (
    CanonicalLessonPlan,
    CodeWalkthroughScene,
    DiagramScene,
    TitleCardScene,
)
from backend.app.schemas.lesson_notes import (
    KeyConcept,
    LessonNotes,
    ModelMetadata,
    RevisionQuestion,
)
from backend.app.services.job_manager import job_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_job_store():
    """Ensure a clean job store for each test."""
    job_manager.clear()
    yield
    job_manager.clear()


@pytest.fixture
def mock_canonical_plan() -> CanonicalLessonPlan:
    return CanonicalLessonPlan(
        schema_version="1.0",
        title="Intro to Binary Search",
        topic="Binary Search Algorithm",
        level="beginner",
        language="en",
        source_language="en",
        target_duration_seconds=60,
        scenes=[
            TitleCardScene(
                id="scene_1",
                type="title_card",
                heading="Binary Search Intro",
                narration="Welcome to Binary Search in logarithmic time.",
            ),
            DiagramScene(
                id="scene_2",
                type="diagram",
                heading="Search Steps",
                narration="Divide the search range in half repeatedly.",
                items=["Find Mid", "Compare", "Halve Range"],
            ),
            CodeWalkthroughScene(
                id="scene_3",
                type="code_walkthrough",
                heading="Implementation",
                narration="Here is the standard Python implementation.",
                code="def binary_search(arr, target):\n    low = 0\n    high = len(arr) - 1\n    return -1",
                highlight_lines=[1, 2],
            ),
        ],
    )


@pytest.fixture
def mock_study_notes() -> LessonNotes:
    return LessonNotes(
        schema_version="1.0.0",
        title="Intro to Binary Search",
        topic="Binary Search Algorithm",
        language="en",
        level="beginner",
        summary="A comprehensive study guide on Binary Search.",
        learning_objectives=["Understand divide-and-conquer", "Implement binary search"],
        key_concepts=[
            KeyConcept(term="Time Complexity", definition="O(log n) worst and average case performance.")
        ],
        step_by_step_explanation=[
            "Initialize low and high pointers.",
            "Compute the middle index.",
            "Compare middle element with target.",
        ],
        key_takeaways=["Requires a sorted array.", "Halves the problem size in each step."],
        revision_questions=[
            RevisionQuestion(question="What is the time complexity?", answer="O(log n)")
        ],
        model_metadata=ModelMetadata(planner="mock-planner", tts="mock-tts"),
    )


@pytest.fixture
def mock_audio_manifest(tmp_path: Path) -> AudioManifest:
    # Create fake WAV files on disk
    scene1_wav = tmp_path / "scene_1.wav"
    scene1_wav.write_bytes(b"RIFFFAKEWAVDATA1")
    scene2_wav = tmp_path / "scene_2.wav"
    scene2_wav.write_bytes(b"RIFFFAKEWAVDATA2")
    scene3_wav = tmp_path / "scene_3.wav"
    scene3_wav.write_bytes(b"RIFFFAKEWAVDATA3")

    return AudioManifest(
        schema_version="1.0.0",
        lesson_id="test_lesson_123",
        language="en",
        total_duration_seconds=30.0,
        entries=[
            SceneAudioEntry(
                scene_id="scene_1",
                audio_file=str(scene1_wav),
                duration_seconds=10.0,
                language="en",
                voice_id="voice-en-1",
                caption_segments=[
                    CaptionSegment(start_seconds=0.0, end_seconds=10.0, text="Intro audio")
                ],
            ),
            SceneAudioEntry(
                scene_id="scene_2",
                audio_file=str(scene2_wav),
                duration_seconds=10.0,
                language="en",
                voice_id="voice-en-1",
                caption_segments=[
                    CaptionSegment(start_seconds=0.0, end_seconds=10.0, text="Steps audio")
                ],
            ),
            SceneAudioEntry(
                scene_id="scene_3",
                audio_file=str(scene3_wav),
                duration_seconds=10.0,
                language="en",
                voice_id="voice-en-1",
                caption_segments=[
                    CaptionSegment(start_seconds=0.0, end_seconds=10.0, text="Code audio")
                ],
            ),
        ],
    )


# ==============================================================================
# 1. POST /api/jobs and POST /jobs (Job Creation & Request Validation)
# ==============================================================================

def test_post_jobs_valid_request_returns_202_with_job_id(monkeypatch):
    # Prevent background execution from running pipeline during unit test
    monkeypatch.setattr("fastapi.BackgroundTasks.add_task", lambda *args, **kwargs: None)

    for prefix in ["/api/jobs", "/jobs"]:
        res = client.post(
            prefix,
            json={
                "topic": "Python Generators",
                "level": "beginner",
                "language": "en",
                "target_duration_seconds": 60,
            },
        )
        assert res.status_code == 202, f"Failed for prefix: {prefix}"
        data = res.json()
        assert "job_id" in data
        assert data["job_id"].startswith("lesson_")
        assert data["status"] == "queued"
        assert data["job_id"] == data["lesson_id"]

        # Verify job was stored in JobManager
        job = job_manager.get_job(data["job_id"])
        assert job is not None
        assert job.request.topic == "Python Generators"


def test_post_jobs_target_language_compatibility(monkeypatch):
    monkeypatch.setattr("fastapi.BackgroundTasks.add_task", lambda *args, **kwargs: None)

    res = client.post(
        "/api/jobs",
        json={
            "topic": "Recursion in Python",
            "level": "intermediate",
            "target_language": "hi",
            "target_duration_seconds": 60,
        },
    )
    assert res.status_code == 202
    data = res.json()
    job = job_manager.get_job(data["job_id"])
    assert job is not None
    assert job.request.language == "hi"


def test_post_jobs_validation_errors():
    # 1. Topic too short
    res1 = client.post("/api/jobs", json={"topic": "A"})
    assert res1.status_code == 422

    # 2. Topic too long (> 200 chars)
    res2 = client.post("/api/jobs", json={"topic": "X" * 201})
    assert res2.status_code == 422

    # 3. Invalid duration (< 30s)
    res3 = client.post("/api/jobs", json={"topic": "Valid Topic", "target_duration_seconds": 15})
    assert res3.status_code == 422

    # 4. Invalid level
    res4 = client.post("/api/jobs", json={"topic": "Valid Topic", "level": "expert"})
    assert res4.status_code == 422


# ==============================================================================
# 2. GET /api/jobs/{job_id} and GET /jobs/{job_id} (Status & Lifecycle Mapping)
# ==============================================================================

def test_get_job_status_unknown_job_returns_404():
    res = client.get("/api/jobs/nonexistent_job_123")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    # Test root-level Vite alias as well
    res_alias = client.get("/jobs/nonexistent_job_123")
    assert res_alias.status_code == 404


def test_get_job_status_maps_completed_to_ready():
    req = LessonGenerateRequest(topic="State Mapping Test")
    job = job_manager.create_job(req, lesson_id="ready_test_job")

    # Status: queued
    res = client.get(f"/api/jobs/{job.lesson_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "queued"

    # Status: running
    job_manager.update_status(job.lesson_id, status="running", stage="planning", progress_percent=20)
    res = client.get(f"/api/jobs/{job.lesson_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "running"
    assert data["stage"] == "planning"
    assert data["progress_percent"] == 20

    # Status: completed -> MUST map to "ready" for Person 3
    job_manager.update_status(job.lesson_id, status="completed", stage="completed", progress_percent=100)
    res = client.get(f"/api/jobs/{job.lesson_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready", "backend 'completed' must map to 'ready' in /jobs/{id}"
    assert data["stage"] == "ready"
    assert data["progress_percent"] == 100
    assert data["fallback_used"] is False

    # Root alias also returns "ready"
    res_alias = client.get(f"/jobs/{job.lesson_id}")
    assert res_alias.status_code == 200
    assert res_alias.json()["status"] == "ready"


def test_existing_lessons_endpoint_preserves_completed_status():
    """Verify Rule 5: Existing /api/lessons endpoint MUST return 'completed', NOT 'ready'."""
    req = LessonGenerateRequest(topic="Preserve Lessons Contract")
    job = job_manager.create_job(req, lesson_id="preserve_contract_job")
    job_manager.update_status(job.lesson_id, status="running")
    job_manager.update_status(job.lesson_id, status="completed", stage="completed", progress_percent=100)

    # /api/lessons/{id}/status returns "completed"
    res = client.get(f"/api/lessons/{job.lesson_id}/status")
    assert res.status_code == 200
    assert res.json()["status"] == "completed"

    # /api/jobs/{id} returns "ready"
    res_jobs = client.get(f"/api/jobs/{job.lesson_id}")
    assert res_jobs.status_code == 200
    assert res_jobs.json()["status"] == "ready"


def test_get_job_status_reports_failed():
    req = LessonGenerateRequest(topic="Failure Test")
    job = job_manager.create_job(req, lesson_id="failed_job_test")
    job_manager.update_status(
        job.lesson_id,
        status="failed",
        stage="failed",
        error="Synthesis pipeline failed",
        message="Generation failed: Synthesis pipeline failed",
    )

    res = client.get(f"/api/jobs/{job.lesson_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "failed"
    assert data["stage"] == "failed"
    assert "Synthesis pipeline failed" in data["error"]


# ==============================================================================
# 3. GET /api/jobs/{job_id}/lesson (Person 3 Contract Verification)
# ==============================================================================

def test_get_job_lesson_not_found_returns_404():
    res = client.get("/api/jobs/missing_job_999/lesson")
    assert res.status_code == 404


def test_get_job_lesson_not_ready_returns_409():
    req = LessonGenerateRequest(topic="Pending Job")
    job = job_manager.create_job(req, lesson_id="pending_job_123")

    res = client.get(f"/api/jobs/{job.lesson_id}/lesson")
    assert res.status_code == 409
    assert "not ready" in res.json()["detail"].lower()


def test_get_job_lesson_conforms_to_person3_contract(
    tmp_path: Path,
    mock_canonical_plan: CanonicalLessonPlan,
    mock_study_notes: LessonNotes,
    mock_audio_manifest: AudioManifest,
):
    req = LessonGenerateRequest(topic="Binary Search Algorithm")
    job = job_manager.create_job(req, lesson_id="full_compatible_job")

    # Create dummy artifact files
    video_file = tmp_path / "full_compatible_job.mp4"
    video_file.write_bytes(b"\x00\x00\x00 ftypisom")
    notes_file = tmp_path / "full_compatible_job_notes.json"
    notes_file.write_text(json.dumps(mock_study_notes.model_dump()))
    subtitles_file = tmp_path / "full_compatible_job.srt"
    subtitles_file.write_text("1\n00:00:00,000 --> 00:00:05,000\nHello")

    # Set results and stage timings
    job_manager.set_result(
        lesson_id=job.lesson_id,
        canonical_plan=mock_canonical_plan,
        study_notes=mock_study_notes,
        audio_manifest=mock_audio_manifest,
        video_path=str(video_file),
        notes_path=str(notes_file),
        subtitles_path=str(subtitles_file),
    )
    job_manager.record_stage_timing(job.lesson_id, "planning", 1520.5)
    job_manager.record_stage_timing(job.lesson_id, "synthesizing", 3210.0)
    job_manager.record_stage_timing(job.lesson_id, "exporting", 4500.2)
    job_manager.update_status(job.lesson_id, status="running")
    job_manager.update_status(job.lesson_id, status="completed", stage="completed", progress_percent=100)

    # Fetch via /api/jobs/{id}/lesson
    res = client.get(f"/api/jobs/{job.lesson_id}/lesson")
    assert res.status_code == 200
    data = res.json()

    # 1. Lesson plan checks (must have topic, level, language, target_duration_seconds, scenes)
    plan = data["lesson_plan"]
    assert plan["topic"] == "Binary Search Algorithm"
    assert plan["level"] == "beginner"
    assert plan["language"] == "en"
    assert plan["target_duration_seconds"] == 60
    assert len(plan["scenes"]) == 3

    # Check scene structures (no null fields for code or highlight_lines)
    s1 = plan["scenes"][0]
    assert s1["id"] == "scene_1"
    assert s1["type"] == "title_card"
    assert "code" not in s1

    s2 = plan["scenes"][1]
    assert s2["type"] == "diagram"
    assert s2["items"] == ["Find Mid", "Compare", "Halve Range"]

    s3 = plan["scenes"][2]
    assert s3["type"] == "code_walkthrough"
    assert "def binary_search" in s3["code"]
    assert s3["highlight_lines"] == [1, 2]

    # 2. Notes checks: MUST be a JSON string, parsable to dict
    assert isinstance(data["notes"], str), "Person 3 expects notes to be a string, not an object"
    notes_parsed = json.loads(data["notes"])
    assert notes_parsed["summary"] == "A comprehensive study guide on Binary Search."
    assert "steps" in notes_parsed
    assert len(notes_parsed["steps"]) == 3
    assert "models" in notes_parsed
    assert notes_parsed["models"]["planner"] == "mock-planner"

    # 3. Artifact manifest checks
    manifest = data["artifact_manifest"]
    assert isinstance(manifest["audio"], list)
    assert len(manifest["audio"]) == 3
    for entry in manifest["audio"]:
        assert "scene_id" in entry
        assert "audio_url" in entry
        assert entry["audio_url"].startswith(f"/api/jobs/{job.lesson_id}/audio/")
        assert entry["duration_seconds"] == 10.0

    # Timings by stage
    timings = manifest["timings_by_stage"]
    assert isinstance(timings, dict)
    assert timings["planning"] == 1520.5
    assert timings["synthesizing"] == 3210.0
    assert timings["exporting"] == 4500.2

    # URLs
    assert manifest["video_url"] == f"/api/jobs/{job.lesson_id}/video"
    assert manifest["notes_url"] == f"/api/jobs/{job.lesson_id}/notes"
    assert manifest["subtitles_url"] == f"/api/jobs/{job.lesson_id}/subtitles"


def test_get_job_lesson_omits_none_artifact_urls(
    mock_canonical_plan: CanonicalLessonPlan,
    mock_study_notes: LessonNotes,
):
    """Ensure video_url/notes_url/subtitles_url are NOT present with null value if files don't exist."""
    req = LessonGenerateRequest(topic="Missing Artifacts Test")
    job = job_manager.create_job(req, lesson_id="missing_artifacts_job")

    job_manager.set_result(
        lesson_id=job.lesson_id,
        canonical_plan=mock_canonical_plan,
        study_notes=mock_study_notes,
        video_path=None,
        notes_path=None,
        subtitles_path=None,
    )
    job_manager.update_status(job.lesson_id, status="running")
    job_manager.update_status(job.lesson_id, status="completed", stage="completed", progress_percent=100)

    res = client.get(f"/api/jobs/{job.lesson_id}/lesson")
    assert res.status_code == 200
    manifest = res.json()["artifact_manifest"]
    assert "video_url" not in manifest
    assert "notes_url" not in manifest
    assert "subtitles_url" not in manifest


# ==============================================================================
# 4. GET /api/jobs/{job_id}/video, notes, subtitles, audio (Download & Streaming)
# ==============================================================================

def test_job_video_download_and_missing(tmp_path: Path):
    req = LessonGenerateRequest(topic="Video Download Test")
    job = job_manager.create_job(req, lesson_id="video_download_job")

    # Before video exists -> 404
    res = client.get(f"/api/jobs/{job.lesson_id}/video")
    assert res.status_code == 404

    # When video exists -> 200 with video/mp4
    video_file = tmp_path / "video.mp4"
    video_file.write_bytes(b"\x00\x00\x00 ftypmp42")
    job_manager.set_result(job.lesson_id, video_path=str(video_file))

    res = client.get(f"/api/jobs/{job.lesson_id}/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert b"ftypmp42" in res.content

    # Root alias also serves video
    res_alias = client.get(f"/jobs/{job.lesson_id}/video")
    assert res_alias.status_code == 200


def test_job_notes_download(tmp_path: Path, mock_study_notes: LessonNotes):
    req = LessonGenerateRequest(topic="Notes Download Test")
    job = job_manager.create_job(req, lesson_id="notes_download_job")

    # Attach notes
    notes_file = tmp_path / "notes.json"
    notes_file.write_text(json.dumps(mock_study_notes.model_dump()))
    job_manager.set_result(job.lesson_id, study_notes=mock_study_notes, notes_path=str(notes_file))

    res = client.get(f"/api/jobs/{job.lesson_id}/notes")
    assert res.status_code == 200
    assert "application/json" in res.headers["content-type"]


def test_job_subtitles_download(tmp_path: Path):
    req = LessonGenerateRequest(topic="Subtitles Download Test")
    job = job_manager.create_job(req, lesson_id="subtitles_download_job")

    # Before subtitles exist -> 404
    res = client.get(f"/api/jobs/{job.lesson_id}/subtitles")
    assert res.status_code == 404

    subtitles_file = tmp_path / "test.srt"
    subtitles_file.write_text("1\n00:00:00,000 --> 00:00:02,000\nHello World\n", encoding="utf-8")
    job_manager.set_result(job.lesson_id, subtitles_path=str(subtitles_file))

    res = client.get(f"/api/jobs/{job.lesson_id}/subtitles")
    assert res.status_code == 200
    assert "text/plain" in res.headers["content-type"]
    assert "Hello World" in res.text


def test_job_audio_stream_and_404(mock_audio_manifest: AudioManifest):
    req = LessonGenerateRequest(topic="Audio Stream Test")
    job = job_manager.create_job(req, lesson_id="audio_stream_job")
    job_manager.set_result(job.lesson_id, audio_manifest=mock_audio_manifest)

    # Valid scene audio
    res = client.get(f"/api/jobs/{job.lesson_id}/audio/scene_1.wav")
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/wav"
    assert b"RIFFFAKEWAVDATA1" in res.content

    # Also without .wav suffix
    res_no_ext = client.get(f"/api/jobs/{job.lesson_id}/audio/scene_1")
    assert res_no_ext.status_code == 200

    # Nonexistent scene -> 404
    res_missing = client.get(f"/api/jobs/{job.lesson_id}/audio/nonexistent_scene.wav")
    assert res_missing.status_code == 404


# ==============================================================================
# 5. Full End-to-End API Lifecycle Contract Test
# ==============================================================================

def test_full_api_contract_job_creation_polling_lesson_and_artifacts(tmp_path: Path, monkeypatch):
    """
    Focused API contract test:
    1. Create job via POST /api/jobs
    2. Poll status via GET /api/jobs/{id}
    3. Retrieve lesson via GET /api/jobs/{id}/lesson
    4. Validate artifact manifest URLs and download each artifact
    """
    from backend.app.services.export.video_exporter import ExportArtifacts
    from backend.app.services.export.media_validator import MediaValidationResult

    # Mock video exporter to generate dummy artifacts quickly without opening Playwright
    def fast_mock_export(lesson_id, canonical_plan, audio_manifest, output_dir, notes_path, on_progress=None):
        if on_progress:
            on_progress(95, "Exporting fast mock video")
        vid = output_dir / f"{lesson_id}.mp4"
        vid.write_bytes(b"\x00\x00\x00 ftypisom")
        srt = output_dir / f"{lesson_id}.srt"
        srt.write_text("1\n00:00:00,000 --> 00:00:05,000\nFast Mock Subtitles\n", encoding="utf-8")
        aud = output_dir / "master_audio.wav"
        aud.write_bytes(b"RIFFFAKEWAV")
        return ExportArtifacts(
            video_path=vid,
            audio_path=aud,
            subtitles_path=srt,
            notes_path=Path(notes_path),
            total_frames=900,
            duration_seconds=30.0,
            validation=MediaValidationResult(is_valid=True, duration_seconds=30.0, video_codec="h264", audio_codec="aac"),
        )

    monkeypatch.setattr("backend.app.services.export.video_exporter.export_lesson_video", fast_mock_export)

    # 1. Create a job
    res_create = client.post(
        "/api/jobs",
        json={
            "topic": "Photosynthesis in Plants",
            "level": "beginner",
            "language": "en",
            "target_duration_seconds": 60,
        },
    )
    assert res_create.status_code == 202
    create_data = res_create.json()
    job_id = create_data["job_id"]
    assert job_id.startswith("lesson_")
    assert create_data["status"] == "queued"

    # 2. Poll job status (FastAPI TestClient processes background task synchronously)
    res_status = client.get(f"/api/jobs/{job_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["status"] == "ready", "Completed job must report 'ready' to Person 3"
    assert status_data["stage"] == "ready"
    assert status_data["progress_percent"] == 100
    assert status_data["job_id"] == job_id

    # 3. Retrieve lesson details
    res_lesson = client.get(f"/api/jobs/{job_id}/lesson")
    assert res_lesson.status_code == 200
    lesson_data = res_lesson.json()

    # Validate lesson plan
    plan = lesson_data["lesson_plan"]
    assert "topic" in plan and len(plan["topic"]) > 0
    assert plan["level"] == "beginner"
    assert plan["language"] == "en"
    assert len(plan["scenes"]) >= 3

    # Validate notes
    assert isinstance(lesson_data["notes"], str)
    notes_obj = json.loads(lesson_data["notes"])
    assert "summary" in notes_obj
    assert "steps" in notes_obj

    # 4. Check artifact manifest and URLs
    manifest = lesson_data["artifact_manifest"]
    assert len(manifest["audio"]) >= 3
    assert "timings_by_stage" in manifest
    assert "video_url" in manifest
    assert "notes_url" in manifest
    assert "subtitles_url" in manifest

    # 5. Fetch and verify every artifact URL
    res_video = client.get(manifest["video_url"])
    assert res_video.status_code == 200
    assert res_video.headers["content-type"] == "video/mp4"

    res_notes = client.get(manifest["notes_url"])
    assert res_notes.status_code == 200
    assert "application/json" in res_notes.headers["content-type"]

    res_subtitles = client.get(manifest["subtitles_url"])
    assert res_subtitles.status_code == 200
    assert "text/plain" in res_subtitles.headers["content-type"]

    first_audio_url = manifest["audio"][0]["audio_url"]
    assert first_audio_url.startswith(f"/api/jobs/{job_id}/audio/")
    res_audio = client.get(first_audio_url)
    assert res_audio.status_code == 200
    assert res_audio.headers["content-type"] == "audio/wav"
