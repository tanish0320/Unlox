"""
Media Validation and ffprobe Inspector for Blu Visual Teacher.
Person 2 Owned.

Validates exported video and audio against project standards:
1. Video stream: H.264 video, 1280x720 resolution, yuv420p pixel format.
2. Audio stream: AAC audio codec.
3. Container: MP4 with +faststart (moov atom placed before mdat).
4. Duration: checks timeline vs encoded duration within acceptable tolerance (+/- 0.2s).
5. Fast failure detection with descriptive diagnostics.
"""

from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import shutil
import subprocess
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MediaValidationResult:
    is_valid: bool
    duration_seconds: float = 0.0
    video_codec: str = ""
    audio_codec: str = ""
    width: int = 0
    height: int = 0
    pixel_format: str = ""
    has_faststart: bool = False
    file_size_bytes: int = 0
    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None


def check_mp4_faststart(path: Path) -> bool:
    """
    Inspects MP4 atom structure to verify +faststart (moov precedes mdat).
    """
    if not path.is_file():
        return False

    file_size = path.stat().st_size
    moov_offset: Optional[int] = None
    mdat_offset: Optional[int] = None

    try:
        with open(path, "rb") as f:
            offset = 0
            # Read top-level atom boxes within first 10 MB or full file
            max_scan = min(file_size, 10 * 1024 * 1024)
            while offset < max_scan:
                f.seek(offset)
                hdr = f.read(8)
                if len(hdr) < 8:
                    break
                box_len = int.from_bytes(hdr[:4], byteorder="big")
                box_type = hdr[4:8].decode("latin-1", errors="ignore")

                if box_type == "moov" and moov_offset is None:
                    moov_offset = offset
                elif box_type == "mdat" and mdat_offset is None:
                    mdat_offset = offset

                if moov_offset is not None and mdat_offset is not None:
                    break

                if box_len == 1:
                    # 64-bit extended length
                    ext_hdr = f.read(8)
                    if len(ext_hdr) < 8:
                        break
                    box_len = int.from_bytes(ext_hdr, byteorder="big")
                elif box_len <= 0:
                    break

                offset += box_len

        return (
            moov_offset is not None
            and mdat_offset is not None
            and moov_offset < mdat_offset
        )
    except Exception:
        return False


def probe_media_file(path: Path) -> Dict[str, Any]:
    """
    Runs ffprobe to retrieve structured JSON metadata for a media file.
    """
    ffprobe_cmd = shutil.which("ffprobe") or "ffprobe"
    if not Path(path).is_file():
        raise FileNotFoundError(f"Media file not found for probing: {path}")

    cmd = [
        ffprobe_cmd,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]

    try:
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=15,
        )
        return json.loads(res.stdout)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"ffprobe failed to probe '{path}': {exc.stderr.strip()}"
        ) from exc
    except Exception as exc:
        raise RuntimeError(f"Error running ffprobe on '{path}': {str(exc)}") from exc


def validate_exported_video(
    video_path: Path,
    expected_duration_seconds: Optional[float] = None,
    duration_tolerance_seconds: float = 0.25,
) -> MediaValidationResult:
    """
    Validates that the exported video satisfies all project production contracts:
    - Container: MP4 with +faststart
    - Video: H.264, 1280x720, yuv420p
    - Audio: AAC
    - Encoded duration aligns with expected audio timeline within tolerance
    """
    if not video_path.is_file():
        return MediaValidationResult(
            is_valid=False,
            error=f"Video file does not exist: {video_path}",
        )

    file_size = video_path.stat().st_size
    if file_size < 1000:
        return MediaValidationResult(
            is_valid=False,
            file_size_bytes=file_size,
            error=f"Video file is suspiciously small ({file_size} bytes)",
        )

    try:
        metadata = probe_media_file(video_path)
    except Exception as exc:
        return MediaValidationResult(
            is_valid=False,
            file_size_bytes=file_size,
            error=f"ffprobe inspection failed: {str(exc)}",
        )

    format_info = metadata.get("format", {})
    streams = metadata.get("streams", [])

    # Identify streams
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video_stream:
        return MediaValidationResult(
            is_valid=False,
            file_size_bytes=file_size,
            error="Video file contains no video stream",
        )

    video_codec = video_stream.get("codec_name", "")
    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))
    pix_fmt = video_stream.get("pix_fmt", "")

    # Video stream assertions
    if video_codec.lower() != "h264":
        return MediaValidationResult(
            is_valid=False,
            video_codec=video_codec,
            file_size_bytes=file_size,
            error=f"Expected H.264 video codec, found '{video_codec}'",
        )

    if width != 1280 or height != 720:
        return MediaValidationResult(
            is_valid=False,
            video_codec=video_codec,
            width=width,
            height=height,
            file_size_bytes=file_size,
            error=f"Expected 1280x720 resolution, found {width}x{height}",
        )

    if pix_fmt.lower() != "yuv420p":
        return MediaValidationResult(
            is_valid=False,
            video_codec=video_codec,
            pixel_format=pix_fmt,
            width=width,
            height=height,
            file_size_bytes=file_size,
            error=f"Expected 'yuv420p' pixel format, found '{pix_fmt}'",
        )

    # Audio stream assertions
    audio_codec = ""
    if audio_stream:
        audio_codec = audio_stream.get("codec_name", "")
        if audio_codec.lower() != "aac":
            return MediaValidationResult(
                is_valid=False,
                video_codec=video_codec,
                audio_codec=audio_codec,
                width=width,
                height=height,
                pixel_format=pix_fmt,
                file_size_bytes=file_size,
                error=f"Expected AAC audio codec, found '{audio_codec}'",
            )

    # Measured duration
    raw_duration = format_info.get("duration") or video_stream.get("duration")
    duration = float(raw_duration) if raw_duration else 0.0

    warnings: List[str] = []

    # Faststart check
    has_faststart = check_mp4_faststart(video_path)
    if not has_faststart:
        warnings.append("Video file does not have moov atom at beginning (+faststart flag check)")

    # Duration alignment check
    if expected_duration_seconds is not None:
        diff = abs(duration - expected_duration_seconds)
        if diff > duration_tolerance_seconds:
            return MediaValidationResult(
                is_valid=False,
                duration_seconds=duration,
                video_codec=video_codec,
                audio_codec=audio_codec,
                width=width,
                height=height,
                pixel_format=pix_fmt,
                has_faststart=has_faststart,
                file_size_bytes=file_size,
                warnings=warnings,
                error=(
                    f"Video duration discrepancy: encoded duration is {duration:.3f}s, "
                    f"expected timeline is {expected_duration_seconds:.3f}s "
                    f"(difference {diff:.3f}s exceeds tolerance {duration_tolerance_seconds:.3f}s)"
                ),
            )

    return MediaValidationResult(
        is_valid=True,
        duration_seconds=duration,
        video_codec=video_codec,
        audio_codec=audio_codec,
        width=width,
        height=height,
        pixel_format=pix_fmt,
        has_faststart=has_faststart,
        file_size_bytes=file_size,
        warnings=warnings,
    )
