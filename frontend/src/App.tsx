import React, { useState, useEffect, useRef } from "react";
import { SceneRenderer } from "./components/scenes/SceneRenderer";
import { CaptionTrack, getActiveCaption } from "./components/CaptionTrack";
import { NotesPreview } from "./components/NotesPreview";
import {
  LessonPlan,
  AudioManifest,
  LessonNotes,
  LessonLevel,
} from "./components/scenes/sceneTypes";
import "./styles/appDesign.css";
import "./styles/fonts.css";
import "./styles/sceneTokens.css";
import { BluAcademyView, GameLaunchPayload } from "./game";

// Quick idea presets by category matching the PRD and UI screenshots
const QUICK_IDEAS = {
  Coding: [
    "How does a Python loop work?",
    "What is a variable in coding?",
    "How does a web page load?",
    "What is an if statement?",
  ],
  Maths: [
    "What is the Pythagorean theorem?",
    "How do fractions work?",
    "Understanding prime numbers",
    "What is probability?",
  ],
  Science: [
    "How do plants use photosynthesis?",
    "Why is the sky blue?",
    "What are atoms and molecules?",
    "How does gravity work on Earth?",
  ],
  "Social Studies": [
    "How do trade routes work?",
    "What is democracy in simple terms?",
    "How maps and compasses work",
    "Understanding human settlements",
  ],
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export const App: React.FC = () => {
  // Form State
  const [topic, setTopic] = useState("How does a Python loop work?");
  const [activeCategory, setActiveCategory] = useState<keyof typeof QUICK_IDEAS>("Coding");
  const [level, setLevel] = useState<LessonLevel>("beginner");
  const [language, setLanguage] = useState("en");
  const [duration, setDuration] = useState(45);
  const [useMockData, setUseMockData] = useState(false);

  // App Navigation & Gamification Integration State
  const [activeView, setActiveView] = useState<"academy" | "studio">("academy");
  const [lastLaunchedSubject, setLastLaunchedSubject] = useState<"maths" | "cs" | "physics" | "chemistry" | "biology" | "social">("cs");
  const [completedLessonInfo, setCompletedLessonInfo] = useState<{
    subject: "maths" | "cs" | "physics" | "chemistry" | "biology" | "social";
    lessonId: string;
    topic: string;
    revisionQuestions?: { question: string; answer: string }[];
  } | null>(null);

  // Generation / Job State
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStep, setJobStep] = useState<"idle" | "generating_script" | "synthesizing_audio" | "generating_notes" | "exporting_video" | "completed" | "failed">("idle");
  const [stepLabel, setStepLabel] = useState("Waiting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Lesson State
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [audioManifest, setAudioManifest] = useState<AudioManifest | null>(null);
  const [studyNotes, setStudyNotes] = useState<LessonNotes | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captionsUrl, setCaptionsUrl] = useState<string | null>(null);
  const [notesUrl, setNotesUrl] = useState<string | null>(null);

  // Player State
  const [activeTab, setActiveTab] = useState<"video" | "notes">("video");
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [sceneTime, setSceneTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load English sample bundle on initial mount so player is instantly testable!
  useEffect(() => {
    loadSampleBundle();
  }, []);

  const loadSampleBundle = async () => {
    try {
      const res = await fetch("/api/lessons/fixtures/sample");
      if (res.ok) {
        const data = await res.json();
        setLessonPlan(data.lesson_plan);
        setAudioManifest(data.audio_manifest);
        setStudyNotes(data.lesson_notes);
        setVideoUrl("/api/lessons/sample_en/video");
        setCaptionsUrl("/api/lessons/sample_en/captions");
        setNotesUrl("/api/lessons/sample_en/notes");
        setJobStep("completed");
        setJobProgress(100);
        setStepLabel("Sample lesson ready to play!");
      }
    } catch {
      // Backend not running yet or offline; fallback gracefully
    }
  };

  // Keyboard shortcut Ctrl+Enter to generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Trigger Generation Pipeline
  const handleGenerate = async (overrideParams?: {
    topic: string;
    level: LessonLevel;
    language: string;
    duration: number;
  }) => {
    const targetTopic = overrideParams?.topic ?? topic;
    const targetLevel = overrideParams?.level ?? level;
    const targetLanguage = overrideParams?.language ?? language;
    const targetDuration = overrideParams?.duration ?? duration;

    if (!targetTopic.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setLessonPlan(null);
    setAudioManifest(null);
    setStudyNotes(null);
    setVideoUrl(null);
    setCaptionsUrl(null);
    setNotesUrl(null);
    setJobStep("generating_script");
    setJobProgress(10);
    setStepLabel("Submitting generation request to local pipeline...");

    try {
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: targetTopic.trim(),
          level: targetLevel,
          language: targetLanguage,
          target_duration_seconds: targetDuration,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }

      const { job_id, lesson_id } = await res.json();

      // Poll job status until completed
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/lessons/jobs/${job_id}`);
          if (!statusRes.ok) return;

          const job = await statusRes.json();
          setJobProgress(job.percent || 10);
          setJobStep(job.step || "generating_script");
          setStepLabel(job.step_label || "Processing...");

          if (job.step === "completed") {
            clearInterval(interval);
            setIsGenerating(false);

            // Fetch final artifacts
            const planRes = await fetch(`/api/lessons/${lesson_id}`);
            const manRes = await fetch(`/api/lessons/${lesson_id}/manifest`);
            const notesRes = await fetch(`/api/lessons/${lesson_id}/notes`);

            if (planRes.ok && manRes.ok && notesRes.ok) {
              setLessonPlan(await planRes.json());
              setAudioManifest(await manRes.json());
              setStudyNotes(await notesRes.json());
              setVideoUrl(`/api/lessons/${lesson_id}/video`);
              setCaptionsUrl(`/api/lessons/${lesson_id}/captions`);
              setNotesUrl(`/api/lessons/${lesson_id}/notes`);
              setCurrentSceneIdx(0);
              setSceneTime(0);
              setIsPlaying(true);
            }
          } else if (job.step === "failed") {
            clearInterval(interval);
            setIsGenerating(false);
            setErrorMessage(job.error || "Generation encountered an error.");
          }
        } catch (err) {
          clearInterval(interval);
          setIsGenerating(false);
          setErrorMessage("Failed to check job progress.");
        }
      }, 1500);

    } catch (err: any) {
      setIsGenerating(false);
      setErrorMessage(err.message || "Failed to reach backend.");
    }
  };

  // Launch lesson from teacher dialogue inside Blu Academy RPG
  const handleLaunchFromGame = (payload: GameLaunchPayload) => {
    const targetLanguage = payload.language || language;
    const targetDuration = payload.duration || duration;

    setTopic(payload.topic);
    setLevel(payload.level);
    setLanguage(targetLanguage);
    setDuration(targetDuration);
    setLastLaunchedSubject(payload.subject);

    if (payload.subject === "maths") setActiveCategory("Maths");
    else if (payload.subject === "cs") setActiveCategory("Coding");
    else if (payload.subject === "social") setActiveCategory("Social Studies");
    else setActiveCategory("Science");

    setActiveView("studio");
    handleGenerate({
      topic: payload.topic,
      level: payload.level,
      language: targetLanguage,
      duration: targetDuration,
    });
  };

  // Active scene and duration calculation
  const currentScene = lessonPlan?.scenes?.[currentSceneIdx];
  const currentAudioEntry = audioManifest?.entries?.[currentSceneIdx];
  const currentSceneDuration = currentAudioEntry?.duration_seconds || 10;

  // Sync sceneTime from audio playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setSceneTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    if (lessonPlan && currentSceneIdx < lessonPlan.scenes.length - 1) {
      setCurrentSceneIdx((prev) => prev + 1);
      setSceneTime(0);
    } else {
      setIsPlaying(false);
      // Automatically stage completed lesson so returning to Academy claims XP & opens quiz!
      setCompletedLessonInfo({
        subject: lastLaunchedSubject,
        lessonId: lessonPlan?.title || topic,
        topic: topic,
        revisionQuestions: studyNotes?.revision_questions || lessonPlan?.revision_questions,
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Active caption resolution
  const activeCaption = getActiveCaption(
    currentAudioEntry?.caption_segments || [],
    sceneTime
  );

  return (
    <div className="bvt-app-container">
      {/* Full-viewport Blu Academy Game Experience */}
      {activeView === "academy" && (
        <div
          data-testid="blu-academy-fullscreen-root"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            minHeight: "100dvh",
            zIndex: 1000,
            overflow: "hidden",
            backgroundColor: "#080C16",
          }}
        >
          <BluAcademyView
            onLaunchLesson={handleLaunchFromGame}
            onExitGame={() => setActiveView("studio")}
            completedLessonInfo={completedLessonInfo}
            onClearCompletedLesson={() => setCompletedLessonInfo(null)}
          />
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bvt-header">
        <div className="bvt-logo-group">
          <div className="bvt-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <h1 className="bvt-logo-title">Blu Visual Teacher</h1>
            <p className="bvt-logo-subtitle">Lessons that travel beyond the internet.</p>
          </div>
        </div>

        <div className="bvt-header-banner">
          <svg width="120" height="32" viewBox="0 0 120 32" fill="none" stroke="#2F6B53" strokeWidth="1.2">
            <polyline points="5,28 25,12 40,24 60,8 80,24 95,14 115,28" />
            <circle cx="85" cy="10" r="5" fill="#E59866" stroke="none" />
          </svg>
          <span className="bvt-handwritten-motto">Better learning for every child</span>
        </div>

        <div className="bvt-header-actions">
          <button
            className={`bvt-pill-btn ${activeView === "academy" ? "active" : ""}`}
            onClick={() => setActiveView("academy")}
            title="Explore Blu Academy 2D RPG School"
          >
            🎒 Blu Academy
          </button>

          <button
            className={`bvt-pill-btn ${activeView === "studio" ? "active" : ""}`}
            onClick={() => setActiveView("studio")}
            title="Create & View Lessons in Studio"
          >
            ✏️ Lesson Studio
          </button>

          <button className="bvt-pill-btn active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Works offline after setup
          </button>

          <button
            className={`bvt-pill-btn ${useMockData ? "active" : ""}`}
            onClick={() => {
              setUseMockData(!useMockData);
              loadSampleBundle();
            }}
          >
            {useMockData ? "Using mock sample" : "Mock data"}
          </button>

          <button className="bvt-pill-btn" title="Toggle Night Theme">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <button className="bvt-pill-btn" title="Text Sizing">
            A+
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="bvt-body-layout">
        {/* Left Sidebar */}
        <aside className="bvt-sidebar">
          <div className="bvt-nav-group">
            <button
              type="button"
              className={`bvt-nav-item ${activeView === "academy" ? "active" : ""}`}
              onClick={() => setActiveView("academy")}
              style={{
                background: activeView === "academy" ? "var(--bvt-green-light)" : "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>🎒</span>
              <span>Blu Academy</span>
            </button>

            <button
              type="button"
              className={`bvt-nav-item ${activeView === "studio" ? "active" : ""}`}
              onClick={() => setActiveView("studio")}
              style={{
                background: activeView === "studio" ? "var(--bvt-green-light)" : "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Create a Lesson</span>
            </button>
          </div>

          <div className="bvt-sidebar-footer">
            <svg width="60" height="50" viewBox="0 0 60 50" fill="none" stroke="#2F6B53" strokeWidth="1.5">
              <circle cx="30" cy="18" r="10" fill="#E59866" />
              <path d="M20,38 Q30,28 40,38" fill="#DEF0E5" />
              <rect x="14" y="38" width="32" height="6" rx="2" fill="#234E3C" />
            </svg>
            <div className="bvt-sidebar-quote">Small steps create big changes</div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="bvt-main-content">
          {/* Form & Steps Column */}
          <section>
                <div className="bvt-hero-header">
                  <div className="bvt-eyebrow">A little curiosity goes a long way</div>
                  <h2 className="bvt-main-heading">Turn any topic into an offline lesson</h2>
              <p className="bvt-subheading">
                Create video lessons with visuals, voice and captions, ready to use even without internet.
              </p>
            </div>

            {/* Card 01: Form */}
            <div className="bvt-card">
              <div className="bvt-card-header">
                <div className="bvt-step-badge">01</div>
                <div className="bvt-card-title-group">
                  <span>Start with an idea</span>
                  <h2>Topic / Subject</h2>
                </div>
              </div>

              <div className="bvt-field-label-row">
                <span>Topic / Subject</span>
                <span className="bvt-char-count">{topic.length}/200 characters</span>
              </div>

              <div className="bvt-input-container">
                <svg className="bvt-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value.slice(0, 200))}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like to learn about?"
                />
              </div>

              {/* Quick ideas category tabs */}
              <div className="bvt-ideas-label">Choose an idea below or write your own.</div>
              <div className="bvt-category-tabs">
                {(Object.keys(QUICK_IDEAS) as (keyof typeof QUICK_IDEAS)[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`bvt-cat-btn ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick ideas pills */}
              <div className="bvt-idea-pills">
                {QUICK_IDEAS[activeCategory].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    className="bvt-idea-pill"
                    onClick={() => setTopic(idea)}
                  >
                    {idea}
                  </button>
                ))}
              </div>

              {/* Level Segmented Control */}
              <div className="bvt-setting-row">
                <div className="bvt-setting-label">Level</div>
                <div className="bvt-level-toggle">
                  <button
                    type="button"
                    className={`bvt-level-btn ${level === "beginner" ? "active" : ""}`}
                    onClick={() => setLevel("beginner")}
                  >
                    Beginner
                  </button>
                  <button
                    type="button"
                    className={`bvt-level-btn ${level === "intermediate" ? "active" : ""}`}
                    onClick={() => setLevel("intermediate")}
                  >
                    Intermediate
                  </button>
                </div>
              </div>

              {/* Language Pills */}
              <div className="bvt-setting-row">
                <div className="bvt-setting-label">Language</div>
                <div className="bvt-lang-pills">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`bvt-lang-pill ${language === l.code ? "active" : ""}`}
                      onClick={() => setLanguage(l.code)}
                    >
                      {l.label}
                      {language === l.code && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson length */}
              <div className="bvt-setting-row">
                <div className="bvt-setting-label">Lesson length</div>
                <select
                  className="bvt-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={30}>30 seconds (Quick Concept)</option>
                  <option value={45}>45 seconds (Recommended)</option>
                  <option value={60}>60 seconds (In-depth)</option>
                  <option value={90}>90 seconds (Extended Walkthrough)</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                className="bvt-generate-btn"
                disabled={isGenerating || !topic.trim()}
                onClick={() => handleGenerate()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {isGenerating ? "Generating offline lesson..." : "Generate lesson"}
              </button>
              <div className="bvt-shortcut-tip">Tip: press Ctrl + Enter to create your lesson.</div>

              {errorMessage && (
                <div style={{ marginTop: 14, color: "#DC2626", fontSize: 13, background: "#FEE2E2", padding: 10, borderRadius: 8 }}>
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Card 02: Stepper Progress */}
            <div className="bvt-card">
              <div className="bvt-card-header">
                <div className="bvt-step-badge">02</div>
                <div className="bvt-card-title-group">
                  <span>Made just for you</span>
                  <h2>Your lesson steps</h2>
                </div>
              </div>

              <div className="bvt-stepper-grid">
                {/* Step 1: Script */}
                <div className="bvt-step-item">
                  <div className={`bvt-step-circle ${jobProgress >= 30 ? "done" : jobStep === "generating_script" ? "active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="bvt-step-name">Lesson script</div>
                  <div className="bvt-step-status">{jobProgress >= 30 ? "Done" : jobStep === "generating_script" ? "Working" : "Waiting"}</div>
                </div>

                {/* Step 2: Voice */}
                <div className="bvt-step-item">
                  <div className={`bvt-step-circle ${jobProgress >= 65 ? "done" : jobStep === "synthesizing_audio" ? "active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="12" x2="10" y2="12" />
                      <line x1="14" y1="12" x2="18" y2="12" />
                    </svg>
                  </div>
                  <div className="bvt-step-name">Voice + captions</div>
                  <div className="bvt-step-status">{jobProgress >= 65 ? "Done" : jobStep === "synthesizing_audio" ? "Working" : "Waiting"}</div>
                </div>

                {/* Step 3: Animated Scenes */}
                <div className="bvt-step-item">
                  <div className={`bvt-step-circle ${jobProgress >= 85 ? "done" : jobStep === "generating_notes" ? "active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      <line x1="7" y1="2" x2="7" y2="22" />
                      <line x1="17" y1="2" x2="17" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                  </div>
                  <div className="bvt-step-name">Animated scenes</div>
                  <div className="bvt-step-status">{jobProgress >= 85 ? "Done" : jobStep === "generating_notes" ? "Working" : "Waiting"}</div>
                </div>

                {/* Step 4: Offline MP4 */}
                <div className="bvt-step-item">
                  <div className={`bvt-step-circle ${jobProgress === 100 ? "done" : jobStep === "exporting_video" ? "active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <div className="bvt-step-name">Offline MP4</div>
                  <div className="bvt-step-status">{jobProgress === 100 ? "Ready" : jobStep === "exporting_video" ? "Rendering" : "Waiting"}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--bvt-text-muted)" }}>
                <span>{jobProgress}% complete</span>
                <span>{stepLabel}</span>
              </div>

              <div className="bvt-progress-bar-container">
                <div className="bvt-progress-bar-fill" style={{ width: `${jobProgress}%` }} />
              </div>
            </div>
          </section>

          {/* Right Column: Player & Study Notes */}
          <section className="bvt-preview-card">
            <div className="bvt-preview-header">
              <div className="bvt-preview-tag">
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#2F6B53" }} />
                Lesson Preview
              </div>

              {lessonPlan && (
                <div className="bvt-preview-tabs">
                  <button
                    className={`bvt-preview-tab ${activeTab === "video" ? "active" : ""}`}
                    onClick={() => setActiveTab("video")}
                  >
                    Animated Player
                  </button>
                  <button
                    className={`bvt-preview-tab ${activeTab === "notes" ? "active" : ""}`}
                    onClick={() => setActiveTab("notes")}
                  >
                    Study Notes
                  </button>
                </div>
              )}
            </div>

            {isGenerating ? (
              <div className="bvt-empty-placeholder">
                <div style={{ width: 44, height: 44, border: "3px solid #E2E8F0", borderTopColor: "#2F6B53", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                <div className="bvt-empty-handwritten">Creating your offline lesson...</div>
                <div style={{ marginTop: 10, fontSize: 14, color: "var(--bvt-text-muted)" }}>
                  {stepLabel} ({jobProgress}%)
                </div>
              </div>
            ) : lessonPlan && currentScene ? (
              activeTab === "video" ? (
                <div>
                  {/* HTML5 Audio Engine */}
                  <audio
                    ref={audioRef}
                    src={currentAudioEntry?.audio_file}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleAudioEnded}
                    autoPlay={isPlaying}
                  />

                  {/* 16:9 Deterministic Animated Stage */}
                  <div className="bvt-player-stage-wrap">
                    <SceneRenderer
                      scene={currentScene}
                      timeSeconds={sceneTime}
                      durationSeconds={currentSceneDuration}
                      width={1280}
                      height={720}
                    />

                    {/* Synchronized Caption Bar */}
                    <CaptionTrack
                      text={activeCaption}
                      visible={captionsVisible}
                      language={lessonPlan.language}
                    />
                  </div>

                  {/* Player Controls Bar */}
                  <div className="bvt-player-controls">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        className="bvt-ctrl-btn"
                        onClick={() => {
                          setCurrentSceneIdx((i) => Math.max(0, i - 1));
                          setSceneTime(0);
                        }}
                        disabled={currentSceneIdx === 0}
                        title="Previous Scene"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="19 20 9 12 19 4 19 20" />
                          <line x1="5" y1="19" x2="5" y2="5" />
                        </svg>
                      </button>

                      <button
                        className="bvt-ctrl-btn bvt-play-btn"
                        onClick={togglePlay}
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>

                      <button
                        className="bvt-ctrl-btn"
                        onClick={() => {
                          setCurrentSceneIdx((i) => Math.min(lessonPlan.scenes.length - 1, i + 1));
                          setSceneTime(0);
                        }}
                        disabled={currentSceneIdx === lessonPlan.scenes.length - 1}
                        title="Next Scene"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5 4 15 12 5 20 5 4" />
                          <line x1="19" y1="5" x2="19" y2="19" />
                        </svg>
                      </button>
                    </div>

                    {/* Progress Slider */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bvt-text-muted)" }}>
                        Scene {currentSceneIdx + 1} of {lessonPlan.scenes.length}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={currentSceneDuration}
                        step="0.05"
                        value={sceneTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSceneTime(val);
                          if (audioRef.current) audioRef.current.currentTime = val;
                        }}
                        style={{ flex: 1, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 13, color: "var(--bvt-text-muted)" }}>
                        {sceneTime.toFixed(1)}s / {currentSceneDuration.toFixed(1)}s
                      </span>
                    </div>

                    {/* Captions Toggle */}
                    <button
                      className={`bvt-pill-btn ${captionsVisible ? "active" : ""}`}
                      onClick={() => setCaptionsVisible(!captionsVisible)}
                      title="Toggle Captions"
                    >
                      CC
                    </button>
                  </div>

                  {/* Real Download Links Bar */}
                  <div className="bvt-downloads-bar">
                    <a
                      href={videoUrl || "#"}
                      download="lesson.mp4"
                      className="bvt-download-btn"
                      style={{ background: "#234E3C", color: "#FFFFFF", borderColor: "#234E3C" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Download MP4 (1280x720)
                    </a>

                    <a
                      href={notesUrl || "#"}
                      download="study-notes.json"
                      className="bvt-download-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Study Notes (JSON)
                    </a>

                    <a
                      href={captionsUrl || "#"}
                      download="subtitles.srt"
                      className="bvt-download-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="6" y1="12" x2="10" y2="12" />
                        <line x1="14" y1="12" x2="18" y2="12" />
                      </svg>
                      Subtitles (SRT)
                    </a>
                  </div>

                  {/* Return to Blu Academy Reward Banner */}
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "linear-gradient(135deg, #DEF0E5 0%, #E8F5E9 100%)",
                      border: "1px solid #A5D6A7",
                      borderRadius: 12,
                      padding: "12px 18px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>🎓</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#234E3C" }}>
                          Blu Academy Progress
                        </div>
                        <div style={{ fontSize: 12, color: "#2F6B53" }}>
                          Return to school to earn +100 XP, unlock subject badges & test your knowledge!
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bvt-pill-btn active"
                      style={{
                        backgroundColor: "#234E3C",
                        color: "#FFFFFF",
                        border: "none",
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setCompletedLessonInfo({
                          subject: lastLaunchedSubject,
                          lessonId: lessonPlan?.title || topic,
                          topic: topic,
                          revisionQuestions: studyNotes?.revision_questions || lessonPlan?.revision_questions,
                        });
                        setActiveView("academy");
                      }}
                    >
                      Return to Academy (+XP) ➜
                    </button>
                  </div>
                </div>
              ) : (
                /* Study Notes View */
                <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, maxHeight: 680, overflowY: "auto" }}>
                  {studyNotes ? (
                    <NotesPreview notes={studyNotes} />
                  ) : (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--bvt-text-muted)" }}>
                      Study notes are generating...
                    </div>
                  )}
                </div>
              )
            ) : errorMessage ? (
              <div className="bvt-empty-placeholder" style={{ borderColor: "#FCA5A5", background: "#FEF2F2" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="bvt-empty-handwritten" style={{ color: "#DC2626" }}>Generation Failed</div>
                <div style={{ marginTop: 10, fontSize: 14, color: "#991B1B", maxWidth: 500, margin: "10px auto 0" }}>
                  {errorMessage}
                </div>
                <button
                  className="bvt-pill-btn"
                  style={{ marginTop: 20 }}
                  onClick={loadSampleBundle}
                >
                  Reload Sample Lesson
                </button>
              </div>
            ) : (
              /* Empty Placeholder matching the supplied design screenshot */
              <div className="bvt-empty-placeholder">
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none" stroke="#2F6B53" strokeWidth="1.5">
                  <path d="M90 140 Q 90 90 90 60" stroke="#234E3C" strokeWidth="3" />
                  <ellipse cx="65" cy="80" rx="24" ry="14" fill="#34D399" opacity="0.3" transform="rotate(-30 65 80)" />
                  <ellipse cx="115" cy="70" rx="28" ry="16" fill="#34D399" opacity="0.3" transform="rotate(30 115 70)" />
                  <circle cx="140" cy="40" r="18" fill="#F59E0B" opacity="0.8" stroke="none" />
                  <path d="M20 150 Q 90 135 160 150" stroke="#D1C7B7" strokeWidth="4" />
                </svg>
                <div className="bvt-empty-handwritten">Your lesson will play here.</div>
                <div style={{ marginTop: 10, fontSize: 14, color: "var(--bvt-text-muted)" }}>
                  Choose a topic on the left to start generating your offline video lesson.
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
