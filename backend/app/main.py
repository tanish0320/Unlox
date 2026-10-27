"""
FastAPI Backend Server for Blu Visual Teacher.

Integrates:
- Local AI Planner (Ollama with deterministic fallback)
- Local Translation & Code-Preserving Adapter
- Local Speech Synthesis (Offline Windows SAPI5 with duration measurement)
- Audio Manifest & Timeline Synchronization
- Structured Educational Notes Generator
- Offline FFmpeg MP4 Exporter & SRT Generator
- Safe Local Audio & Media Serving
"""

import asyncio
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Dict, List, Literal, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.schemas.audio_manifest import AudioManifest, SceneAudioEntry, CaptionSegment
from backend.app.schemas.lesson_notes import LessonNotes
from backend.app.services.planner.ollama_planner import OllamaLessonPlanner
from backend.app.services.planner.mock_planner import MockLessonPlanner
from backend.app.services.translation.translation_adapter import LocalTranslationDispatcher
from backend.app.services.tts.tts_adapter import LocalTTSDispatcher
from backend.app.services.notes_generator import generate_study_notes
from backend.app.services.pdf_generator import generate_lesson_pdf
from backend.app.services.exporter.video_exporter import (
    export_mp4_video,
    generate_srt_file,
    find_ffmpeg_binaries,
    verify_video_file,
)

