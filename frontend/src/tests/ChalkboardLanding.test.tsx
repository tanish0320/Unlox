import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChalkboardLanding } from '../components/ChalkboardLanding'

describe('ChalkboardLanding Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the plain chalkboard container with accessible region label', () => {
    render(<ChalkboardLanding />)
    const region = screen.getByRole('region', { name: /chalkboard multilingual greeting transition/i })
    expect(region).toBeDefined()
  })

  it('does not render any visible skip button', () => {
    render(<ChalkboardLanding />)
    const skipBtn = screen.queryByRole('button', { name: /skip/i })
    expect(skipBtn).toBeNull()
  })

  it('triggers onSkip when tapping / clicking anywhere on the chalkboard', async () => {
    const onSkipMock = vi.fn()
    render(<ChalkboardLanding onSkip={onSkipMock} />)

    const region = screen.getByRole('region', { name: /chalkboard multilingual greeting transition/i })
    fireEvent.click(region)

    // Component fades out before calling onSkip
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(onSkipMock).toHaveBeenCalledTimes(1)
  })

  it('triggers onSkip when pressing Escape key', async () => {
    const onSkipMock = vi.fn()
    render(<ChalkboardLanding onSkip={onSkipMock} />)

    fireEvent.keyDown(window, { code: 'Escape' })

    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(onSkipMock).toHaveBeenCalledTimes(1)
  })

  it('triggers onSkip when pressing Space key', async () => {
    const onSkipMock = vi.fn()
    render(<ChalkboardLanding onSkip={onSkipMock} />)

    fireEvent.keyDown(window, { code: 'Space' })

    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(onSkipMock).toHaveBeenCalledTimes(1)
  })
})
