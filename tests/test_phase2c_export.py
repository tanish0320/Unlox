"""
Phase 2C Test Suite: Video Export, Media Validation, Playwright Capture, and API Endpoints.
Person 2 Owned.

Tests:
1. Frame planning and cumulative timing (drift-free 30 FPS, inter-scene pauses).
2. Audio-manifest mapping and PCM silence assembly.
3. Subtitle (.srt) generation and UTF-8 encoding.
4. Renderer readiness, error element detection, and timeouts.
5. FFmpeg failure handling and descriptive diagnostics.
6. ffprobe inspection and production validation (H.264, AAC, 1280x720, yuv420p, +faststart).
7. Job lifecycle failure transitions.
8. Artifact delivery endpoints (GET /video, GET /notes, GET /subtitles, GET detail).
9. Temporary-file cleanup on success and failure.
10. End-to-end Playwright + FFmpeg export smoke test.
"""

from pathlib import Path
import shutil
import struct
import subprocess
import time
from typing import List, Optional
import wave
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.api_models import LessonGenerateRequest
from backend.app.schemas.audio_manifest import (
    AudioManifest,
    CaptionSegment,
    SceneAudioEntry,
)
from backend.app.schemas.canonical_lesson import (
    CanonicalLessonPlan,
    CodeWalkthroughScene,
    DiagramScene,
    TitleCardScene,
)
from backend.app.services.export.audio_assembler import (
    assemble_master_audio,
    validate_wav_file,
)
from backend.app.services.export.frame_planner import (
    FrameSpec,
    TimelinePlan,
    plan_timeline,
)
from backend.app.services.export.media_validator import (
    check_mp4_faststart,
    validate_exported_video,
)
from backend.app.services.export.subtitle_service import (
    format_srt_timestamp,
    generate_subtitles,
)
from backend.app.services.export.video_exporter import (
    check_frontend_availability,
    export_lesson_video,
)
from backend.app.services.job_manager import JobRecord, job_manager
from backend.app.services.pipeline_orchestrator import execute_lesson_generation

client = TestClient(app)


# =========================================================================
# Helper Fixtures
# =========================================================================

def create_synthetic_wav(path: Path, duration_seconds: float = 1.0, framerate: int = 24000) -> Path:
    """Creates an uncompressed 16-bit mono PCM WAV file with non-zero audio content."""
    path.parent.mkdir(parents=True, exist_ok=True)
    num_frames = int(round(framerate * duration_seconds))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(framerate)
        # Synthetic 440 Hz square-like audio frames
        audio_data = bytearray()
        for i in range(num_frames):
            val = 8000 if (i % 50 < 25) else -8000
            audio_data.extend(struct.pack("<h", val))
        wf.writeframes(bytes(audio_data))
    return path


@pytest.fixture
def sample_audio_manifest(tmp_path: Path) -> AudioManifest:
    """Creates a valid 3-scene AudioManifest with actual WAV files."""
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    wav1 = create_synthetic_wav(audio_dir / "scene_01.wav", duration_seconds=2.0)
    wav2 = create_synthetic_wav(audio_dir / "scene_02.wav", duration_seconds=3.0)
    wav3 = create_synthetic_wav(audio_dir / "scene_03.wav", duration_seconds=2.5)

    return AudioManifest(
        lesson_id="test_lesson_manifest",
        language="en",
        entries=[
            SceneAudioEntry(
                scene_id="scene_01",
                audio_file=str(wav1),
                duration_seconds=2.0,
                language="en",
                voice_id="Microsoft David Desktop",
                sample_rate=24000,
                caption_segments=[
                    CaptionSegment(
                        text="Introduction to algorithms.",
                        start_seconds=0.0,
                        end_seconds=2.0,
                    )
                ],
            ),
            SceneAudioEntry(
                scene_id="scene_02",
                audio_file=str(wav2),
                duration_seconds=3.0,
                language="en",
                voice_id="Microsoft David Desktop",
                sample_rate=24000,
                caption_segments=[
                    CaptionSegment(
                        text="Let us inspect the Python loop.",
                        start_seconds=0.0,
                        end_seconds=3.0,
                    )
                ],
            ),
            SceneAudioEntry(
                scene_id="scene_03",
                audio_file=str(wav3),
                duration_seconds=2.5,
                language="en",
                voice_id="Microsoft David Desktop",
                sample_rate=24000,
                caption_segments=[
                    CaptionSegment(
                        text="Diagram of sequential execution flow.",
                        start_seconds=0.0,
                        end_seconds=2.5,
                    )
                ],
            ),
        ],
        total_duration_seconds=7.5,
        total_timeline_duration_seconds=8.1,  # 7.5 + (2 pauses * 0.3s) = 8.1s
    )


