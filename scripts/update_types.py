from pathlib import Path

path = Path("frontend/src/components/scenes/sceneTypes.ts")
content = path.read_text(encoding="utf-8").replace("\r\n", "\n")

old_lp = """export interface LessonPlan {
  schema_version: string;
  title: string;
  level: LessonLevel;
  language: string;
  topic?: string;
  target_duration_seconds?: number;
  scenes: LessonScene[];
}"""

new_lp = """export interface LessonPlan {
  schema_version: string;
  title: string;
  level: LessonLevel;
  language: string;
  source_language?: string;
  topic?: string;
  target_duration_seconds?: number;
  scenes: LessonScene[];
  summary?: string;
  learning_objectives?: string[];
  key_takeaways?: string[];
  glossary?: KeyConcept[];
  revision_questions?: RevisionQuestion[];
}"""

old_ame = """export interface AudioManifestEntry {
  scene_id: string;
  audio_file: string;
  duration_seconds: number;
  language: string;
  voice_id: string;
  sample_rate?: number;
  fallback_used?: boolean;
}"""

new_ame = """export interface AudioManifestEntry {
  scene_id: string;
  audio_file: string;
  duration_seconds: number;
  language: string;
  voice_id: string;
  sample_rate?: number;
  fallback_used?: boolean;
  start_seconds?: number;
  end_seconds?: number;
  global_start_seconds?: number;
  global_end_seconds?: number;
  caption_segments?: CaptionSegment[];
}"""

if old_lp in content and old_ame in content:
    content = content.replace(old_lp, new_lp).replace(old_ame, new_ame)
    path.write_text(content, encoding="utf-8")
    print("SUCCESS: sceneTypes.ts updated")
else:
    print("FAILED: old strings not found")

prov_path = Path("contracts/provisional_types.ts")
if prov_path.exists():
    prov_content = prov_path.read_text(encoding="utf-8").replace("\r\n", "\n")
    if old_lp in prov_content:
        prov_content = prov_content.replace(old_lp, new_lp)
        prov_path.write_text(prov_content, encoding="utf-8")
        print("SUCCESS: contracts/provisional_types.ts updated")
