import React from "react";
import { TitleCardProps } from "./sceneTypes";
import {
  normalizedProgress,
  segmentProgress,
  easeOutCubic,
  easeInOutQuad,
} from "./animationUtils";

export const TitleCard: React.FC<TitleCardProps> = ({
  scene,
  timeSeconds,
  durationSeconds,
  currentTime,
  duration,
  className = "",
}) => {
  // Support both Person 3's timeSeconds/durationSeconds and fallback aliases
  const resolvedTime = Number.isFinite(timeSeconds) ? timeSeconds : (Number.isFinite(currentTime) ? currentTime! : 0);
  const resolvedDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : (Number.isFinite(duration) && duration! > 0 ? duration! : 1);

  const progress = normalizedProgress(resolvedTime, resolvedDuration);

  // Phase calculations (pure mathematical functions)
  // Phase 1 (0.00 - 0.22): Entrance reveal
  const enterProgress = segmentProgress(progress, 0.0, 0.22);
  const enterEased = easeOutCubic(enterProgress);

  // Phase 2 (0.22 - 0.80): Stable inspection with subtle deterministic breath
  const stableProgress = segmentProgress(progress, 0.22, 0.8);
  const breath = Math.sin(stableProgress * Math.PI * 2) * 0.02;

  // Phase 3 (0.80 - 1.00): Gentle finish/settle
  const exitProgress = segmentProgress(progress, 0.8, 1.0);
  const exitEased = easeInOutQuad(exitProgress);

  // Derived styling values
  const opacity = enterProgress >= 1 ? 1 - exitEased * 0.15 : enterEased;
  const translateY = (1 - enterEased) * 28 - exitEased * 6;
  const scale = 0.96 + enterEased * 0.04 + (enterProgress >= 1 ? breath : 0);

  // Subtitle staggered reveal
  const subtitleProgress = segmentProgress(progress, 0.08, 0.28);
  const subtitleEased = easeOutCubic(subtitleProgress);
  const subtitleOpacity = subtitleProgress >= 1 ? 1 - exitEased * 0.15 : subtitleEased;
  const subtitleTranslateY = (1 - subtitleEased) * 18;

  // Orbit ring rotations and scale (purely deterministic)
  const orbitRotation = progress * 72;
  const ringScale = 0.85 + enterEased * 0.15 + breath * 1.5;

  return (
    <div
      className={`blu-title-card ${className}`}
      data-testid="blu-title-card"
      data-scene-id={scene.id}
    >
      {/* Deterministic SVG Background Graphics */}
      <svg
        className="blu-title-graphics"
        viewBox="0 0 1280 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id="titleGlow"
            cx="640"
            cy="360"
            r="450"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.16 * opacity} />
            <stop offset="60%" stopColor="#A78BFA" stopOpacity={0.06 * opacity} />
            <stop offset="100%" stopColor="#0B1020" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4 * opacity} />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.1 * opacity} />
          </linearGradient>
        </defs>

        {/* Central Ambient Glow */}
        <circle cx="640" cy="360" r="450" fill="url(#titleGlow)" />

        {/* Orbital Geometric Rings */}
        <g
          transform={`translate(640, 360) rotate(${orbitRotation}) scale(${ringScale}) translate(-640, -360)`}
        >
          <circle
            cx="640"
            cy="360"
            r="280"
            stroke="url(#orbitGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <circle
            cx="640"
            cy="360"
            r="360"
            stroke="rgba(56, 189, 248, 0.12)"
            strokeWidth="1"
            strokeDasharray="12 16"
          />
          {/* Orbital nodes */}
          <circle
            cx="920"
            cy="360"
            r="5"
            fill="#38BDF8"
            opacity={0.8 * opacity}
          />
          <circle
            cx="360"
            cy="360"
            r="4"
            fill="#A78BFA"
            opacity={0.7 * opacity}
          />
          <circle
            cx="640"
            cy="80"
            r="4.5"
            fill="#34D399"
            opacity={0.6 * opacity}
          />
        </g>
      </svg>

      {/* Main Content */}
      <div
        className="blu-title-content"
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        {scene.tag || scene.topic ? (
          <div className="blu-title-tag">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{scene.tag || scene.topic}</span>
          </div>
        ) : (
          <div className="blu-title-tag">
            <span>Blu Visual Lesson</span>
          </div>
        )}

        <h1 className="blu-title-heading" data-testid="title-heading">
          {scene.heading}
        </h1>

        {scene.subtitle && (
          <p
            className="blu-title-subtitle"
            data-testid="title-subtitle"
            style={{
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTranslateY}px)`,
            }}
          >
            {scene.subtitle}
          </p>
        )}

        <div
          className="blu-title-divider"
          style={{
            transform: `scaleX(${enterEased})`,
            opacity,
          }}
        />
      </div>
    </div>
  );
};
