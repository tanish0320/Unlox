import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["offline"] is True
    assert data["ffmpeg_available"] is True

def test_api_sample_fixture():
    res = client.get("/api/lessons/fixtures/sample")
    assert res.status_code == 200
    data = res.json()
    assert data["lesson_id"] == "sample_en"
    assert "lesson_plan" in data
    assert "audio_manifest" in data
    assert len(data["lesson_plan"]["scenes"]) == 3
    # Check browser accessible audio url
    first_entry = data["audio_manifest"]["entries"][0]
    assert first_entry["audio_file"].startswith("/api/audio/")

def test_api_sample_audio_serving():
    res = client.get("/api/audio/fixtures/en/scene_01_en.wav")
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/wav"
    assert len(res.content) > 10000

def test_api_sample_video_serving():
    res = client.get("/api/lessons/sample_en/video")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert len(res.content) > 10000

def test_api_sample_captions_serving():
    res = client.get("/api/lessons/sample_en/captions")
    assert res.status_code == 200
    assert len(res.content) > 50
    assert b"-->" in res.content

def test_export_mp4_generation_and_verification():
    from backend.app.services.exporter.video_exporter import (
        export_mp4_video,
        generate_srt_file,
        verify_video_file,
        find_ffmpeg_binaries,
    )
    from backend.app.schemas.provisional_lesson import LessonPlan
    from backend.app.schemas.audio_manifest import AudioManifest

    ffmpeg_p, _ = find_ffmpeg_binaries()
    assert ffmpeg_p is not None, "FFmpeg binary must exist"

    root = Path(__file__).resolve().parent.parent
    en_dir = root / "outputs" / "integration_fixtures" / "en"

    lesson = LessonPlan(**json.loads((en_dir / "lesson_plan.json").read_text(encoding="utf-8")))
    manifest = AudioManifest(**json.loads((en_dir / "audio_manifest.json").read_text(encoding="utf-8")))

    tmp_out = root / "outputs" / "test_run" / "test_unit.mp4"
    tmp_srt = root / "outputs" / "test_run" / "test_unit.srt"

    generate_srt_file(manifest, tmp_srt)
    assert tmp_srt.is_file() and tmp_srt.stat().st_size > 0

    export_mp4_video(lesson, manifest, root, tmp_out, fps=25)
    assert tmp_out.is_file() and tmp_out.stat().st_size > 0

    verification = verify_video_file(tmp_out)
    assert verification["valid"] is True
    assert verification["is_h264"] is True
    assert verification["is_1280x720"] is True


def test_planner_return_contracts_unpacking():
    """Regression test ensuring planner return tuple contracts are unpacked without AttributeError."""
    from backend.app.services.planner.ollama_planner import OllamaLessonPlanner
    from backend.app.services.planner.mock_planner import MockLessonPlanner
    from backend.app.schemas.provisional_lesson import LessonPlan

    # Ollama returns 3-tuple: (LessonPlan, fallback_used, error_reason)
    ollama_planner = OllamaLessonPlanner()
    ollama_res = ollama_planner.plan_lesson(topic="Explain Ratio and proportion")
    assert isinstance(ollama_res, tuple)
    assert len(ollama_res) == 3
    plan_ollama, fallback_used, err = ollama_res
    assert isinstance(plan_ollama, LessonPlan)
    assert hasattr(plan_ollama, "scenes")
    assert len(plan_ollama.scenes) >= 3

    # Mock planner returns 2-tuple: (LessonPlan, fallback_used)
    mock_planner = MockLessonPlanner()
    mock_res = mock_planner.plan_lesson(topic="Explain Ratio and proportion")
    assert isinstance(mock_res, tuple)
    assert len(mock_res) == 2
    plan_mock, mock_fallback = mock_res
    assert isinstance(plan_mock, LessonPlan)
    assert hasattr(plan_mock, "scenes")
    assert len(plan_mock.scenes) >= 3


