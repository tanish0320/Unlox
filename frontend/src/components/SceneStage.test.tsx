import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Scene } from '../api/types'
import { SceneStage } from './SceneStage'

describe('SceneStage', () => {
  it('shows the safe placeholder for an unknown scene type', () => {
    const scene = {
      id: 'unknown',
      type: 'future_scene',
      heading: 'A new kind of scene',
      narration: 'This narration appears in the caption, not the scene.',
    } as unknown as Scene

    render(
      <SceneStage scene={scene} timeSeconds={2} durationSeconds={8} />,
    )

    expect(screen.getByText('Lesson scene')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A new kind of scene' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Scene time' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
    expect(
      screen.queryByText('This narration appears in the caption, not the scene.'),
    ).not.toBeInTheDocument()
  })
})
