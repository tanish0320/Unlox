import { useState } from 'react'
import { Check, Download, Film, Languages, NotebookPen } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  notesUrl,
  subtitlesUrl,
  videoUrl,
} from '../api/client'
import { mockLesson } from '../api/mockData'
import type { GenerateRequest, LessonResponse } from '../api/types'
import { LANGUAGES } from '../config/languages'
import { useLessonJob } from '../hooks/useLessonJob'
import { GenerationForm } from '../components/GenerationForm'
import { GenerationProgress } from '../components/GenerationProgress'
import { LessonIllustration } from '../components/LessonIllustration'
import { LessonPlayer } from '../components/LessonPlayer'

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
}

function DownloadLink({
  href,
  filename,
  disabled,
  children,
  secondary = false,
}: DownloadLinkProps) {
  const className = `download-link${secondary ? ' secondary' : ''}${disabled ? ' is-disabled' : ''}`
  if (disabled) {
    return (
      <button
        className={className}
        type="button"
        disabled
        title="Available when the backend is connected"
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
  const [samplePreview, setSamplePreview] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function submitLesson(request: GenerateRequest) {
    setLastRequest(request)
    setSamplePreview(false)
    void startJob(request)
  }

  function retryLesson() {
    if (!lastRequest) return
    setSamplePreview(false)
    void startJob(lastRequest)
  }

  function makeAnotherLesson() {
    reset()
    setLastRequest(null)
    setSamplePreview(false)
    setFormKey((key) => key + 1)
  }

  const shownLesson = lesson ?? (samplePreview ? mockLesson : null)
  const language = shownLesson
    ? LANGUAGES.find((item) => item.code === shownLesson.lesson_plan.language)
    : undefined
  const subtitleAvailable = Boolean(shownLesson?.artifact_manifest.subtitles_url)
  const subtitleDownloadUrl = subtitleAvailable
    ? jobId
      ? subtitlesUrl(jobId)
      : shownLesson?.artifact_manifest.subtitles_url ?? ''
    : ''
  const ready = Boolean(lesson && status?.status === 'ready')
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
            onUseSample={() => setSamplePreview(true)}
            onMakeAnother={makeAnotherLesson}
          />
        </div>
      </section>

      <aside className="preview-panel lesson-preview" aria-label="Lesson preview">
        <div className="preview-topline">
          <span className="preview-dot" aria-hidden="true" />
          <span>{lesson ? 'YOUR LESSON' : shownLesson ? 'LESSON DETAILS' : 'LESSON PREVIEW'}</span>
        </div>
        {lesson && status?.status === 'ready' ? (
          <LessonPlayer lesson={lesson} lessonId={jobId ?? ''} />
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
            {samplePreview && !lesson && (
              <p className="sample-preview-note">Sample lesson preview</p>
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
            >
              <Download size={17} aria-hidden="true" />
              Download MP4
            </DownloadLink>
            <DownloadLink
              href={notesDownloadUrl}
              filename="blu-lesson-notes.json"
              disabled={isMockMode || !notesDownloadUrl}
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
                secondary
              >
                <Languages size={17} aria-hidden="true" />
                Download Captions (SRT)
              </DownloadLink>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
