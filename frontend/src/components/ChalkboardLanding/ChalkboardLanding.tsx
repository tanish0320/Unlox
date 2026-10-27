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

  const onSkipRef = useRef(onSkip)
  onSkipRef.current = onSkip

  const handleSkip = useCallback(() => {
    if (isFadingOut) return
    setIsFadingOut(true)
    setTimeout(() => {
      if (onSkipRef.current) {
        onSkipRef.current()
      }
    }, 380)
  }, [isFadingOut])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Ensure container is empty before mounting engine
    container.innerHTML = ''

    const engine = new ChalkboardEngine(container)
    engineRef.current = engine

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyS' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleSkip()
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
      container.innerHTML = ''
    }
  }, [handleSkip])

  const handleTapToSkip = () => {
    handleSkip()
  }

  return (
    <div
      className={`chalkboard-landing-root ${isFadingOut ? 'fading-out' : ''} ${className}`}
      onClick={handleTapToSkip}
      onTouchEnd={handleTapToSkip}
      role="region"
      aria-label="Chalkboard multilingual greeting transition - tap anywhere to skip"
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
