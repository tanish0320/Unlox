import React from "react";
import { LessonPlan, LessonPart, LessonScene } from "../scenes/sceneTypes";

export interface PartSidebarProps {
  lessonPlan: LessonPlan;
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onMoveSceneUp: (sceneId: string) => void;
  onMoveSceneDown: (sceneId: string) => void;
  onMoveSceneToPart: (sceneId: string, targetPartId: string) => void;
  onExportPart: (partId: string) => void;
  onPlayPart: (partId: string) => void;
  sceneDurations: Record<string, number>;
  unsavedSceneIds: Set<string>;
}

export const PartSidebar: React.FC<PartSidebarProps> = ({
  lessonPlan,
  activeSceneId,
  onSelectScene,
  onMoveSceneUp,
  onMoveSceneDown,
  onMoveSceneToPart,
  onExportPart,
  onPlayPart,
  sceneDurations,
  unsavedSceneIds,
}) => {
  const parts = lessonPlan.parts || [];
  const scenes = lessonPlan.scenes || [];
  const sceneMap = new Map<string, LessonScene>(scenes.map((s) => [s.id, s]));

  return (
    <div
      style={{
        width: "300px",
        background: "#090d16",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1e293b",
          background: "#0d1322",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Parts &amp; Scenes Hierarchy
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              background: "#1e293b",
              color: "#38bdf8",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            {parts.length} {parts.length === 1 ? "Part" : "Parts"}
          </span>
        </div>
      </div>

      {/* Parts List */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {parts.map((part, pIdx) => {
          // Calculate part duration from contained scene durations
          const partDuration = part.scene_ids.reduce((acc, sid) => acc + (sceneDurations[sid] || 30.0), 0);

          return (
            <div
              key={part.part_id}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {/* Part Header */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "#131c31",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>
                    Part {part.part_number}: {part.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    ~{Math.round(partDuration)}s
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                  <button
                    onClick={() => onPlayPart(part.part_id)}
                    title="Play all scenes in this part"
                    style={{
                      padding: "3px 8px",
                      background: "#1e293b",
                      color: "#e2e8f0",
                      border: "1px solid #334155",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>▶</span> Play Part
                  </button>
                  <button
                    onClick={() => onExportPart(part.part_id)}
                    title="Export only this part as standalone MP4"
                    style={{
                      padding: "3px 8px",
                      background: "rgba(56, 189, 248, 0.1)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    Export Video
                  </button>
                </div>
              </div>

              {/* Contained Scenes */}
              <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {part.scene_ids.map((sid, sIdx) => {
                  const scene = sceneMap.get(sid);
                  if (!scene) return null;
                  const isActive = scene.id === activeSceneId;
                  const isUnsaved = unsavedSceneIds.has(scene.id);
                  const isEdited = scene.is_edited;
                  const dur = sceneDurations[scene.id] || 30.0;

                  return (
                    <div
                      key={scene.id}
                      onClick={() => onSelectScene(scene.id)}
                      style={{
                        padding: "8px 10px",
                        background: isActive ? "#1e293b" : "#0b1120",
                        border: `1px solid ${isActive ? "#38bdf8" : isUnsaved ? "#f59e0b" : "#1e293b"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "#64748b",
                              background: "#090d16",
                              padding: "2px 5px",
                              borderRadius: "3px",
                            }}
                          >
                            #{sIdx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color: isActive ? "#ffffff" : "#cbd5e1",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "140px",
                            }}
                          >
                            {scene.heading || "Untitled Scene"}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            {Math.round(dur)}s
                          </span>
                          {isUnsaved ? (
                            <span
                              title="Unsaved modifications"
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: "#f59e0b",
                              }}
                            />
                          ) : isEdited ? (
                            <span
                              title="Edited scene"
                              style={{
                                fontSize: "0.65rem",
                                color: "#34d399",
                                background: "rgba(16, 185, 129, 0.15)",
                                padding: "1px 4px",
                                borderRadius: "3px",
                              }}
                            >
                              mod
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Scene Order & Move Controls */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.7rem",
                          color: "#64748b",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ textTransform: "uppercase", fontSize: "0.65rem" }}>
                          {scene.type.replace("_", " ")}
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => onMoveSceneUp(scene.id)}
                            title="Move scene up"
                            disabled={sIdx === 0 && pIdx === 0}
                            style={{
                              background: "transparent",
                              border: "1px solid #334155",
                              color: "#94a3b8",
                              borderRadius: "3px",
                              padding: "0 4px",
                              cursor: sIdx === 0 && pIdx === 0 ? "not-allowed" : "pointer",
                              opacity: sIdx === 0 && pIdx === 0 ? 0.3 : 1,
                              fontSize: "0.7rem",
                            }}
                          >
                            &uarr;
                          </button>
                          <button
                            onClick={() => onMoveSceneDown(scene.id)}
                            title="Move scene down"
                            disabled={sIdx === part.scene_ids.length - 1 && pIdx === parts.length - 1}
                            style={{
                              background: "transparent",
                              border: "1px solid #334155",
                              color: "#94a3b8",
                              borderRadius: "3px",
                              padding: "0 4px",
                              cursor: sIdx === part.scene_ids.length - 1 && pIdx === parts.length - 1 ? "not-allowed" : "pointer",
                              opacity: sIdx === part.scene_ids.length - 1 && pIdx === parts.length - 1 ? 0.3 : 1,
                              fontSize: "0.7rem",
                            }}
                          >
                            &darr;
                          </button>
                          {parts.length > 1 && (
                            <select
                              value={part.part_id}
                              onChange={(e) => onMoveSceneToPart(scene.id, e.target.value)}
                              title="Move scene to different part"
                              style={{
                                background: "#090d16",
                                border: "1px solid #334155",
                                color: "#94a3b8",
                                borderRadius: "3px",
                                fontSize: "0.65rem",
                                padding: "0 2px",
                                cursor: "pointer",
                              }}
                            >
                              {parts.map((p) => (
                                <option key={p.part_id} value={p.part_id}>
                                  To Part {p.part_number}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
