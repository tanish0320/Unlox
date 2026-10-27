import { normalizeJobStatus, normalizeLessonResponse } from '../adapters/normalize'
import { getMockLesson } from './mockData'
import type {
  GenerateJobResponse,
  GenerateRequest,
  JobStage,
  JobStatus,
  LessonResponse,
} from './types'

const env = import.meta.env
const useMock = env.VITE_USE_MOCK === 'true'
const apiBase = (env.VITE_API_BASE ?? '').replace(/\/+$/, '')
export const pollIntervalMs = readPositiveInteger(
  env.VITE_POLL_INTERVAL_MS,
  500,
)
export const jobTimeoutMs = readPositiveInteger(
  env.VITE_JOB_TIMEOUT_MS,
  60_000,
)

const stages: Array<{ name: JobStage; duration: number }> = [
  { name: 'validating', duration: 1500 },
  { name: 'planning', duration: 1700 },
  { name: 'translating', duration: 1700 },
  { name: 'narrating', duration: 1700 },
  { name: 'rendering', duration: 2400 },
  { name: 'exporting', duration: 2000 },
  { name: 'ready', duration: 1000 },
]
const jobDurationMs = stages.reduce((total, stage) => total + stage.duration, 0)
const failedJobTimeMs = stages
  .slice(0, 5)
  .reduce((total, stage) => total + stage.duration, 0)

interface MockJob {
  startedAt: number
  fallbackUsed: boolean
  shouldFail: boolean
  language: string
}

const mockJobs = new Map<string, MockJob>()
let nextMockJobId = 1

function readPositiveInteger(value: string | undefined, defaultValue: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue
}

function endpoint(path: string) {
  return `${apiBase}${path}`
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(endpoint(path), init)
  if (!response.ok) {
    throw new Error(`API request failed (${response.status} ${response.statusText})`)
  }
  return response.json()
}

function getMockJob(jobId: string): MockJob {
  const job = mockJobs.get(jobId)
  if (!job) throw new Error(`Mock job not found: ${jobId}`)
  return job
}

function mockStatus(job: MockJob): JobStatus {
  const elapsed = Date.now() - job.startedAt
  if (job.shouldFail && elapsed >= failedJobTimeMs) {
    return {
      status: 'failed',
      stage: 'rendering',
      progress_percent: 66,
      message: 'The demo job failed during rendering.',
      fallback_used: job.fallbackUsed,
    }
  }

  let stageElapsed = 0
  let stageIndex = 0
  for (; stageIndex < stages.length - 1; stageIndex += 1) {
    if (elapsed < stageElapsed + stages[stageIndex].duration) break
    stageElapsed += stages[stageIndex].duration
  }
  const stage = stages[stageIndex]
  if (elapsed >= jobDurationMs) {
    return {
      status: 'ready',
      stage: 'ready',
      progress_percent: 100,
      message: 'Your lesson is ready.',
      fallback_used: job.fallbackUsed,
    }
  }

  const progress = Math.min(
    99,
    Math.floor(
      ((stageElapsed +
        Math.max(0, elapsed - stageElapsed)) /
        jobDurationMs) *
        100,
    ),
  )
  return {
    status: elapsed < 300 ? 'queued' : 'running',
    stage: stage.name,
    progress_percent: progress,
    message: `Currently ${stage.name} your lesson.`,
    fallback_used: job.fallbackUsed,
  }
}

export async function generateLesson(
  request: GenerateRequest,
): Promise<GenerateJobResponse> {
  if (useMock) {
    const jobId = `demo-${nextMockJobId}`
    nextMockJobId += 1
    const params = new URLSearchParams(window.location.search)
    mockJobs.set(jobId, {
      startedAt: Date.now(),
      fallbackUsed: params.get('fallback') === '1',
      shouldFail: params.get('fail') === '1',
      language: request.language,
    })
    return { job_id: jobId }
  }

  const data = await requestJson('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid generate response: expected an object')
  }
  const record = data as Record<string, unknown>
  const jobId = record.job_id ?? record.id
  if (typeof jobId !== 'string' || jobId.length === 0) {
    throw new Error('Invalid generate response: missing job id')
  }
  return { job_id: jobId }
}

export async function getStatus(jobId: string): Promise<JobStatus> {
  if (useMock) return mockStatus(getMockJob(jobId))
  return normalizeJobStatus(
    await requestJson(`/jobs/${encodeURIComponent(jobId)}`),
  )
}

export async function getLesson(jobId: string): Promise<LessonResponse> {
  if (useMock) {
    const status = mockStatus(getMockJob(jobId))
    if (status.status !== 'ready') {
      throw new Error('The demo lesson is not ready yet')
    }
    return getMockLesson(getMockJob(jobId).language)
  }
  return normalizeLessonResponse(
    await requestJson(`/jobs/${encodeURIComponent(jobId)}/lesson`),
  )
}

export function videoUrl(jobId: string) {
  return endpoint(`/jobs/${encodeURIComponent(jobId)}/video`)
}

export function notesUrl(jobId: string) {
  return endpoint(`/jobs/${encodeURIComponent(jobId)}/notes`)
}

export function subtitlesUrl(jobId: string) {
  return endpoint(`/jobs/${encodeURIComponent(jobId)}/subtitles`)
}
