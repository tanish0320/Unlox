import React from "react";
import { SceneRenderer } from "./scenes/SceneRenderer";
import { CaptionTrack, getActiveCaption } from "./CaptionTrack";
import { NotesPreview } from "./NotesPreview";
import { LessonPlan, AudioManifest, LessonNotes, LessonLevel } from "./scenes/sceneTypes";

interface StudioRedesignLayoutProps {
  topic: string;
  setTopic: (t: string) => void;
  level: LessonLevel;
  setLevel: (l: LessonLevel) => void;
  language: string;
  handleLanguageChange: (lang: string) => void;
  duration: number;
  setDuration: (d: number) => void;
  activeCategory: string;
  setActiveCategory: (cat: any) => void;
  isGenerating: boolean;
  jobProgress: number;
  stepLabel: string;
  handleGenerate: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  lessonPlan: LessonPlan | null;
  audioManifest: AudioManifest | null;
  studyNotes: LessonNotes | null;
  currentSceneIdx: number;
  setCurrentSceneIdx: (idx: number | ((prev: number) => number)) => void;
  sceneTime: number;
  setSceneTime: (t: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  captionsVisible: boolean;
  setCaptionsVisible: (v: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  controlsVisible: boolean;
  handleUserActivity: () => void;
  playerContainerRef: any;
  audioRef: any;
  handleTimeUpdate: () => void;
  handleAudioEnded: () => void;
  videoUrl: string | null;
  captionsUrl: string | null;
  notesUrl: string | null;
  pdfUrl: string | null;
  activeLessonId: string;
  isDarkMode: boolean;
  setIsDarkMode: (d: boolean) => void;
  fontScaleIdx: number;
  setFontScaleIdx: (fn: (prev: number) => number) => void;
  fontScales: string[];
  activeView: "landing" | "academy" | "studio";
  setActiveView: (v: "landing" | "academy" | "studio") => void;
  isSampleDemo: boolean;
  setIsEditorOpen: (o: boolean) => void;
  setIsWhatIfLabOpen: (o: boolean) => void;
  activeTab: "video" | "notes";
  setActiveTab: (t: "video" | "notes") => void;
  lastLaunchedSubject: "maths" | "cs" | "physics" | "chemistry" | "biology" | "social";
  formatTime: (secs: number) => string;
}

const CATEGORIES = ["Coding", "Maths", "Science", "Social Studies"] as const;
const LEVELS: { key: LessonLevel; label: string }[] = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
];
const LANGUAGES_LIST = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export const StudioRedesignLayout: React.FC<StudioRedesignLayoutProps> = (props) => {
  const {
    topic,
    setTopic,
    level,
    setLevel,
    language,
    handleLanguageChange,
    duration,
    setDuration,
    activeCategory,
    setActiveCategory,
    isGenerating,
    jobProgress,
    stepLabel,
    handleGenerate,
    handleKeyDown,
    lessonPlan,
    audioManifest,
    studyNotes,
    currentSceneIdx,
    setCurrentSceneIdx,
    sceneTime,
    setSceneTime,
    isPlaying,
    togglePlay,
    isMuted,
    toggleMute,
    captionsVisible,
    setCaptionsVisible,
    isFullscreen,
    toggleFullscreen,
    controlsVisible,
    handleUserActivity,
    playerContainerRef,
    audioRef,
    handleTimeUpdate,
    handleAudioEnded,
    videoUrl,
    captionsUrl,
    notesUrl,
    pdfUrl,
    activeLessonId,
    isDarkMode,
    setIsDarkMode,
    fontScaleIdx,
    setFontScaleIdx,
    fontScales,
    activeView,
    setActiveView,
    setIsEditorOpen,
    setIsWhatIfLabOpen,
    activeTab,
    setActiveTab,
    lastLaunchedSubject,
    formatTime,
  } = props;

  const currentScene = lessonPlan?.scenes?.[currentSceneIdx];
  const currentAudioEntry = audioManifest?.entries?.[currentSceneIdx];
  const currentSceneDuration = currentAudioEntry?.duration_seconds || 10;
  const totalLessonDuration =
    audioManifest?.total_timeline_duration_seconds ||
    audioManifest?.total_duration_seconds ||
    (lessonPlan?.scenes?.length ? lessonPlan.scenes.length * 10 : 0);

  const priorDuration = (audioManifest?.entries || [])
    .slice(0, currentSceneIdx)
    .reduce((acc, e) => acc + (e.duration_seconds || 0) + 0.3, 0);

  const globalLessonTime = Math.min(totalLessonDuration, priorDuration + sceneTime);

  const activeCaption = getActiveCaption(
    currentAudioEntry?.caption_segments || [],
    sceneTime
  );

  // Professor Avatar and Subject Name
  const getTeacherInfo = () => {
    switch (lastLaunchedSubject) {
      case "maths":
        return { name: "Ms. Asha", room: "Maths room", avatar: "📐", color: "#F59E0B" };
      case "physics":
        return { name: "Dr. Newton", room: "Physics room", avatar: "🔭", color: "#8B5CF6" };
      case "chemistry":
        return { name: "Dr. Mira", room: "Chemistry lab", avatar: "🧪", color: "#10B981" };
      case "biology":
        return { name: "Ms. Flora", room: "Greenhouse", avatar: "🌱", color: "#22C55E" };
      case "social":
        return { name: "Mr. Atlas", room: "Social studies", avatar: "🌍", color: "#D97706" };
      case "cs":
      default:
        return { name: "Prof. Byte", room: "Maths room", avatar: "🤖", color: "#0284C7" };
    }
  };

  const teacher = getTeacherInfo();

  return (
    <div className="bvt-studio-app">
      {/* 1. TOP GLOBAL NAVIGATION BAR */}
      <header className="bvt-studio-topbar">
        <div
          className="bvt-studio-logo"
          onClick={() => setActiveView("studio")}
          role="button"
          tabIndex={0}
        >
          Blu Visual Teacher
        </div>

        {/* Search / Topic Input Field + Start Lesson Button */}
        <div className="bvt-studio-search-group">
          <input
            type="text"
            className="bvt-studio-search-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How do fractions work?"
          />
          <button
            type="button"
            className="bvt-studio-start-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            {isGenerating ? `${jobProgress}%...` : "Start lesson"}
          </button>
        </div>

        {/* Right Action Icons: Works Offline, Dark Mode, A+ Scaler */}
        <div className="bvt-studio-top-actions">
          <div className="bvt-studio-offline-pill" title="100% Offline Local Engine">
            Works offline
          </div>

          <button
            type="button"
            className="bvt-studio-icon-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          <button
            type="button"
            className="bvt-studio-icon-btn"
            onClick={() => setFontScaleIdx((prev) => (prev + 1) % 3)}
            title={`Font scale: ${fontScales[fontScaleIdx]}`}
          >
            A+
          </button>
        </div>
      </header>

      {/* 2. SECONDARY FILTER / CONFIG BAR (SUBJECT | LEVEL | LANGUAGE) */}
      <div className="bvt-studio-subnav">
        {/* SUBJECT */}
        <div className="bvt-studio-filter-group">
          <span className="bvt-studio-filter-label">Subject</span>
          <div className="bvt-studio-filter-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`bvt-studio-filter-btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* LEVEL */}
        <div className="bvt-studio-filter-group">
          <span className="bvt-studio-filter-label">Level</span>
          <div className="bvt-studio-filter-row">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.key}
                type="button"
                className={`bvt-studio-filter-btn ${level === lvl.key ? "active" : ""}`}
                onClick={() => setLevel(lvl.key)}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* LANGUAGE */}
        <div className="bvt-studio-filter-group">
          <span className="bvt-studio-filter-label">Language</span>
          <div className="bvt-studio-filter-row">
            {LANGUAGES_LIST.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`bvt-studio-filter-btn ${language === lang.code ? "active" : ""}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH SIDEBAR + STAGE + SCENES */}
      <div className="bvt-studio-workspace">
        {/* Left Vertical Icon Sidebar */}
        <aside className="bvt-studio-sidebar">
          <button
            type="button"
            className="bvt-studio-side-item"
            onClick={() => setActiveView("landing")}
            title="Home / Project Showcase"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="bvt-studio-side-label">Home</span>
          </button>

          <button
            type="button"
            className="bvt-studio-side-item active"
            onClick={() => setActiveView("studio")}
            title="Create Lesson"
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            <span className="bvt-studio-side-label">Create</span>
          </button>

          <button
            type="button"
            className="bvt-studio-side-item"
            onClick={() => setActiveView("academy")}
            title="Hallway / Blu Academy RPG"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="bvt-studio-side-label">Hallway</span>
          </button>
        </aside>

        {/* Center Canvas / Content Area */}
        <main className="bvt-studio-content">
          {/* Duration Selector */}
          <div className="bvt-studio-duration-row">
            <span className="bvt-studio-filter-label" style={{ display: "block", marginBottom: 4 }}>
              Length
            </span>
            <select
              className="bvt-studio-duration-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 sec</option>
              <option value={45}>45 sec</option>
              <option value={60}>60 sec</option>
              <option value={90}>90 sec</option>
              <option value={120}>120 sec (2 min)</option>
              <option value={180}>180 sec (3 min)</option>
              <option value={240}>240 sec (4 min)</option>
            </select>
          </div>

          {/* Main 2-Column Section: Chalkboard Stage + Scenes Sidebar */}
          <div className="bvt-studio-stage-layout">
            {/* Left: Chalkboard Player Stage */}
            <div>
              <div className="bvt-studio-board-frame">
                <div className="bvt-studio-board-surface">
                  {/* HTML5 Audio Player */}
                  <audio
                    ref={audioRef}
                    src={currentAudioEntry?.audio_file}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleAudioEnded}
                    autoPlay={isPlaying}
                  />

                  {/* Standard Player Wrapper for Test Compatibility */}
                  <div
                    className={`bvt-player-wrapper ${isFullscreen ? "is-fullscreen" : ""} ${
                      controlsVisible ? "controls-visible" : "controls-hidden"
                    }`}
                    ref={playerContainerRef}
                    onMouseMove={handleUserActivity}
                    onMouseEnter={handleUserActivity}
                  >
                    <div className="bvt-player-stage-wrap">
                      {currentScene ? (
                        <SceneRenderer
                          scene={currentScene}
                          timeSeconds={sceneTime}
                          durationSeconds={currentSceneDuration}
                          width={1280}
                          height={720}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 380,
                            padding: 24,
                            textAlign: "center",
                          }}
                        >
                          {isGenerating ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 14,
                                background: "#0F172A",
                                border: "1px solid #1E293B",
                                borderRadius: 12,
                                padding: "24px 32px",
                                maxWidth: 440,
                                width: "90%",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  border: "3px solid #334155",
                                  borderTopColor: "#E59F26",
                                  borderRadius: "50%",
                                  animation: "spin 0.8s linear infinite",
                                }}
                              />
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color: "#F8FAFC",
                                  fontFamily: "var(--bvt-font-sans, sans-serif)",
                                  letterSpacing: "-0.2px",
                                }}
                              >
                                Creating your lesson
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#94A3B8",
                                  textAlign: "center",
                                  lineHeight: 1.4,
                                }}
                              >
                                {stepLabel}
                              </div>
                              {/* Progress bar */}
                              <div
                                style={{
                                  width: "100%",
                                  height: 6,
                                  backgroundColor: "#1E293B",
                                  borderRadius: 9999,
                                  overflow: "hidden",
                                  marginTop: 4,
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${Math.max(10, Math.min(100, jobProgress))}%`,
                                    backgroundColor: "#E59F26",
                                    borderRadius: 9999,
                                    transition: "width 0.4s ease",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#E59F26",
                                  fontFamily: "monospace",
                                }}
                              >
                                {jobProgress}% complete
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                color: "#FEF08A",
                                fontFamily: "var(--bvt-font-hand, cursive)",
                                fontSize: 26,
                              }}
                            >
                              Ready to start lesson
                            </div>
                          )}
                        </div>
                      )}

                      {/* Captions Track */}
                      <CaptionTrack
                        text={activeCaption}
                        visible={captionsVisible}
                        language={lessonPlan?.language || language}
                      />
                    </div>

                    {/* Controls Bar inside Wrapper for full test compatibility */}
                    <div className="bvt-player-controls bvt-studio-inboard-controls">
                      <div className="bvt-studio-inboard-left">
                        {/* Play/Pause */}
                        <button
                          type="button"
                          className="bvt-ctrl-btn bvt-studio-inboard-btn"
                          onClick={togglePlay}
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>

                        {/* Next Scene */}
                        <button
                          type="button"
                          className="bvt-ctrl-btn bvt-studio-inboard-btn"
                          onClick={() => {
                            if (lessonPlan && currentSceneIdx < lessonPlan.scenes.length - 1) {
                              setCurrentSceneIdx((prev) => (typeof prev === "number" ? prev + 1 : prev));
                              setSceneTime(0);
                            }
                          }}
                          disabled={!lessonPlan || currentSceneIdx >= lessonPlan.scenes.length - 1}
                          title="Next Scene"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 4 15 12 5 20 5 4" />
                            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </button>

                        {/* Time Readout */}
                        <span className="bvt-studio-inboard-time">
                          {formatTime(globalLessonTime)} / {formatTime(totalLessonDuration)}
                        </span>
                      </div>

                      {/* Timeline Slider */}
                      <div className="bvt-studio-inboard-timeline">
                        <input
                          type="range"
                          className="bvt-studio-inboard-slider"
                          min="0"
                          max={currentSceneDuration}
                          step="0.05"
                          value={sceneTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSceneTime(val);
                            if (audioRef.current) audioRef.current.currentTime = val;
                          }}
                        />
                      </div>

                      {/* Right Action Buttons */}
                      <div className="bvt-studio-inboard-right">
                        {/* CC Toggle */}
                        <button
                          type="button"
                          className={`bvt-studio-inboard-tag ${captionsVisible ? "active" : ""}`}
                          onClick={() => setCaptionsVisible(!captionsVisible)}
                          title="Toggle Captions"
                        >
                          CC
                        </button>

                        {/* Speed Tag */}
                        <span className="bvt-studio-inboard-tag">1x</span>

                        {/* MP4 Badge */}
                        <span className="bvt-studio-inboard-tag">MP4</span>

                        {/* Mute Toggle */}
                        <button
                          type="button"
                          className="bvt-ctrl-btn bvt-studio-inboard-btn"
                          onClick={toggleMute}
                          title={isMuted ? "Unmute (M)" : "Mute (M)"}
                        >
                          {isMuted ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                          )}
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                          type="button"
                          className="bvt-ctrl-btn bvt-studio-inboard-btn"
                          onClick={toggleFullscreen}
                          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scenes Playlist */}
            <div className="bvt-studio-scenes-panel">
              <span className="bvt-studio-scenes-heading">Scenes</span>
              {(lessonPlan?.scenes || []).map((sc, idx) => {
                const durationSecs = audioManifest?.entries?.[idx]?.duration_seconds || 10;
                const isCurrent = idx === currentSceneIdx;
                const isPast = idx < currentSceneIdx;
                return (
                  <div
                    key={sc.id || idx}
                    className={`bvt-studio-scene-item ${isCurrent ? "active" : ""}`}
                    onClick={() => {
                      setCurrentSceneIdx(idx);
                      setSceneTime(0);
                    }}
                  >
                    <div className="bvt-studio-scene-thumb">
                      <div className="bvt-studio-scene-thumb-text">
                        {sc.heading || `Scene ${idx + 1}`}
                      </div>
                      <div className="bvt-studio-scene-thumb-dur">
                        0:{Math.round(durationSecs).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <div className="bvt-studio-scene-meta">
                      <div className="bvt-studio-scene-title">
                        {idx + 1}. {sc.heading || `Scene ${idx + 1}`}
                      </div>
                      <div className="bvt-studio-scene-status">
                        {isCurrent ? "Now playing" : isPast ? "Watched" : `0:${Math.round(durationSecs)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. BOTTOM LESSON INFO & ACTION CONTROLS */}
          <div className="bvt-studio-bottom-section">
            <h2 className="bvt-studio-bottom-title">{lessonPlan?.title || topic}</h2>

            <div className="bvt-studio-action-row">
              {/* Professor Profile Card */}
              <div className="bvt-studio-teacher-card">
                <div className="bvt-studio-avatar" style={{ backgroundColor: teacher.color }}>
                  {teacher.avatar}
                </div>
                <div>
                  <div className="bvt-studio-teacher-name">{teacher.name}</div>
                  <div className="bvt-studio-teacher-sub">{teacher.room}</div>
                </div>
              </div>

              {/* Action Buttons: Download MP4, Notes, Captions, Ask Another */}
              <div className="bvt-studio-btn-group">
                <a
                  href={videoUrl || "#"}
                  download={`${activeLessonId}.mp4`}
                  className="bvt-studio-dl-btn"
                >
                  Download MP4
                </a>

                {/* PDF Study Notes Download */}
                <a
                  href={pdfUrl || (activeLessonId ? `/api/lessons/${activeLessonId}/notes/pdf` : "#")}
                  download={`${activeLessonId}_study_notes.pdf`}
                  className="bvt-studio-secondary-btn"
                  title="Download Formatted PDF Study Notes"
                >
                  📄 Notes (PDF)
                </a>

                {/* JSON Study Notes Download */}
                <a
                  href={notesUrl ? `${notesUrl}?download=true` : (activeLessonId ? `/api/lessons/${activeLessonId}/notes?download=true` : "#")}
                  download={`${activeLessonId}_notes.json`}
                  className="bvt-studio-secondary-btn"
                  title="Download Structured Study Notes in JSON format"
                >
                  📋 Notes (JSON)
                </a>

                <button
                  type="button"
                  className={`bvt-studio-secondary-btn ${activeTab === "notes" ? "active" : ""}`}
                  onClick={() => setActiveTab(activeTab === "notes" ? "video" : "notes")}
                >
                  Notes Preview
                </button>

                <a
                  href={captionsUrl || "#"}
                  download={`${activeLessonId}.srt`}
                  className="bvt-studio-secondary-btn"
                >
                  Captions
                </a>

                <button
                  type="button"
                  className="bvt-studio-secondary-btn"
                  onClick={() => {
                    setTopic("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Ask another
                </button>

                {/* Secondary Actions: Modular Scene Editor & What-if Lab */}
                <button
                  type="button"
                  className="bvt-studio-secondary-btn"
                  onClick={() => setIsEditorOpen(true)}
                  title="Open Modular Scene Editor"
                >
                  ✏️ Edit Scenes
                </button>

                <button
                  type="button"
                  className="bvt-studio-secondary-btn"
                  onClick={() => setIsWhatIfLabOpen(true)}
                  title="Open Interactive What-If Lab"
                >
                  🔬 What-If Lab
                </button>
              </div>
            </div>

            {/* Sub-tabs: Overview | Notes | Details */}
            <div className="bvt-studio-tab-bar">
              <button
                type="button"
                className={`bvt-studio-bottom-tab ${activeTab === "video" ? "active" : ""}`}
                onClick={() => setActiveTab("video")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`bvt-studio-bottom-tab ${activeTab === "notes" ? "active" : ""}`}
                onClick={() => setActiveTab("notes")}
              >
                Notes
              </button>
              <button
                type="button"
                className="bvt-studio-bottom-tab"
                onClick={() => setIsEditorOpen(true)}
              >
                Details
              </button>
            </div>

            {/* Tab Content Display */}
            {activeTab === "video" ? (
              <div className="bvt-studio-overview-box">
                <div className="bvt-studio-overview-meta">
                  {language.toUpperCase()} • {level.toUpperCase()} •{" "}
                  {Math.round(totalLessonDuration)} sec •{" "}
                  {lessonPlan?.scenes?.length || 0} scenes • made on this laptop, offline
                </div>
                <div className="bvt-studio-overview-text">
                  <strong>Key idea:</strong>{" "}
                  {studyNotes?.summary ||
                    "A visual and audio explanation created completely offline without cloud dependencies."}
                </div>
              </div>
            ) : (
              <div style={{ background: "#131E2F", borderRadius: 8, padding: 20, marginTop: 12 }}>
                {studyNotes ? (
                  <NotesPreview notes={studyNotes} />
                ) : (
                  <div style={{ color: "#94A3B8", textAlign: "center" }}>No notes available yet.</div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
