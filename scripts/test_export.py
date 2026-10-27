import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.schemas.audio_manifest import AudioManifest
from backend.app.services.exporter.video_exporter import export_mp4_video, generate_srt_file, verify_video_file

root = Path(__file__).resolve().parent.parent

en_dir = root / "outputs" / "integration_fixtures" / "en"
lesson_path = en_dir / "lesson_plan.json"
manifest_path = en_dir / "audio_manifest.json"

plan_data = json.loads(lesson_path.read_text(encoding="utf-8"))
manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))

lesson_plan = LessonPlan(**plan_data)
manifest = AudioManifest(**manifest_data)

out_dir = root / "outputs" / "exported_videos" / "en"
out_dir.mkdir(parents=True, exist_ok=True)

out_mp4 = out_dir / "lesson_en.mp4"
out_srt = out_dir / "lesson_en.srt"

print("Exporting SRT...")
generate_srt_file(manifest, out_srt)
print(f"SRT generated at: {out_srt} ({out_srt.stat().st_size} bytes)")

print("Exporting MP4 (1280x720, H.264, AAC)...")
export_mp4_video(
    lesson_plan=lesson_plan,
    manifest=manifest,
    workspace_root=root,
    output_mp4_path=out_mp4,
    fps=25
)

print("Verifying MP4 with FFmpeg/FFprobe...")
result = verify_video_file(out_mp4)
print("Verification Result:", result)
assert result["valid"] is True, "Video failed verification!"
print("SUCCESS: Real MP4 video successfully generated and verified!")
