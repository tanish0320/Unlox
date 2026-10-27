import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { BookOpen, Check, LoaderCircle, Sparkles, X } from 'lucide-react'
import { LANGUAGES } from '../config/languages'
import type { GenerateRequest, LessonLevel } from '../api/types'

interface GenerationFormProps {
  onSubmit: (request: GenerateRequest) => void
  disabled: boolean
}

const topicExamples: Record<string, string[]> = {
  Coding: [
    'How does a Python loop work?',
    'What is a variable in coding?',
    'How does a web page load?',
    'What is an if statement?',
  ],
  Maths: [
    'How do fractions work?',
    'What is the area of a triangle?',
    'How do negative numbers work?',
    'What is a prime number?',
  ],
  Science: [
    'How do plants make their food?',
    'Why does the Moon change shape?',
    'How does the water cycle work?',
    'What makes a rainbow?',
  ],
  'Social Studies': [
    'How did people travel long ago?',
    'What makes a community?',
    'How does a map help us?',
    'Why do we have seasons?',
  ],
}

const subjects = Object.keys(topicExamples)
const durations = [30, 45, 60, 90]

interface SavedChoices {
  level: LessonLevel
  language: string
  duration: number
}

function getSavedChoices(): SavedChoices {
  const defaults: SavedChoices = {
    level: 'beginner',
    language: 'en',
    duration: 45,
  }
  try {
    const saved = window.localStorage.getItem('blu-generation-settings')
    if (!saved) return defaults
    const parsed: unknown = JSON.parse(saved)
    if (typeof parsed !== 'object' || parsed === null) return defaults
    const values = parsed as Record<string, unknown>
    return {
      level:
        values.level === 'intermediate' || values.level === 'beginner'
          ? values.level
          : defaults.level,
      language:
        typeof values.language === 'string' &&
        LANGUAGES.some((language) => language.code === values.language)
          ? values.language
          : defaults.language,
      duration:
        typeof values.duration === 'number' &&
        durations.includes(values.duration)
          ? values.duration
          : defaults.duration,
    }
  } catch {
    return defaults
  }
}

export function GenerationForm({ onSubmit, disabled }: GenerationFormProps) {
  const [topic, setTopic] = useState('')
  const [savedChoices] = useState(getSavedChoices)
  const [level, setLevel] = useState<LessonLevel>(savedChoices.level)
  const [language, setLanguage] = useState(savedChoices.language)
  const [duration, setDuration] = useState(savedChoices.duration)
  const [subject, setSubject] = useState(subjects[0])
  const [touched, setTouched] = useState(false)

  const trimmedTopic = topic.trim()
  const topicError =
    trimmedTopic.length === 0
      ? 'Add a topic to get started.'
      : trimmedTopic.length < 3
        ? 'Please enter at least 3 characters.'
        : trimmedTopic.length > 200
          ? 'Please keep your topic under 200 characters.'
          : ''
  const canSubmit = topicError.length === 0 && !disabled

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'blu-generation-settings',
        JSON.stringify({ level, language, duration }),
      )
    } catch {
      // These settings still work for this visit if storage is unavailable.
    }
  }, [duration, language, level])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    onSubmit({
      topic: trimmedTopic,
      level,
      language,
      target_duration_seconds: duration,
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.currentTarget.requestSubmit()
    }
  }

  return (
    <form
      className="generation-form"
      onSubmit={submit}
      onKeyDown={handleKeyDown}
      aria-labelledby="form-title"
    >
      <div className="topic-field">
        <div className="field-title-row">
          <label htmlFor="lesson-topic">Topic / Subject</label>
          <span className="field-hint">3–200 characters</span>
        </div>
        <div className={`topic-input-wrap${touched && topicError ? ' has-error' : ''}`}>
          <BookOpen className="topic-input-icon" size={20} aria-hidden="true" />
          <textarea
            id="lesson-topic"
            name="topic"
            rows={3}
            maxLength={200}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="What would you like to learn about?"
            aria-invalid={touched && Boolean(topicError)}
            aria-describedby="topic-help topic-counter"
          />
          {topic.length > 0 && (
            <button
              className="clear-topic"
              type="button"
              onClick={() => {
                setTopic('')
                setTouched(false)
              }}
              aria-label="Clear topic"
              title="Clear topic"
            >
              <X size={15} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
        <div className="topic-meta">
          <p id="topic-help" className={touched && topicError ? 'field-error' : 'field-help'}>
            {touched && topicError ? topicError : 'Choose an idea below or write your own.'}
          </p>
          <span id="topic-counter" className="character-count" aria-live="polite">
            {topic.length}/200
          </span>
        </div>
      </div>

      <fieldset className="subject-picker">
        <legend>Quick ideas</legend>
        <div className="subject-tabs" role="group" aria-label="Choose a subject">
          {subjects.map((item) => (
            <button
              key={item}
              className={`subject-tab${subject === item ? ' selected' : ''}`}
              type="button"
              aria-pressed={subject === item}
              onClick={() => setSubject(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="example-topics">
          {topicExamples[subject].map((example) => (
            <button
              className="example-topic"
              key={example}
              type="button"
              onClick={() => {
                setTopic(example)
                setTouched(false)
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="setting-field">
        <legend>Level</legend>
        <div className="level-segment" role="group" aria-label="Choose lesson level">
          {(['beginner', 'intermediate'] as const).map((value) => (
            <button
              key={value}
              className={level === value ? 'selected' : ''}
              type="button"
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
            >
              {value === 'beginner' ? 'Beginner' : 'Intermediate'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="setting-field">
        <legend>Language</legend>
        <div className="language-pills">
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              className={`language-pill${language === item.code ? ' selected' : ''}`}
              type="button"
              aria-pressed={language === item.code}
              onClick={() => setLanguage(item.code)}
            >
              <span lang={item.code}>{item.nativeName}</span>
              {language === item.code && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="duration-field">
        <label htmlFor="lesson-duration">Lesson length</label>
        <select
          id="lesson-duration"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          {durations.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} seconds
            </option>
          ))}
        </select>
      </div>

      <button className="generate-button" type="submit" disabled={!canSubmit}>
        {disabled ? (
          <LoaderCircle className="loading-icon" size={19} aria-hidden="true" />
        ) : (
          <Sparkles size={19} aria-hidden="true" />
        )}
        {disabled ? 'Creating lesson…' : 'Generate lesson'}
      </button>
      <p className="keyboard-hint">Tip: press Ctrl + Enter to create your lesson.</p>
    </form>
  )
}
