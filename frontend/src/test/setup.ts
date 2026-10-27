import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
