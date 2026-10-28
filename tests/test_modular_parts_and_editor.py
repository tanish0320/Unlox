import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.main import app, LESSON_STORE, MANIFEST_STORE, OUTPUTS_DIR
from backend.app.schemas.provisional_lesson import LessonPlan, LessonPart, DiagramScene, TitleCardScene
from backend.app.schemas.audio_manifest import AudioManifest, SceneAudioEntry, CaptionSegment
from backend.app.services.tts.tts_adapter import LocalTTSDispatcher
from backend.app.services.exporter.video_exporter import find_ffmpeg_binaries, verify_video_file

client = TestClient(app)


def test_modular_parts_schema_and_backward_compatibility():
    """Verifies LessonPlan auto-partitions legacy lessons and guarantees scene.part_id alignment."""
    raw_scenes = [
        {
            "id": "scene_01",
            "type": "title_card",
            "heading": "Introduction to Photosynthesis",
            "narration": "Welcome to our comprehensive biology lesson on how plants convert sunlight into chemical energy.",
            "subtitle": "The Engine of Plant Life",
        },
        {
            "id": "scene_02",
            "type": "diagram",
            "heading": "What Plants Absorb",
            "narration": "Plants absorb water through root systems and carbon dioxide through microscopic leaf pores called stomata.",
            "items": ["Water from soil", "CO2 from atmosphere", "Chlorophyll in leaves"],
            "layout": "horizontal",
        },
        {
            "id": "scene_03",
            "type": "diagram",
            "heading": "The Light Reaction",
            "narration": "Sunlight strikes chlorophyll molecules in the thylakoid membranes, initiating the electron transport chain.",
            "items": ["Photons absorbed", "Water split", "Oxygen released"],
            "layout": "horizontal",
        },
        {
            "id": "scene_04",
            "type": "diagram",
            "heading": "The Calvin Cycle",
            "narration": "During the light-independent reactions, ATP and NADPH drive the synthesis of energy-rich glucose molecules.",
            "items": ["Carbon fixation", "Sugar production", "Glucose stored"],
            "layout": "cycle",
        },
    ]

    # Legacy lesson without explicit 'parts'
    legacy_plan = LessonPlan(
        title="Photosynthesis Deep Dive",
        topic="Photosynthesis",
        target_duration_seconds=120,
        scenes=raw_scenes,
    )

    # Auto-partitioning should produce 2 coherent parts for 120s
    assert len(legacy_plan.parts) >= 2
    assert legacy_plan.parts[0].part_id == "part_1"
    assert legacy_plan.parts[1].part_id == "part_2"

    # All scenes must have valid part_id populated
    for scene in legacy_plan.scenes:
        assert scene.part_id in ("part_1", "part_2")
        assert scene.is_edited is False


def test_audio_manifest_sub_manifest():
    """Verifies AudioManifest.create_sub_manifest creates an independent valid timeline for part export."""
    entries = [
        SceneAudioEntry(
            scene_id="scene_01",
            audio_file="outputs/generated/test/audio/scene_01_en.wav",
            duration_seconds=20.0,
            language="en",
            voice_id="test_voice",
            caption_segments=[CaptionSegment(start_seconds=0.0, end_seconds=20.0, text="Scene 1 speech")],
        ),
        SceneAudioEntry(
            scene_id="scene_02",
            audio_file="outputs/generated/test/audio/scene_02_en.wav",
            duration_seconds=25.0,
            language="en",
            voice_id="test_voice",
            caption_segments=[CaptionSegment(start_seconds=0.0, end_seconds=25.0, text="Scene 2 speech")],
        ),
        SceneAudioEntry(
            scene_id="scene_03",
            audio_file="outputs/generated/test/audio/scene_03_en.wav",
            duration_seconds=30.0,
            language="en",
            voice_id="test_voice",
            caption_segments=[CaptionSegment(start_seconds=0.0, end_seconds=30.0, text="Scene 3 speech")],
        ),
    ]

    manifest = AudioManifest(
        lesson_id="test_manifest_lesson",
        language="en",
        total_duration_seconds=75.0,
        entries=entries,
    ).compute_global_timeline(scene_pause_padding=0.3)

    # Full timeline includes padding between 3 scenes: 20 + 0.3 + 25 + 0.3 + 30 = 75.6
    assert manifest.total_timeline_duration_seconds == 75.6

    # Sub-manifest for Part 2 containing only scene_02 and scene_03
    sub_man = manifest.create_sub_manifest(["scene_02", "scene_03"], scene_pause_padding=0.3)
    assert len(sub_man.entries) == 2
    assert sub_man.entries[0].scene_id == "scene_02"
    assert sub_man.entries[1].scene_id == "scene_03"
    assert sub_man.total_duration_seconds == 55.0
    # Part timeline start must be 0.0
    assert sub_man.entries[0].caption_segments[0].global_start_seconds == 0.0
    assert sub_man.entries[0].caption_segments[0].global_end_seconds == 25.0
    assert sub_man.entries[1].caption_segments[0].global_start_seconds == 25.3
    assert sub_man.total_timeline_duration_seconds == 55.3


