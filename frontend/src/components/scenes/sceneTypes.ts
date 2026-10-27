export type SceneType =
  | "title_card"
  | "diagram"
  | "code_walkthrough";

export type LessonLevel =
  | "beginner"
  | "intermediate";

export interface BaseScene {
  id: string;
  type: SceneType;
  heading: string;
  narration: string;
}

export interface TitleCardScene extends BaseScene {
  type: "title_card";
  subtitle?: string;
  tag?: string;
  topic?: string;
  key_points?: string[];
}

export interface DiagramNode {
  id: string;
  label: string;
  description?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramItem {
  label: string;
  detail?: string;
}

export interface NumberLineSpec {
  min_val: number;
  max_val: number;
  step?: number;
  marked_points?: Array<{ value: number; label: string; color?: string }>;
  highlight_range?: [number, number];
}

export interface FractionBarSegment {
  label: string;
  units: number;
  color?: string;
  fraction_text?: string;
}

export interface FractionBarSpec {
  total_units: number;
  segments: FractionBarSegment[];
  comparison_label?: string;
}

export interface ProportionTableSpec {
  headers: string[];
  rows: Array<{ values: number[] }>;
  scale_factor_label?: string;
}

export interface ScienceElement {
  name: string;
  role?: string;
  x: number;
  y: number;
}

export interface ScienceDiagramSpec {
  subject: string;
  elements: ScienceElement[];
  process_flow?: string[];
}

export interface DiagramScene extends BaseScene {
  diagram_type?: "flowchart" | "number_line" | "fraction_bar" | "proportion_table" | "science_diagram";
  number_line?: NumberLineSpec;
  fraction_bar?: FractionBarSpec;
  proportion_table?: ProportionTableSpec;
  science_diagram?: ScienceDiagramSpec;
  type: "diagram";
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  items?: string[];
  layout?: "linear" | "horizontal" | "vertical" | "loop" | "cycle" | "tree" | "auto";
  structured_nodes?: DiagramItem[];
}

export interface CodeWalkthroughScene extends BaseScene {
  type: "code_walkthrough";
  code: string;
  highlight_lines?: number[];
  language?: string;
  code_language?: string;
  filename?: string;
  output?: string;
  expected_output?: string;
}

export type LessonScene =
  | TitleCardScene
  | DiagramScene
  | CodeWalkthroughScene;

export interface LessonPlan {
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
}

/**
 * Person 3's exact SceneRendererProps contract:
 * <SceneRenderer scene timeSeconds durationSeconds />
 */
export interface SceneRendererProps {
  scene: LessonScene;
  timeSeconds: number;
  durationSeconds: number;
  width?: number;
  height?: number;
  className?: string;
  // Optional backwards compatibility aliases
  currentTime?: number;
  duration?: number;
}

export interface TitleCardProps {
  scene: TitleCardScene;
  timeSeconds: number;
  durationSeconds: number;
  className?: string;
  currentTime?: number;
  duration?: number;
}

export interface DiagramSceneProps {
  scene: DiagramScene;
  timeSeconds: number;
  durationSeconds: number;
  className?: string;
  currentTime?: number;
  duration?: number;
}

export interface CodeWalkthroughProps {
  scene: CodeWalkthroughScene;
  timeSeconds: number;
  durationSeconds: number;
  className?: string;
  currentTime?: number;
  duration?: number;
}

/**
 * Person 3's exact CaptionTrackProps contract:
 * <CaptionTrack text visible />
 */
export interface CaptionTrackProps {
  text: string;
  visible: boolean;
  className?: string;
  language?: string;
}

export interface CaptionSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
  language?: string;
  global_start_seconds?: number;
  global_end_seconds?: number;
}

export interface KeyConcept {
  term: string;
  definition: string;
}

export interface StepExplanation {
  step: number;
  title: string;
  content: string;
}

export interface NoteExample {
  description: string;
  code?: string;
  output?: string;
}

export interface RevisionQuestion {
  question: string;
  answer: string;
}

export interface ArtifactRef {
  type: "video" | "notes" | "subtitles" | string;
  filename: string;
}

export interface ModelMetadata {
  planner?: string;
  translator?: string;
  tts?: string;
  fallback_used?: boolean;
}

export interface LessonNotes {
  schema_version?: string;
  title: string;
  topic?: string;
  language: string;
  level: LessonLevel | string;
  summary: string;
  learning_objectives: string[];
  key_concepts: KeyConcept[];
  step_by_step_explanation: (string | StepExplanation)[];
  examples: NoteExample[];
  key_takeaways: string[];
  revision_questions: RevisionQuestion[];
  generated_artifacts?: ArtifactRef[];
  model_metadata?: ModelMetadata;
}

/**
 * Person 3's exact NotesPreviewProps contract:
 * <NotesPreview notes />
 */
export interface NotesPreviewProps {
  notes: LessonNotes;
  className?: string;
}

export interface AudioManifestEntry {
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
}

export interface AudioManifest {
  schema_version?: string;
  lesson_id?: string;
  language?: string;
  total_duration_seconds?: number;
  entries: AudioManifestEntry[];
  fallback_used?: boolean;
}
