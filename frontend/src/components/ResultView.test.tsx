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
    render(<ResultView lesson={mockLesson} fallbackUsed={false} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))

    expect(screen.getByText('Model names:')).toBeInTheDocument()
    expect(screen.getByText('Not provided')).toBeInTheDocument()
  })
})
