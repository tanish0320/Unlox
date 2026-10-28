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
import { ChalkboardLanding } from "./components/ChalkboardLanding";
import { ProjectLandingPage } from "./components/ProjectLandingPage";
import { SceneEditor } from "./components/SceneEditor";
import { WhatIfLabModal } from "./components/WhatIfLab";
import { StudioRedesignLayout } from "./components/StudioRedesignLayout";



// Quick idea presets by category matching the PRD and UI screenshots

const QUICK_IDEAS = {

  Coding: [

    "How does a Python loop work?",

    "What is a variable in coding?",

    "How does a web page load?",

    "What is an if statement?",

  ],

  Maths: [

    "Explain Ratio and proportion",

    "What is the Pythagorean theorem?",

    "How do fractions work?",

    "Understanding prime numbers",

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

  { code: "en", label: "English", voiceEngine: "Kokoro Neural & SAPI5", voiceStatus: "ready" },

  { code: "hi", label: "हिन्दी", voiceEngine: "Piper Neural", voiceStatus: "ready" },

  { code: "te", label: "తెలుగు", voiceEngine: "Piper Neural", voiceStatus: "ready" },

  { code: "ta", label: "தமிழ்", voiceEngine: "Piper Neural", voiceStatus: "ready" },

  { code: "kn", label: "ಕನ್ನಡ", voiceEngine: "Piper Neural", voiceStatus: "ready" },

];



const VOICE_OPTIONS: Record<string, Array<{ id: string; name: string; engine: string }>> = {

  en: [

    { id: "af_heart", name: "Heart (Kokoro Neural - Expressive Female)", engine: "Kokoro ONNX" },

    { id: "af_bella", name: "Bella (Kokoro Neural - Clear Female)", engine: "Kokoro ONNX" },

    { id: "am_adam", name: "Adam (Kokoro Neural - Deep Male)", engine: "Kokoro ONNX" },

    { id: "bf_emma", name: "Emma (Kokoro Neural - British Female)", engine: "Kokoro ONNX" },

    { id: "david", name: "David (Windows SAPI5 Male)", engine: "SAPI5" },

    { id: "zira", name: "Zira (Windows SAPI5 Female)", engine: "SAPI5" },

  ],

  hi: [

    { id: "hi_IN-pratham-medium", name: "Pratham (Piper Neural Hindi Male)", engine: "Piper ONNX" },

  ],

  te: [

    { id: "te_IN-padmavathi-medium", name: "Padmavathi (Piper Neural Telugu Female)", engine: "Piper ONNX" },

  ],

  ta: [

    { id: "ta_IN-rasa_female-medium", name: "Rasa (Piper Neural Tamil Female)", engine: "Piper ONNX" },

  ],

  kn: [

    { id: "kn_IN-syspin_male-medium", name: "SYSPIN (Piper Neural Kannada Male)", engine: "Piper ONNX" },

  ],

};



export const App: React.FC = () => {

  // Navigation View State

  const [activeNav, setActiveNav] = useState<"create" | "home">("create");



  // Night Mode State

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {

    return localStorage.getItem("bvt_theme") === "dark";

  });



  // A+ Font Scale State (0 = 100%, 1 = 115%, 2 = 130%)

  const [fontScaleIdx, setFontScaleIdx] = useState<number>(0);

  const fontScales = ["100%", "115%", "130%"];



  // Form State

  const [topic, setTopic] = useState("Explain Ratio and proportion");

  const [activeCategory, setActiveCategory] = useState<keyof typeof QUICK_IDEAS>("Maths");

  const [level, setLevel] = useState<LessonLevel>("beginner");

  const [language, setLanguage] = useState("en");

  const [selectedVoice, setSelectedVoice] = useState<string>("af_heart");

  const [duration, setDuration] = useState(60);

  // Chalkboard Intro Landing Overlay State
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("langtest") === "1" ||
      params.get("render") === "1" ||
      window.location.pathname === "/render"
    ) {
      return false;
    }
    try {
      return sessionStorage.getItem("bvt_intro_seen") !== "1";
    } catch {
      return true;
    }
  });

  const handleSkipIntro = () => {
    setShowIntro(false);
    setActiveView("landing");
    try {
      sessionStorage.setItem("bvt_intro_seen", "1");
    } catch {
      // Safe fallback
    }
  };

  // App Navigation & Gamification Integration State
  const [activeView, setActiveView] = useState<"landing" | "academy" | "studio">(() => {
    if (typeof window === "undefined") return "studio";
    if ((import.meta as any).env?.MODE === "test") return "studio";
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("render") === "1" ||
      params.get("langtest") === "1" ||
      window.location.pathname === "/render" ||
      params.get("view") === "studio"
    ) {
      return "studio";
    }
    if (params.get("view") === "academy") {
      return "academy";
    }
    // Default entry route opens the project landing dashboard
    return "landing";
  });
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isWhatIfLabOpen, setIsWhatIfLabOpen] = useState<boolean>(false);
  const [lastLaunchedSubject, setLastLaunchedSubject] = useState<"maths" | "cs" | "physics" | "chemistry" | "biology" | "social">("cs");
  const [completedLessonInfo, setCompletedLessonInfo] = useState<{
    subject: "maths" | "cs" | "physics" | "chemistry" | "biology" | "social";
    lessonId: string;
    topic: string;
    revisionQuestions?: { question: string; answer: string }[];
  } | null>(null);



  const handleLanguageChange = (newLang: string) => {

    setLanguage(newLang);

    if (newLang === "en") {

      setSelectedVoice("af_heart");

    } else if (newLang === "hi") {

      setSelectedVoice("hi_IN-pratham-medium");

    } else if (newLang === "te") {

      setSelectedVoice("te_IN-padmavathi-medium");

    } else if (newLang === "ta") {

      setSelectedVoice("ta_IN-rasa_female-medium");

    } else if (newLang === "kn") {

      setSelectedVoice("kn_IN-syspin_male-medium");

    }

  };



  // Generation / Job State

  const [isGenerating, setIsGenerating] = useState(false);

  const [jobProgress, setJobProgress] = useState(0);

  const [jobStep, setJobStep] = useState<

    "idle" | "generating_script" | "synthesizing_audio" | "generating_notes" | "exporting_video" | "completed" | "failed"

  >("idle");

  const [stepLabel, setStepLabel] = useState("Waiting");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  // Active Lesson State

  const [activeLessonId, setActiveLessonId] = useState<string>("sample_en");

  const [isSampleDemo, setIsSampleDemo] = useState<boolean>(true);

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  const [audioManifest, setAudioManifest] = useState<AudioManifest | null>(null);

  const [studyNotes, setStudyNotes] = useState<LessonNotes | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [captionsUrl, setCaptionsUrl] = useState<string | null>(null);

  const [notesUrl, setNotesUrl] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);



  // Cached generated lesson (to allow switching back from mock)

  const [lastGeneratedLesson, setLastGeneratedLesson] = useState<{

    id: string;

    plan: LessonPlan;

    manifest: AudioManifest;

    notes: LessonNotes;

  } | null>(null);



  // Player State

  const [activeTab, setActiveTab] = useState<"video" | "notes">("video");

  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);

  const [sceneTime, setSceneTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);

  const [captionsVisible, setCaptionsVisible] = useState(true);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [controlsVisible, setControlsVisible] = useState(true);

  const controlsTimeoutRef = useRef<any>(null);

  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);



  // Apply Theme & Font Scale on Mount and State Change

  useEffect(() => {

    if (isDarkMode) {

      document.documentElement.classList.add("bvt-dark");

      document.body.classList.add("bvt-dark");

      localStorage.setItem("bvt_theme", "dark");

    } else {

      document.documentElement.classList.remove("bvt-dark");

      document.body.classList.remove("bvt-dark");

      localStorage.setItem("bvt_theme", "light");

    }

  }, [isDarkMode]);



  useEffect(() => {

    const scales = ["1", "1.15", "1.3"];

    document.documentElement.style.setProperty("--bvt-font-scale", scales[fontScaleIdx]);

  }, [fontScaleIdx]);



  // Load English sample bundle on initial mount

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

        setActiveLessonId("sample_en");

        setIsSampleDemo(true);

        setVideoUrl("/api/lessons/sample_en/video");

        setCaptionsUrl("/api/lessons/sample_en/captions");

        setNotesUrl("/api/lessons/sample_en/notes");

        setPdfUrl("/api/lessons/sample_en/notes/pdf");

        setJobStep("completed");

        setJobProgress(100);

        setStepLabel("Sample lesson ready to play!");

        setCurrentSceneIdx(0);

        setSceneTime(0);

      }

    } catch {

      // Backend offline or starting up

    }

  };



  const switchToGeneratedLesson = () => {

    if (lastGeneratedLesson) {

      setLessonPlan(lastGeneratedLesson.plan);

      setAudioManifest(lastGeneratedLesson.manifest);

      setStudyNotes(lastGeneratedLesson.notes);

      setActiveLessonId(lastGeneratedLesson.id);

      setIsSampleDemo(false);

      setVideoUrl(`/api/lessons/${lastGeneratedLesson.id}/video`);

      setCaptionsUrl(`/api/lessons/${lastGeneratedLesson.id}/captions`);

      setNotesUrl(`/api/lessons/${lastGeneratedLesson.id}/notes`);

      setPdfUrl(`/api/lessons/${lastGeneratedLesson.id}/notes/pdf`);

      setCurrentSceneIdx(0);

      setSceneTime(0);

    }

  };



  // Keyboard shortcut Enter or Ctrl+Enter to generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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

    setPdfUrl(null);

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
          voice_id: selectedVoice,
        }),

      });



      if (!res.ok) {

        throw new Error(`Server returned error status ${res.status}`);

      }



      const { job_id, lesson_id } = await res.json();

      setActiveLessonId(lesson_id);



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

              const planData = await planRes.json();

              const manData = await manRes.json();

              const notesData = await notesRes.json();



              setLessonPlan(planData);

              setAudioManifest(manData);

              setStudyNotes(notesData);

              setIsSampleDemo(false);

              setVideoUrl(`/api/lessons/${lesson_id}/video`);

              setCaptionsUrl(`/api/lessons/${lesson_id}/captions`);

              setNotesUrl(`/api/lessons/${lesson_id}/notes`);

              setPdfUrl(`/api/lessons/${lesson_id}/notes/pdf`);

              setCurrentSceneIdx(0);

              setSceneTime(0);

              setIsPlaying(true);



              setLastGeneratedLesson({

                id: lesson_id,

                plan: planData,

                manifest: manData,

                notes: notesData,

              });

            }

          } else if (job.step === "failed") {

            clearInterval(interval);

            setIsGenerating(false);

            setErrorMessage(job.error || "Generation encountered an error.");

          }

        } catch {

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

  const totalLessonDuration = audioManifest?.total_timeline_duration_seconds
    || audioManifest?.total_duration_seconds
    || (lessonPlan?.scenes?.length ? lessonPlan.scenes.length * 10 : 0);

  const priorDuration = (audioManifest?.entries || [])
    .slice(0, currentSceneIdx)
    .reduce((acc, e) => acc + (e.duration_seconds || 0) + 0.3, 0);

  const globalLessonTime = Math.min(totalLessonDuration, priorDuration + sceneTime);



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

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (document.fullscreenElement && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs) {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen || !isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen, isPlaying]);

  useEffect(() => {
    if (showIntro) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, sceneTime - 5);
        setSceneTime(next);
        if (audioRef.current) audioRef.current.currentTime = next;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(currentSceneDuration, sceneTime + 5);
        setSceneTime(next);
        if (audioRef.current) audioRef.current.currentTime = next;
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isPlaying, isFullscreen, isMuted, sceneTime, currentSceneDuration, showIntro]);



  // Active caption resolution

  const activeCaption = getActiveCaption(

    currentAudioEntry?.caption_segments || [],

    sceneTime

  );



  const selectedLangObj = LANGUAGES.find((l) => l.code === language);



  return (

    <div className="bvt-app-container">

      {/* Multilingual Chalkboard Landing Overlay */}
      {showIntro && (
        <ChalkboardLanding
          onSkip={handleSkipIntro}
        />
      )}

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

      {/* Project Landing Showcase View */}
      {activeView === "landing" && (
        <div style={{ minHeight: "100vh", backgroundColor: "#080D1A" }}>
          <ProjectLandingPage
            onEnterAcademy={() => setActiveView("academy")}
            onCreateLesson={() => setActiveView("studio")}
            onReplayIntroAnimation={() => setShowIntro(true)}
          />
        </div>
      )}

      {/* Studio Redesign Layout matching UI screen.jpeg */}
      {activeView === "studio" && (
        <StudioRedesignLayout
          topic={topic}
          setTopic={setTopic}
          level={level}
          setLevel={setLevel}
          language={language}
          handleLanguageChange={handleLanguageChange}
          duration={duration}
          setDuration={setDuration}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          isGenerating={isGenerating}
          jobProgress={jobProgress}
          stepLabel={stepLabel}
          handleGenerate={handleGenerate}
          handleKeyDown={handleKeyDown}
          lessonPlan={lessonPlan}
          audioManifest={audioManifest}
          studyNotes={studyNotes}
          currentSceneIdx={currentSceneIdx}
          setCurrentSceneIdx={setCurrentSceneIdx}
          sceneTime={sceneTime}
          setSceneTime={setSceneTime}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          isMuted={isMuted}
          toggleMute={toggleMute}
          captionsVisible={captionsVisible}
          setCaptionsVisible={setCaptionsVisible}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          controlsVisible={controlsVisible}
          handleUserActivity={handleUserActivity}
          playerContainerRef={playerContainerRef}
          audioRef={audioRef}
          handleTimeUpdate={handleTimeUpdate}
          handleAudioEnded={handleAudioEnded}
          videoUrl={videoUrl}
          captionsUrl={captionsUrl}
          notesUrl={notesUrl}
          pdfUrl={pdfUrl}
          activeLessonId={activeLessonId}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          fontScaleIdx={fontScaleIdx}
          setFontScaleIdx={setFontScaleIdx}
          fontScales={fontScales}
          activeView={activeView}
          setActiveView={setActiveView}
          isSampleDemo={isSampleDemo}
          setIsEditorOpen={setIsEditorOpen}
          setIsWhatIfLabOpen={setIsWhatIfLabOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lastLaunchedSubject={lastLaunchedSubject}
          formatTime={formatTime}
        />
      )}
      {isEditorOpen && lessonPlan && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9000 }}>
          <SceneEditor
            initialLessonPlan={lessonPlan}
            initialAudioManifest={audioManifest || undefined}
            lessonId={activeLessonId || "sample_en"}
            onClose={() => setIsEditorOpen(false)}
            onOpenWhatIfLab={() => setIsWhatIfLabOpen(true)}
          />
        </div>
      )}

      <WhatIfLabModal
        isOpen={isWhatIfLabOpen}
        onClose={() => setIsWhatIfLabOpen(false)}
      />
    </div>

  );

};