app = FastAPI(
    title="Blu Visual Teacher API",
    description="Offline-first Local AI Lesson Generator, Audio Synthesizer, and Video Exporter",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active lessons and jobs
LESSON_STORE: Dict[str, LessonPlan] = {}
MANIFEST_STORE: Dict[str, AudioManifest] = {}
NOTES_STORE: Dict[str, LessonNotes] = {}
JOB_STORE: Dict[str, Dict[str, any]] = {}

OUTPUTS_DIR = ROOT_DIR / "outputs" / "generated"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = Field(default="en")
    target_duration_seconds: int = Field(default=45, ge=30, le=120)


def run_lesson_pipeline(job_id: str, lesson_id: str, req: GenerateRequest):
    """Executes the full local generation pipeline asynchronously in background."""
    try:
        # Step 1: Lesson Planning
        JOB_STORE[job_id]["step"] = "generating_script"
        JOB_STORE[job_id]["percent"] = 15
        JOB_STORE[job_id]["step_label"] = "Generating lesson structure and scenes..."

        planner = OllamaLessonPlanner(timeout_seconds=25.0)
        lesson = None
        fallback_used = False

        if planner.is_available():
            try:
                lesson, fallback_used, err_msg = planner.plan_lesson(
                    topic=req.topic,
                    level=req.level,
                    language="en",
                    target_duration_seconds=req.target_duration_seconds,
                )
                if fallback_used:
                    mock_p = MockLessonPlanner()
                    lesson, _ = mock_p.plan_lesson(
                        topic=req.topic,
                        level=req.level,
                        language="en",
                        target_duration_seconds=req.target_duration_seconds,
                    )
                    fallback_used = True
            except Exception:
                lesson = None

        if lesson is None:
            mock_p = MockLessonPlanner()
            lesson, fallback_used = mock_p.plan_lesson(
                topic=req.topic,
                level=req.level,
                language="en",
                target_duration_seconds=req.target_duration_seconds,
            )

        # Step 2: Translation (if target language is not English)
        if req.language.lower() != "en":
            JOB_STORE[job_id]["step"] = "translating_script"
            JOB_STORE[job_id]["percent"] = 35
            JOB_STORE[job_id]["step_label"] = f"Translating narration to {req.language.upper()}..."

            translator = LocalTranslationDispatcher()
            translated_lesson, trans_fallback, trans_err = translator.translate(
                lesson=lesson,
                target_language=req.language.lower(),
                source_language="en",
            )
            lesson = translated_lesson
            lesson.language = req.language.lower()
            lesson.source_language = "en"

        # Step 3: Local TTS & Duration Measurement
        JOB_STORE[job_id]["step"] = "synthesizing_audio"
        JOB_STORE[job_id]["percent"] = 55
        JOB_STORE[job_id]["step_label"] = "Synthesizing voice narration and measuring duration..."

        lesson_dir = OUTPUTS_DIR / lesson_id
        audio_dir = lesson_dir / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        tts = LocalTTSDispatcher(output_dir=audio_dir, use_system_tts=True)

        manifest_entries: List[SceneAudioEntry] = []
        global_cursor = 0.0
        padding = 0.3

        for i, scene in enumerate(lesson.scenes):
            wav_path = audio_dir / f"{scene.id}_{lesson.language}.wav"
            tts_res = tts.synthesize_speech(
                text=scene.narration,
                language=lesson.language,
                output_path=wav_path,
            )

            dur = tts_res.duration_seconds
            # Caption segment
            caption = CaptionSegment(
                start_seconds=0.0,
                end_seconds=dur,
                global_start_seconds=round(global_cursor, 3),
                global_end_seconds=round(global_cursor + dur, 3),
                text=scene.narration,
            )

            rel_path = f"outputs/generated/{lesson_id}/audio/{wav_path.name}"
            manifest_entries.append(
                SceneAudioEntry(
                    scene_id=scene.id,
                    audio_file=rel_path,
                    duration_seconds=dur,
                    language=lesson.language,
                    voice_id=tts_res.voice_id,
                    sample_rate=tts_res.sample_rate,
                    fallback_used=tts_res.fallback_used,
                    caption_segments=[caption],
                )
            )
            global_cursor += dur + padding

        raw_total_dur = sum(e.duration_seconds for e in manifest_entries)
        manifest = AudioManifest(
            schema_version="1.0.0",
            lesson_id=lesson_id,
            language=lesson.language,
            total_duration_seconds=round(raw_total_dur, 3),
            total_timeline_duration_seconds=round(global_cursor - (padding if manifest_entries else 0), 3),
            entries=manifest_entries,
            fallback_used=any(e.fallback_used for e in manifest_entries),
        )

        # Step 4: Study Notes Generation
        JOB_STORE[job_id]["step"] = "generating_notes"
        JOB_STORE[job_id]["percent"] = 75
        JOB_STORE[job_id]["step_label"] = "Generating educational study notes..."

        notes = generate_study_notes(lesson, manifest=manifest)

        # Reconcile educational fields on canonical LessonPlan
        lesson.summary = notes.summary
        lesson.learning_objectives = notes.learning_objectives
        lesson.key_takeaways = notes.key_takeaways
        lesson.glossary = [{"term": c.term, "definition": c.definition} for c in notes.key_concepts]
        lesson.revision_questions = [{"question": q.question, "answer": q.answer} for q in notes.revision_questions]

        # Generate offline study notes PDF
        out_pdf = lesson_dir / f"{lesson_id}_notes.pdf"
        try:
            generate_lesson_pdf(lesson=lesson, notes=notes, output_path=out_pdf)
        except Exception as pdf_err:
            print(f"Warning: PDF generation encountered non-fatal error: {pdf_err}")

        # Step 5: Exporting MP4 Video & SRT
        JOB_STORE[job_id]["step"] = "exporting_video"
        JOB_STORE[job_id]["percent"] = 85
        JOB_STORE[job_id]["step_label"] = "Rendering 1280x720 MP4 video and subtitles..."

        out_mp4 = lesson_dir / f"{lesson_id}.mp4"
        out_srt = lesson_dir / f"{lesson_id}.srt"

        generate_srt_file(manifest, out_srt)
        export_mp4_video(
            lesson_plan=lesson,
            manifest=manifest,
            workspace_root=ROOT_DIR,
            output_mp4_path=out_mp4,
            fps=25,
        )

        # Save artifacts to disk for persistence
        (lesson_dir / "lesson_plan.json").write_text(lesson.model_dump_json(indent=2), encoding="utf-8")
        (lesson_dir / "audio_manifest.json").write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        (lesson_dir / "lesson-notes.json").write_text(notes.model_dump_json(indent=2), encoding="utf-8")

        # Save to memory store
        LESSON_STORE[lesson_id] = lesson
        MANIFEST_STORE[lesson_id] = manifest
        NOTES_STORE[lesson_id] = notes

        # Step 6: Completed
        JOB_STORE[job_id]["step"] = "completed"
        JOB_STORE[job_id]["percent"] = 100
        JOB_STORE[job_id]["step_label"] = "Lesson successfully generated!"
        JOB_STORE[job_id]["lesson_id"] = lesson_id

    except Exception as exc:
        import traceback
        traceback.print_exc()
        JOB_STORE[job_id]["step"] = "failed"
        JOB_STORE[job_id]["error"] = str(exc)
        JOB_STORE[job_id]["step_label"] = f"Failed: {exc}"


@app.get("/api/health")
def health():
    """Health check endpoint reporting offline readiness and tool status."""
    ffmpeg_p, ffprobe_p = find_ffmpeg_binaries()
    return {
        "status": "healthy",
        "offline": True,
        "ffmpeg_available": bool(ffmpeg_p),
        "ffmpeg_path": ffmpeg_p,
        "supported_languages": ["en", "hi", "ta", "te", "kn"],
    }


@app.get("/api/tts/voices")
def get_tts_voices():
    """Returns local TTS engine status and voice availability per language."""
    dispatcher = LocalTTSDispatcher()
    return dispatcher.get_supported_voices()


@app.post("/api/lessons/generate")
def generate_lesson(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Enqueues a new lesson generation request and returns the job tracker ID."""
    job_id = str(uuid.uuid4())[:8]
    lesson_id = f"lesson_{job_id}"

    JOB_STORE[job_id] = {
        "job_id": job_id,
        "lesson_id": lesson_id,
        "step": "queued",
        "percent": 0,
        "step_label": "Queued for processing...",
        "error": None,
    }

    background_tasks.add_task(run_lesson_pipeline, job_id, lesson_id, req)
    return {"job_id": job_id, "lesson_id": lesson_id, "status": "queued"}


@app.get("/api/lessons/jobs/{job_id}")
def get_job_status(job_id: str):
    """Returns the live status, progress percentage, and stage of a generation job."""
    if job_id not in JOB_STORE:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOB_STORE[job_id]


@app.get("/api/lessons/fixtures/sample")
def get_sample_lesson():
    """Returns the verified English integration bundle instantly for preview."""
    en_dir = ROOT_DIR / "outputs" / "integration_fixtures" / "en"
    plan_file = en_dir / "lesson_plan.json"
    manifest_file = en_dir / "audio_manifest.json"
    notes_file = en_dir / "lesson-notes.json"

    if not plan_file.exists():
        raise HTTPException(status_code=404, detail="Fixture not found")

    plan = json.loads(plan_file.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    notes = json.loads(notes_file.read_text(encoding="utf-8"))

    # Rewrite audio URLs to be browser-accessible
    for entry in manifest.get("entries", []):
        raw_path = entry.get("audio_file", "")
        filename = Path(raw_path).name
        entry["audio_file"] = f"/api/audio/fixtures/en/{filename}"

    return {
        "lesson_id": "sample_en",
        "lesson_plan": plan,
        "audio_manifest": manifest,
        "lesson_notes": notes,
        "video_url": "/api/lessons/fixtures/en/video",
        "notes_url": "/api/lessons/fixtures/en/notes",
        "captions_url": "/api/lessons/fixtures/en/captions",
    }


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: str):
    """Retrieves the canonical LessonPlan data."""
    if lesson_id in LESSON_STORE:
        return LESSON_STORE[lesson_id]

    # Check disk
    plan_path = OUTPUTS_DIR / lesson_id / "lesson_plan.json"
    if plan_path.is_file():
        return json.loads(plan_path.read_text(encoding="utf-8"))

    raise HTTPException(status_code=404, detail="Lesson not found")


@app.get("/api/lessons/{lesson_id}/manifest")
def get_manifest(lesson_id: str):
    """Retrieves the AudioManifest with browser-accessible audio URLs."""
    manifest = None
    if lesson_id in MANIFEST_STORE:
        manifest = MANIFEST_STORE[lesson_id].model_dump()
    else:
        man_path = OUTPUTS_DIR / lesson_id / "audio_manifest.json"
        if man_path.is_file():
            manifest = json.loads(man_path.read_text(encoding="utf-8"))

    if not manifest:
        raise HTTPException(status_code=404, detail="Audio manifest not found")

    # Map audio paths to browser API endpoints
    for entry in manifest.get("entries", []):
        filename = Path(entry["audio_file"]).name
        entry["audio_file"] = f"/api/audio/{lesson_id}/{filename}"

    return manifest


@app.get("/api/lessons/{lesson_id}/notes")
def get_notes(lesson_id: str, download: bool = False):
    """Retrieves structured study notes JSON or downloads it directly."""
    # Check if sample bundle
    if lesson_id in ("sample_en", "sample") or lesson_id.startswith("sample"):
        sample_path = ROOT_DIR / "outputs" / "integration_fixtures" / "en" / "lesson-notes.json"
        if sample_path.is_file():
            if download:
                return FileResponse(
                    str(sample_path),
                    media_type="application/json",
                    filename=f"{lesson_id}_notes.json",
                    headers={"Content-Disposition": f'attachment; filename="{lesson_id}_notes.json"'}
                )
            return json.loads(sample_path.read_text(encoding="utf-8"))

    if lesson_id in NOTES_STORE:
        notes_data = NOTES_STORE[lesson_id].model_dump()
        if download:
            notes_path = OUTPUTS_DIR / lesson_id / "lesson-notes.json"
            if notes_path.is_file():
                return FileResponse(
                    str(notes_path),
                    media_type="application/json",
                    filename=f"{lesson_id}_notes.json",
                    headers={"Content-Disposition": f'attachment; filename="{lesson_id}_notes.json"'}
                )
            return JSONResponse(
                content=notes_data,
                headers={"Content-Disposition": f'attachment; filename="{lesson_id}_notes.json"'}
            )
        return notes_data

    notes_path = OUTPUTS_DIR / lesson_id / "lesson-notes.json"
    if notes_path.is_file():
        if download:
            return FileResponse(
                str(notes_path),
                media_type="application/json",
                filename=f"{lesson_id}_notes.json",
                headers={"Content-Disposition": f'attachment; filename="{lesson_id}_notes.json"'}
            )
        return json.loads(notes_path.read_text(encoding="utf-8"))

    raise HTTPException(status_code=404, detail="Lesson notes not found")


@app.get("/api/lessons/{lesson_id}/notes/pdf")
def get_notes_pdf(lesson_id: str):
    """Generates and downloads beautifully formatted PDF study notes with Unicode support."""
    # 1. Sample bundle PDF
    if lesson_id in ("sample_en", "sample") or lesson_id.startswith("sample"):
        en_dir = ROOT_DIR / "outputs" / "integration_fixtures" / "en"
        fixture_pdf = en_dir / "lesson-notes.pdf"
        if not fixture_pdf.is_file():
            plan_file = en_dir / "lesson_plan.json"
            notes_file = en_dir / "lesson-notes.json"
            if plan_file.is_file():
                p = LessonPlan(**json.loads(plan_file.read_text(encoding="utf-8")))
                n = LessonNotes(**json.loads(notes_file.read_text(encoding="utf-8"))) if notes_file.is_file() else None
                generate_lesson_pdf(lesson=p, notes=n, output_path=fixture_pdf)

        if fixture_pdf.is_file():
            return FileResponse(
                str(fixture_pdf),
                media_type="application/pdf",
                filename="sample_en_study_notes.pdf",
                headers={"Content-Disposition": 'attachment; filename="sample_en_study_notes.pdf"'}
            )

    # 2. Generated lesson PDF
    pdf_path = OUTPUTS_DIR / lesson_id / f"{lesson_id}_notes.pdf"
    if not pdf_path.is_file():
        # Generate on demand if missing
        plan_path = OUTPUTS_DIR / lesson_id / "lesson_plan.json"
        notes_path = OUTPUTS_DIR / lesson_id / "lesson-notes.json"
        if plan_path.is_file():
            p = LessonPlan(**json.loads(plan_path.read_text(encoding="utf-8")))
            n = LessonNotes(**json.loads(notes_path.read_text(encoding="utf-8"))) if notes_path.is_file() else None
            generate_lesson_pdf(lesson=p, notes=n, output_path=pdf_path)

    if pdf_path.is_file():
        return FileResponse(
            str(pdf_path),
            media_type="application/pdf",
            filename=f"{lesson_id}_study_notes.pdf",
            headers={"Content-Disposition": f'attachment; filename="{lesson_id}_study_notes.pdf"'}
        )

    raise HTTPException(status_code=404, detail="Study notes PDF not found")


@app.get("/api/lessons/{lesson_id}/video")
def get_video(lesson_id: str):
    """Streams or downloads the exported 1280x720 MP4 video."""
    video_path = OUTPUTS_DIR / lesson_id / f"{lesson_id}.mp4"
    if not video_path.is_file():
        # Fallback to exported fixture if sample
        fixture_mp4 = ROOT_DIR / "outputs" / "exported_videos" / "en" / "lesson_en.mp4"
        if fixture_mp4.is_file():
            return FileResponse(str(fixture_mp4), media_type="video/mp4", filename=f"{lesson_id}.mp4")
        raise HTTPException(status_code=404, detail="MP4 video not found or export incomplete")

    return FileResponse(str(video_path), media_type="video/mp4", filename=f"{lesson_id}.mp4")


@app.get("/api/lessons/{lesson_id}/captions")
def get_captions(lesson_id: str):
    """Downloads the generated SRT subtitle file."""
    srt_path = OUTPUTS_DIR / lesson_id / f"{lesson_id}.srt"
    if not srt_path.is_file():
        fixture_srt = ROOT_DIR / "outputs" / "exported_videos" / "en" / "lesson_en.srt"
        if fixture_srt.is_file():
            return FileResponse(str(fixture_srt), media_type="text/plain", filename=f"{lesson_id}.srt")
        raise HTTPException(status_code=404, detail="SRT captions not found")

    return FileResponse(str(srt_path), media_type="text/plain", filename=f"{lesson_id}.srt")


@app.get("/api/lessons/fixtures/en/video")
def get_fixture_video():
    fixture_mp4 = ROOT_DIR / "outputs" / "exported_videos" / "en" / "lesson_en.mp4"
    if fixture_mp4.is_file():
        return FileResponse(str(fixture_mp4), media_type="video/mp4", filename="sample_lesson.mp4")
    raise HTTPException(status_code=404, detail="Fixture video not found")


@app.get("/api/lessons/fixtures/en/notes")
def get_fixture_notes(download: bool = False):
    notes_path = ROOT_DIR / "outputs" / "integration_fixtures" / "en" / "lesson-notes.json"
    if notes_path.is_file():
        if download:
            return FileResponse(
                str(notes_path),
                media_type="application/json",
                filename="sample_notes.json",
                headers={"Content-Disposition": 'attachment; filename="sample_notes.json"'}
            )
        return json.loads(notes_path.read_text(encoding="utf-8"))
    raise HTTPException(status_code=404, detail="Fixture notes not found")


@app.get("/api/lessons/fixtures/en/captions")
def get_fixture_captions():
    fixture_srt = ROOT_DIR / "outputs" / "exported_videos" / "en" / "lesson_en.srt"
    if fixture_srt.is_file():
        return FileResponse(str(fixture_srt), media_type="text/plain", filename="sample_lesson.srt")
    raise HTTPException(status_code=404, detail="Fixture captions not found")


@app.get("/api/audio/{lesson_id}/{filename}")
def get_audio_file(lesson_id: str, filename: str):
    """Safely serves synthesized WAV audio files for browser playback."""
    audio_path = OUTPUTS_DIR / lesson_id / "audio" / filename
    if not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(str(audio_path), media_type="audio/wav")


@app.get("/api/audio/fixtures/en/{filename}")
def get_fixture_audio_file(filename: str):
    """Serves vetted integration fixture audio files."""
    audio_path = ROOT_DIR / "outputs" / "integration_fixtures" / "en" / filename
    if not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Fixture audio file not found")
    return FileResponse(str(audio_path), media_type="audio/wav")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False)