@pytest.fixture
def sample_canonical_plan() -> CanonicalLessonPlan:
    """Creates a canonical lesson plan for export testing."""
    return CanonicalLessonPlan(
        schema_version="1.0",
        title="Testing Canonical Video Export",
        level="beginner",
        language="en",
        target_duration_seconds=60,
        scenes=[
            TitleCardScene(
                id="scene_01",
                heading="Testing Canonical Video Export",
                subtitle="Verification of Phase 2C Playwright Pipeline",
                key_points=["Offline capture", "30 FPS deterministic sync"],
                narration="Introduction to algorithms.",
            ),
            CodeWalkthroughScene(
                id="scene_02",
                heading="Inspect the loop",
                code="for i in range(3):\n    print(i)",
                code_language="python",
                highlight_lines=[1],
                narration="Let us inspect the Python loop.",
            ),
            DiagramScene(
                id="scene_03",
                heading="Execution Flow",
                items=["Start", "Execute", "Terminate"],
                layout="horizontal",
                narration="Diagram of sequential execution flow.",
            ),
        ],
    )


# =========================================================================
# 1. Frame Planning and Cumulative Timing Tests
# =========================================================================

def test_frame_planning_cumulative_timing(sample_audio_manifest: AudioManifest):
    """
    Tests drift-free timeline calculation:
    - Verifies 0.3s pauses between scenes.
    - Verifies no pause after final scene.
    - Verifies monotonic global frame timestamps: global_time = k / fps.
    """
    plan = plan_timeline(sample_audio_manifest, fps=30, pause_seconds=0.3)

    # 3 scenes: dur 2.0, 3.0, 2.5 + 2 pauses of 0.3 = 8.1s
    assert plan.fps == 30
    assert plan.total_audio_duration_seconds == 7.5
    assert plan.total_timeline_duration_seconds == 8.1
    # total_frames = round(8.1 * 30) = 243
    assert plan.total_frames == 243
    assert plan.video_duration_seconds == round(243 / 30.0, 4)

    # Segments should be: scene_01, pause, scene_02, pause, scene_03 (5 segments)
    assert len(plan.segments) == 5
    assert plan.segments[0].segment_type == "scene"
    assert plan.segments[0].scene_id == "scene_01"
    assert plan.segments[1].segment_type == "pause"
    assert plan.segments[1].duration == 0.3
    assert plan.segments[2].segment_type == "scene"
    assert plan.segments[2].scene_id == "scene_02"
    assert plan.segments[3].segment_type == "pause"
    assert plan.segments[3].duration == 0.3
    assert plan.segments[4].segment_type == "scene"
    assert plan.segments[4].scene_id == "scene_03"
    # Final segment has NO trailing pause
    assert plan.segments[-1].segment_type == "scene"

    # Verify frame sequence
    assert len(plan.frames) == 243
    for k, frame in enumerate(plan.frames):
        assert frame.frame_index == k
        expected_time = round(k / 30.0, 4)
        assert abs(frame.global_time - expected_time) < 1e-4

    # Verify pause frames hold final scene time
    pause_frames = [f for f in plan.frames if f.is_pause]
    assert len(pause_frames) > 0
    for pf in pause_frames:
        assert pf.scene_time == pf.scene_duration


