import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GenerationForm } from './GenerationForm'

describe('GenerationForm', () => {
  it('shows a friendly message when the topic is empty', () => {
    render(<GenerationForm onSubmit={vi.fn()} disabled={false} />)

    fireEvent.blur(screen.getByRole('textbox', { name: 'Topic / Subject' }))

    expect(screen.getByText('Add a topic to get started.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate lesson' })).toBeDisabled()
  })

  it('submits the topic and selected lesson settings', () => {
    const onSubmit = vi.fn()
    render(<GenerationForm onSubmit={onSubmit} disabled={false} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Topic / Subject' }), {
      target: { value: 'How do fractions work?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }))
    fireEvent.click(screen.getByRole('button', { name: 'தமிழ்' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Lesson length' }), {
      target: { value: '60' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }))

    expect(onSubmit).toHaveBeenCalledWith({
      topic: 'How do fractions work?',
      level: 'intermediate',
      language: 'ta',
      target_duration_seconds: 60,
    })
  })
})
