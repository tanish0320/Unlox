/**
 * Project Landing Page & Chalkboard Showcase
 * Markets Blu Visual Teacher: offline-first visual lessons, speech, study notes, and simulations.
 */

import React from "react";
import "./ProjectLandingPage.css";

interface ProjectLandingPageProps {
  onEnterAcademy: () => void;
  onCreateLesson: () => void;
  onReplayIntroAnimation: () => void;
}

export const ProjectLandingPage: React.FC<ProjectLandingPageProps> = ({
  onEnterAcademy,
  onCreateLesson,
  onReplayIntroAnimation,
}) => {
  return (
    <div className="bvt-landing-page" data-testid="bvt-landing-page">
      {/* Top Banner Navigation */}
      <nav className="bvt-landing-nav">
        <div className="bvt-landing-brand">
          <span className="bvt-landing-chalk-title">Blu Visual Teacher</span>
          <span className="bvt-landing-tag">100% Offline Local AI</span>
        </div>
        <div className="bvt-landing-nav-actions">
          <button
            type="button"
            className="bvt-landing-nav-btn secondary"
            onClick={onReplayIntroAnimation}
            title="Replay Chalk Drawing Intro"
          >
            ✨ Chalk Intro
          </button>
          <button
            type="button"
            className="bvt-landing-nav-btn"
            onClick={onCreateLesson}
          >
            Studio
          </button>
          <button
            type="button"
            className="bvt-landing-nav-btn primary"
            onClick={onEnterAcademy}
          >
            Enter Academy ➜
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bvt-landing-hero">
        <div className="bvt-landing-hero-content">
          <div className="bvt-landing-badge">
            🎒 Vernacular Visual Education
          </div>
          <h1 className="bvt-landing-heading">
            Better learning for every child — <span className="highlight">even without reliable internet</span>.
          </h1>
          <p className="bvt-landing-subtext">
            Create animated educational video lessons with natural neural speech in English, Hindi, Tamil, Telugu, and Kannada, synchronized subtitles, structured study notes, and interactive simulations — running completely locally on your laptop.
          </p>
          <div className="bvt-landing-hero-actions">
            <button
              type="button"
              className="bvt-landing-cta-primary"
              onClick={onEnterAcademy}
            >
              🎮 Enter Blu Academy
            </button>
            <button
              type="button"
              className="bvt-landing-cta-secondary"
              onClick={onCreateLesson}
            >
              ✏️ Create a Lesson
            </button>
          </div>
        </div>

        {/* Hero Chalkboard Mock Preview */}
        <div className="bvt-landing-hero-board">
          <div className="bvt-landing-board-frame">
            <div className="bvt-landing-board-canvas">
              <div className="bvt-chalk-text-lg">How do fractions work?</div>
              <div className="bvt-chalk-diagram">
                <div className="bvt-fraction-bar-preview">
                  <div className="bvt-frac-filled" />
                  <div className="bvt-frac-empty" />
                </div>
                <div className="bvt-chalk-text-md">1/2 = one of two equal parts</div>
              </div>
              <div className="bvt-chalk-caption-preview">
                भिन्न किसी पूरे के बराबर भागों को दर्शाती है।
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="bvt-landing-features">
        <div className="bvt-landing-section-header">
          <h2>Everything Needed for Deep Conceptual Learning</h2>
          <p>Carefully engineered tools for rural classrooms, low-connectivity schools, and independent teachers.</p>
        </div>

        <div className="bvt-landing-grid">
          <div className="bvt-landing-card">
            <div className="bvt-card-icon">🧠</div>
            <h3>Local Lesson Planning</h3>
            <p>
              AI-assisted structured planning using local Ollama models or deterministic pedagogy templates. Breaks topics into sequential, concept-reinforcing scenes.
            </p>
          </div>

          <div className="bvt-landing-card">
            <div className="bvt-card-icon">🎬</div>
            <h3>Animated Scenes & Modular Parts</h3>
            <p>
              Hierarchy of Lessons &rarr; Parts &rarr; Scenes. Visual flowcharts, algorithm walkthroughs, and title cards rendered smoothly at 1280x720.
            </p>
          </div>

          <div className="bvt-landing-card">
            <div className="bvt-card-icon">🗣️</div>
            <h3>Offline Multilingual Neural Speech</h3>
            <p>
              Genuine CPU neural voices using Piper ONNX for Hindi, Tamil, Telugu, and Kannada, plus Kokoro ONNX and native Windows SAPI5 for English.
            </p>
          </div>

          <div className="bvt-landing-card">
            <div className="bvt-card-icon">📥</div>
            <h3>Exportable Learning Bundles</h3>
            <p>
              Export standard MP4 video lessons with burned-in subtitles, SubRip (.srt) caption files, and print-ready PDF & JSON study notes with Unicode Indic support.
            </p>
          </div>

          <div className="bvt-landing-card">
            <div className="bvt-card-icon">🔬</div>
            <h3>Interactive What-if Lab</h3>
            <p>
              Zero-latency client-side simulations for dynamic Fractions, Euclidean Triangle Geometry (180&deg; proof), and Newton's Second Law ($F = m \cdot a$).
            </p>
          </div>

          <div className="bvt-landing-card">
            <div className="bvt-card-icon">🏫</div>
            <h3>Blu Academy RPG School</h3>
            <p>
              2D pixel-art gamified school environment. Walk through halls, talk to professor mentors in CS, Maths, Physics, Chemistry, Biology, and Social Studies, and earn subject badges.
            </p>
          </div>
        </div>
      </section>

      {/* Simple 3-Step How It Works */}
      <section className="bvt-landing-steps">
        <div className="bvt-landing-section-header">
          <h2>How It Works in 3 Simple Steps</h2>
        </div>
        <div className="bvt-steps-container">
          <div className="bvt-step-card">
            <div className="bvt-step-num">01</div>
            <h4>Choose Topic & Language</h4>
            <p>Enter any topic, select grade level (Beginner or Intermediate), pick language, and configure duration (30s to 4 min).</p>
          </div>
          <div className="bvt-step-card">
            <div className="bvt-step-num">02</div>
            <h4>Synthesize & Edit Scenes</h4>
            <p>The local pipeline plans the lesson, synthesizes audio, and produces synchronized visual scenes. Customize narration or diagrams in the Scene Editor.</p>
          </div>
          <div className="bvt-step-card">
            <div className="bvt-step-num">03</div>
            <h4>Export & Teach Anywhere</h4>
            <p>Save offline MP4s to a USB drive or local server, print study notes, and share with students without requiring internet access.</p>
          </div>
        </div>
      </section>

      {/* Offline-First Value Proposition */}
      <section className="bvt-landing-offline-banner">
        <div className="bvt-offline-banner-box">
          <div className="bvt-offline-icon">⚡</div>
          <div className="bvt-offline-body">
            <h3>Verified Offline Architecture</h3>
            <p>
              Once voice models and dependencies are present, speech synthesis, scene rendering, video multiplexing, study notes PDF generation, and simulations run entirely on your local CPU. No cloud API keys or recurring internet connectivity required.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <footer className="bvt-landing-footer">
        <h2>Start Teaching with Blu Visual Teacher</h2>
        <p>Explore the pixel school or build your custom offline video lesson right now.</p>
        <div className="bvt-landing-hero-actions">
          <button
            type="button"
            className="bvt-landing-cta-primary"
            onClick={onEnterAcademy}
          >
            Enter Blu Academy (RPG)
          </button>
          <button
            type="button"
            className="bvt-landing-cta-secondary"
            onClick={onCreateLesson}
          >
            Open Lesson Studio
          </button>
        </div>
      </footer>
    </div>
  );
};