def test_generate_ratio_and_proportion_pipeline():
    """Regression test for 'Explain Ratio and proportion' lesson generation pipeline."""
    from backend.app.main import run_lesson_pipeline, JOB_STORE, LESSON_STORE, MANIFEST_STORE, GenerateRequest
    import uuid

    job_id = f"test_{uuid.uuid4().hex[:6]}"
    lesson_id = f"lesson_{job_id}"
    req = GenerateRequest(
        topic="Explain Ratio and proportion",
        level="beginner",
        language="en",
        target_duration_seconds=45,
    )

    JOB_STORE[job_id] = {
        "job_id": job_id,
        "lesson_id": lesson_id,
        "step": "queued",
        "percent": 0,
        "step_label": "Queued",
        "error": None,
    }

    # Execute synchronous generation pipeline
    run_lesson_pipeline(job_id, lesson_id, req)

    job_state = JOB_STORE[job_id]
    assert job_state["step"] == "completed", f"Pipeline failed: {job_state.get('error')}"
    assert job_state["error"] is None

    # Verify generated LessonPlan
    lesson = LESSON_STORE[lesson_id]
    assert lesson.topic == "Explain Ratio and proportion"
    assert lesson.level == "beginner"
    assert lesson.language == "en"
    assert len(lesson.scenes) == 3
    assert hasattr(lesson, "scenes")
    # Verify educational fields populated
    assert lesson.summary is not None
    assert len(lesson.learning_objectives) >= 1
    assert len(lesson.glossary) >= 1
    assert len(lesson.revision_questions) >= 1

    # Verify manifest
    manifest = MANIFEST_STORE[lesson_id]
    assert manifest.lesson_id == lesson_id
    assert len(manifest.entries) == 3
    assert manifest.total_duration_seconds > 0


def test_generate_lesson_hindi_translation():
    """Verify selecting Hindi produces translated narration and preserves code integrity."""
    from backend.app.main import run_lesson_pipeline, JOB_STORE, LESSON_STORE, GenerateRequest
    import uuid

    job_id = f"test_{uuid.uuid4().hex[:6]}"
    lesson_id = f"lesson_{job_id}"
    req = GenerateRequest(
        topic="Explain Ratio and proportion",
        level="beginner",
        language="hi",
        target_duration_seconds=45,
    )

    JOB_STORE[job_id] = {
        "job_id": job_id,
        "lesson_id": lesson_id,
        "step": "queued",
        "percent": 0,
        "step_label": "Queued",
        "error": None,
    }

    run_lesson_pipeline(job_id, lesson_id, req)

    job_state = JOB_STORE[job_id]
    assert job_state["step"] == "completed", f"Pipeline failed: {job_state.get('error')}"

    lesson = LESSON_STORE[lesson_id]
    assert lesson.language == "hi"
    assert lesson.source_language == "en"
    # Verify scene 1 contains Hindi text
    assert "अनुपात" in lesson.scenes[0].heading or "[HI]" in lesson.scenes[0].heading
    # Verify math scene is a visual diagram without inappropriate Python code
    math_scene = lesson.scenes[1]
    assert math_scene.type == "diagram"
    assert math_scene.diagram_type in ["fraction_bar", "proportion_table"] or getattr(math_scene, "fraction_bar", None) is not None