def test_frame_planning_non_integer_duration_tolerance():
    """
    Validates non-integer timeline duration (e.g. 22.449s) tolerance handling.
    22.449s cannot be exactly divided into 1/30s periods.
    """
    entries = [
        SceneAudioEntry(
            scene_id=f"scene_{i}",
            audio_file="dummy.wav",
            duration_seconds=dur,
            language="en",
            voice_id="test",
        )
        for i, dur in enumerate([7.018, 7.833, 6.998])
    ]
    manifest = AudioManifest(
        lesson_id="sync_test",
        language="en",
        entries=entries,
        total_duration_seconds=21.849,
    )
    plan = plan_timeline(manifest, fps=30, pause_seconds=0.3)
    # Total = 21.849 + 0.6 = 22.449s
    assert plan.total_timeline_duration_seconds == 22.449
    # 22.449 * 30 = 673.47 -> 673 frames
    assert plan.total_frames == 673
    encoded_video_dur = plan.total_frames / 30.0
    sync_delta = abs(encoded_video_dur - plan.total_timeline_duration_seconds)
    # Discrepancy is ~0.0157s, strictly under agreed 0.2s broadcast sync tolerance
    assert sync_delta < 0.05


def test_frame_planning_validation_errors():
    """Verifies that invalid manifests or parameters raise ValueError."""
    with pytest.raises(Exception):
        AudioManifest(
            lesson_id="empty",
            language="en",
            entries=[],
            total_duration_seconds=0.0,
        )

    entries = [
        SceneAudioEntry(
            scene_id="s1",
            audio_file="a.wav",
            duration_seconds=1.0,
            language="en",
            voice_id="v",
        )
    ]
    valid_manifest = AudioManifest(
        lesson_id="v",
        language="en",
        entries=entries,
        total_duration_seconds=1.0,
    )
    with pytest.raises(ValueError, match="FPS must be positive"):
        plan_timeline(valid_manifest, fps=0)


# =========================================================================
# 2. Audio Assembly & Silence Tests
# =========================================================================

def test_audio_assembler_mapping_and_silence(sample_audio_manifest: AudioManifest, tmp_path: Path):
    """
    Tests audio assembly:
    - Injects exactly 0.3s uncompressed PCM silence between scenes.
    - Preserves WAV parameters (1 channel, 16-bit, 24000 Hz).
    - Checks that silence interval contains only 0x00 bytes.
    """
    out_wav = tmp_path / "assembled_master.wav"
    assemble_master_audio(sample_audio_manifest, output_path=out_wav, pause_seconds=0.3)

    assert out_wav.is_file()
    nchannels, sampwidth, framerate, nframes = validate_wav_file(out_wav)
    assert nchannels == 1
    assert sampwidth == 2
    assert framerate == 24000

    # Total frames: 2.0s + 0.3s + 3.0s + 0.3s + 2.5s = 8.1s * 24000 = 194,400 frames
    expected_frames = int(round(8.1 * 24000))
    assert abs(nframes - expected_frames) <= 24  # Allow 1ms rounding tolerance

    # Read silence segment: at 2.0s (frame 48000), next 7200 frames (0.3s) should be silence
    with wave.open(str(out_wav), "rb") as wf:
        wf.setpos(int(2.0 * 24000) + 10)
        silence_chunk = wf.readframes(int(0.25 * 24000))
        assert all(b == 0 for b in silence_chunk)


def test_audio_assembler_mismatched_format(tmp_path: Path):
    """Verifies that mismatched sample rates trigger a ValueError."""
    wav1 = create_synthetic_wav(tmp_path / "w1.wav", duration_seconds=1.0, framerate=24000)
    wav2 = create_synthetic_wav(tmp_path / "w2.wav", duration_seconds=1.0, framerate=16000)

    manifest = AudioManifest(
        lesson_id="mismatch",
        language="en",
        entries=[
            SceneAudioEntry(scene_id="s1", audio_file=str(wav1), duration_seconds=1.0, language="en", voice_id="v"),
            SceneAudioEntry(scene_id="s2", audio_file=str(wav2), duration_seconds=1.0, language="en", voice_id="v"),
        ],
        total_duration_seconds=2.0,
    )
    with pytest.raises(ValueError, match="Audio format mismatch"):
        assemble_master_audio(manifest, output_path=tmp_path / "bad.wav")


