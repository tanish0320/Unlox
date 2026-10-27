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
    <header
      data-testid="blu-academy-hud"
      style={{
        position: "relative",
        width: "100%",
        height: 60,
        minHeight: 60,
        flexShrink: 0,
        backgroundColor: "#0B1020",
        borderBottom: "1.5px solid rgba(245, 158, 11, 0.25)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 18px",
        boxSizing: "border-box",
        zIndex: 50,
        fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Left Section: Current Location + Map & Quick Visit */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Current Location Badge */}
        <div
          style={{
            height: 38,
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            padding: "0 14px",
            borderRadius: 10,
            border: `1.5px solid ${currentRoom.accentColor}`,
            color: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxSizing: "border-box",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>
            {currentRoom.id === "corridor" && "🏛️"}
            {currentRoom.id === "maths" && "📐"}
            {currentRoom.id === "cs" && "💻"}
            {currentRoom.id === "physics" && "🔭"}
            {currentRoom.id === "chemistry" && "⚗️"}
            {currentRoom.id === "biology" && "🌿"}
            {currentRoom.id === "social" && "🏺"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {currentRoom.name}
            </div>
            {currentRoom.teacher && (
              <div style={{ fontSize: 10.5, color: currentRoom.accentColor, fontWeight: 600, lineHeight: 1 }}>
                Instructor: {currentRoom.teacher.name}
              </div>
            )}
          </div>
        </div>

        {/* Map & Quick Visit Button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFastTravel(!showFastTravel)}
            style={{
              height: 38,
              backgroundColor: "rgba(30, 41, 59, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#F8FAFC",
              padding: "0 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              boxSizing: "border-box",
              transition: "background-color 0.15s ease",
            }}
          >
            <span>🗺️ Map & Quick Visit</span>
            <span style={{ fontSize: 9 }}>{showFastTravel ? "▲" : "▼"}</span>
          </button>

          {showFastTravel && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                backgroundColor: "#0F172A",
                border: "1.5px solid #334155",
                borderRadius: 12,
                padding: 8,
                width: 250,
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.65)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                zIndex: 100,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  padding: "4px 8px",
                  letterSpacing: "0.05em",
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
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: isCurrent ? `1.5px solid ${room.accentColor}` : "1px solid transparent",
                      backgroundColor: isCurrent ? "rgba(255, 255, 255, 0.08)" : "transparent",
                      color: isCurrent ? "#F8FAFC" : "#CBD5E1",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>
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

      {/* Right Section: Player Stats & Exit to Studio */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* XP and Level Pill */}
        <div
          onClick={onOpenProgress}
          style={{
            height: 38,
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            padding: "0 12px",
            borderRadius: 10,
            border: "1.5px solid rgba(255, 255, 255, 0.14)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
            boxSizing: "border-box",
          }}
          title="Click to view Student Badges & Progress"
        >
          {/* Level Circle */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: "#E59866",
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {progress.level}
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2, gap: 8 }}>
              <span style={{ fontWeight: 700, color: "#E2E8F0" }}>Level {progress.level}</span>
              <span style={{ color: "#94A3B8" }}>
                {progress.currentXP}/{progress.nextLevelXP} XP
              </span>
            </div>
            {/* XP Bar */}
            <div
              style={{
                width: 80,
                height: 5,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${xpPercent}%`,
                  height: "100%",
                  backgroundColor: "#E59866",
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "2px 6px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span>🏅</span>
            <span>{progress.unlockedBadges.length}/9</span>
          </div>
        </div>

        {/* Native Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          style={{
            height: 38,
            backgroundColor: "rgba(30, 41, 59, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#F8FAFC",
            padding: "0 12px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            boxSizing: "border-box",
            transition: "background-color 0.15s ease",
          }}
        >
          <span style={{ fontSize: 13 }}>{isFullscreen ? "⤢" : "⛶"}</span>
          <span>{isFullscreen ? "Windowed" : "Fullscreen"}</span>
        </button>

        {/* Exit to Studio Button */}
        <button
          onClick={onExitGame}
          title="Return to Blu Lesson Studio"
          style={{
            height: 38,
            backgroundColor: "#234E3C",
            border: "1px solid #34D399",
            color: "#FFFFFF",
            padding: "0 16px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(35, 78, 60, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxSizing: "border-box",
            transition: "background-color 0.15s ease",
          }}
        >
          <span>Studio</span>
          <span>➔</span>
        </button>
      </div>
    </header>
  );
};
