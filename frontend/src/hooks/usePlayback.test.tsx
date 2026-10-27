import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockLesson } from '../api/mockData'
import { usePlayback } from './usePlayback'

describe('usePlayback', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses manifest duration and waits 0.6 seconds before advancing', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => usePlayback(mockLesson))
    act(() => result.current.play())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_599)
    })
    expect(result.current.currentSceneIndex).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.currentSceneIndex).toBe(1)
    unmount()
  })

  it('supports next, previous, replay and jumping to a scene', () => {
    const { result } = renderHook(() => usePlayback(mockLesson))

    act(() => result.current.next())
    expect(result.current.currentSceneIndex).toBe(1)

    act(() => result.current.previous())
    expect(result.current.currentSceneIndex).toBe(0)

    act(() => result.current.jumpTo(2))
    expect(result.current.currentSceneIndex).toBe(2)

    act(() => result.current.replay())
    expect(result.current.currentSceneIndex).toBe(0)
    expect(result.current.playing).toBe(true)
  })

  it('stops and offers replay when the final scene ends', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => usePlayback(mockLesson))

    act(() => result.current.jumpTo(2))
    act(() => result.current.play())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_600)
    })

    expect(result.current.currentSceneIndex).toBe(2)
    expect(result.current.playing).toBe(false)
    expect(result.current.isComplete).toBe(true)
    unmount()
  })
})