# =========================================================================
# 3. Subtitle Generation Tests
# =========================================================================

def test_subtitle_generation_format_and_unicode(tmp_path: Path):
    """
    Tests SubRip (.srt) generation:
    - HH:MM:SS,mmm timecode format.
    - Preserves 0.3s inter-scene gap.
    - Preserves Devanagari Hindi Unicode characters.
    """
    srt_out = tmp_path / "subtitles.srt"
    manifest = AudioManifest(
        lesson_id="sub_test",
        language="hi",
        entries=[
            SceneAudioEntry(
                scene_id="scene_01",
                audio_file="dummy.wav",
                duration_seconds=4.5,
                language="hi",
                voice_id="v",
                caption_segments=[
                    CaptionSegment(
                        text="पायथन लूप कैसे काम करता है?",
                        start_seconds=0.0,
                        end_seconds=4.5,
                    )
                ],
            ),
            SceneAudioEntry(
                scene_id="scene_02",
                audio_file="dummy.wav",
                duration_seconds=5.0,
                language="hi",
                voice_id="v",
                caption_segments=[
                    CaptionSegment(
                        text="कोड का प्रवाह समझें।",
                        start_seconds=0.0,
                        end_seconds=5.0,
                    )
                ],
            ),
        ],
        total_duration_seconds=9.5,
    )

    generate_subtitles(manifest, output_path=srt_out, pause_seconds=0.3)
    assert srt_out.is_file()
    content = srt_out.read_text(encoding="utf-8")

    assert "पायथन लूप कैसे काम करता है?" in content
    assert "कोड का प्रवाह समझें।" in content
    # First scene: 00:00:00,000 --> 00:00:04,500
    assert "00:00:00,000 --> 00:00:04,500" in content
    # Second scene starts at 4.5 + 0.3 = 4.8s: 00:00:04,800 --> 00:00:09,800
    assert "00:00:04,800 --> 00:00:09,800" in content


# =========================================================================
# 4. Renderer Readiness, Error Detection, and Timeouts
# =========================================================================

def test_frontend_availability_check():
    """Verifies that check_frontend_availability detects reachable vs offline servers."""
    assert check_frontend_availability("http://localhost:5173") is True
    assert check_frontend_availability("http://localhost:59999") is False


def test_renderer_error_handling_in_playwright():
    """
    Tests that requesting a non-existent lesson correctly surfaces
    the #render-error diagnostic and data-render-error='true'.
    """
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto("http://localhost:5173/render?lesson=missing_lesson_xyz&scene=0")
        elem = page.wait_for_selector("#render-root[data-render-error='true']", timeout=6000)
        assert elem is not None
        assert elem.get_attribute("data-render-ready") == "false"
        assert elem.get_attribute("data-render-error") == "true"
        err_div = page.query_selector("#render-error")
        assert err_div is not None
        assert "not found" in err_div.inner_text().lower()
        browser.close()


# =========================================================================
# 5. FFmpeg Failure Handling Tests
# =========================================================================

def test_ffmpeg_failure_handling(sample_canonical_plan: CanonicalLessonPlan, sample_audio_manifest: AudioManifest, tmp_path: Path, monkeypatch):
    """
    Verifies that FFmpeg non-zero exit codes raise RuntimeError
    with standard error diagnostics, and clean up temporary frames.
    """
    def mock_subprocess_run(cmd, *args, **kwargs):
        if len(cmd) > 0 and "ffmpeg" in str(cmd[0]):
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=1,
                stdout="",
                stderr="[libx264 @ 0x1234] Invalid pixel format requested",
            )
        return subprocess.run(cmd, *args, **kwargs)

    monkeypatch.setattr(subprocess, "run", mock_subprocess_run)

    with pytest.raises(RuntimeError, match="FFmpeg encoding failed with exit code 1"):
        export_lesson_video(
            lesson_id="test_fail_ffmpeg",
            canonical_plan=sample_canonical_plan,
            audio_manifest=sample_audio_manifest,
            output_dir=tmp_path / "ffmpeg_fail_out",
            max_frames=2,
        )

    # Ensure no leftover temp frame directory exists
    temp_dirs = list((tmp_path / "ffmpeg_fail_out").glob("temp_frames_*"))
    assert len(temp_dirs) == 0


