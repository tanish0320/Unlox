import React, { useState, useEffect } from "react";
import { LessonScene, DiagramScene, CodeWalkthroughScene, TitleCardScene } from "../scenes/sceneTypes";

export interface PropertiesPanelProps {
  scene: LessonScene | null;
  onUpdateScene: (updatedFields: Partial<LessonScene>, isNarrationChange: boolean) => void;
  onSaveScene: () => void;
  onResetScene: () => void;
  onResynthesizeAudio: () => void;
  measuredDuration?: number;
  isSaving: boolean;
  isAudioRebuilding: boolean;
  hasUnsavedChanges: boolean;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  scene,
  onUpdateScene,
  onSaveScene,
  onResetScene,
  onResynthesizeAudio,
  measuredDuration = 30.0,
  isSaving,
  isAudioRebuilding,
  hasUnsavedChanges,
}) => {
  const [heading, setHeading] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Sync internal state when active scene changes
  useEffect(() => {
    if (scene) {
      setHeading(scene.heading || "");
      setNarration(scene.narration || "");
      setShowResetConfirm(false);
    }
  }, [scene?.id]);

  if (!scene) {
    return (
      <div
        style={{
          width: "360px",
          background: "#090d16",
          borderLeft: "1px solid #1e293b",
          padding: "24px",
          color: "#64748b",
          fontSize: "0.875rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Select a scene to edit its properties
      </div>
    );
  }

  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  // Standard speech rate: ~140 words per minute => ~2.33 words per second
  const estimatedSeconds = Math.max(2.0, Math.round((words / 2.33) * 10) / 10);

  const handleHeadingChange = (newVal: string) => {
    setHeading(newVal);
    onUpdateScene({ heading: newVal }, false);
  };

  const handleNarrationChange = (newVal: string) => {
    setNarration(newVal);
    onUpdateScene({ narration: newVal }, true);
  };

  return (
    <div
      style={{
        width: "360px",
        background: "#090d16",
        borderLeft: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1e293b",
          background: "#0d1322",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Scene Properties
          </span>
          <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "2px" }}>
            {scene.id} &middot; {scene.type.replace("_", " ")}
          </div>
        </div>

        {hasUnsavedChanges && (
          <span
            style={{
              fontSize: "0.7rem",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "2px 8px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Unsaved Changes
          </span>
        )}
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Heading Input */}
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
            Scene Heading
          </label>
          <input
            type="text"
            value={heading}
            onChange={(e) => handleHeadingChange(e.target.value)}
            placeholder="Enter scene on-screen title..."
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#ffffff",
              fontSize: "0.875rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Narration Script Textarea */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1" }}>
              Narration Script (TTS Audio)
            </label>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
              {words} words &middot; ~{estimatedSeconds}s est.
            </span>
          </div>
          <textarea
            value={narration}
            onChange={(e) => handleNarrationChange(e.target.value)}
            rows={5}
            placeholder="Spoken narration script..."
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#ffffff",
              fontSize: "0.85rem",
              lineHeight: 1.4,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>
            Measured WAV audio: <strong>{measuredDuration.toFixed(2)}s</strong>
          </div>
        </div>

        {/* Dynamic Visual Properties Editor */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#38bdf8", textTransform: "uppercase" }}>
            Visual Parameters
          </h4>

          {/* Diagram Type Editor */}
          {scene.type === "diagram" && (() => {
            const diag = scene as DiagramScene;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Diagram Layout
                  </label>
                  <select
                    value={diag.layout || "horizontal"}
                    onChange={(e) => onUpdateScene({ layout: e.target.value as any }, false)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <option value="horizontal">Horizontal Flow</option>
                    <option value="vertical">Vertical Flow</option>
                    <option value="cycle">Cycle / Loop</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Diagram Category
                  </label>
                  <select
                    value={diag.diagram_type || "flowchart"}
                    onChange={(e) => onUpdateScene({ diagram_type: e.target.value as any }, false)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <option value="flowchart">Flowchart / Concept Nodes</option>
                    <option value="fraction_bar">Fraction Bar Strip</option>
                    <option value="number_line">Number Line</option>
                    <option value="proportion_table">Proportion Table</option>
                    <option value="science_diagram">Science Diagram</option>
                  </select>
                </div>

                {diag.items && (
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                      Nodes / Steps ({diag.items.length})
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {diag.items.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const newItems = [...(diag.items || [])];
                              newItems[idx] = e.target.value;
                              onUpdateScene({ items: newItems }, false);
                            }}
                            style={{
                              flex: 1,
                              padding: "4px 8px",
                              background: "#1e293b",
                              border: "1px solid #334155",
                              color: "#ffffff",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}
                          />
                          <button
                            onClick={() => {
                              const newItems = (diag.items || []).filter((_, i) => i !== idx);
                              onUpdateScene({ items: newItems }, false);
                            }}
                            style={{
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "#f87171",
                              border: "none",
                              borderRadius: "4px",
                              padding: "0 6px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const currentItems = diag.items || [];
                          const newItems = [...currentItems, `Step ${currentItems.length + 1}`];
                          onUpdateScene({ items: newItems }, false);
                        }}
                        style={{
                          padding: "4px 8px",
                          background: "#1e293b",
                          border: "1px dashed #475569",
                          color: "#38bdf8",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          marginTop: "2px",
                        }}
                      >
                        + Add Node
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Code Walkthrough Editor */}
          {scene.type === "code_walkthrough" && (() => {
            const codeScene = scene as CodeWalkthroughScene;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Programming Language
                  </label>
                  <input
                    type="text"
                    value={codeScene.code_language || "python"}
                    onChange={(e) => onUpdateScene({ code_language: e.target.value }, false)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Code Snippet
                  </label>
                  <textarea
                    value={codeScene.code || ""}
                    onChange={(e) => onUpdateScene({ code: e.target.value }, false)}
                    rows={6}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#090d16",
                      border: "1px solid #334155",
                      color: "#38bdf8",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Highlighted Lines (comma-separated, e.g. 1, 3)
                  </label>
                  <input
                    type="text"
                    value={(codeScene.highlight_lines || []).join(", ")}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split(",")
                        .map((s) => parseInt(s.trim(), 10))
                        .filter((n) => !isNaN(n));
                      onUpdateScene({ highlight_lines: lines }, false);
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Title Card Editor */}
          {scene.type === "title_card" && (() => {
            const titleScene = scene as TitleCardScene;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Subtitle Tagline
                  </label>
                  <input
                    type="text"
                    value={titleScene.subtitle || ""}
                    onChange={(e) => onUpdateScene({ subtitle: e.target.value }, false)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          <button
            onClick={onSaveScene}
            disabled={isSaving}
            style={{
              padding: "10px 16px",
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: isSaving ? "wait" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isSaving ? "Saving & Syncing..." : "Save Scene Changes"}
          </button>

          <button
            onClick={onResynthesizeAudio}
            disabled={isAudioRebuilding}
            style={{
              padding: "8px 14px",
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: isAudioRebuilding ? "wait" : "pointer",
            }}
          >
            {isAudioRebuilding ? "Re-synthesizing Audio..." : "Re-synthesize Audio Only"}
          </button>

          {/* Reset Action with Confirmation */}
          {scene.is_edited && (
            <div style={{ marginTop: "4px" }}>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Reset Scene to Original
                </button>
              ) : (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: "0 0 6px 0", fontSize: "0.75rem", color: "#fca5a5" }}>
                    Discard all edits to this scene?
                  </p>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                    <button
                      onClick={() => {
                        setShowResetConfirm(false);
                        onResetScene();
                      }}
                      style={{
                        padding: "4px 10px",
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Yes, Reset
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      style={{
                        padding: "4px 10px",
                        background: "#334155",
                        color: "#cbd5e1",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
