/**
 * TypeScript contract definitions for Blu Visual Teacher.
 * Status: PROVISIONAL (Awaiting confirmation from Person 2 and Person 4).
 * Generated to strictly mirror backend/app/schemas/provisional_lesson.py and audio_manifest.py
 */

export type SceneType = 'title_card' | 'diagram' | 'code_walkthrough';

export interface BaseScene {
  id: string;
  heading: string;
  narration: string;
}

export interface TitleCardScene extends BaseScene {
  type: 'title_card';
  subtitle?: string;
  key_points?: string[];
}

export interface DiagramItem {
  label: string;
  detail?: string;
}

export interface DiagramScene extends BaseScene {
  type: 'diagram';
  items: string[];
  layout?: 'horizontal' | 'vertical' | 'cycle';
  structured_nodes?: DiagramItem[];
}

export interface CodeWalkthroughScene extends BaseScene {
  type: 'code_walkthrough';
  code: string;
  code_language?: string;
  highlight_lines?: number[];
  expected_output?: string;
}

export type Scene = TitleCardScene | DiagramScene | CodeWalkthroughScene;

export interface LessonPlan {
  schema_version: string;
  title: string;
  topic: string;
  level: 'beginner' | 'intermediate';
  language: string;
  target_duration_seconds?: number;
  scenes: Scene[];
}

/**
 * Caption timestamps convention:
 * 1. start_seconds / end_seconds are SCENE-RELATIVE (0.0 = start of scene audio).
 * 2. global_start_seconds / global_end_seconds are LESSON-GLOBAL (cumulative timeline for FFmpeg/SRT).
 */
export interface CaptionSegment {
  start_seconds: number;
  end_seconds: number;
  global_start_seconds?: number;
  global_end_seconds?: number;
  text: string;
}

export interface SceneAudioEntry {
  scene_id: string;
  audio_file: string;
  duration_seconds: number;
  language: string;
  voice_id: string;
  sample_rate: number;
  fallback_used?: boolean;
  caption_segments?: CaptionSegment[];
}

export interface AudioManifest {
  schema_version: string;
  lesson_id: string;
  language: string;
  total_duration_seconds: number;
  total_timeline_duration_seconds?: number;
  entries: SceneAudioEntry[];
  fallback_used: boolean;
}

export interface MultiLanguageAudioManifest {
  schema_version: string;
  lesson_id: string;
  default_language: string;
  manifests: Record<string, AudioManifest>;
}

export interface KeyConcept {
  term: string;
  definition: string;
}

export interface LessonExample {
  description: string;
  code?: string;
  output?: string;
}

export interface RevisionQuestion {
  question: string;
  answer: string;
}

export interface ArtifactRef {
  type: 'video' | 'notes' | 'subtitles';
  filename: string;
}

export interface ModelMetadata {
  planner: string;
  translator?: string;
  tts: string;
  fallback_used: boolean;
}

export interface LessonNotes {
  schema_version: string;
  title: string;
  topic: string;
  language: string;
  level: string;
  summary: string;
  learning_objectives: string[];
  key_concepts: KeyConcept[];
  step_by_step_explanation: string[];
  examples: LessonExample[];
  key_takeaways: string[];
  revision_questions: RevisionQuestion[];
  generated_artifacts: ArtifactRef[];
  model_metadata: ModelMetadata;
}
