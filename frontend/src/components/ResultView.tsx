import { useRef, useState, type KeyboardEvent } from 'react'
import type { LessonResponse } from '../api/types'
import { LANGUAGES } from '../config/languages'
import { OptionalNotesPreview } from './SceneStage'

type ResultTab = 'overview' | 'notes' | 'details'

interface NotesData {
  summary: string
  key_concepts: Array<{ term: string; definition: string }>
  steps: string[]
  key_takeaways: string[]
  revision_questions: Array<{ question: string; answer: string }>
}

interface ResultViewProps {
  lesson: LessonResponse
  fallbackUsed: boolean
}

const tabs: Array<{ id: ResultTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes', label: 'Notes' },
  { id: 'details', label: 'Details' },
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readNotes(notes: string): NotesData {
  let parsed: unknown
  try {
    parsed = JSON.parse(notes)
  } catch {
    return {
      summary: notes,
      key_concepts: [],
      steps: [],
      key_takeaways: [],
      revision_questions: [],
    }
  }

  const data = asRecord(parsed)
  if (!data) {
    return {
      summary: notes,
      key_concepts: [],
      steps: [],
      key_takeaways: [],
      revision_questions: [],
    }
  }

  const concepts = Array.isArray(data.key_concepts) ? data.key_concepts : []
  const questions = Array.isArray(data.revision_questions)
    ? data.revision_questions
    : []
  return {
    summary: typeof data.summary === 'string' ? data.summary : notes,
    key_concepts: concepts.flatMap((item) => {
      const concept = asRecord(item)
      return typeof concept?.term === 'string' &&
        typeof concept.definition === 'string'
        ? [{ term: concept.term, definition: concept.definition }]
        : []
    }),
    steps: stringList(data.steps),
    key_takeaways: stringList(data.key_takeaways),
    revision_questions: questions.flatMap((item) => {
      const question = asRecord(item)
      return typeof question?.question === 'string' &&
        typeof question.answer === 'string'
        ? [{ question: question.question, answer: question.answer }]
        : []
    }),
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function formatDuration(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(wholeSeconds / 60)
  const remaining = wholeSeconds % 60
  return minutes > 0
    ? `${minutes}:${String(remaining).padStart(2, '0')}`
    : `${remaining} sec`
}

function modelNames(lesson: LessonResponse) {
  const manifest = asRecord(lesson.artifact_manifest)
  const notes = asRecord(readJson(lesson.notes))
  const candidates = [manifest, notes]
  for (const record of candidates) {
    if (!record) continue
    for (const key of ['model_names', 'models', 'model_name', 'model']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string') &&
        value.length > 0
      ) {
        return value.join(', ')
      }
      const nested = asRecord(value)
      if (nested) {
        const names = Object.values(nested).filter(
          (item): item is string => typeof item === 'string' && item.length > 0,
        )
        if (names.length > 0) return names.join(', ')
      }
    }
  }
  return 'Not provided'
}

function readJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function BuiltInNotes({ notes }: { notes: string }) {
  const content = readNotes(notes)
  const [revealedQuestions, setRevealedQuestions] = useState<number[]>([])
  if (!notes.trim()) {
    return (
      <div className="result-notes-empty" role="status">
        <h2>No notes yet</h2>
        <p>There are no notes for this lesson yet. You can still review the scenes above.</p>
      </div>
    )
  }

  function toggleAnswer(index: number) {
    setRevealedQuestions((current) =>
      current.includes(index)
        ? current.filter((question) => question !== index)
        : [...current, index],
    )
  }

  return (
    <div className="result-notes-content">
      <section>
        <h3>Summary</h3>
        <p>{content.summary || 'Not provided'}</p>
      </section>
      <section>
        <h3>Key concepts</h3>
        {content.key_concepts.length ? (
          <dl className="result-concepts">
            {content.key_concepts.map(({ term, definition }) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Not provided</p>
        )}
      </section>
      <section>
        <h3>Steps</h3>
        {content.steps.length ? (
          <ol>{content.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
        ) : (
          <p>Not provided</p>
        )}
      </section>
      <section>
        <h3>Key takeaways</h3>
        {content.key_takeaways.length ? (
          <ul>{content.key_takeaways.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : (
          <p>Not provided</p>
        )}
      </section>
      <section>
        <h3>Revision questions</h3>
        {content.revision_questions.length ? (
          <ul className="revision-questions">
            {content.revision_questions.map(({ question, answer }, index) => {
              const isRevealed = revealedQuestions.includes(index)
              return (
                <li key={question}>
                  <button
                    type="button"
                    aria-expanded={isRevealed}
                    onClick={() => toggleAnswer(index)}
                  >
                    {question}
                  </button>
                  {isRevealed && <p>{answer}</p>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p>Not provided</p>
        )}
      </section>
    </div>
  )
}

export function ResultView({ lesson, fallbackUsed }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>('overview')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const plan = lesson.lesson_plan
  const language = LANGUAGES.find((item) => item.code === plan.language)
  const manifest = asRecord(lesson.artifact_manifest)
  const audio = Array.isArray(manifest?.audio) ? manifest.audio : []
  const audioDuration = audio.reduce((total, artifact) => {
    const item = asRecord(artifact)
    return total + (
      typeof item?.duration_seconds === 'number' &&
      Number.isFinite(item.duration_seconds)
        ? item.duration_seconds
        : 0
    )
  }, 0)
  const duration =
    audioDuration ||
    (Number.isFinite(plan.target_duration_seconds)
      ? plan.target_duration_seconds
      : 0)
  const stageTimings = asRecord(manifest?.timings_by_stage) ?? {}
  const timings = Object.entries(stageTimings)
  const tabIndex = tabs.findIndex((tab) => tab.id === activeTab)

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = tabIndex
    if (event.key === 'ArrowRight') nextIndex = (tabIndex + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (tabIndex + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    setActiveTab(tabs[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <section className="result-view" aria-label="Lesson results">
      <div className="result-tabs" role="tablist" aria-label="Lesson result sections">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { tabRefs.current[index] = element }}
            id={`result-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`result-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={onTabKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="result-panel"
        id={`result-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`result-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'overview' && (
          <div className="result-overview">
            <h2>{plan.topic}</h2>
            <div className="result-facts">
              <span>{plan.level === 'beginner' ? 'Beginner' : 'Intermediate'}</span>
              <span lang={plan.language}>{language?.nativeName ?? plan.language}</span>
              <span>{formatDuration(duration)}</span>
              <span>{plan.scenes.length} scenes</span>
            </div>
            <h3>Scene headings</h3>
            <ol>
              {plan.scenes.map((scene) => (
                <li key={scene.id} lang={plan.language}>{scene.heading}</li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === 'notes' && (
          <OptionalNotesPreview notes={lesson.notes}>
            <BuiltInNotes notes={lesson.notes} />
          </OptionalNotesPreview>
        )}

        {activeTab === 'details' && (
          <div className="result-details">
            <h2>Stage timings</h2>
            {timings.length > 0 ? (
              <table>
                <thead><tr><th scope="col">Stage</th><th scope="col">Time</th></tr></thead>
                <tbody>
                  {timings.map(([stage, milliseconds]) => (
                    <tr key={stage}>
                      <th scope="row">{stage}</th>
                      <td>
                        {typeof milliseconds === 'number' &&
                        Number.isFinite(milliseconds)
                          ? `${(milliseconds / 1000).toFixed(1)} sec`
                          : 'Not provided'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Not provided</p>
            )}
            <p className="result-detail-row">
              <strong>Fallback:</strong>{' '}
              <span className={fallbackUsed ? 'result-badge is-fallback' : 'result-badge'}>
                {fallbackUsed ? 'Used' : 'Not used'}
              </span>
            </p>
            <p className="result-detail-row">
              <strong>Model names:</strong> {modelNames(lesson)}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
