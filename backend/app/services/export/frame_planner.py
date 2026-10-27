"""
Timeline and Deterministic Frame Planner for Blu Visual Teacher.
Person 2 Owned.

Guarantees drift-free 30 FPS video synchronization:
1. Calculates cumulative global timeline segments from the AudioManifest.
2. Accurately preserves Person 1's 0.3-second inter-scene pauses.
3. Ensures zero pause padding after the final scene.
4. Derives every frame boundary from cumulative global timestamps:
   Total frames = round(total_timeline_duration * fps).
   Each frame k in [0, total_frames - 1] maps to global_time = k / fps.
5. Prevents per-scene independent rounding errors from accumulating drift across scenes.
"""

from dataclasses import dataclass
from typing import List, Literal, Optional
from backend.app.schemas.audio_manifest import AudioManifest


@dataclass(frozen=True)
class TimelineSegment:
    """Represents a discrete time interval on the master video timeline."""
    segment_type: Literal["scene", "pause"]
    scene_index: int
    scene_id: str
    global_start: float
    global_end: float
    duration: float
    scene_duration: float


@dataclass(frozen=True)
class FrameSpec:
    """Exact deterministic rendering specification for a single video frame."""
    frame_index: int
    global_time: float
    scene_index: int
    scene_id: str
    scene_time: float
    scene_duration: float
    is_pause: bool


@dataclass
class TimelinePlan:
    """Complete lesson export schedule and frame blueprint."""
    fps: int
    total_audio_duration_seconds: float
    total_timeline_duration_seconds: float
    total_frames: int
    video_duration_seconds: float
    segments: List[TimelineSegment]
    frames: List[FrameSpec]


def plan_timeline(
    manifest: AudioManifest,
    fps: int = 30,
    pause_seconds: float = 0.3,
) -> TimelinePlan:
    """
    Computes a cumulative, drift-free frame schedule for a lesson video.

    Timing Math & Tolerances:
    - Discrete video frames at 30 FPS have a period of 1/30 = 0.0333... seconds.
    - Continuous audio timelines (e.g., 22.449s) cannot be represented with an
      exact integer number of 30 FPS frames:
      22.449 * 30 = 673.47 frames -> round(673.47) = 673 frames.
    - 673 frames at 30 FPS represents 673 / 30 = 22.4333... seconds of video.
    - The discrepancy is 22.449 - 22.4333 = ~0.016 seconds (~16 ms), which is
      less than half a frame period and well within the agreed broadcast audio/video
      sync tolerance of +/- 0.2 seconds.
    - To prevent rounding errors from accumulating across multiple scenes, frame
      boundaries are derived directly from the global monotonic counter:
      global_time = k / fps for k in range(total_frames).
    """
    if not manifest.entries:
        raise ValueError("Cannot plan timeline for an empty AudioManifest")
    if fps <= 0:
        raise ValueError(f"FPS must be positive, got {fps}")

    # Build continuous, non-overlapping segments
    segments: List[TimelineSegment] = []
    cumulative = 0.0
    total_audio = 0.0
    num_entries = len(manifest.entries)

    for i, entry in enumerate(manifest.entries):
        # 1. Active scene narration segment
        scene_dur = entry.duration_seconds
        total_audio += scene_dur
        scene_start = cumulative
        scene_end = round(cumulative + scene_dur, 4)

        segments.append(
            TimelineSegment(
                segment_type="scene",
                scene_index=i,
                scene_id=entry.scene_id,
                global_start=scene_start,
                global_end=scene_end,
                duration=round(scene_end - scene_start, 4),
                scene_duration=scene_dur,
            )
        )
        cumulative = scene_end

        # 2. Inter-scene pause (only between scenes, never after the last scene)
        if i < num_entries - 1 and pause_seconds > 0:
            pause_start = cumulative
            pause_end = round(cumulative + pause_seconds, 4)
            segments.append(
                TimelineSegment(
                    segment_type="pause",
                    scene_index=i,
                    scene_id=entry.scene_id,
                    global_start=pause_start,
                    global_end=pause_end,
                    duration=round(pause_end - pause_start, 4),
                    scene_duration=scene_dur,
                )
            )
            cumulative = pause_end

    total_timeline_duration = round(cumulative, 4)
    total_frames = int(round(total_timeline_duration * fps))
    video_duration = round(total_frames / float(fps), 4)

    # Generate exact FrameSpec for every discrete frame index
    frames: List[FrameSpec] = []
    seg_idx = 0
    num_segments = len(segments)

    for k in range(total_frames):
        t_global = k / float(fps)

        # Advance segment pointer if t_global exceeds current segment boundary
        while (
            seg_idx < num_segments - 1
            and t_global >= segments[seg_idx].global_end
        ):
            seg_idx += 1

        seg = segments[seg_idx]

        if seg.segment_type == "scene":
            # Normal narration playback time clamped to [0.0, scene_duration]
            offset = max(0.0, t_global - seg.global_start)
            scene_time = min(offset, seg.scene_duration)
            is_pause = False
        else:
            # During inter-scene silence, hold the final visual state of the scene
            scene_time = seg.scene_duration
            is_pause = True

        frames.append(
            FrameSpec(
                frame_index=k,
                global_time=round(t_global, 4),
                scene_index=seg.scene_index,
                scene_id=seg.scene_id,
                scene_time=round(scene_time, 4),
                scene_duration=seg.scene_duration,
                is_pause=is_pause,
            )
        )

    return TimelinePlan(
        fps=fps,
        total_audio_duration_seconds=round(total_audio, 4),
        total_timeline_duration_seconds=total_timeline_duration,
        total_frames=total_frames,
        video_duration_seconds=video_duration,
        segments=segments,
        frames=frames,
    )
