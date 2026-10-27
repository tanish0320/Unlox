import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadHome() {
  vi.resetModules()
  const { Home } = await import('./Home')
  return Home
}

function submitTopic() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Topic / Subject' }), {
    target: { value: 'How does a loop work?' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'தமிழ்' }))
  fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }))
}

describe('backend connection errors', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    vi.stubEnv('VITE_API_BASE', '/api')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('shows a clear message when the local backend cannot be reached', async () => {
    const Home = await loadHome()
    render(<Home />)
    submitTopic()

    expect(
      await screen.findByText(
        'Cannot reach the local server. Is the backend running?',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Use sample lesson' }),
    ).toBeInTheDocument()
  })

  it('loads and plays a sample in the selected language after failure', async () => {
    const Home = await loadHome()
    render(<Home />)
    submitTopic()

    await screen.findByText(
      'Cannot reach the local server. Is the backend running?',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Use sample lesson' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Pause lesson' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText('This is the built-in sample lesson, not a new one.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Python loop மூலம் மீண்டும் செய்',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('தமிழ்').length).toBeGreaterThan(0)
  })
})
