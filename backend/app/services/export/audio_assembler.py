"""
Audio Assembler and PCM Silence Concatenator for Blu Visual Teacher.
Person 2 Owned.

Safely merges scene audio into master_audio.wav:
1. Validates WAV headers and RIFF consistency across all scene audio files.
2. Injects precise 0.3-second uncompressed PCM silence (b'\\x00' bytes) between scenes.
3. Guarantees zero trailing silence padding after the final scene.
4. Verifies output master duration against the AudioManifest.
"""

from pathlib import Path
from typing import List, Optional, Tuple
import wave

from backend.app.schemas.audio_manifest import AudioManifest


def validate_wav_file(path: Path) -> Tuple[int, int, int, int]:
    """
    Validates that a WAV file exists and has readable uncompressed PCM headers.
    Returns (nchannels, sampwidth, framerate, nframes).
    """
    if not path.is_file():
        raise FileNotFoundError(f"Scene audio file not found: {path}")

    try:
        with wave.open(str(path), "rb") as wf:
            params = wf.getparams()
            if params.nchannels not in (1, 2):
                raise ValueError(
                    f"Unsupported channel count {params.nchannels} in {path} (expected 1 or 2)"
                )
            if params.sampwidth not in (1, 2, 4):
                raise ValueError(
                    f"Unsupported sample width {params.sampwidth} in {path} (expected 16-bit PCM)"
                )
            if params.framerate <= 0:
                raise ValueError(f"Invalid frame rate {params.framerate} in {path}")
            if params.nframes <= 0:
                raise ValueError(f"WAV file contains 0 audio frames: {path}")
            return (
                params.nchannels,
                params.sampwidth,
                params.framerate,
                params.nframes,
            )
    except wave.Error as exc:
        raise ValueError(f"Corrupted or invalid WAV file at {path}: {str(exc)}") from exc


def assemble_master_audio(
    manifest: AudioManifest,
    output_path: Path,
    pause_seconds: float = 0.3,
    base_dir: Optional[Path] = None,
) -> Path:
    """
    Concatenates scene audio entries with deterministic PCM silence padding.

    - Exactly pause_seconds of silence is injected between consecutive scenes.
    - No pause padding is added after the final scene.
    - Output WAV parameters match the source audio streams.
    """
    if not manifest.entries:
        raise ValueError("Cannot assemble audio from an empty AudioManifest")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    root = base_dir or Path.cwd()

    # Step 1: Validate all input audio files and verify format homogeneity
    resolved_paths: List[Path] = []
    first_params: Optional[Tuple[int, int, int, int]] = None

    for entry in manifest.entries:
        raw_path = Path(entry.audio_file)
        # Try both direct path and relative to workspace root
        if raw_path.is_file():
            resolved = raw_path
        elif (root / raw_path).is_file():
            resolved = root / raw_path
        else:
            raise FileNotFoundError(
                f"Audio file for scene '{entry.scene_id}' not found at '{raw_path}' or '{root / raw_path}'"
            )

        params = validate_wav_file(resolved)
        if first_params is None:
            first_params = params
        else:
            # Check channels, sample width, framerate
            if (
                params[0] != first_params[0]
                or params[1] != first_params[1]
                or params[2] != first_params[2]
            ):
                raise ValueError(
                    f"Audio format mismatch in '{resolved}': "
                    f"expected (channels={first_params[0]}, sampwidth={first_params[1]}, rate={first_params[2]}), "
                    f"got (channels={params[0]}, sampwidth={params[1]}, rate={params[2]})"
                )

        resolved_paths.append(resolved)

    assert first_params is not None
    nchannels, sampwidth, framerate, _ = first_params

    # Calculate silence bytes for inter-scene pause
    pause_frames = int(round(framerate * pause_seconds))
    bytes_per_frame = nchannels * sampwidth
    silence_bytes = b"\x00" * (pause_frames * bytes_per_frame)

    total_written_frames = 0
    num_scenes = len(resolved_paths)

    # Step 2: Stream audio data and write to output file
    with wave.open(str(output_path), "wb") as out_wf:
        out_wf.setnchannels(nchannels)
        out_wf.setsampwidth(sampwidth)
        out_wf.setframerate(framerate)

        for i, path in enumerate(resolved_paths):
            with wave.open(str(path), "rb") as in_wf:
                frames_to_read = in_wf.getnframes()
                data = in_wf.readframes(frames_to_read)
                out_wf.writeframes(data)
                total_written_frames += frames_to_read

            # Inject pause only between scenes, NEVER after the final scene
            if i < num_scenes - 1 and pause_frames > 0:
                out_wf.writeframes(silence_bytes)
                total_written_frames += pause_frames

    # Step 3: Validate generated output master
    out_duration = round(total_written_frames / float(framerate), 3)
    expected_duration = manifest.total_timeline_duration_seconds or manifest.total_duration_seconds

    # Duration tolerance: 50 milliseconds
    if abs(out_duration - expected_duration) > 0.05:
        # Recompute if manifest did not include inter-scene pauses
        expected_with_pauses = round(
            manifest.total_duration_seconds + (num_scenes - 1) * pause_seconds, 3
        )
        if abs(out_duration - expected_with_pauses) > 0.05:
            raise ValueError(
                f"Assembled master audio duration mismatch: wrote {out_duration}s, expected {expected_duration}s"
            )

    return output_path
