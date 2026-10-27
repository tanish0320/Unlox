import React, { useEffect, useState, useMemo } from "react";
import { SceneRenderer } from "../components/scenes/SceneRenderer";
import { CaptionTrack, getActiveCaption } from "../components/CaptionTrack";
import { LessonPlan, LessonScene } from "../components/scenes/sceneTypes";
import { sampleLesson, sampleLessonHindi, sampleLessonKannada } from "../fixtures/sampleLesson";
import { sampleLessonP1, p1AudioManifestDurations } from "../fixtures/sampleLessonP1";
import { sampleCaptions } from "../fixtures/sampleCaptions";
import "../styles/fonts.css";
import "../styles/sceneTokens.css";
import "../components/scenes/sceneStyles.css";

// Registry of confirmed offline fixtures
const FIXTURE_REGISTRY: Record<string, LessonPlan> = {
  default: sampleLesson,
  sample: sampleLesson,
  en: sampleLesson,
  p1: sampleLessonP1,
  sample_p1: sampleLessonP1,
  loop: sampleLessonP1,
  hi: sampleLessonHindi,
  hindi: sampleLessonHindi,
  kn: sampleLessonKannada,
  kannada: sampleLessonKannada,
};

export interface RenderState {
  lessonKey: string;
  sceneIndex: number;
  timeSeconds: number;
  durationSeconds: number;
  showCaptions: boolean;
}

export interface RenderPageProps {
  initialSearch?: string; // Optional search string override for unit testing
}

/**
 * RenderPage: Dedicated export viewport for Person 2's Playwright capture engine.
 * Fixed 1280x720 canvas rendering SceneRenderer with strict DOM readiness signaling.
 */
