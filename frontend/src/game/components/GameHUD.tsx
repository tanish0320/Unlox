import React, { useState, useEffect } from "react";
import { ClassroomDef, RoomId, StudentProgress } from "../types";
import { CLASSROOMS } from "../data/classrooms";

interface GameHUDProps {
  currentRoom: ClassroomDef;
  progress: StudentProgress;
  onSelectRoom: (roomId: RoomId) => void;
  onOpenProgress: () => void;
  onExitGame: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentRoom,
  progress,
  onSelectRoom,
  onOpenProgress,
  onExitGame,
}) => {
  const [showFastTravel, setShowFastTravel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false;
  });

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request not permitted or unsupported:", err);
    }
  };

  const xpPercent = Math.min(100, Math.round((progress.currentXP / progress.nextLevelXP) * 100));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        zIndex: 20,
        fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Top Left: Current Room & Fast Travel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, pointerEvents: "auto" }}>
        <div
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(6px)",
            padding: "8px 16px",
            borderRadius: 12,
            border: `1.5px solid ${currentRoom.accentColor}`,
            color: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>
            {currentRoom.id === "corridor" && "🏛️"}
            {currentRoom.id === "maths" && "📐"}
            {currentRoom.id === "cs" && "💻"}
            {currentRoom.id === "physics" && "🔭"}
            {currentRoom.id === "chemistry" && "⚗️"}
            {currentRoom.id === "biology" && "🌿"}
            {currentRoom.id === "social" && "🏺"}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {currentRoom.name}
            </div>
            {currentRoom.teacher && (
              <div style={{ fontSize: 11, color: currentRoom.accentColor, fontWeight: 600 }}>
                Instructor: {currentRoom.teacher.name}
              </div>
            )}
          </div>
        </div>

        {/* Fast Travel / Quick Nav Button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFastTravel(!showFastTravel)}
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#F8FAFC",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            }}
          >
            <span>🗺️ Map & Quick Visit</span>
            <span style={{ fontSize: 10 }}>{showFastTravel ? "▲" : "▼"}</span>
          </button>

          {showFastTravel && (
            <div
              style={{
                position: "absolute",
                top: 36,
                left: 0,
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: 12,
                padding: 8,
                width: 240,
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  padding: "4px 8px",
                }}
              >
                Teleport to Room
              </div>
              {Object.values(CLASSROOMS).map((room) => {
                const isCurrent = room.id === currentRoom.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      onSelectRoom(room.id);
                      setShowFastTravel(false);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      backgroundColor: isCurrent ? `${room.accentColor}30` : "transparent",
                      color: isCurrent ? room.accentColor : "#E2E8F0",
                      fontSize: 12,
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>
                      {room.id === "corridor" && "🏛️"}
                      {room.id === "maths" && "📐"}
                      {room.id === "cs" && "💻"}
                      {room.id === "physics" && "🔭"}
                      {room.id === "chemistry" && "⚗️"}
                      {room.id === "biology" && "🌿"}
                      {room.id === "social" && "🏺"}
                    </span>
                    <span>{room.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Player Stats & Exit to Studio */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
        {/* XP and Level Pill */}
        <div
          onClick={onOpenProgress}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(6px)",
            padding: "8px 14px",
            borderRadius: 12,
            border: "1.5px solid rgba(255, 255, 255, 0.12)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          }}
          title="Click to view Student Badges & Progress"
        >
          {/* Level Circle */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#E59866",
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {progress.level}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: "#E2E8F0" }}>Level {progress.level} Scholar</span>
              <span style={{ color: "#94A3B8" }}>
                {progress.currentXP} / {progress.nextLevelXP} XP
              </span>
            </div>
            {/* XP Bar */}
            <div
              style={{
                width: 110,
                height: 6,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${xpPercent}%`,
                  height: "100%",
                  backgroundColor: "#E59866",
                  borderRadius: 4,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "4px 8px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>🏅</span>
            <span>{progress.unlockedBadges.length}/9</span>
          </div>
        </div>

        {/* Native Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          style={{
            backgroundColor: "rgba(30, 41, 59, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#F8FAFC",
            padding: "8px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <span style={{ fontSize: 13 }}>{isFullscreen ? "⤢" : "⛶"}</span>
          <span>{isFullscreen ? "Windowed" : "Fullscreen"}</span>
        </button>

        {/* Exit to Studio Button */}
        <button
          onClick={onExitGame}
          style={{
            backgroundColor: "#234E3C",
            border: "1px solid #34D399",
            color: "#FFFFFF",
            padding: "8px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(35, 78, 60, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Studio</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
};
