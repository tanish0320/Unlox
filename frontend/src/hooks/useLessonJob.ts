import { useCallback, useEffect, useRef, useState } from 'react'
import {
  generateLesson,
  getLesson,
  getStatus,
  jobTimeoutMs,
  pollIntervalMs,
} from '../api/client'
import type { GenerateRequest, JobStatus, LessonResponse } from '../api/types'

export interface UseLessonJobResult {
  startJob: (request: GenerateRequest) => Promise<void>
  reset: () => void
  jobId: string | null
  status: JobStatus | null
  lesson: LessonResponse | null
  error: string | null
  isLoading: boolean
}

const timeoutStatus: JobStatus = {
  status: 'failed',
  stage: 'timeout',
  progress_percent: 0,
  message: 'The lesson took too long to finish. Please try again.',
  fallback_used: false,
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

export function useLessonJob(): UseLessonJobResult {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [lesson, setLesson] = useState<LessonResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const runId = useRef(0)
  const startTimeout = useRef<number | null>(null)
  const startedAt = useRef<number | null>(null)

  const startJob = useCallback(async (request: GenerateRequest) => {
    runId.current += 1
    const currentRun = runId.current
    setJobId(null)
    setStatus(null)
    setLesson(null)
    setError(null)
    setIsLoading(true)
    startedAt.current = Date.now()
    let timeoutId = 0
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error(timeoutStatus.message)),
          jobTimeoutMs,
        )
        startTimeout.current = timeoutId
      })
      const result = await Promise.race([generateLesson(request), timeout])
      if (runId.current === currentRun) setJobId(result.job_id)
    } catch (jobError) {
      if (runId.current === currentRun) {
        const message = errorMessage(jobError)
        if (message === timeoutStatus.message) setStatus(timeoutStatus)
        setError(message)
        setIsLoading(false)
      }
    } finally {
      window.clearTimeout(timeoutId)
      if (startTimeout.current === timeoutId) startTimeout.current = null
    }
  }, [])

  const reset = useCallback(() => {
    runId.current += 1
    if (startTimeout.current !== null) {
      window.clearTimeout(startTimeout.current)
      startTimeout.current = null
    }
    startedAt.current = null
    setJobId(null)
    setStatus(null)
    setLesson(null)
    setError(null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!jobId) return

    const currentRun = runId.current
    let stopped = false
    let pollTimer = 0
    const remainingTimeout = Math.max(
      0,
      jobTimeoutMs - (Date.now() - (startedAt.current ?? Date.now())),
    )
    const timeoutTimer = window.setTimeout(() => {
      stopped = true
      setStatus(timeoutStatus)
      setError(timeoutStatus.message)
      setIsLoading(false)
    }, remainingTimeout)

    const poll = async () => {
      if (stopped || runId.current !== currentRun) return
      try {
        const nextStatus = await getStatus(jobId)
        if (stopped || runId.current !== currentRun) return
        setStatus(nextStatus)

        if (nextStatus.status === 'ready') {
          const readyLesson = await getLesson(jobId)
          if (stopped || runId.current !== currentRun) return
          setLesson(readyLesson)
          setIsLoading(false)
          stopped = true
          window.clearTimeout(timeoutTimer)
          return
        }
        if (nextStatus.status === 'failed') {
          setError(nextStatus.message)
          setIsLoading(false)
          stopped = true
          window.clearTimeout(timeoutTimer)
          return
        }
        pollTimer = window.setTimeout(poll, pollIntervalMs)
      } catch (pollError) {
        if (stopped || runId.current !== currentRun) return
        setError(errorMessage(pollError))
        setIsLoading(false)
        stopped = true
        window.clearTimeout(timeoutTimer)
      }
    }

    poll()
    return () => {
      stopped = true
      window.clearTimeout(pollTimer)
      window.clearTimeout(timeoutTimer)
    }
  }, [jobId])

  useEffect(
    () => () => {
      if (startTimeout.current !== null) {
        window.clearTimeout(startTimeout.current)
      }
    },
    [],
  )

  return { startJob, reset, jobId, status, lesson, error, isLoading }
}
