import React from "react";
import { StudentProgress, SubjectId } from "../types";
import { BADGES } from "../data/badges";

interface ProgressModalProps {
  progress: StudentProgress;
  onClose: () => void;
  onReset: () => void;
}

const SUBJECT_LABELS: Record<SubjectId, { name: string; icon: string; color: string }> = {
  maths: { name: "Mathematics", icon: "📐", color: "#F59E0B" },
  cs: { name: "Computer Science", icon: "💻", color: "#0284C7" },
  physics: { name: "Physics", icon: "🔭", color: "#8B5CF6" },
  chemistry: { name: "Chemistry", icon: "⚗️", color: "#10B981" },
  biology: { name: "Biology", icon: "🌿", color: "#22C55E" },
  social: { name: "Social Sciences", icon: "🏛️", color: "#D97706" },
};

export const ProgressModal: React.FC<ProgressModalProps> = ({
  progress,
  onClose,
  onReset,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(11, 16, 32, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          maxHeight: "90vh",
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "2px solid #E2DCD2",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#234E3C",
            color: "#FFFFFF",
            padding: "20px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "#E59866",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "#1E293B",
              }}
            >
              {progress.level}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                Student Academy Dossier
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "#DEF0E5" }}>
                Level {progress.level} Scholar • {progress.totalLessonsCompleted} Lessons Mastered
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
          {/* Subject Mastery Progress Bars */}
          <div style={{ marginBottom: 28 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                margin: "0 0 14px 0",
              }}
            >
              Subject Mastery
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((subId) => {
                const sub = SUBJECT_LABELS[subId];
                const stat = progress.subjectStats[subId] || { lessonsCompleted: 0, xpEarned: 0 };
                const percent = Math.min(100, stat.lessonsCompleted * 33); // 3 lessons for 100% mastery star

                return (
                  <div
                    key={subId}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderRadius: 12,
                      padding: "12px 16px",
                      border: "1px solid #E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{sub.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1E293B",
                          marginBottom: 6,
                        }}
                      >
                        <span>{sub.name}</span>
                        <span style={{ fontSize: 12, color: sub.color }}>
                          {stat.lessonsCompleted} done ({stat.xpEarned} XP)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          backgroundColor: "#E2E8F0",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            backgroundColor: sub.color,
                            borderRadius: 3,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Badges Grid */}
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                margin: "0 0 14px 0",
              }}
            >
              Academy Badges ({progress.unlockedBadges.length} / {BADGES.length} Unlocked)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {BADGES.map((badge) => {
                const isUnlocked = progress.unlockedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    style={{
                      borderRadius: 12,
                      padding: "14px 16px",
                      border: isUnlocked ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                      backgroundColor: isUnlocked ? "#FFFBEB" : "#F8FAFC",
                      opacity: isUnlocked ? 1 : 0.65,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 6,
                      boxShadow: isUnlocked ? "0 4px 12px rgba(245, 158, 11, 0.15)" : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        filter: isUnlocked ? "none" : "grayscale(100%)",
                      }}
                    >
                      {badge.icon}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
                      {badge.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                      {badge.description}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: isUnlocked ? "#D97706" : "#94A3B8",
                      }}
                    >
                      {isUnlocked ? "✓ Unlocked" : "🔒 Locked"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 28px",
            backgroundColor: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all academy progress and badges?")) {
                onReset();
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#EF4444",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Reset Progress
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#234E3C",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
