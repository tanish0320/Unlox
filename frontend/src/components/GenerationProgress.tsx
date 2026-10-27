import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Captions,
  Check,
  Clapperboard,
  Clock3,
  Download,
  FlaskConical,
  RotateCcw,
} from 'lucide-react'
import type { JobStatus } from '../api/types'

interface GenerationProgressProps {
  status: JobStatus | null
  isLoading: boolean
  error: string | null
  timingsByStage?: Record<string, number>
  onRetry: () => void
  onUseSample: () => void
  onMakeAnother: () => void
  sampleUsed?: boolean
}

const steps = [
  {
    title: 'Lesson script',
    stages: ['validating', 'planning', 'translating'],
    Icon: BookOpen,
  },
  { title: 'Voice + captions', stages: ['narrating'], Icon: Captions },
  { title: 'Animated scenes', stages: ['rendering'], Icon: Clapperboard },
  { title: 'Offline MP4', stages: ['exporting'], Icon: Download },
]

function stepIndexForStage(stage: string) {
  if (['validating', 'planning', 'translating'].includes(stage)) return 0
  if (stage === 'narrating') return 1
  if (stage === 'rendering') return 2
  if (stage === 'exporting' || stage === 'ready') return 3
  return 0
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0
    ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
    : `0:${String(remainingSeconds).padStart(2, '0')}`
}

function formatStepTime(stages: string[], timings?: Record<string, number>) {
  if (!timings) return null
  const milliseconds = stages.reduce(
    (sum, stage) => sum + (timings[stage] ?? 0),
    0,
  )
  if (milliseconds <= 0) return null
  return `${(milliseconds / 1000).toFixed(1)} sec`
}

export function GenerationProgress({
  status,
  isLoading,
  error,
  timingsByStage,
  onRetry,
  onUseSample,
  onMakeAnother,
  sampleUsed = false,
}: GenerationProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startedAt = useRef<number | null>(null)
  const wasLoading = useRef(false)
  const failed = status?.status === 'failed' || Boolean(error)
  const idle = !status && !isLoading && !error
  const activeIndex = status ? stepIndexForStage(status.stage) : 0

  useEffect(() => {
    if (isLoading) {
      if (!wasLoading.current) {
        startedAt.current = Date.now()
        setElapsedSeconds(0)
      }
      wasLoading.current = true
      const timer = window.setInterval(() => {
        if (startedAt.current !== null) {
          setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000))
        }
      }, 1000)
      return () => window.clearInterval(timer)
    }

    if (wasLoading.current && startedAt.current !== null) {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000))
    }
    wasLoading.current = false
  }, [isLoading])

  const percent =
    status?.status === 'ready' ? 100 : status?.progress_percent ?? 0
  const heading = failed
    ? 'Something went wrong'
    : status?.status === 'ready'
      ? 'Your lesson is ready'
      : isLoading
        ? 'Creating your lesson...'
        : 'Your lesson steps'

  return (
    <section className="placeholder-card generation-progress" aria-labelledby="progress-title">
      <div className="card-heading">
        <span className="step-number">02</span>
        <div>
          <p className="card-kicker">MADE JUST FOR YOU</p>
          <h2 id="progress-title">{heading}</h2>
        </div>
      </div>

      {sampleUsed ? (
        <div className="fallback-banner" role="status">
          This is the built-in sample lesson, not a new one.
        </div>
      ) : status?.fallback_used && (
        <div className="fallback-banner" role="status">
          The AI planner was not available, so a built-in sample lesson is shown.
        </div>
      )}

      {failed ? (
        <div className="job-error-panel" role="alert">
          <div className="job-error-icon">
            <FlaskConical size={20} aria-hidden="true" />
          </div>
          <div className="job-error-copy">
            <h3>We couldn’t finish this lesson.</h3>
            <p>Try again, or use a sample lesson while you wait.</p>
            {error && <p className="job-error-detail">{error}</p>}
          </div>
          <div className="job-error-actions">
            <button type="button" className="retry-button" onClick={onRetry}>
              <RotateCcw size={16} aria-hidden="true" />
              Retry
            </button>
            <button type="button" className="sample-button" onClick={onUseSample}>
              Use sample lesson
            </button>
          </div>
        </div>
      ) : (
        <>
          <ol className={`progress-steps${idle ? ' is-idle' : ''}`}>
            {steps.map(({ title, stages: stepStages, Icon }, index) => {
              const isDone = status?.status === 'ready' || index < activeIndex
              const isCurrent =
                !idle &&
                status?.status !== 'ready' &&
                index === activeIndex
              const stepTime = formatStepTime(stepStages, timingsByStage)

              return (
                <li
                  className={`progress-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
                  key={title}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="progress-step-icon">
                    {isDone ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <Icon size={18} aria-hidden="true" />
                    )}
                  </span>
                  <span className="progress-step-title">{title}</span>
                  <span className="progress-step-state">
                    {idle ? 'Waiting' : isDone ? 'Done' : isCurrent ? 'In progress' : 'Waiting'}
                    {stepTime && <span className="step-time">{stepTime}</span>}
                  </span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="step-arrow" size={16} aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </ol>

          <div className="job-progress-meta">
            <span>{percent}% complete</span>
            <span className="elapsed-time">
              <Clock3 size={15} aria-hidden="true" />
              {idle ? 'Waiting' : formatElapsed(elapsedSeconds)}
            </span>
          </div>
          <div
            className="job-progress-track"
            role="progressbar"
            aria-label="Lesson creation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          {status && status.status !== 'ready' && !failed && (
            <p className="current-stage-message">{status.message}</p>
          )}
          {status?.status === 'ready' && (
            <button
              type="button"
              className="make-another-button"
              onClick={onMakeAnother}
            >
              Make another lesson
            </button>
          )}
        </>
      )}
    </section>
  )
}
