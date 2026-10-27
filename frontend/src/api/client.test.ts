import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateLesson, getStatus } from './client'

describe('mock lesson client', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    window.history.replaceState({}, '', '/')
  })

  it('creates a job and reports ready after the mock stages finish', async () => {
    const job = await generateLesson({
      topic: 'Python loops',
      level: 'beginner',
      language: 'en',
      target_duration_seconds: 45,
    })

    expect(job.job_id).toMatch(/^demo-/)
    expect((await getStatus(job.job_id)).status).toBe('queued')

    vi.advanceTimersByTime(12_000)
    expect((await getStatus(job.job_id)).status).toBe('ready')
  })
})
