/**
 * Fullscreen Plain Chalkboard Landing Animation Component
 * Vernacular Visual Teacher - Fast Multilingual Greetings with Chalk Powder Transitions
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ChalkboardEngine } from './chalkEngine'
import './ChalkboardLanding.css'

export interface ChalkboardLandingProps {
  onSkip?: () => void
  onLanguageChange?: (lang: string) => void
  className?: string
  showSkipButton?: boolean
}

export const ChalkboardLanding: React.FC<ChalkboardLandingProps> = ({
  onSkip,
  className = '',
  showSkipButton = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ChalkboardEngine | null>(null)
  const [isFadingOut, setIsFadingOut] = useState(false)

  const handleSkip = useCallback(() => {
    if (isFadingOut) return
    setIsFadingOut(true)
    setTimeout(() => {
      if (onSkip) {
        onSkip()
      }
    }, 380)
  }, [isFadingOut, onSkip])

  useEffect(() => {
    if (!containerRef.current) return

    const engine = new ChalkboardEngine(containerRef.current)
    engineRef.current = engine

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyS') {
        e.preventDefault()
        handleSkip()
      } else if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
        e.preventDefault()
        if (engineRef.current) {
          engineRef.current.disintegrateIntoPowder()
        }
      } else if (e.code === 'KeyM') {
        if (engineRef.current) {
          engineRef.current.audio.toggleSound()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
    }
  }, [handleSkip])

  const handleBoardClick = () => {
    if (isFadingOut) return
    if (engineRef.current) {
      if (engineRef.current.state === 'HOLDING' || engineRef.current.state === 'WRITING') {
        engineRef.current.disintegrateIntoPowder()
      }
    }
  }

  return (
    <div
      className={`chalkboard-landing-root ${isFadingOut ? 'fading-out' : ''} ${className}`}
      onClick={handleBoardClick}
      role="region"
      aria-label="Chalkboard multilingual greeting transition"
    >
      <div className="chalkboard-frame">
        {/* Brass Screws */}
        <div className="chalkboard-screw top-left" />
        <div className="chalkboard-screw top-right" />
        <div className="chalkboard-screw bottom-left" />
        <div className="chalkboard-screw bottom-right" />

        {/* Greenboard Slate */}
        <div className="chalkboard-slate">
          {/* Ambient Spotlight */}
          <div className="chalkboard-spotlight" />

          {/* Canvas Engine Container */}
          <div ref={containerRef} className="chalkboard-canvas-holder" />

          {/* Skip Button Option */}
          {showSkipButton && (
            <button
              type="button"
              className="chalkboard-skip-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleSkip()
              }}
              aria-label="Skip chalkboard intro"
              title="Skip intro and open Blu Visual Teacher"
            >
              <span>Skip</span>
              <span className="chalkboard-skip-hint">[Esc]</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}

          {/* Bottom Wooden Chalk Tray */}
          <div className="chalkboard-tray" aria-hidden="true">
            <div className="tray-chalk-row">
              <div className="tray-chalk-piece white" />
              <div className="tray-chalk-piece yellow" />
              <div className="tray-chalk-piece cyan" />
              <div className="tray-chalk-piece pink" />
            </div>
            <div className="tray-duster-block" />
          </div>
        </div>
      </div>
    </div>
  )
}