# =========================================================================
# 6. ffprobe Media Validation Tests
# =========================================================================

def test_ffprobe_validation_on_real_video():
    """
    Inspects and validates an existing generated MP4 video against the specification:
    - H.264 video codec
    - AAC audio codec
    - 1280x720 resolution
    - yuv420p pixel format
    - +faststart flag present
    """
    jobs_dir = Path("outputs/jobs")
    videos = list(jobs_dir.glob("lesson_*/lesson_*.mp4"))
    if not videos:
        pytest.skip("No pre-rendered MP4 found in outputs/jobs to inspect")

    test_video = videos[0]
    res = validate_exported_video(test_video, duration_tolerance_seconds=0.5)

    assert res.is_valid is True
    assert res.video_codec == "h264"
    assert res.audio_codec == "aac"
    assert res.width == 1280
    assert res.height == 720
    assert res.pixel_format == "yuv420p"
    assert res.has_faststart is True
    assert res.duration_seconds > 0.0


def test_media_validator_invalid_files(tmp_path: Path):
    """Verifies that non-existent and corrupted media files fail validation cleanly."""
    res_missing = validate_exported_video(tmp_path / "non_existent.mp4")
    assert res_missing.is_valid is False
    assert "does not exist" in res_missing.error

    small_file = tmp_path / "tiny.mp4"
    small_file.write_bytes(b"too small")
    res_small = validate_exported_video(small_file)
    assert res_small.is_valid is False
    assert "suspiciously small" in res_small.error


def test_mp4_faststart_checker(tmp_path: Path):
    """Tests +faststart inspector with dummy and real atoms."""
    garbage = tmp_path / "junk.mp4"
    garbage.write_bytes(b"\x00\x00\x00\x10mdatdata\x00\x00\x00\x10moovhead")
    assert check_mp4_faststart(garbage) is False


# =========================================================================
# 7. Job Lifecycle Failure Transitions
# =========================================================================

