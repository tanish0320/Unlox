import type {
  ArtifactManifest,
  AudioArtifact,
  GenerateRequest,
  JobStatus,
  LessonLevel,
  LessonResponse,
  Scene,
  SceneItem,
  SceneType,
} from '../api/types'

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label}: expected an object`)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${label}: expected text`)
  }
  return value
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${label}: expected a number`)
  }
  return value
}

function asLevel(value: unknown): LessonLevel {
  if (value !== 'beginner' && value !== 'intermediate') {
    throw new Error('Invalid lesson level')
  }
  return value
}

function normalizeSceneItem(value: unknown): string | SceneItem {
  if (typeof value === 'string') return value
  const item = asObject(value, 'scene item')
  const normalized: SceneItem = {
    label: asString(item.label, 'scene item label'),
  }
  if (item.id !== undefined) normalized.id = asString(item.id, 'scene item id')
  if (item.description !== undefined) {
    normalized.description = asString(item.description, 'scene item description')
  }
  return normalized
}

function normalizeScene(value: unknown): Scene {
  const scene = asObject(value, 'scene')
  const type = scene.type
  if (
    type !== 'title_card' &&
    type !== 'code_walkthrough' &&
    type !== 'diagram'
  ) {
    throw new Error('Invalid scene type')
  }

  const normalized: Scene = {
    id: asString(scene.id, 'scene id'),
    type: type as SceneType,
    heading: asString(scene.heading, 'scene heading'),
    narration: asString(scene.narration, 'scene narration'),
  }
  if (scene.code !== undefined) {
    normalized.code = asString(scene.code, 'scene code')
  }
  if (scene.highlight_lines !== undefined) {
    if (
      !Array.isArray(scene.highlight_lines) ||
      !scene.highlight_lines.every(
        (line): line is number =>
          typeof line === 'number' && Number.isInteger(line),
      )
    ) {
      throw new Error('Invalid scene highlight lines')
    }
    normalized.highlight_lines = scene.highlight_lines
  }
  if (scene.items !== undefined) {
    if (!Array.isArray(scene.items)) throw new Error('Invalid scene items')
    normalized.items = scene.items.map(normalizeSceneItem)
  }
  return normalized
}

function normalizeAudio(value: unknown): AudioArtifact {
  const audio = asObject(value, 'audio artifact')
  return {
    scene_id: asString(audio.scene_id, 'audio scene id'),
    audio_url: asString(audio.audio_url ?? '', 'audio URL'),
    duration_seconds: asNumber(audio.duration_seconds, 'audio duration'),
  }
}

function normalizeManifest(value: unknown): ArtifactManifest {
  const manifest = asObject(value, 'artifact manifest')
  if (!Array.isArray(manifest.audio)) {
    throw new Error('Invalid artifact manifest: expected an audio list')
  }
  const timings = asObject(
    manifest.timings_by_stage,
    'stage timings',
  ) as Record<string, number>
  for (const [stage, duration] of Object.entries(timings)) {
    asNumber(duration, `timing for ${stage}`)
  }

  const normalized: ArtifactManifest = {
    audio: manifest.audio.map(normalizeAudio),
    timings_by_stage: timings,
  }
  for (const key of ['video_url', 'notes_url', 'subtitles_url'] as const) {
    const url = manifest[key]
    if (url !== undefined) normalized[key] = asString(url, key)
  }
  return normalized
}

export function normalizeGenerateRequest(value: unknown): GenerateRequest {
  const request = asObject(value, 'generate request')
  const language = request.target_language ?? request.language
  return {
    topic: asString(request.topic, 'topic'),
    level: asLevel(request.level),
    language: asString(language, 'language'),
    target_duration_seconds: asNumber(
      request.target_duration_seconds,
      'target duration',
    ),
  }
}

export function normalizeJobStatus(value: unknown): JobStatus {
  const status = asObject(value, 'job status')
  if (
    status.status !== 'queued' &&
    status.status !== 'running' &&
    status.status !== 'ready' &&
    status.status !== 'failed'
  ) {
    throw new Error('Invalid job status')
  }
  return {
    status: status.status,
    stage: asString(status.stage, 'job stage'),
    progress_percent: asNumber(status.progress_percent, 'job progress'),
    message: asString(status.message, 'job message'),
    fallback_used: status.fallback_used === true,
  }
}

export function normalizeLessonResponse(value: unknown): LessonResponse {
  const response = asObject(value, 'lesson response')
  const plan = asObject(response.lesson_plan, 'lesson plan')
  if (!Array.isArray(plan.scenes)) {
    throw new Error('Invalid lesson plan: expected a scenes list')
  }
  const language =
    plan.target_language ??
    plan.language ??
    response.target_language ??
    response.language
  return {
    lesson_plan: {
      topic: asString(plan.topic, 'lesson topic'),
      level: asLevel(plan.level),
      language: asString(language, 'lesson language'),
      target_duration_seconds: asNumber(
        plan.target_duration_seconds,
        'target duration',
      ),
      scenes: plan.scenes.map(normalizeScene),
    },
    notes: asString(response.notes, 'lesson notes'),
    artifact_manifest: normalizeManifest(response.artifact_manifest),
  }
}