def test_audio_hash_caching(tmp_path):
    """Verifies LocalTTSDispatcher caches synthesized audio based on SHA256 of text, language, and voice."""
    tts = LocalTTSDispatcher(output_dir=tmp_path, allow_mock=True)
    tts.clear_audio_cache()

    sample_text = "This is a deterministic pedagogical sentence testing audio caching efficiency."
    out_file1 = tmp_path / "scene_cache_1.wav"
    out_file2 = tmp_path / "scene_cache_2.wav"

    # First call: cache miss
    entry1 = tts.synthesize_speech(text=sample_text, language="en", output_path=out_file1)
    assert tts.cache_misses >= 1
    assert out_file1.is_file()

    # Second call with identical text, language, voice: cache hit
    initial_hits = tts.cache_hits
    entry2 = tts.synthesize_speech(text=sample_text, language="en", output_path=out_file2)
    assert tts.cache_hits == initial_hits + 1
    assert out_file2.is_file()
    assert entry2.duration_seconds == entry1.duration_seconds


def test_scene_update_narration_vs_visual_invalidation(tmp_path):
    """
    Verifies PUT /api/lessons/{lesson_id}/scenes/{scene_id} invalidates and regenerates audio
    ONLY when narration changes, preserving existing audio for visual-only updates.
    """
    lesson_id = "test_editor_lesson_001"
    lesson_dir = OUTPUTS_DIR / lesson_id
    audio_dir = lesson_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    # Prepare dummy audio files
    tts = LocalTTSDispatcher(output_dir=audio_dir, allow_mock=True)
    wav1 = audio_dir / f"scene_01_en.wav"
    wav2 = audio_dir / f"scene_02_en.wav"
    wav3 = audio_dir / f"scene_03_en.wav"
    entry1 = tts.synthesize_speech(text="Original narration for scene 1", language="en", output_path=wav1)
    entry2 = tts.synthesize_speech(text="Original narration for scene 2", language="en", output_path=wav2)
    entry3 = tts.synthesize_speech(text="Original narration for scene 3", language="en", output_path=wav3)
    entry1.scene_id = "scene_01"
    entry2.scene_id = "scene_02"
    entry3.scene_id = "scene_03"

    plan = LessonPlan(
        title="Test Lesson for Editor",
        topic="Physics",
        target_duration_seconds=60,
        scenes=[
            TitleCardScene(
                id="scene_01",
                heading="Introduction to Force",
                narration="Original narration for scene 1",
            ),
            DiagramScene(
                id="scene_02",
                heading="Force Vectors",
                narration="Original narration for scene 2",
                items=["Applied Force", "Friction"],
                layout="horizontal",
            ),
            TitleCardScene(
                id="scene_03",
                heading="Summary of Force",
                narration="Original narration for scene 3",
            ),
        ],
    )

    manifest = AudioManifest(
        lesson_id=lesson_id,
        language="en",
        total_duration_seconds=entry1.duration_seconds + entry2.duration_seconds + entry3.duration_seconds,
        entries=[entry1, entry2, entry3],
    ).compute_global_timeline()

    LESSON_STORE[lesson_id] = plan
    MANIFEST_STORE[lesson_id] = manifest
    (lesson_dir / "lesson_plan.json").write_text(plan.model_dump_json(), encoding="utf-8")
    (lesson_dir / "audio_manifest.json").write_text(manifest.model_dump_json(), encoding="utf-8")

    # 1. Visual-only update: change heading and diagram items
    res_visual = client.put(
        f"/api/lessons/{lesson_id}/scenes/scene_02",
        json={
            "heading": "Updated Force Vectors Title",
            "items": ["Applied Force", "Friction", "Normal Force"],
        },
    )
    assert res_visual.status_code == 200
    data_visual = res_visual.json()
    assert data_visual["is_edited"] is True
    assert data_visual["audio_rebuilt"] is False
    assert data_visual["scene"]["heading"] == "Updated Force Vectors Title"
    assert len(data_visual["scene"]["items"]) == 3

    # 2. Narration update: modifies text -> triggers selective audio rebuild
    res_narration = client.put(
        f"/api/lessons/{lesson_id}/scenes/scene_02",
        json={
            "narration": "Brand new narration script explaining normal force and gravity in great detail.",
        },
    )
    assert res_narration.status_code == 200
    data_narration = res_narration.json()
    assert data_narration["audio_rebuilt"] is True
    assert data_narration["scene"]["narration"].startswith("Brand new narration")


