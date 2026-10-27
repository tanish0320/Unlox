import React from "react";
import { SceneRendererProps } from "./sceneTypes";
import { TitleCard } from "./TitleCard";
import { DiagramSceneComponent } from "./DiagramScene";
import { CodeWalkthroughSceneComponent } from "./CodeWalkthroughScene";
import "./sceneStyles.css";

/**
 * Person 3's exact SceneRenderer contract:
 * <SceneRenderer scene={scene} timeSeconds={timeSeconds} durationSeconds={durationSeconds} />
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  timeSeconds,
  durationSeconds,
  currentTime,
  duration,
  width = 1280,
  height = 720,
  className = "",
}) => {
  // Resolve time and duration cleanly, prioritizing Person 3's exact prop names
  const resolvedTime = Number.isFinite(timeSeconds)
    ? timeSeconds
    : Number.isFinite(currentTime)
    ? currentTime!
    : 0;

  const resolvedDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : Number.isFinite(duration) && duration! > 0
    ? duration!
    : 1;

  const safeTime = Math.max(0, resolvedTime);
  const safeDuration = resolvedDuration;

  const renderSceneContent = () => {
    switch (scene.type) {
      case "title_card":
        return (
          <TitleCard
            scene={scene}
            timeSeconds={safeTime}
            durationSeconds={safeDuration}
            currentTime={safeTime}
            duration={safeDuration}
          />
        );

      case "diagram":
        return (
          <DiagramSceneComponent
            scene={scene}
            timeSeconds={safeTime}
            durationSeconds={safeDuration}
            currentTime={safeTime}
            duration={safeDuration}
          />
        );

      case "code_walkthrough":
        return (
          <CodeWalkthroughSceneComponent
            scene={scene}
            timeSeconds={safeTime}
            durationSeconds={safeDuration}
            currentTime={safeTime}
            duration={safeDuration}
          />
        );

      default: {
        const unknownScene = scene as { heading?: string; narration?: string; type?: string };
        return (
          <div
            className="blu-stage-inner"
            data-testid="blu-unknown-scene"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div className="blu-scene-badge" style={{ marginBottom: 16 }}>
              Notice: Unsupported Scene ({String(unknownScene.type)})
            </div>
            <h2 className="blu-title-heading" style={{ fontSize: 32 }}>
              {unknownScene.heading || "Educational Concept"}
            </h2>
            {unknownScene.narration && (
              <p className="blu-title-subtitle" style={{ marginTop: 12 }}>
                {unknownScene.narration}
              </p>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div
      className={`blu-stage ${className}`}
      style={{
        maxWidth: width,
        maxHeight: height,
      }}
      data-testid="blu-scene-renderer"
      data-scene-type={scene.type}
      data-time-seconds={safeTime}
      data-duration-seconds={safeDuration}
    >
      {renderSceneContent()}
    </div>
  );
};
