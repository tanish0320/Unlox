import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Captions,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import type { LessonResponse } from '../api/types'
import { videoUrl } from '../api/client'
import { LANGUAGES } from '../config/languages'
import { usePlayback, type PlaybackSpeed } from '../hooks/usePlayback'
import {
  OptionalCaptionTrack,
  OptionalNotesPreview,
  SceneStage,
} from './SceneStage'

interface LessonPlayerProps {
  lesson: LessonResponse
  lessonId: string
}

function isSmallScreen() {
  return typeof window !== 'undefined' && window.innerWidth < 640
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  )
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`
}

const playbackSpeeds: PlaybackSpeed[] = [0.75, 1, 1.25]

export function LessonPlayer({ lesson, lessonId }: LessonPlayerProps) {
  const playback = usePlayback(lesson)
  const playerRef = useRef<HTMLDivElement>(null)
  const sceneChipRowRef = useRef<HTMLDivElement>(null)
  const [captionsVisible, setCaptionsVisible] = useState(true)
  const [videoMode, setVideoMode] = useState(
    () => !isMockMode() && isSmallScreen(),
  )
  const [fullScreenMessage, setFullScreenMessage] = useState('')
  const videoAvailable = !isMockMode() && Boolean(lessonId)
  const scenes = lesson.lesson_plan.scenes
  const scene = scenes[playback.currentSceneIndex]
  const language = LANGUAGES.find(
    (item) => item.code === lesson.lesson_plan.language,
  )
  const sceneDurations = scenes.map(
    (item) =>
      lesson.artifact_manifest.audio.find(
        (audio) => audio.scene_id === item.id,
      )?.duration_seconds ?? 0,
  )
  const totalDuration = sceneDurations.reduce((total, seconds) => total + seconds, 0)
  const elapsedBeforeScene = sceneDurations
    .slice(0, playback.currentSceneIndex)
    .reduce((total, seconds) => total + seconds, 0)
  const overallProgress =
    totalDuration > 0
      ? Math.min(
          100,
          ((elapsedBeforeScene + playback.timeSeconds) / totalDuration) * 100,
        )
      : 0

  useEffect(() => {
    const activeChip =
      sceneChipRowRef.current?.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      )
    activeChip?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [playback.currentSceneIndex])

  const toggleFullScreen = useCallback(async () => {
    setFullScreenMessage('')
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (playerRef.current?.requestFullscreen) {
        await playerRef.current.requestFullscreen()
      } else {
        setFullScreenMessage('Fullscreen is not available in this browser.')
      }
    } catch {
      setFullScreenMessage('Fullscreen could not be opened.')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (videoMode || isTypingTarget(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (playback.isComplete) playback.replay()
        else playback.toggle()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        playback.previous()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        playback.next()
      } else if (event.key.toLowerCase() === 'c') {
        setCaptionsVisible((visible) => !visible)
      } else if (event.key.toLowerCase() === 'r') {
        playback.replay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playback, videoMode])

  const captionText = scene?.narration ?? ''

  return (
    <div className="lesson-player" ref={playerRef}>
      <div className="player-mode-switch" role="group" aria-label="Player mode">
        <button
          type="button"
          className={!videoMode ? 'selected' : ''}
          aria-pressed={!videoMode}
          onClick={() => setVideoMode(false)}
        >
          Interactive
        </button>
        <button
          type="button"
          className={videoMode ? 'selected' : ''}
          aria-pressed={videoMode}
          disabled={!videoAvailable}
          title={!videoAvailable ? 'Available when the backend is connected' : undefined}
          onClick={() => setVideoMode(true)}
        >
          MP4 video
        </button>
      </div>

      <div className="player-stage">
        {videoMode && videoAvailable ? (
          <video
            className="lesson-video"
            src={videoUrl(lessonId)}
            controls
            playsInline
            aria-label={`Lesson video: ${lesson.lesson_plan.topic}`}
          />
        ) : scene ? (
          <SceneStage
            scene={scene}
            timeSeconds={playback.timeSeconds}
            durationSeconds={playback.durationSeconds}
          />
        ) : (
          <div className="scene-empty">No scenes are available for this lesson.</div>
        )}
      </div>

      {!videoMode && (
        <>
          <div className="player-caption" aria-live="polite">
            <OptionalCaptionTrack
              text={captionText}
              visible={captionsVisible}
            />
          </div>

          <div className="player-progress">
            <div className="segmented-progress" aria-label="Scene progress">
              {scenes.map((item, index) => {
                const sceneProgress =
                  index < playback.currentSceneIndex
                    ? 100
                    : index === playback.currentSceneIndex &&
                        playback.durationSeconds > 0
                      ? Math.min(
                          100,
                          (playback.timeSeconds / playback.durationSeconds) *
                            100,
                        )
                      : 0
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Go to scene ${index + 1}: ${item.heading}`}
                    aria-current={
                      index === playback.currentSceneIndex ? 'step' : undefined
                    }
                    onClick={() => playback.jumpTo(index)}
                  >
                    <span style={{ width: `${sceneProgress}%` }} />
                  </button>
                )
              })}
            </div>
            <div className="scene-chip-row" ref={sceneChipRowRef}>
              {scenes.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={
                    index === playback.currentSceneIndex ? 'active' : ''
                  }
                  aria-pressed={index === playback.currentSceneIndex}
                  onClick={() => playback.jumpTo(index)}
                >
                  {index + 1}. {item.heading}
                </button>
              ))}
            </div>
          </div>

          <div className="player-controls">
            <div className="player-control-buttons">
              <button
                type="button"
                className="player-icon-button"
                aria-label="Replay lesson from the beginning"
                onClick={playback.replay}
              >
                <RotateCcw size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="player-icon-button"
                aria-label="Previous scene"
                onClick={playback.previous}
                disabled={scenes.length === 0}
              >
                <SkipBack size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="player-icon-button primary"
                aria-label={
                  playback.isComplete
                    ? 'Replay lesson'
                    : playback.playing
                      ? 'Pause lesson'
                      : 'Play lesson'
                }
                onClick={
                  playback.isComplete ? playback.replay : playback.toggle
                }
                disabled={scenes.length === 0}
              >
                {playback.playing ? (
                  <Pause size={20} aria-hidden="true" />
                ) : (
                  <Play size={20} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="player-icon-button"
                aria-label="Next scene"
                onClick={playback.next}
                disabled={scenes.length === 0}
              >
                <SkipForward size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`player-icon-button${captionsVisible ? ' active' : ''}`}
                aria-label={`Turn captions ${captionsVisible ? 'off' : 'on'}`}
                aria-pressed={captionsVisible}
                onClick={() => setCaptionsVisible((visible) => !visible)}
              >
                <Captions size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="player-icon-button"
                aria-label="Open fullscreen"
                onClick={() => void toggleFullScreen()}
              >
                <Maximize size={19} aria-hidden="true" />
              </button>
              <label className="speed-control">
                <span>Speed</span>
                <select
                  aria-label="Playback speed"
                  value={playback.speed}
                  onChange={(event) =>
                    playback.setSpeed(
                      Number(event.target.value) as PlaybackSpeed,
                    )
                  }
                >
                  {playbackSpeeds.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="player-time-info">
              <span>
                Scene {playback.currentSceneIndex + 1} of {scenes.length}
              </span>
              <span className="player-clock">
                {formatTime(elapsedBeforeScene + playback.timeSeconds)} /{' '}
                {formatTime(totalDuration)}
              </span>
              {playback.isComplete && (
                <span className="replay-status">Replay</span>
              )}
              <span
                className="player-language"
                lang={lesson.lesson_plan.language}
              >
                {language?.nativeName ?? lesson.lesson_plan.language}
              </span>
            </div>
            <div
              className="overall-playback-track"
              role="progressbar"
              aria-label="Lesson playback progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(overallProgress)}
            >
              <span style={{ width: `${overallProgress}%` }} />
            </div>
            {fullScreenMessage && (
              <p className="fullscreen-message" role="status">
                {fullScreenMessage}
              </p>
            )}
          </div>
        </>
      )}

      <OptionalNotesPreview notes={lesson.notes} />
    </div>
  )
}

function isMockMode() {
  return import.meta.env.VITE_USE_MOCK === 'true'
}
