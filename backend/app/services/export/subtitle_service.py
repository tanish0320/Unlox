"""
SubRip (.srt) Subtitle Generator for Blu Visual Teacher.
Person 2 Owned.

Extracts timing and caption text from AudioManifest to produce standard .srt subtitles:
1. Formats timestamps as HH:MM:SS,mmm according to SubRip specifications.
2. Uses lesson-global start and end offsets to preserve inter-scene pause gaps.
3. Falls back gracefully to scene narration if granular word segments are absent.
4. Encodes as UTF-8 to support English and Indic scripts.
"""

from pathlib import Path
from typing import List, Optional
from backend.app.schemas.audio_manifest import AudioManifest, CaptionSegment


def format_srt_timestamp(seconds: float) -> str:
    """
    Formats a duration in seconds into SubRip timecode: HH:MM:SS,mmm.
    Examples:
    0.0 -> "00:00:00,000"
    7.018 -> "00:00:07,018"
    75.25 -> "00:01:15,250"
    """
    if seconds < 0:
        seconds = 0.0

    total_millis = int(round(seconds * 1000))
    hours = total_millis // 3600000
    rem = total_millis % 3600000
    minutes = rem // 60000
    rem = rem % 60000
    secs = rem // 1000
    millis = rem % 1000

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_subtitles(
    manifest: AudioManifest,
    output_path: Path,
    pause_seconds: float = 0.3,
) -> Path:
    """
    Generates an SRT subtitle file from AudioManifest entries.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Collect all timed segments across scenes
    srt_blocks: List[str] = []
    block_index = 1
    cumulative = 0.0

    for i, entry in enumerate(manifest.entries):
        scene_start = cumulative
        scene_dur = entry.duration_seconds

        if entry.caption_segments:
            for seg in entry.caption_segments:
                # Prefer global timestamps if precomputed, otherwise compute relative to cumulative
                g_start = (
                    seg.global_start_seconds
                    if seg.global_start_seconds is not None
                    else round(scene_start + seg.start_seconds, 3)
                )
                g_end = (
                    seg.global_end_seconds
                    if seg.global_end_seconds is not None
                    else round(scene_start + seg.end_seconds, 3)
                )

                start_str = format_srt_timestamp(g_start)
                end_str = format_srt_timestamp(g_end)
                text = seg.text.strip()

                if text:
                    srt_blocks.append(
                        f"{block_index}\n{start_str} --> {end_str}\n{text}\n"
                    )
                    block_index += 1
        else:
            # Fallback if no caption segments were provided: single block for entire scene
            start_str = format_srt_timestamp(scene_start)
            end_str = format_srt_timestamp(scene_start + scene_dur)
            text = f"Scene {entry.scene_id}"
            srt_blocks.append(
                f"{block_index}\n{start_str} --> {end_str}\n{text}\n"
            )
            block_index += 1

        cumulative += scene_dur
        if i < len(manifest.entries) - 1 and pause_seconds > 0:
            cumulative += pause_seconds

    content = "\n".join(srt_blocks).strip() + "\n"
    output_path.write_text(content, encoding="utf-8")
    return output_path