export const RenderPage: React.FC<RenderPageProps> = ({ initialSearch }) => {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [timeSeconds, setTimeSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [showCaptions, setShowCaptions] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse query parameters
  const parseParams = (searchStr: string) => {
    const params = new URLSearchParams(searchStr);

    // 1. Lesson resolution
    const lessonParam = (
      params.get("lesson") ||
      params.get("lesson_id") ||
      params.get("lessonId") ||
      "default"
    ).trim();

    // 2. Scene resolution (index or ID)
    const sceneParam =
      params.get("scene") ||
      params.get("scene_index") ||
      params.get("sceneIndex") ||
      params.get("scene_id") ||
      params.get("sceneId") ||
      "0";

    // 3. Timestamp resolution
    const rawTime =
      params.get("t") ||
      params.get("time") ||
      params.get("time_seconds") ||
      params.get("timeSeconds") ||
      "0";
    const parsedTime = Math.max(0, parseFloat(rawTime) || 0);

    // 4. Duration resolution (optional explicit duration)
    const rawDuration =
      params.get("duration") ||
      params.get("duration_seconds") ||
      params.get("durationSeconds");
    const parsedDuration = rawDuration ? parseFloat(rawDuration) : null;

    // 5. Captions visibility
    const rawCaptions = params.get("captions") || params.get("show_captions");
    const parsedCaptions = rawCaptions === "true" || rawCaptions === "1";

    return {
      lessonParam,
      sceneParam,
      parsedTime,
      parsedDuration,
      parsedCaptions,
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const initializeFrame = async () => {
      setIsReady(false);
      setErrorMessage(null);

      try {
        const search =
          initialSearch !== undefined
            ? initialSearch
            : typeof window !== "undefined"
            ? window.location.search
            : "";
        const {
          lessonParam,
          sceneParam,
          parsedTime,
          parsedDuration,
          parsedCaptions,
        } = parseParams(search);

        // 1. Load Lesson Plan
        let loadedPlan: LessonPlan | null = null;
        const normalizedKey = lessonParam.toLowerCase();

        if (FIXTURE_REGISTRY[normalizedKey]) {
          loadedPlan = FIXTURE_REGISTRY[normalizedKey];
        } else {
          // Attempt local backend API lookup for dynamic jobs
          try {
            const apiRes = await fetch(`http://localhost:8000/api/lessons/${lessonParam}`);
            if (apiRes.ok) {
              const data = await apiRes.json();
              if (data.lesson_plan) {
                loadedPlan = data.lesson_plan;
              }
            }
          } catch {
            // Local fetch failed (backend not running or network offline)
          }

          if (!loadedPlan) {
            throw new Error(
              `Lesson '${lessonParam}' not found. Available offline fixtures: 'default', 'p1', 'hi', 'kn'. Or start the backend on port 8000.`
            );
          }
        }

        if (!loadedPlan || !loadedPlan.scenes || loadedPlan.scenes.length === 0) {
          throw new Error(`Loaded lesson '${lessonParam}' contains no scenes.`);
        }

        // 2. Resolve Active Scene
        let resolvedIdx = -1;
        // Check if sceneParam matches a scene ID
        const idMatchIdx = loadedPlan.scenes.findIndex((s) => s.id === sceneParam);
        if (idMatchIdx !== -1) {
          resolvedIdx = idMatchIdx;
        } else {
          // Try numeric index
          const numericIdx = parseInt(sceneParam, 10);
          if (!isNaN(numericIdx) && numericIdx >= 0 && numericIdx < loadedPlan.scenes.length) {
            resolvedIdx = numericIdx;
          }
        }

        if (resolvedIdx === -1) {
          throw new Error(
            `Scene '${sceneParam}' does not exist in lesson '${lessonParam}'. Valid range: 0 to ${
              loadedPlan.scenes.length - 1
            } or valid scene IDs: ${loadedPlan.scenes.map((s) => s.id).join(", ")}.`
          );
        }

        const scene = loadedPlan.scenes[resolvedIdx];

        // 3. Resolve Duration (from URL, audio manifest duration lookup, or fallback)
        let resolvedDuration = 10;
        if (parsedDuration !== null && !isNaN(parsedDuration) && parsedDuration > 0) {
          resolvedDuration = parsedDuration;
        } else if (p1AudioManifestDurations[scene.id]) {
          resolvedDuration = p1AudioManifestDurations[scene.id];
        } else if (loadedPlan.target_duration_seconds) {
          resolvedDuration = loadedPlan.target_duration_seconds / loadedPlan.scenes.length;
        }

        // 4. Wait for local fonts to settle (guarantees glyph metrics before capture)
        if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        if (!isCancelled) {
          setLessonPlan(loadedPlan);
          setActiveSceneIndex(resolvedIdx);
          setTimeSeconds(parsedTime);
          setDurationSeconds(resolvedDuration);
          setShowCaptions(parsedCaptions);
          setIsReady(true);
        }
      } catch (err) {
        if (!isCancelled) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setIsReady(false);
        }
      }
    };

    initializeFrame();

    return () => {
      isCancelled = true;
    };
  }, [initialSearch]);

  // Expose Playwright helper on window for fast programmatic seeking without full reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __BLU_SEEK_FRAME__?: unknown }).__BLU_SEEK_FRAME__ = (
        time: number,
        duration?: number
      ) => {
        setIsReady(false);
        setTimeSeconds(Math.max(0, time));
        if (duration !== undefined && duration > 0) {
          setDurationSeconds(duration);
        }
        // Next tick readiness
        setTimeout(() => setIsReady(true), 0);
      };
    }
  }, []);

  const activeScene: LessonScene | null = useMemo(() => {
    if (!lessonPlan || !lessonPlan.scenes[activeSceneIndex]) {
      return null;
    }
    return lessonPlan.scenes[activeSceneIndex];
  }, [lessonPlan, activeSceneIndex]);

  const activeCaption = useMemo(() => {
    if (!showCaptions) return "";
    return getActiveCaption(sampleCaptions, timeSeconds);
  }, [showCaptions, timeSeconds]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#050811",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/*
        PLAYWRIGHT CAPTURE TARGET:
        - Fixed 1280x720 canvas
        - data-render-ready: 'true' only when fonts, lesson, and scene are rendered
        - data-render-ready: 'false' during loading or upon error
      */}
      <div
        id="render-root"
        data-testid="render-root"
        data-render-ready={isReady ? "true" : "false"}
        data-render-error={errorMessage ? "true" : "false"}
        data-lesson-title={lessonPlan?.title || ""}
        data-scene-index={activeSceneIndex}
        data-scene-id={activeScene?.id || ""}
        data-scene-type={activeScene?.type || ""}
        data-time-seconds={timeSeconds}
        data-duration-seconds={durationSeconds}
        style={{
          width: 1280,
          height: 720,
          minWidth: 1280,
          minHeight: 720,
          maxWidth: 1280,
          maxHeight: 720,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0B1020",
          boxSizing: "border-box",
        }}
      >
        {errorMessage ? (
          <div
            id="render-error"
            data-testid="render-error"
            style={{
              padding: 48,
              color: "#F87171",
              fontFamily: "sans-serif",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                color: "#EF4444",
                marginBottom: 8,
              }}
            >
              Export Render Error
            </div>
            <h2 style={{ fontSize: 24, margin: "0 0 16px 0", color: "#FEE2E2" }}>
              Unable to render requested frame
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#FCA5A5", margin: 0 }}>
              {errorMessage}
            </p>
          </div>
        ) : activeScene ? (
          <>
            <SceneRenderer
              scene={activeScene}
              timeSeconds={timeSeconds}
              durationSeconds={durationSeconds}
              width={1280}
              height={720}
            />
            {showCaptions && activeCaption && (
              <CaptionTrack
                text={activeCaption}
                visible={true}
                language={lessonPlan?.language}
              />
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#64748B",
              fontFamily: "sans-serif",
              fontSize: 18,
            }}
          >
            Initializing frame render...
          </div>
        )}
      </div>
    </div>
  );
};
