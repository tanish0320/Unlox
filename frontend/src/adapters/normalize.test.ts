import { describe, expect, it } from 'vitest'
import { normalizeGenerateRequest } from './normalize'

describe('normalizeGenerateRequest', () => {
  const request = {
    topic: 'A lesson topic',
    level: 'beginner',
    target_duration_seconds: 45,
  }

  it('reads target_language when the backend uses that name', () => {
    expect(
      normalizeGenerateRequest({ ...request, target_language: 'hi' }).language,
    ).toBe('hi')
  })

  it('reads language when the backend uses that name', () => {
    expect(
      normalizeGenerateRequest({ ...request, language: 'ta' }).language,
    ).toBe('ta')
  })
})
