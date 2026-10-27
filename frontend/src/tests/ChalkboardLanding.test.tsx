import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChalkboardLanding } from '../components/ChalkboardLanding'

describe('ChalkboardLanding Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the chalkboard container with accessible region label', () => {
    render(<ChalkboardLanding />)
    const region = screen.getByRole('region', { name: /chalkboard multilingual greeting transition/i })
    expect(region).toBeDefined()
  })

  it('renders the Skip button with accessible hint', () => {
    render(<ChalkboardLanding showSkipButton={true} />)
    const skipBtn = screen.getByRole('button', { name: /skip chalkboard intro/i })
    expect(skipBtn).toBeDefined()
    expect(skipBtn.textContent).toContain('Skip')
  })

  it('triggers onSkip when Skip button is clicked', async () => {
    const onSkipMock = vi.fn()
    render(<ChalkboardLanding onSkip={onSkipMock} />)

    const skipBtn = screen.getByRole('button', { name: /skip chalkboard intro/i })
    fireEvent.click(skipBtn)

    // Component fades out before calling onSkip
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(onSkipMock).toHaveBeenCalledTimes(1)
  })

  it('triggers onSkip when Escape key is pressed', async () => {
    const onSkipMock = vi.fn()
    render(<ChalkboardLanding onSkip={onSkipMock} />)

    fireEvent.keyDown(window, { code: 'Escape' })

    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(onSkipMock).toHaveBeenCalledTimes(1)
  })
})
