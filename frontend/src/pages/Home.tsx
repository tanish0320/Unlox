import { useEffect, useState } from 'react'
import { Check, Clipboard, Download, Film, Languages, NotebookPen } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  notesUrl,
  subtitlesUrl,
  videoUrl,
} from '../api/client'
import { getMockLesson } from '../api/mockData'
import type { GenerateRequest, LessonResponse } from '../api/types'
import { LANGUAGES } from '../config/languages'
import { useLessonJob } from '../hooks/useLessonJob'
import { GenerationForm } from '../components/GenerationForm'
import { GenerationProgress } from '../components/GenerationProgress'
import { LessonIllustration } from '../components/LessonIllustration'
import { LessonPlayer } from '../components/LessonPlayer'
import { ResultView } from '../components/ResultView'

const isMockMode = import.meta.env.VITE_USE_MOCK === 'true'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${seconds} sec`
  return remainingSeconds === 0
    ? `${minutes} min`
    : `${minutes} min ${remainingSeconds} sec`
}

function getLessonDuration(lesson: LessonResponse) {
  const audioDuration = lesson.artifact_manifest.audio.reduce(
    (total, audio) => total + audio.duration_seconds,
    0,
  )
  return audioDuration || lesson.lesson_plan.target_duration_seconds
}

interface DownloadLinkProps {
  href: string
  filename: string
  disabled: boolean
  children: ReactNode
  secondary?: boolean
  disabledReason?: string
}

function DownloadLink({
  href,
  filename,
  disabled,
  children,
  secondary = false,
  disabledReason,
}: DownloadLinkProps) {
  const className = `download-link${secondary ? ' secondary' : ''}${disabled ? ' is-disabled' : ''}`
  if (disabled) {
    return (
      <button
        className={className}
        type="button"
        disabled
        title={disabledReason ?? 'Available when the backend is connected'}
      >
        {children}
      </button>
    )
  }

  return (
    <a
      className={className}
      href={href}
      download={filename}
    >
      {children}
    </a>
  )
}

export function Home() {
  const { startJob, reset, jobId, status, lesson, error, isLoading } =
    useLessonJob()
  const [lastRequest, setLastRequest] = useState<GenerateRequest | null>(null)
  const [sampleLesson, setSampleLesson] = useState<LessonResponse | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [copyMessage, setCopyMessage] = useState('')
  const ready = Boolean(lesson && status?.status === 'ready')
  const hasReadyLesson = ready || Boolean(sampleLesson)
  const playableLesson = ready ? lesson : sampleLesson

  useEffect(() => {
    const previousTitle = document.title
    document.title = hasReadyLesson
      ? 'Blu Visual Teacher - Lesson ready'
      : 'Blu Visual Teacher'
    return () => {
      document.title = previousTitle
    }
  }, [hasReadyLesson])

  async function copyNotes() {
    try {
      await window.navigator.clipboard.writeText(notesAsReadableText(lesson?.notes ?? ''))
      setCopyMessage('Notes copied.')
    } catch {
      setCopyMessage('Could not copy notes. Please select and copy them from the Notes tab.')
    }
  }

  function submitLesson(request: GenerateRequest) {
    setLastRequest(request)
    setSampleLesson(null)
    void startJob(request)
  }

  function retryLesson() {
    if (!lastRequest) return
    setSampleLesson(null)
    void startJob(lastRequest)
  }

  function useSampleLesson() {
    reset()
    setSampleLesson(getMockLesson(lastRequest?.language ?? 'en'))
  }

  function makeAnotherLesson() {
    reset()
    setLastRequest(null)
    setSampleLesson(null)
    setFormKey((key) => key + 1)
  }

  const shownLesson = lesson ?? sampleLesson
  const language = shownLesson
    ? LANGUAGES.find((item) => item.code === shownLesson.lesson_plan.language)
    : undefined
  const subtitleAvailable = Boolean(shownLesson?.artifact_manifest.subtitles_url)
  const subtitleDownloadUrl = subtitleAvailable
    ? jobId
      ? subtitlesUrl(jobId)
      : shownLesson?.artifact_manifest.subtitles_url ?? ''
    : ''
  const videoDownloadUrl =
    (jobId ? videoUrl(jobId) : '') || lesson?.artifact_manifest.video_url || ''
  const notesDownloadUrl =
    (jobId ? notesUrl(jobId) : '') || lesson?.artifact_manifest.notes_url || ''

  return (
    <main className="main-content home-page" id="home">
      <section className="work-area" aria-labelledby="page-title">
        <div className="page-intro">
          <p className="section-kicker">A LITTLE CURIOSITY GOES A LONG WAY</p>
          <h1 id="page-title">Turn any topic into an offline lesson</h1>
          <p className="intro-copy">
            Create video lessons with visuals, voice and captions, ready to use even without internet.
          </p>
        </div>

        <div className="lesson-setup">
          <section className="placeholder-card form-card" aria-labelledby="form-title">
            <div className="card-heading">
              <span className="step-number">01</span>
              <div>
                <p className="card-kicker">START WITH AN IDEA</p>
                <h2 id="form-title">Topic / Subject</h2>
              </div>
            </div>
            <GenerationForm
              key={formKey}
              onSubmit={submitLesson}
              disabled={isLoading}
            />
          </section>

          <GenerationProgress
            status={status}
            isLoading={isLoading}
            error={error}
            timingsByStage={lesson?.artifact_manifest.timings_by_stage}
            onRetry={retryLesson}
            onUseSample={useSampleLesson}
            onMakeAnother={makeAnotherLesson}
            sampleUsed={Boolean(sampleLesson)}
          />
        </div>
      </section>

      <aside className="preview-panel lesson-preview" aria-label="Lesson preview">
        <div className="preview-topline">
          <span className="preview-dot" aria-hidden="true" />
          <span>{lesson ? 'YOUR LESSON' : shownLesson ? 'LESSON DETAILS' : 'LESSON PREVIEW'}</span>
        </div>
        {playableLesson ? (
          <>
            <LessonPlayer
              lesson={playableLesson}
              lessonId={sampleLesson ? '' : jobId ?? ''}
              autoPlay={Boolean(sampleLesson)}
            />
            {sampleLesson ? (
              <p className="demo-text-note">
                Demo sample text. Real narration comes from the local models.
              </p>
            ) : isMockMode ? (
              <p className="demo-text-note">
                Demo sample text. Real narration comes from the local models.
              </p>
            ) : null}
            <ResultView
              lesson={playableLesson}
              fallbackUsed={sampleLesson ? true : status?.fallback_used ?? false}
            />
          </>
        ) : isLoading ? (
          <div className="preview-skeleton" role="status" aria-label="Loading lesson">
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-stage" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-short" />
          </div>
        ) : shownLesson ? (
          <div className="ready-preview" aria-live="polite">
            <span className="ready-preview-icon" aria-hidden="true">
              <Film size={26} />
            </span>
            <h2>{shownLesson.lesson_plan.topic}</h2>
            <div className="lesson-facts">
              <span>
                <Film size={16} aria-hidden="true" />
                {shownLesson.lesson_plan.scenes.length} scenes
              </span>
              <span>
                <Download size={16} aria-hidden="true" />
                {formatDuration(getLessonDuration(shownLesson))}
              </span>
            </div>
            {language && (
              <span className="lesson-language-chip" lang={language.code}>
                <Languages size={15} aria-hidden="true" />
                {language.nativeName}
              </span>
            )}
          </div>
        ) : (
          <div className="preview-art-wrap">
            <LessonIllustration />
            <span className="art-label label-sun">Sunlight</span>
            <span className="art-label label-water">Water</span>
          </div>
        )}
        {!shownLesson && (
          <p className="preview-caption">Your lesson will play here.</p>
        )}
      </aside>

      {ready && lesson && (
        <section className="ready-bar" aria-labelledby="ready-title">
          <div className="ready-message">
            <span className="ready-check">
              <Check size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="ready-title">Ready without internet</h2>
              <p>
                Your lesson is saved as a video file you can use anytime, even without internet.
              </p>
            </div>
          </div>
          <div className="download-actions">
            <DownloadLink
              href={videoDownloadUrl}
              filename="blu-lesson.mp4"
              disabled={isMockMode || !videoDownloadUrl}
              disabledReason={isMockMode ? undefined : "This video file is not available for this lesson."}
            >
              <Download size={17} aria-hidden="true" />
              Download MP4
            </DownloadLink>
            <DownloadLink
              href={notesDownloadUrl}
              filename="blu-lesson-notes.json"
              disabled={isMockMode || !notesDownloadUrl}
              disabledReason={isMockMode ? undefined : "Notes are not available for download for this lesson."}
              secondary
            >
              <NotebookPen size={17} aria-hidden="true" />
              Download Notes (JSON)
            </DownloadLink>
            {subtitleDownloadUrl && (
              <DownloadLink
                href={subtitleDownloadUrl}
                filename="blu-lesson-captions.srt"
                disabled={isMockMode}
                disabledReason={isMockMode ? undefined : "Captions are not available for download for this lesson."}
                secondary
              >
                <Languages size={17} aria-hidden="true" />
                Download Captions (SRT)
              </DownloadLink>
            )}
            <button
              className="download-link secondary"
              type="button"
              onClick={() => void copyNotes()}
            >
              <Clipboard size={17} aria-hidden="true" />
              Copy notes
            </button>
          </div>
          {copyMessage && <p className="copy-notes-message" role="status">{copyMessage}</p>}
          {!isMockMode && (!videoDownloadUrl || !notesDownloadUrl) && (
            <p className="download-missing-message" role="status">
              {!videoDownloadUrl && !notesDownloadUrl
                ? 'The video and notes files are not available for download.'
                : !videoDownloadUrl
                  ? 'The video file is not available for download.'
                  : 'The notes file is not available for download.'}
            </p>
          )}
        </section>
      )}
    </main>
  )
}

function notesAsReadableText(notes: string) {
  try {
    const parsed: unknown = JSON.parse(notes)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return notes
    }
    const data = parsed as Record<string, unknown>
    const lines: string[] = []
    if (typeof data.summary === 'string') lines.push(`Summary\n${data.summary}`)
    if (Array.isArray(data.key_concepts)) {
      const concepts = data.key_concepts.flatMap((item) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
        const concept = item as Record<string, unknown>
        return typeof concept.term === 'string' && typeof concept.definition === 'string'
          ? [`- ${concept.term}: ${concept.definition}`]
          : []
      })
      if (concepts.length) lines.push(`Key concepts\n${concepts.join('\n')}`)
    }
    for (const [key, title] of [
      ['steps', 'Steps'],
      ['key_takeaways', 'Key takeaways'],
    ]) {
      const values = data[key]
      if (Array.isArray(values)) {
        const entries = values.filter((value): value is string => typeof value === 'string')
        if (entries.length) lines.push(`${title}\n${entries.map((entry) => `- ${entry}`).join('\n')}`)
      }
    }
    if (Array.isArray(data.revision_questions)) {
      const questions = data.revision_questions.flatMap((item) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
        const question = item as Record<string, unknown>
        return typeof question.question === 'string' && typeof question.answer === 'string'
          ? [`Q: ${question.question}\nA: ${question.answer}`]
          : []
      })
      if (questions.length) lines.push(`Revision questions\n${questions.join('\n')}`)
    }
    return lines.join('\n\n') || notes
  } catch {
    return notes
  }
}
