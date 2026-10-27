import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { SceneRenderer } from "./components/scenes/SceneRenderer";
import { CaptionTrack, getActiveCaption } from "./components/CaptionTrack";
import { NotesPreview } from "./components/NotesPreview";
import { sampleLesson } from "./fixtures/sampleLesson";
import { sampleCaptions } from "./fixtures/sampleCaptions";
import { sampleNotes } from "./fixtures/sampleNotes";
import { RenderPage } from "./render/RenderPage";

// Lightweight pathname routing to support /render without third-party router dependency
const isRenderRoute =
  typeof window !== "undefined" &&
  (window.location.pathname === "/render" ||
    window.location.pathname.startsWith("/render/") ||
    new URLSearchParams(window.location.search).get("mode") === "render");

const App: React.FC = () => {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const duration = 10; // 10 seconds per scene

  const scene = sampleLesson.scenes[currentSceneIdx];
  const activeCaptionText = getActiveCaption(sampleCaptions, currentTime);

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ color: "#F8FAFC", fontFamily: "sans-serif" }}>
        Blu Visual Teacher — Person 4 Scene Component Preview
      </h1>
      <div style={{ position: "relative", width: "100%", maxWidth: 1280, marginBottom: 24 }}>
        {/* Person 3 expected contract */}
        <SceneRenderer
          scene={scene}
          timeSeconds={currentTime}
          durationSeconds={duration}
        />
        {/* Person 3 expected contract */}
        <CaptionTrack
          text={activeCaptionText}
          visible={captionsVisible}
        />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 32, flexWrap: "wrap" }}>
        <button
          onClick={() => setCurrentSceneIdx((idx) => Math.max(0, idx - 1))}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Previous Scene
        </button>
        <button
          onClick={() =>
            setCurrentSceneIdx((idx) => Math.min(sampleLesson.scenes.length - 1, idx + 1))
          }
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Next Scene
        </button>
        <button
          onClick={() => {
            window.location.href = "/render?lesson=default&scene=0&t=2.5";
          }}
          style={{ padding: "8px 16px", cursor: "pointer", background: "#38BDF8", color: "#0B1020", fontWeight: "bold" }}
        >
          Open /render Route
        </button>
        <label style={{ color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={captionsVisible}
            onChange={(e) => setCaptionsVisible(e.target.checked)}
          />
          Captions Visible
        </label>
        <label style={{ color: "#F8FAFC", marginLeft: 16 }}>
          Time: {currentTime.toFixed(1)}s / {duration}s
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            style={{ marginLeft: 12, width: 240 }}
          />
        </label>
      </div>
      {/* Person 3 expected contract */}
      <NotesPreview notes={sampleNotes} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isRenderRoute ? <RenderPage /> : <App />}
  </React.StrictMode>
);
