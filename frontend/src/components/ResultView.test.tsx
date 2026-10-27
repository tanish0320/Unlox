import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockLesson } from '../api/mockData'
import { ResultView } from './ResultView'

describe('ResultView', () => {
  it('switches tabs by click and arrow key', () => {
    render(<ResultView lesson={mockLesson} fallbackUsed={false} />)

    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }))
    expect(screen.getByRole('tabpanel', { name: 'Notes' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Notes' }), {
      key: 'ArrowRight',
    })
    expect(screen.getByRole('tabpanel', { name: 'Details' })).toBeInTheDocument()
  })

  it('shows a clear value when model details are missing', () => {
    const lessonWithoutDetails = {
      ...mockLesson,
      artifact_manifest: {
        ...mockLesson.artifact_manifest,
        timings_by_stage: {},
      },
    }
    render(<ResultView lesson={lessonWithoutDetails} fallbackUsed={false} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))

    expect(screen.getByText('Model names:')).toBeInTheDocument()
    expect(screen.getAllByText('Not provided')).toHaveLength(2)
  })

  it('shows a friendly message when the lesson has no notes', () => {
    render(
      <ResultView
        lesson={{ ...mockLesson, notes: '' }}
        fallbackUsed={false}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }))

    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })
})
