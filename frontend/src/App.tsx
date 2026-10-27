import { useEffect, useState } from 'react'
import { BookOpen, Home, Moon, Sun, WifiOff, Sparkles } from 'lucide-react'
import { BRAND_NAME, BRAND_TAGLINE } from './config/brand'
import { LanguageCheck } from './components/LanguageCheck'
import { Home as HomePage } from './pages/Home'
import { ChalkboardLanding } from './components/ChalkboardLanding'
import './App.css'

function getSavedTextSize() {
  try {
    return window.localStorage.getItem('blu-text-size') === 'large'
  } catch {
    return false
  }
}

function HeaderIllustration() {
  return (
    <svg
      className="header-landscape"
      viewBox="0 0 430 74"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="386" cy="21" r="10" />
      <path d="M5 61 48 26l41 35 38-27 53 27 47-37 53 37 38-24 50 24 31-20 27 20" />
      <path d="M13 67h402" />
      <path d="M100 61V45h26v16M96 45l17-14 17 14M107 48v8m8-8v8m7-8v8" />
      <path d="M67 62V48m-8 4 8-11 8 11m-13 3 5-7 6 7m88 7V45m-9 7 9-14 9 14m-14 3 5-8 5 8m134 5V48m-8 4 8-12 8 12m-13 3 5-7 5 7" />
      <path d="M187 62V50m-6 7h12m-9-5h6m-9 10 5-7m8 7-5-7" />
    </svg>
  )
}

function ReaderIllustration() {
  return (
    <svg
      className="reader-art"
      viewBox="0 0 220 166"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M23 145h174" stroke="var(--color-line-art)" strokeWidth="2" />
      <path d="M45 145v-14h54v14M53 131v-13h46v13" fill="var(--color-book)" />
      <path d="M45 145h54v-14H45zM53 131h46v-13H53z" stroke="var(--color-line-art)" strokeWidth="2" />
      <path d="M58 123h35M50 138h43" stroke="var(--color-book-line)" strokeWidth="2" strokeLinecap="round" />
      <path d="M128 145v-16h49v16M133 129v-13h40v13" fill="var(--color-sage)" />
      <path d="M128 145h49v-16h-49zM133 129h40v-13h-40z" stroke="var(--color-line-art)" strokeWidth="2" />
      <path d="M139 122h19m-24 12h26" stroke="var(--color-line-art)" strokeWidth="2" strokeLinecap="round" />
      <path d="M107 85c0-16 12-27 27-27s27 11 27 27v25h-54V85Z" fill="var(--color-skin)" />
      <path d="M107 83c1-21 12-33 29-33 15 0 25 10 27 28-8-7-13-12-17-20-9 12-22 20-39 25Z" fill="var(--color-hair)" />
      <path d="M113 82c4 2 7 2 10 0m18 0c3 2 6 2 9 0" stroke="var(--color-line-art)" strokeWidth="2" strokeLinecap="round" />
      <path d="M124 92h15" stroke="var(--color-line-art)" strokeWidth="2" strokeLinecap="round" />
      <path d="M103 106c-10 2-17 10-19 20l22 5 11-16m21-9c11 1 19 9 23 19l-23 7-12-17" fill="var(--color-shirt)" />
      <path d="m105 111 24 20 24-19v24H105v-25Z" fill="var(--color-surface)" stroke="var(--color-line-art)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M129 131v5m-15-13 10 3m20-3-10 3" stroke="var(--color-book-line)" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 119c-2-12 2-22 10-29m-8 13c-7-1-11-6-12-12 8 0 13 4 15 11m-4-7c4-8 10-11 17-11-2 8-7 13-15 14" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M188 119c0-13 5-23 13-31m-7 15c-7-2-10-7-10-13 7 1 12 5 13 12m-3-8c5-7 11-10 17-9-2 8-8 12-16 12" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 119h-9m170 0h-9" stroke="var(--color-line-art)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function App() {
  const showLanguageCheck =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('langtest') === '1'
  const [isDark, setIsDark] = useState(false)
  const [largeText, setLargeText] = useState(getSavedTextSize)
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    if (params.get('langtest') === '1') return false
    return true
  })

  useEffect(() => {
    const root = document.documentElement
    if (largeText) root.dataset.textSize = 'large'
    else delete root.dataset.textSize

    try {
      window.localStorage.setItem('blu-text-size', largeText ? 'large' : 'normal')
    } catch {
      // The size control still works for this visit if storage is unavailable.
    }
  }, [largeText])

  return (
    <>
      {showIntro && (
        <ChalkboardLanding
          onSkip={() => setShowIntro(false)}
        />
      )}
      <div className={`app-shell${isDark ? ' theme-dark' : ''}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 44 44" fill="none">
                <path d="M7 12c6-2 11 0 15 4 4-4 9-6 15-4v19c-6-2-11 0-15 4-4-4-9-6-15-4V12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M22 16v19m-1-8c-5-1-8-4-9-9 5 0 8 3 9 9Zm2-5c1-5 4-8 9-9-1 5-4 8-9 9Zm-2-2c-2-4-1-7 2-10 3 3 4 6 2 10" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brand-name">{BRAND_NAME}</span>
          </div>
          <p className="brand-tagline">{BRAND_TAGLINE}</p>
        </div>

        <div className="header-art-block" aria-hidden="true">
          <HeaderIllustration />
          <span className="hand-note">Better learning for every child</span>
        </div>

        <div className="topbar-actions">
          <span className="offline-pill">
            <WifiOff size={16} aria-hidden="true" />
            Works offline after setup
          </span>
          {import.meta.env.VITE_USE_MOCK === 'true' && (
            <span className="mock-data-badge">Mock data</span>
          )}
          <button
            className="header-button"
            type="button"
            aria-label="View chalkboard landing intro"
            title="Watch Chalkboard Intro"
            onClick={() => setShowIntro(true)}
          >
            <Sparkles size={19} aria-hidden="true" />
          </button>
          <button
            className="header-button"
            type="button"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            aria-pressed={isDark}
            onClick={() => setIsDark((current) => !current)}
          >
            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
          <button
            className="header-button text-size-button"
            type="button"
            aria-label={`Use ${largeText ? 'normal' : 'large'} text`}
            aria-pressed={largeText}
            onClick={() => setLargeText((current) => !current)}
          >
            {largeText ? 'A+' : 'A'}
          </button>
        </div>
      </header>

      <div className="app-layout">
        {!showLanguageCheck && (
          <aside className="sidebar" aria-label="Main navigation">
            <nav className="side-nav">
              <a className="nav-item" href="#home">
                <Home size={19} aria-hidden="true" />
                <span>Home</span>
              </a>
              <a
                className="nav-item active"
                href="#create-lesson"
                aria-current="page"
              >
                <BookOpen size={19} aria-hidden="true" />
                <span>Create a Lesson</span>
              </a>
            </nav>
            <div className="sidebar-footer">
              <ReaderIllustration />
              <p className="hand-note">Small steps create big changes</p>
            </div>
          </aside>
        )}
        {showLanguageCheck ? <LanguageCheck /> : <HomePage />}
      </div>
    </div>
    </>
  )
}

export default App
