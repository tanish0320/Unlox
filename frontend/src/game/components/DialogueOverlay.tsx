import React, { useState } from "react";
import { GameLaunchPayload, TeacherDef } from "../types";
import { LessonLevel } from "../../components/scenes/sceneTypes";

interface DialogueOverlayProps {
  teacher: TeacherDef;
  onClose: () => void;
  onLaunchLesson: (payload: GameLaunchPayload) => void;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  teacher,
  onClose,
  onLaunchLesson,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(teacher.suggestedTopics[0] || "");
  const [isCustomTopic, setIsCustomTopic] = useState<boolean>(false);
  const [customTopicInput, setCustomTopicInput] = useState<string>("");
  const [level, setLevel] = useState<LessonLevel>("beginner");
  const [language, setLanguage] = useState<string>("en");
  const [duration, setDuration] = useState<number>(45);

  const activeTopic = isCustomTopic ? customTopicInput.trim() : selectedTopic;

  const handleLaunch = () => {
    if (!activeTopic) return;
    onLaunchLesson({
      subject: teacher.subject,
      teacherName: teacher.name,
      topic: activeTopic,
      level,
      language,
      duration,
      suggestedDuration: duration,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(11, 16, 32, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.35)",
          border: `3px solid ${teacher.color}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
        }}
      >
        {/* Header with Teacher Portrait & Intro */}
        <div
          style={{
            backgroundColor: "#FBF9F4",
            padding: "20px 24px",
            borderBottom: "1px solid #E2DCD2",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Pixel Teacher Portrait Badge */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: teacher.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
              border: "2px solid #FFFFFF",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 28 }}>
              {teacher.subject === "maths" && "📐"}
              {teacher.subject === "cs" && "💻"}
              {teacher.subject === "physics" && "🔭"}
              {teacher.subject === "chemistry" && "⚗️"}
              {teacher.subject === "biology" && "🌿"}
              {teacher.subject === "social" && "🏛️"}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#1E293B", fontWeight: 700 }}>
                {teacher.name}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 100,
                  backgroundColor: `${teacher.color}20`,
                  color: teacher.color,
                  border: `1px solid ${teacher.color}40`,
                }}
              >
                {teacher.subjectName}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748B" }}>
              {teacher.title}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "#94A3B8",
              padding: 4,
            }}
            title="Close dialogue"
          >
            ✕
          </button>
        </div>

        {/* Dialogue Greeting Speech Bubble */}
        <div style={{ padding: "16px 24px", backgroundColor: "#F8FAFC" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#334155",
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            "{teacher.greeting} {teacher.dialogueIntro}"
          </div>
        </div>

        {/* Topic Selection Options */}
        <div style={{ padding: "16px 24px 20px 24px", flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748B",
              marginBottom: 10,
            }}
          >
            Select a Topic:
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {teacher.suggestedTopics.map((top) => {
              const isSelected = !isCustomTopic && selectedTopic === top;
              return (
                <button
                  key={top}
                  type="button"
                  onClick={() => {
                    setIsCustomTopic(false);
                    setSelectedTopic(top);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: isSelected
                      ? `2px solid ${teacher.color}`
                      : "1px solid #E2E8F0",
                    backgroundColor: isSelected ? `${teacher.color}10` : "#FFFFFF",
                    color: isSelected ? "#0F172A" : "#334155",
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {top}
                </button>
              );
            })}
          </div>

          {/* Custom Topic Option */}
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setIsCustomTopic(true)}
              style={{
                background: "none",
                border: "none",
                color: teacher.color,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ✍️ Or enter my own topic...
            </button>

            {isCustomTopic && (
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                placeholder="e.g. How does quantum entanglement work?"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `2px solid ${teacher.color}`,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            )}
          </div>

          {/* Configuration Controls: Level, Language, Duration */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              paddingTop: 14,
              borderTop: "1px solid #E2DCD2",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
                LEVEL
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LessonLevel)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
                LANGUAGE
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
                TARGET TIME
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              >
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds (1 minute)</option>
                <option value={90}>90 seconds</option>
                <option value={120}>2 minutes (120 seconds)</option>
                <option value={180}>3 minutes (180 seconds)</option>
                <option value={240}>4 minutes (240 seconds)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              color: "#475569",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Explore More
          </button>

          <button
            onClick={handleLaunch}
            disabled={!activeTopic}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              backgroundColor: activeTopic ? teacher.color : "#94A3B8",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: activeTopic ? "pointer" : "not-allowed",
              boxShadow: activeTopic ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Launch Lesson in Studio</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