def test_api_generate_lesson_endpoint():
    """Verify POST /api/lessons/generate correctly enqueues a generation job."""
    res = client.post(
        "/api/lessons/generate",
        json={
            "topic": "Explain Ratio and proportion",
            "level": "beginner",
            "language": "en",
            "target_duration_seconds": 45,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "job_id" in data
    assert "lesson_id" in data
    assert data["status"] == "queued"

    job_res = client.get(f"/api/lessons/jobs/{data['job_id']}")
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert "step" in job_data
    assert "percent" in job_data




def test_api_notes_json_and_pdf_download():
    """Verify notes JSON and PDF download endpoints for sample and generated lessons."""
    # 1. Sample bundle JSON download
    res_json = client.get("/api/lessons/sample_en/notes?download=true")
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["content-type"]
    assert "attachment" in res_json.headers.get("content-disposition", "")
    data = res_json.json()
    assert "summary" in data
    assert "learning_objectives" in data

    # 2. Sample bundle PDF download
    res_pdf = client.get("/api/lessons/sample_en/notes/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert "attachment" in res_pdf.headers.get("content-disposition", "")
    assert len(res_pdf.content) > 1000
    assert res_pdf.content.startswith(b"%PDF")


def test_api_tts_voices_endpoint():
    """Verify /api/tts/voices endpoint lists local speech engines and voice availability."""
    res = client.get("/api/tts/voices")
    assert res.status_code == 200
    voices = res.json()
    assert "hi" in voices
    assert "en" in voices
    assert "te" in voices
    assert "ta" in voices
    assert "kn" in voices
    # Hindi and Telugu are locally installed via Piper ONNX
    assert voices["hi"]["available"] is True
    assert "piper" in voices["hi"]["engine"].lower()
    assert voices["te"]["available"] is True
    assert "piper" in voices["te"]["engine"].lower()
    # English uses native Windows SAPI5
    assert voices["en"]["available"] is True
    assert "windows" in voices["en"]["engine"].lower() or "sapi5" in voices["en"]["engine"].lower()
    # Tamil and Kannada are locally installed via Piper ONNX
    assert voices["ta"]["available"] is True
    assert "piper" in voices["ta"]["engine"].lower()
    assert voices["kn"]["available"] is True
    assert "piper" in voices["kn"]["engine"].lower()


def test_real_hindi_speech_synthesis():
    """Verify genuine offline neural speech synthesis for Hindi Devanagari text."""
    from backend.app.services.tts.tts_adapter import LocalTTSDispatcher
    import wave

    dispatcher = LocalTTSDispatcher()
    hindi_text = "अनुपात और समानुपात के इस पाठ में आपका स्वागत है।"
    tts_res = dispatcher.synthesize(text=hindi_text, language="hi")

    wav_file = Path(tts_res.audio_file)
    assert wav_file.is_file()
    audio_bytes = wav_file.read_bytes()
    assert len(audio_bytes) > 20000
    assert tts_res.duration_seconds > 1.0
    assert tts_res.fallback_used is False
    assert "piper" in tts_res.voice_id.lower() or "pratham" in tts_res.voice_id.lower()

    # Verify standard WAV headers and format
    with wave.open(str(wav_file), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        assert wf.getframerate() == 22050
        frames = wf.getnframes()
        calc_dur = frames / wf.getframerate()
        assert abs(calc_dur - tts_res.duration_seconds) < 0.2


def test_missing_voice_error_for_unsupported_language():
    """Verify requesting an unsupported language raises MissingLocalVoiceError without substituting English."""
    import pytest
    from backend.app.services.tts.tts_adapter import LocalTTSDispatcher, MissingLocalVoiceError

    dispatcher = LocalTTSDispatcher()
    with pytest.raises(MissingLocalVoiceError) as exc_info:
        dispatcher.synthesize(text="നമസ്കാരം", language="ml")

    err = str(exc_info.value)
    assert "Malayalam" in err or "ml" in err
    assert "piper" in err.lower() or "install" in err.lower()


def test_real_tamil_and_kannada_speech_synthesis():
    """Verify genuine offline neural speech synthesis for Tamil and Kannada text."""
    from backend.app.services.tts.tts_adapter import LocalTTSDispatcher
    import wave

    dispatcher = LocalTTSDispatcher()

    # Tamil synthesis
    ta_res = dispatcher.synthesize(text="வணக்கம்! இது தமிழ் மாதிரி.", language="ta")
    ta_wav = Path(ta_res.audio_file)
    assert ta_wav.is_file()
    assert not ta_res.fallback_used
    assert "piper_ta_IN" in ta_res.voice_id

    # Kannada synthesis
    kn_res = dispatcher.synthesize(text="ನಮಸ್ಕಾರ! ಇದು ಕನ್ನಡ ಮಾದರಿ.", language="kn")
    kn_wav = Path(kn_res.audio_file)
    assert kn_wav.is_file()
    assert not kn_res.fallback_used
    assert "piper_kn_IN" in kn_res.voice_id
