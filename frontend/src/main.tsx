import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/young-serif/400.css'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-tamil/400.css'
import '@fontsource/noto-sans-telugu/400.css'
import '@fontsource/noto-sans-kannada/400.css'
import './index.css'
import App from './App'
import { RenderPage } from './render/RenderPage'

// Lightweight pathname routing to support Person 4's /render without third-party router dependency
const isRenderRoute =
  typeof window !== 'undefined' &&
  (window.location.pathname === '/render' ||
    window.location.pathname.startsWith('/render/') ||
    new URLSearchParams(window.location.search).get('mode') === 'render')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRenderRoute ? <RenderPage /> : <App />}
  </StrictMode>,
)
