"""
Playwright Frame Capture and FFmpeg Video Exporter for Blu Visual Teacher.
Person 2 Owned.

Coordinates the complete Phase 2C offline export pipeline:
1. Plans drift-free 30 FPS frame timeline from AudioManifest.
2. Assembles uncompressed master_audio.wav with 0.3s inter-scene pauses.
3. Generates SubRip (.srt) subtitles.
4. Uses Playwright headless Chromium to open Person 4's /render route:
   - Waits for #render-root[data-render-ready='true'] with bounded timeout.
   - Detects #render-root[data-render-error='true'] and aborts with descriptive error.
   - Uses window.__BLU_SEEK_FRAME__(t, d) for deterministic seeking.
   - Captures exact 1280x720 PNG frames.
5. Encodes video with FFmpeg: H.264, AAC, 1280x720, yuv420p, +faststart.
6. Validates output using ffprobe inspector before completing.
7. Safely cleans up temporary frame directories on success and failure.
"""

from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import shutil
import subprocess
import time
from typing import Callable, Optional
import urllib.request

from backend.app.schemas.audio_manifest import AudioManifest
from backend.app.schemas.canonical_lesson import CanonicalLessonPlan
from backend.app.services.export.audio_assembler import assemble_master_audio
from backend.app.services.export.frame_planner import FrameSpec, TimelinePlan, plan_timeline
from backend.app.services.export.media_validator import (
    MediaValidationResult,
    validate_exported_video,
)
from backend.app.services.export.subtitle_service import generate_subtitles

logger = logging.getLogger(__name__)


@dataclass
class ExportArtifacts:
    video_path: Path
    audio_path: Path
    subtitles_path: Path
    notes_path: Optional[Path]
    total_frames: int
    duration_seconds: float
    validation: MediaValidationResult


