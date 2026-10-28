import React, { useState, useEffect, useRef, useCallback } from "react";
import { LessonPlan, LessonScene, AudioManifest } from "../scenes/sceneTypes";
import { SceneRenderer } from "../scenes/SceneRenderer";
import { CaptionTrack, getActiveCaption } from "../CaptionTrack";
import { PartSidebar } from "./PartSidebar";
import { PropertiesPanel } from "./PropertiesPanel";

export interface SceneEditorProps {
  initialLessonPlan: LessonPlan;
  initialAudioManifest?: AudioManifest;
  lessonId: string;
  onClose?: () => void;
  onOpenWhatIfLab?: () => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
  initialLessonPlan,
  initialAudioManifest,
  lessonId,
  onClose,
  onOpenWhatIfLab,
}) => {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan>(initialLessonPlan);
  const [audioManifest, setAudioManifest] = useState<AudioManifest | undefined>(initialAudioManifest);

  // Active navigation state
  const scenes = lessonPlan.scenes || [];
  const parts = lessonPlan.parts || [];
  const [activeSceneId, setActiveSceneId] = useState<string>(scenes[0]?.id || "");

  // Undo / Redo history
  const [history, setHistory] = useState<LessonPlan[]>([initialLessonPlan]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [unsavedSceneIds, setUnsavedSceneIds] = useState<Set<string>>(new Set());

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackScope, setPlaybackScope] = useState<"scene" | "part" | "lesson">("scene");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Status & notifications
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAudioRebuilding, setIsAudioRebuilding] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Map measured durations from audio manifest
  const sceneDurations = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (audioManifest && audioManifest.entries) {
      for (const entry of audioManifest.entries) {
        map[entry.scene_id] = entry.duration_seconds;
      }
    }
    // Fallback for scenes not in manifest
    for (const sc of scenes) {
      if (!map[sc.id]) map[sc.id] = 30.0;
    }
    return map;
  }, [audioManifest, scenes]);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0] || null;
  const activeDuration = activeScene ? sceneDurations[activeScene.id] || 30.0 : 30.0;

  // Push new state to undo/redo history
  const pushHistory = (newPlan: LessonPlan) => {
    const sliced = history.slice(0, historyIndex + 1);
    setHistory([...sliced, newPlan]);
    setHistoryIndex(sliced.length);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setLessonPlan(prev);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setLessonPlan(next);
    }
  }, [history, historyIndex]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Stop playback on active scene change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [activeSceneId]);

  // Audio playback synchronization
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const startTime = performance.now() - currentTime * 1000;
    const loop = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= activeDuration) {
        // Handle end of scene
        if (playbackScope === "scene") {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          // Advance to next scene in part or lesson
          advancePlayback();
        }
      } else {
        setCurrentTime(elapsed);
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, activeDuration, playbackScope, currentTime]);

  const advancePlayback = () => {
    if (!activeScene) return;
    if (playbackScope === "part") {
      const currentPart = parts.find((p) => p.scene_ids.includes(activeScene.id));
      if (currentPart) {
        const idx = currentPart.scene_ids.indexOf(activeScene.id);
        if (idx < currentPart.scene_ids.length - 1) {
          setActiveSceneId(currentPart.scene_ids[idx + 1]);
          setCurrentTime(0);
          return;
        }
      }
    } else if (playbackScope === "lesson") {
      const idx = scenes.findIndex((s) => s.id === activeScene.id);
      if (idx < scenes.length - 1) {
        setActiveSceneId(scenes[idx + 1].id);
        setCurrentTime(0);
        return;
      }
    }
    // Completed sequence
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Scene editing handler (with selective invalidation)
  const handleUpdateActiveScene = (updatedFields: Partial<LessonScene>, isNarrationChange: boolean) => {
    if (!activeScene) return;

    const nextScenes = scenes.map((sc) => {
      if (sc.id === activeScene.id) {
        return {
          ...sc,
          ...updatedFields,
          is_edited: true,
        } as LessonScene;
      }
      return sc;
    });

    const nextPlan = { ...lessonPlan, scenes: nextScenes };
    setLessonPlan(nextPlan);
    pushHistory(nextPlan);

    setUnsavedSceneIds((prev) => new Set(prev).add(activeScene.id));
  };

  // Reorder scene Up
  const handleMoveSceneUp = (sceneId: string) => {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx <= 0) return;
    const nextScenes = [...scenes];
    const temp = nextScenes[idx - 1];
    nextScenes[idx - 1] = nextScenes[idx];
    nextScenes[idx] = temp;

    // Synchronize parts
    const nextParts = parts.map((p) => {
      if (p.scene_ids.includes(sceneId)) {
        const pIdx = p.scene_ids.indexOf(sceneId);
        if (pIdx > 0) {
          const nextIds = [...p.scene_ids];
          const t = nextIds[pIdx - 1];
          nextIds[pIdx - 1] = nextIds[pIdx];
          nextIds[pIdx] = t;
          return { ...p, scene_ids: nextIds };
        }
      }
      return p;
    });

    const nextPlan = { ...lessonPlan, scenes: nextScenes, parts: nextParts };
    setLessonPlan(nextPlan);
    pushHistory(nextPlan);
    setUnsavedSceneIds((prev) => new Set(prev).add(sceneId));
  };

  // Reorder scene Down
  const handleMoveSceneDown = (sceneId: string) => {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1 || idx >= scenes.length - 1) return;
    const nextScenes = [...scenes];
    const temp = nextScenes[idx + 1];
    nextScenes[idx + 1] = nextScenes[idx];
    nextScenes[idx] = temp;

    const nextParts = parts.map((p) => {
      if (p.scene_ids.includes(sceneId)) {
        const pIdx = p.scene_ids.indexOf(sceneId);
        if (pIdx < p.scene_ids.length - 1) {
          const nextIds = [...p.scene_ids];
          const t = nextIds[pIdx + 1];
          nextIds[pIdx + 1] = nextIds[pIdx];
          nextIds[pIdx] = t;
          return { ...p, scene_ids: nextIds };
        }
      }
      return p;
    });

    const nextPlan = { ...lessonPlan, scenes: nextScenes, parts: nextParts };
    setLessonPlan(nextPlan);
    pushHistory(nextPlan);
    setUnsavedSceneIds((prev) => new Set(prev).add(sceneId));
  };

  // Move scene to different part
  const handleMoveSceneToPart = (sceneId: string, targetPartId: string) => {
    const nextParts = parts.map((p) => {
      if (p.scene_ids.includes(sceneId) && p.part_id !== targetPartId) {
        return { ...p, scene_ids: p.scene_ids.filter((id) => id !== sceneId) };
      }
      if (p.part_id === targetPartId && !p.scene_ids.includes(sceneId)) {
        return { ...p, scene_ids: [...p.scene_ids, sceneId] };
      }
      return p;
    });

    const nextScenes = scenes.map((s) => {
      if (s.id === sceneId) {
        return { ...s, part_id: targetPartId, is_edited: true };
      }
      return s;
    });

    const nextPlan = { ...lessonPlan, scenes: nextScenes, parts: nextParts };
    setLessonPlan(nextPlan);
    pushHistory(nextPlan);
    setUnsavedSceneIds((prev) => new Set(prev).add(sceneId));
  };

  // Save changes to backend via PUT /api/lessons/{lessonId}/scenes/{sceneId}
  const handleSaveActiveScene = async () => {
    if (!activeScene) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        heading: activeScene.heading,
        narration: activeScene.narration,
        part_id: activeScene.part_id,
        items: (activeScene as any).items,
        layout: (activeScene as any).layout,
        diagram_type: (activeScene as any).diagram_type,
        code: (activeScene as any).code,
        code_language: (activeScene as any).code_language,
        highlight_lines: (activeScene as any).highlight_lines,
        expected_output: (activeScene as any).expected_output,
        subtitle: (activeScene as any).subtitle,
        key_points: (activeScene as any).key_points,
      };

      const res = await fetch(`/api/lessons/${lessonId}/scenes/${activeScene.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to save scene (${res.status})`);
      }

      const data = await res.json();
      setUnsavedSceneIds((prev) => {
        const next = new Set(prev);
        next.delete(activeScene.id);
        return next;
      });

      setStatusMessage(
        data.audio_rebuilt
          ? "Scene saved & speech re-synthesized successfully!"
          : "Visual scene changes saved immediately (audio preserved)!"
      );
    } catch (err: any) {
      setStatusMessage(`Error saving: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scene to original
  const handleResetActiveScene = async () => {
    if (!activeScene) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/scenes/${activeScene.id}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scene) {
          const nextScenes = scenes.map((s) => (s.id === activeScene.id ? data.scene : s));
          setLessonPlan({ ...lessonPlan, scenes: nextScenes });
          setUnsavedSceneIds((prev) => {
            const next = new Set(prev);
            next.delete(activeScene.id);
            return next;
          });
          setStatusMessage("Scene restored to original generated version.");
        }
      }
    } catch (err: any) {
      setStatusMessage(`Reset failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Re-synthesize audio only
  const handleResynthesizeAudio = async () => {
    if (!activeScene) return;
    setIsAudioRebuilding(true);
    setStatusMessage("Re-synthesizing neural audio...");
    try {
      await handleSaveActiveScene();
    } finally {
      setIsAudioRebuilding(false);
    }
  };

  // Export individual part independently
  const handleExportPart = async (partId: string) => {
    setStatusMessage(`Exporting Part ${partId} to MP4...`);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/parts/${partId}/export`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Part export failed");
      const data = await res.json();
      setStatusMessage(`Part ${partId} exported successfully! [Download MP4](${data.video_url})`);
      if (data.video_url) {
        window.open(data.video_url, "_blank");
      }
    } catch (err: any) {
      setStatusMessage(`Part export error: ${err.message}`);
    }
  };

  // Active caption
  const activeCaption = activeScene
    ? getActiveCaption(
        audioManifest?.entries?.find((e) => e.scene_id === activeScene.id)?.caption_segments,
        currentTime
      ) || activeScene.narration
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        background: "#030712",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Top Navigation Bar */}
      <div
        style={{
          height: "56px",
          borderBottom: "1px solid #1e293b",
          background: "#090d16",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8" }}>
            Blu Scene Editor
          </span>
          <span style={{ color: "#64748b" }}>&middot;</span>
          <span style={{ fontSize: "0.9rem", color: "#e2e8f0", fontWeight: 600 }}>
            {lessonPlan.title}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              background: "#1e293b",
              color: "#94a3b8",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {scenes.length} Scenes &middot; {parts.length} Parts
          </span>
        </div>

        {/* Action Controls & Undo/Redo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {statusMessage && (
            <span style={{ fontSize: "0.8rem", color: "#38bdf8", marginRight: "8px" }}>
              {statusMessage}
            </span>
          )}

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            style={{
              padding: "5px 10px",
              background: "#1e293b",
              color: historyIndex <= 0 ? "#475569" : "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "4px",
              cursor: historyIndex <= 0 ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
            }}
          >
            &larr; Undo
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            style={{
              padding: "5px 10px",
              background: "#1e293b",
              color: historyIndex >= history.length - 1 ? "#475569" : "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "4px",
              cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
            }}
          >
            Redo &rarr;
          </button>

          {onOpenWhatIfLab && (
            <button
              onClick={onOpenWhatIfLab}
              style={{
                padding: "6px 12px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid #0284c7",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔬</span> What-If Lab
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Back to Player
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Hierarchy & Parts Sidebar */}
        <PartSidebar
          lessonPlan={lessonPlan}
          activeSceneId={activeSceneId}
          onSelectScene={setActiveSceneId}
          onMoveSceneUp={handleMoveSceneUp}
          onMoveSceneDown={handleMoveSceneDown}
          onMoveSceneToPart={handleMoveSceneToPart}
          onExportPart={handleExportPart}
          onPlayPart={(partId) => {
            const p = parts.find((pt) => pt.part_id === partId);
            if (p && p.scene_ids.length > 0) {
              setActiveSceneId(p.scene_ids[0]);
              setPlaybackScope("part");
              setCurrentTime(0);
              setIsPlaying(true);
            }
          }}
          sceneDurations={sceneDurations}
          unsavedSceneIds={unsavedSceneIds}
        />

        {/* Center: Live Preview & Playback Scrubber */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#02040a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Canvas Preview Container */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              boxSizing: "border-box",
            }}
          >
            {activeScene ? (
              <div
                style={{
                  width: "100%",
                  maxWidth: "960px",
                  aspectRatio: "16 / 9",
                  background: "#090d16",
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                  position: "relative",
                }}
              >
                <SceneRenderer
                  scene={activeScene}
                  timeSeconds={currentTime}
                  durationSeconds={activeDuration}
                />

                {/* Burned-in caption bar overlay */}
                <CaptionTrack text={activeCaption} visible={Boolean(activeCaption)} />
              </div>
            ) : (
              <div style={{ color: "#64748b" }}>No scene selected</div>
            )}
          </div>

          {/* Bottom Playback Toolbar */}
          <div
            style={{
              height: "72px",
              background: "#090d16",
              borderTop: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              gap: "20px",
            }}
          >
            {/* Play / Pause & Scrubber */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#0284c7",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <input
                  type="range"
                  min="0"
                  max={activeDuration}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentTime(parseFloat(e.target.value));
                  }}
                  style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{activeDuration.toFixed(1)}s</span>
                </div>
              </div>
            </div>

            {/* Scope Selection */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => {
                  setPlaybackScope("scene");
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                style={{
                  padding: "6px 12px",
                  background: playbackScope === "scene" ? "#1e293b" : "transparent",
                  color: playbackScope === "scene" ? "#38bdf8" : "#94a3b8",
                  border: `1px solid ${playbackScope === "scene" ? "#38bdf8" : "#334155"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Play Scene
              </button>

              <button
                onClick={() => {
                  setPlaybackScope("part");
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                style={{
                  padding: "6px 12px",
                  background: playbackScope === "part" ? "#1e293b" : "transparent",
                  color: playbackScope === "part" ? "#38bdf8" : "#94a3b8",
                  border: `1px solid ${playbackScope === "part" ? "#38bdf8" : "#334155"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Play Part
              </button>

              <button
                onClick={() => {
                  setPlaybackScope("lesson");
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                style={{
                  padding: "6px 12px",
                  background: playbackScope === "lesson" ? "#1e293b" : "transparent",
                  color: playbackScope === "lesson" ? "#38bdf8" : "#94a3b8",
                  border: `1px solid ${playbackScope === "lesson" ? "#38bdf8" : "#334155"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Play Full Lesson
              </button>
            </div>
          </div>
        </div>

        {/* Right: Properties & Narration Editor */}
        <PropertiesPanel
          scene={activeScene}
          onUpdateScene={handleUpdateActiveScene}
          onSaveScene={handleSaveActiveScene}
          onResetScene={handleResetActiveScene}
          onResynthesizeAudio={handleResynthesizeAudio}
          measuredDuration={activeDuration}
          isSaving={isSaving}
          isAudioRebuilding={isAudioRebuilding}
          hasUnsavedChanges={unsavedSceneIds.has(activeScene?.id || "")}
        />
      </div>
    </div>
  );
};
