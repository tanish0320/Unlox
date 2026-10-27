import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioArtifact, LessonResponse } from '../api/types'

export type PlaybackSpeed = 0.75 | 1 | 1.25

export interface UsePlaybackResult {
  currentSceneIndex: number
  playing: boolean
  timeSeconds: number
  speed: PlaybackSpeed
  durationSeconds: number
  isComplete: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  previous: () => void
  replay: () => void
  jumpTo: (index: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
}

function sceneDuration(
  lesson: LessonResponse,
  sceneId: string,
): number {
  return (
    lesson.artifact_manifest.audio.find((audio) => audio.scene_id === sceneId)
      ?.duration_seconds ?? 0
  )
}

function sceneAudio(
  lesson: LessonResponse,
  sceneId: string,
): AudioArtifact | undefined {
  return lesson.artifact_manifest.audio.find(
    (audio) => audio.scene_id === sceneId && audio.audio_url.length > 0,
  )
}

export function usePlayback(lesson: LessonResponse): UsePlaybackResult {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1)
  const [isComplete, setIsComplete] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const delayRef = useRef<number | null>(null)
  const indexRef = useRef(currentSceneIndex)
  const playingRef = useRef(playing)
  const timeRef = useRef(timeSeconds)
  const speedRef = useRef(speed)

  const scene = lesson.lesson_plan.scenes[currentSceneIndex]
  const durationSeconds = scene ? sceneDuration(lesson, scene.id) : 0

  useEffect(() => {
    indexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    timeRef.current = timeSeconds
  }, [timeSeconds])

  useEffect(() => {
    speedRef.current = speed
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  const clearDelay = useCallback(() => {
    if (delayRef.current !== null) {
      window.clearTimeout(delayRef.current)
      delayRef.current = null
    }
  }, [])

  const stopAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audioRef.current = null
  }, [])

  const advance = useCallback(() => {
    clearDelay()
    stopAudio()
    const nextIndex = indexRef.current + 1
    if (nextIndex >= lesson.lesson_plan.scenes.length) {
      setPlaying(false)
      setIsComplete(true)
      return
    }
    indexRef.current = nextIndex
    setCurrentSceneIndex(nextIndex)
    timeRef.current = 0
    setTimeSeconds(0)
  }, [clearDelay, lesson.lesson_plan.scenes.length, stopAudio])

  const play = useCallback(() => {
    const currentScene = lesson.lesson_plan.scenes[indexRef.current]
    if (!currentScene) return
    clearDelay()
    setIsComplete(false)
    setPlaying(true)
  }, [clearDelay, lesson.lesson_plan.scenes])

  const pause = useCallback(() => {
    setPlaying(false)
    clearDelay()
    audioRef.current?.pause()
  }, [clearDelay])

  const toggle = useCallback(() => {
    if (playingRef.current) pause()
    else play()
  }, [pause, play])

  const jumpTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= lesson.lesson_plan.scenes.length) return
      clearDelay()
      stopAudio()
      indexRef.current = index
      setCurrentSceneIndex(index)
      timeRef.current = 0
      setTimeSeconds(0)
      setIsComplete(false)
    },
    [clearDelay, lesson.lesson_plan.scenes.length, stopAudio],
  )

  const next = useCallback(() => {
    if (indexRef.current >= lesson.lesson_plan.scenes.length - 1) {
      pause()
      setIsComplete(true)
      setTimeSeconds(0)
      timeRef.current = 0
      return
    }
    jumpTo(indexRef.current + 1)
  }, [jumpTo, lesson.lesson_plan.scenes.length, pause])

  const previous = useCallback(() => {
    if (timeRef.current > 0.5) {
      jumpTo(indexRef.current)
      return
    }
    jumpTo(Math.max(0, indexRef.current - 1))
  }, [jumpTo])

  const replay = useCallback(() => {
    clearDelay()
    stopAudio()
    indexRef.current = 0
    setCurrentSceneIndex(0)
    timeRef.current = 0
    setTimeSeconds(0)
    setIsComplete(false)
    setPlaying(true)
  }, [clearDelay, stopAudio])

  const setSpeed = useCallback((nextSpeed: PlaybackSpeed) => {
    speedRef.current = nextSpeed
    setSpeedState(nextSpeed)
  }, [])

  useEffect(() => {
    if (!playing) {
      audioRef.current?.pause()
      return
    }

    const currentScene = lesson.lesson_plan.scenes[currentSceneIndex]
    if (!currentScene) return
    const audioArtifact = sceneAudio(lesson, currentScene.id)
    const duration = sceneDuration(lesson, currentScene.id)
    let intervalId = 0
    let sceneEndTimer: number | null = null
    let endedTimer: number | null = null
    let updateAudioTime: (() => void) | null = null

    const moveAfterPause = () => {
      if (!playingRef.current) return
      endedTimer = window.setTimeout(advance, 600)
      delayRef.current = endedTimer
    }

    if (audioArtifact) {
      const audio = new Audio(audioArtifact.audio_url)
      audioRef.current = audio
      audio.playbackRate = speedRef.current
      audio.currentTime = Math.max(0, timeRef.current)
      audio.addEventListener('ended', moveAfterPause)
      updateAudioTime = () => {
        timeRef.current = audio.currentTime
        setTimeSeconds(audio.currentTime)
      }
      audio.addEventListener('timeupdate', updateAudioTime)
      void audio.play().catch(() => {
        setPlaying(false)
      })
    } else {
      let previousTick = performance.now()
      intervalId = window.setInterval(() => {
        const now = performance.now()
        const elapsed = ((now - previousTick) / 1000) * speedRef.current
        previousTick = now
        const nextTime = Math.min(duration, timeRef.current + elapsed)
        timeRef.current = nextTime
        setTimeSeconds(nextTime)
      }, 100)
      const remainingDuration = Math.max(
        0,
        ((duration - timeRef.current) / speedRef.current) * 1000,
      )
      sceneEndTimer = window.setTimeout(() => {
        timeRef.current = duration
        setTimeSeconds(duration)
        moveAfterPause()
      }, remainingDuration)
    }

    return () => {
      window.clearInterval(intervalId)
      if (sceneEndTimer !== null) window.clearTimeout(sceneEndTimer)
      if (endedTimer !== null) window.clearTimeout(endedTimer)
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', moveAfterPause)
        if (updateAudioTime) {
          audioRef.current.removeEventListener('timeupdate', updateAudioTime)
        }
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [advance, currentSceneIndex, lesson, playing])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pause])

  useEffect(
    () => () => {
      clearDelay()
      stopAudio()
    },
    [clearDelay, stopAudio],
  )

  return {
    currentSceneIndex,
    playing,
    timeSeconds,
    speed,
    durationSeconds,
    isComplete,
    play,
    pause,
    toggle,
    next,
    previous,
    replay,
    jumpTo,
    setSpeed,
  }
}