def check_frontend_availability(url: str, timeout_seconds: float = 2.0) -> bool:
    """Verifies that the frontend Vite server is responding."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BluExporter/1.0"})
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False


def export_lesson_video(
    lesson_id: str,
    canonical_plan: CanonicalLessonPlan,
    audio_manifest: AudioManifest,
    output_dir: Path,
    frontend_url: str = "http://localhost:5173",
    fps: int = 30,
    pause_seconds: float = 0.3,
    max_frames: Optional[int] = None,
    on_progress: Optional[Callable[[int, str], None]] = None,
    notes_path: Optional[Path] = None,
) -> ExportArtifacts:
    """
    Executes end-to-end video export for a lesson.
    """
    from playwright.sync_api import sync_playwright

    output_dir.mkdir(parents=True, exist_ok=True)
    temp_frames_dir = output_dir / f"temp_frames_{int(time.time() * 1000)}"
    temp_frames_dir.mkdir(parents=True, exist_ok=True)

    master_audio_path = output_dir / "master_audio.wav"
    subtitles_path = output_dir / "subtitles.srt"
    output_video_path = output_dir / f"{lesson_id}.mp4"

    try:
        # -------------------------------------------------------------
        # Step 1: Master Audio Assembly
        # -------------------------------------------------------------
        if on_progress:
            on_progress(72, "Assembling master audio timeline with pauses...")
        assemble_master_audio(
            manifest=audio_manifest,
            output_path=master_audio_path,
            pause_seconds=pause_seconds,
        )

        # -------------------------------------------------------------
        # Step 2: Subtitle Generation
        # -------------------------------------------------------------
        if on_progress:
            on_progress(75, "Generating synchronized SubRip (.srt) subtitles...")
        generate_subtitles(
            manifest=audio_manifest,
            output_path=subtitles_path,
            pause_seconds=pause_seconds,
        )

        # -------------------------------------------------------------
        # Step 3: Drift-free Timeline and Frame Schedule Planning
        # -------------------------------------------------------------
        if on_progress:
            on_progress(77, "Planning frame-accurate 30 FPS timeline...")
        timeline_plan: TimelinePlan = plan_timeline(
            manifest=audio_manifest,
            fps=fps,
            pause_seconds=pause_seconds,
        )

        frames_to_render = timeline_plan.frames
        if max_frames is not None and max_frames > 0:
            frames_to_render = frames_to_render[:max_frames]

        total_frames_count = len(frames_to_render)
        if total_frames_count == 0:
            raise ValueError("Zero frames scheduled for capture")

        # -------------------------------------------------------------
        # Step 4: Playwright Headless Browser Frame Capture
        # -------------------------------------------------------------
        if on_progress:
            on_progress(80, f"Capturing {total_frames_count} frames via Playwright renderer...")

        # Verify frontend server is available
        if not check_frontend_availability(frontend_url):
            raise ConnectionError(
                f"Frontend render server is not reachable at {frontend_url}. "
                "Ensure the frontend server is running on port 5173."
            )

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})

            # Mock / intercept dynamic lesson API fetch so RenderPage always receives the canonical plan
            plan_payload = {
                "lesson_id": lesson_id,
                "lesson_plan": canonical_plan.model_dump(),
                "artifact_manifest": {},
            }
            page.route(
                "**/api/lessons/*",
                lambda route: route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(plan_payload),
                ),
            )

            # Group frames by scene to avoid unnecessary full-page navigations
            current_loaded_scene: Optional[int] = None

            for idx, f_spec in enumerate(frames_to_render):
                scene_idx = f_spec.scene_index
                scene_id = f_spec.scene_id
                scene_dur = f_spec.scene_duration

                # Navigate if new scene
                if current_loaded_scene != scene_idx:
                    render_url = (
                        f"{frontend_url}/render"
                        f"?lesson={lesson_id}&scene={scene_id}&duration={scene_dur}"
                    )
                    page.goto(render_url)

                    # Await readiness attribute with 6000ms bounded timeout
                    try:
                        elem = page.wait_for_selector(
                            "#render-root[data-render-ready='true']",
                            timeout=6000,
                        )
                    except Exception as exc:
                        # Check if error element is present
                        err_elem = page.query_selector("#render-error")
                        err_text = (
                            err_elem.inner_text() if err_elem else "Timeout waiting for DOM readiness"
                        )
                        raise TimeoutError(
                            f"Renderer failed on scene '{scene_id}' ({render_url}): {err_text}"
                        ) from exc

                    # Verify no error marker is active
                    is_error = elem.get_attribute("data-render-error") == "true"
                    if is_error:
                        err_elem = page.query_selector("#render-error")
                        err_text = err_elem.inner_text() if err_elem else "Unspecified render error"
                        raise RuntimeError(f"Scene renderer reported error: {err_text}")

                    current_loaded_scene = scene_idx

                # Seek frame deterministically using Person 4's window helper
                page.evaluate(
                    "({ t, d }) => window.__BLU_SEEK_FRAME__(t, d)",
                    {"t": f_spec.scene_time, "d": scene_dur},
                )
                page.wait_for_selector(
                    "#render-root[data-render-ready='true']",
                    timeout=3000,
                )

                # Capture frame to temporary directory
                frame_filename = temp_frames_dir / f"frame_{f_spec.frame_index:05d}.png"
                page.locator("#render-root").screenshot(path=str(frame_filename))

                # Periodically update progress
                if on_progress and (idx % 30 == 0 or idx == total_frames_count - 1):
                    pct = int(80 + (idx / total_frames_count) * 12)
                    on_progress(pct, f"Captured frame {idx + 1}/{total_frames_count} ({pct}%)")

            browser.close()

        # -------------------------------------------------------------
        # Step 5: FFmpeg Muxing & Encoding
        # -------------------------------------------------------------
        if on_progress:
            on_progress(93, "Encoding H.264/AAC MP4 video with FFmpeg...")

        ffmpeg_cmd = shutil.which("ffmpeg") or "ffmpeg"
        frame_pattern = str(temp_frames_dir / "frame_%05d.png")

        expected_dur = (
            timeline_plan.total_timeline_duration_seconds
            if max_frames is None
            else round(total_frames_count / float(fps), 3)
        )

        cmd = [
            ffmpeg_cmd,
            "-y",
            "-framerate",
            str(fps),
            "-i",
            frame_pattern,
            "-i",
            str(master_audio_path),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
        ]
        if max_frames is not None:
            cmd.extend(["-t", str(expected_dur)])
        cmd.append(str(output_video_path))

        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=120,
        )

        if res.returncode != 0:
            raise RuntimeError(
                f"FFmpeg encoding failed with exit code {res.returncode}:\n{res.stderr.strip()}"
            )

        # -------------------------------------------------------------
        # Step 6: Post-Export Validation with ffprobe
        # -------------------------------------------------------------
        if on_progress:
            on_progress(97, "Validating exported MP4 using ffprobe...")

        expected_dur = (
            timeline_plan.total_timeline_duration_seconds
            if max_frames is None
            else round(total_frames_count / float(fps), 3)
        )
        val_result = validate_exported_video(
            video_path=output_video_path,
            expected_duration_seconds=expected_dur,
            duration_tolerance_seconds=0.25,
        )

        if not val_result.is_valid:
            raise ValueError(f"Export validation failed: {val_result.error}")

        if on_progress:
            on_progress(99, "Video export validated successfully!")

        return ExportArtifacts(
            video_path=output_video_path,
            audio_path=master_audio_path,
            subtitles_path=subtitles_path,
            notes_path=notes_path,
            total_frames=total_frames_count,
            duration_seconds=val_result.duration_seconds,
            validation=val_result,
        )

    finally:
        # Step 7: Safe cleanup of temporary frame images (never deletes final artifacts)
        if temp_frames_dir.exists():
            shutil.rmtree(temp_frames_dir, ignore_errors=True)