def test_independent_part_video_export():
    """Verifies independent part video export via POST /api/lessons/{lesson_id}/parts/{part_id}/export."""
    ffmpeg_bin, _ = find_ffmpeg_binaries()
    if not ffmpeg_bin:
        pytest.skip("FFmpeg not available on test host")

    lesson_id = "test_part_export_001"
    lesson_dir = OUTPUTS_DIR / lesson_id
    audio_dir = lesson_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    tts = LocalTTSDispatcher(output_dir=audio_dir, allow_mock=True)
    wav1 = audio_dir / f"scene_01_en.wav"
    wav2 = audio_dir / f"scene_02_en.wav"
    wav3 = audio_dir / f"scene_03_en.wav"
    entry1 = tts.synthesize_speech(text="Part 1 introduction to energy and power.", language="en", output_path=wav1)
    entry2 = tts.synthesize_speech(text="Part 2 application in mechanical systems.", language="en", output_path=wav2)
    entry3 = tts.synthesize_speech(text="Part 2 deep dive on conservation laws.", language="en", output_path=wav3)
    entry1.scene_id = "scene_01"
    entry2.scene_id = "scene_02"
    entry3.scene_id = "scene_03"

    plan = LessonPlan(
        title="Energy and Work",
        topic="Physics",
        target_duration_seconds=120,
        parts=[
            LessonPart(part_id="part_1", part_number=1, title="Energy Foundations", scene_ids=["scene_01"]),
            LessonPart(part_id="part_2", part_number=2, title="Mechanical Work", scene_ids=["scene_02", "scene_03"]),
        ],
        scenes=[
            TitleCardScene(id="scene_01", heading="Energy Foundations", narration="Part 1 introduction to energy and power."),
            DiagramScene(id="scene_02", heading="Mechanical Work", narration="Part 2 application in mechanical systems.", items=["Force", "Distance"]),
            DiagramScene(id="scene_03", heading="Conservation Laws", narration="Part 2 deep dive on conservation laws.", items=["Kinetic Energy", "Potential Energy"]),
        ],
    )

    manifest = AudioManifest(
        lesson_id=lesson_id,
        language="en",
        total_duration_seconds=entry1.duration_seconds + entry2.duration_seconds + entry3.duration_seconds,
        entries=[entry1, entry2, entry3],
    ).compute_global_timeline()

    LESSON_STORE[lesson_id] = plan
    MANIFEST_STORE[lesson_id] = manifest
    (lesson_dir / "lesson_plan.json").write_text(plan.model_dump_json(), encoding="utf-8")
    (lesson_dir / "audio_manifest.json").write_text(manifest.model_dump_json(), encoding="utf-8")

    # Export Part 1 independently
    res = client.post(f"/api/lessons/{lesson_id}/parts/part_1/export")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["part_id"] == "part_1"
    assert "video_url" in data

    # Verify exported part video file exists
    part_mp4 = lesson_dir / f"{lesson_id}_part_1.mp4"
    assert part_mp4.is_file()
    assert part_mp4.stat().st_size > 1000
