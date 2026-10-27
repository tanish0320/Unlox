export type LessonLevel = 'beginner' | 'intermediate'

export interface GenerateRequest {
  topic: string
  level: LessonLevel
  language: string
  target_duration_seconds: number
}

export type JobStage =
  | 'validating'
  | 'planning'
  | 'translating'
  | 'narrating'
  | 'rendering'
  | 'exporting'
  | 'ready'

export interface JobStatus {
  status: 'queued' | 'running' | 'ready' | 'failed'
  stage: string
  progress_percent: number
  message: string
  fallback_used: boolean
}

export type SceneType = 'title_card' | 'code_walkthrough' | 'diagram'

export interface SceneItem {
  id?: string
  label: string
  description?: string
}

export interface Scene {
  id: string
  type: SceneType
  heading: string
  narration: string
  code?: string
  highlight_lines?: number[]
  items?: Array<string | SceneItem>
}

export interface AudioArtifact {
  scene_id: string
  audio_url: string
  duration_seconds: number
}

export interface ArtifactManifest {
  audio: AudioArtifact[]
  timings_by_stage: Record<string, number>
  video_url?: string
  notes_url?: string
  subtitles_url?: string
}

export interface LessonPlan {
  topic: string
  level: LessonLevel
  language: string
  target_duration_seconds: number
  scenes: Scene[]
}

export interface LessonResponse {
  lesson_plan: LessonPlan
  notes: string
  artifact_manifest: ArtifactManifest
}

export interface GenerateJobResponse {
  job_id: string
}
