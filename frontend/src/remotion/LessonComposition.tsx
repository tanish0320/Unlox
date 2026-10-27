import React from "react";
import { Series, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { LessonPlan, AudioManifest } from "../components/scenes/sceneTypes";
import { SceneRenderer } from "../components/scenes/SceneRenderer";
import "../styles/appDesign.css";
import "../styles/fonts.css";
import "../styles/sceneTokens.css";
import "../components/scenes/sceneStyles.css";

export interface LessonCompositionProps {
  lessonPlan: LessonPlan;
  audioManifest: AudioManifest;
  audioSrc?: string;
}

export const LessonComposition: React.FC<LessonCompositionProps> = ({
  lessonPlan,
  audioManifest,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalTimeSeconds = frame / fps;

  // Active caption resolution
  let activeCaption = "";
  if (audioManifest && audioManifest.entries) {
    for (const entry of audioManifest.entries) {
      if (!entry.caption_segments) continue;
      for (const seg of entry.caption_segments) {
        const start =
          seg.global_start_seconds !== undefined && seg.global_start_seconds !== null
            ? seg.global_start_seconds
            : seg.start_seconds;
        const end =
          seg.global_end_seconds !== undefined && seg.global_end_seconds !== null
            ? seg.global_end_seconds
            : seg.end_seconds;

        if (globalTimeSeconds >= start && globalTimeSeconds < end) {
          activeCaption = seg.text;
          break;
        }
      }
      if (activeCaption) break;
    }
  }

  // Pre-calculate duration in frames for each scene
  const sceneDurations = lessonPlan.scenes.map((scene, idx) => {
    const entry = audioManifest?.entries?.find((e) => e.scene_id === scene.id);
    const durationSeconds = entry?.duration_seconds && entry.duration_seconds > 0
      ? entry.duration_seconds + (idx < lessonPlan.scenes.length - 1 ? 0.3 : 0.0)
      : 5.0;
    return Math.max(1, Math.round(durationSeconds * fps));
  });

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        position: "relative",
        backgroundColor: "#FBF9F4",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Visual Scenes Series */}
      <Series>
        {lessonPlan.scenes.map((scene, idx) => {
          const durationInFrames = sceneDurations[idx];
          const durationSeconds = durationInFrames / fps;

          return (
            <Series.Sequence key={scene.id} durationInFrames={durationInFrames}>
              <SceneFrameWrapper
                scene={scene}
                durationSeconds={durationSeconds}
              />
            </Series.Sequence>
          );
        })}
      </Series>

      {/* Burned-in Remotion Caption Pill */}
      {activeCaption ? (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0 60px",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1.5px solid rgba(232, 226, 213, 0.9)",
              color: "#1C2B38",
              fontSize: 20,
              fontWeight: 600,
              padding: "10px 24px",
              borderRadius: 9999,
              backdropFilter: "blur(12px)",
              textAlign: "center",
              maxWidth: 960,
              boxShadow: "0 8px 32px rgba(28, 43, 56, 0.12)",
              lineHeight: 1.4,
            }}
          >
            {activeCaption}
          </div>
        </div>
      ) : null}

      {/* Synchronized Master Audio Track */}
      {audioSrc ? <Audio src={audioSrc} /> : null}
    </div>
  );
};

const SceneFrameWrapper: React.FC<{
  scene: any;
  durationSeconds: number;
}> = ({ scene, durationSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSeconds = frame / fps;

  return (
    <div style={{ width: 1280, height: 720 }}>
      <SceneRenderer
        scene={scene}
        timeSeconds={timeSeconds}
        durationSeconds={durationSeconds}
        width={1280}
        height={720}
      />
    </div>
  );
};