def test_job_failure_transition_on_pipeline_error(tmp_path: Path, monkeypatch):
    """
    Tests that when an unhandled error occurs during video export,
    the job cleanly transitions to 'failed' and surfaces the error.
    """
    req = LessonGenerateRequest(topic="Export Failure Test")
    job = job_manager.create_job(req, lesson_id="export_error_job")

    def crashing_exporter(*args, **kwargs):
        raise TimeoutError("Playwright timed out waiting for #render-root")

    monkeypatch.setattr(
        "backend.app.services.export.video_exporter.export_lesson_video",
        crashing_exporter,
    )

    execute_lesson_generation(
        lesson_id=job.lesson_id,
        request=req,
        job_manager=job_manager,
        output_dir=tmp_path,
        export_video=True,
    )

    updated = job_manager.get_job(job.lesson_id)
    assert updated.status == "failed"
    assert updated.stage == "failed"
    assert "timed out" in updated.error.lower()

    status_res = client.get(f"/api/lessons/{job.lesson_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "failed"
    assert "timed out" in status_res.json()["error"].lower()


# =========================================================================
# 8. Artifact Availability Endpoints
# =========================================================================

def test_artifact_endpoints_and_download(sample_canonical_plan: CanonicalLessonPlan, tmp_path: Path):
    """
    Tests that:
    - GET /api/lessons/{id} returns artifact_manifest URLs
    - GET /api/lessons/{id}/video returns 200 with video/mp4
    - GET /api/lessons/{id}/notes returns 200 with JSON
    - GET /api/lessons/{id}/subtitles returns 200 with UTF-8 text
    - Missing artifacts return 404
    """
    req = LessonGenerateRequest(topic="Artifact Test")
    job = job_manager.create_job(req, lesson_id="artifact_test_job")

    # Create dummy artifact files
    video_file = tmp_path / "test.mp4"
    video_file.write_bytes(b"dummy mp4 content for testing download")
    notes_file = tmp_path / "notes.json"
    notes_file.write_text('{"summary": "Test Notes"}', encoding="utf-8")
    subtitles_file = tmp_path / "subtitles.srt"
    subtitles_file.write_text("1\n00:00:00,000 --> 00:00:02,000\nHello\n", encoding="utf-8")

    job_manager.set_result(
        lesson_id=job.lesson_id,
        canonical_plan=sample_canonical_plan,
        video_path=str(video_file),
        notes_path=str(notes_file),
        subtitles_path=str(subtitles_file),
    )

    # 1. Lesson detail
    detail_res = client.get(f"/api/lessons/{job.lesson_id}")
    assert detail_res.status_code == 200
    manifest = detail_res.json()["artifact_manifest"]
    assert manifest["video"] == f"/api/lessons/{job.lesson_id}/video"
    assert manifest["notes"] == f"/api/lessons/{job.lesson_id}/notes"
    assert manifest["subtitles"] == f"/api/lessons/{job.lesson_id}/subtitles"

    # 2. Video download
    v_res = client.get(f"/api/lessons/{job.lesson_id}/video")
    assert v_res.status_code == 200
    assert v_res.headers["content-type"] == "video/mp4"
    assert v_res.content == b"dummy mp4 content for testing download"

    # 3. Notes download
    n_res = client.get(f"/api/lessons/{job.lesson_id}/notes")
    assert n_res.status_code == 200
    assert "application/json" in n_res.headers["content-type"]

    # 4. Subtitles download
    s_res = client.get(f"/api/lessons/{job.lesson_id}/subtitles")
    assert s_res.status_code == 200
    assert "text/plain" in s_res.headers["content-type"]
    assert "Hello" in s_res.text

    # 5. Non-existent lesson returns 404
    missing_res = client.get("/api/lessons/unknown_id/video")
    assert missing_res.status_code == 404


# =========================================================================
# 9. Temporary File Cleanup Tests
# =========================================================================

def test_temporary_file_cleanup(sample_canonical_plan: CanonicalLessonPlan, sample_audio_manifest: AudioManifest, tmp_path: Path):
    """
    Verifies that temporary capture frames are deleted upon completion,
    leaving only final production artifacts (MP4, WAV, SRT).
    """
    out_dir = tmp_path / "cleanup_test_dir"
    artifacts = export_lesson_video(
        lesson_id="cleanup_job",
        canonical_plan=sample_canonical_plan,
        audio_manifest=sample_audio_manifest,
        output_dir=out_dir,
        max_frames=3,  # fast partial capture to verify cleanup
    )

    assert artifacts.video_path.is_file()
    assert artifacts.audio_path.is_file()
    assert artifacts.subtitles_path.is_file()

    # Verify no temp_frames_* directories remain
    remaining_temp_dirs = list(out_dir.glob("temp_frames_*"))
    assert len(remaining_temp_dirs) == 0


def test_end_to_end_mp4_generation_and_ffprobe(sample_canonical_plan: CanonicalLessonPlan, sample_audio_manifest: AudioManifest, tmp_path: Path):
    """
    Executes a full video export with Playwright Chromium, FFmpeg encoding,
    and verifies the resulting MP4 using ffprobe and media_validator.
    """
    out_dir = tmp_path / "e2e_video_out"
    artifacts = export_lesson_video(
        lesson_id="e2e_val_job",
        canonical_plan=sample_canonical_plan,
        audio_manifest=sample_audio_manifest,
        output_dir=out_dir,
        max_frames=15,  # 0.5s at 30 FPS
    )
    assert artifacts.video_path.is_file()
    assert artifacts.video_path.stat().st_size > 5000

    res = validate_exported_video(
        artifacts.video_path,
        expected_duration_seconds=0.5,
        duration_tolerance_seconds=0.15,
    )
    assert res.is_valid is True
    assert res.video_codec == "h264"
    assert res.audio_codec == "aac"
    assert res.width == 1280
    assert res.height == 720
    assert res.pixel_format == "yuv420p"
    assert res.has_faststart is True
