import React, { useState, useEffect } from "react";
import { ClassroomDef, GameLaunchPayload, Position, RoomId, TeacherDef } from "../types";
import { CLASSROOMS } from "../data/classrooms";
import { GameCanvas } from "./GameCanvas";
import { GameHUD } from "./GameHUD";
import { DialogueOverlay } from "./DialogueOverlay";
import { ProgressModal } from "./ProgressModal";
import { QuizModal } from "./QuizModal";
import { useGameProgress } from "../state/useGameProgress";

interface BluAcademyViewProps {
  onLaunchLesson: (payload: GameLaunchPayload) => void;
  onExitGame: () => void;
  completedLessonInfo?: {
    subject: "maths" | "cs" | "physics" | "chemistry" | "biology" | "social";
    lessonId: string;
    topic: string;
    revisionQuestions?: { question: string; answer: string }[];
  } | null;
  onClearCompletedLesson?: () => void;
}

export const BluAcademyView: React.FC<BluAcademyViewProps> = ({
  onLaunchLesson,
  onExitGame,
  completedLessonInfo,
  onClearCompletedLesson,
}) => {
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>("corridor");
  const [spawnPosition, setSpawnPosition] = useState<Position | undefined>({ x: 13, y: 9 });
  const [activeTeacher, setActiveTeacher] = useState<TeacherDef | null>(null);
  const [showProgressModal, setShowProgressModal] = useState<boolean>(false);
  const [pendingQuiz, setPendingQuiz] = useState<typeof completedLessonInfo | null>(null);

  const {
    progress,
    awardLessonCompletion,
    awardQuizXP,
    resetAllProgress,
    recentNotification,
    clearNotification,
  } = useGameProgress();

  // If a lesson was just completed in the player, trigger XP award & optional quiz!
  useEffect(() => {
    if (completedLessonInfo) {
      awardLessonCompletion(
        completedLessonInfo.subject,
        completedLessonInfo.lessonId,
        completedLessonInfo.topic
      );
      setPendingQuiz(completedLessonInfo);
      if (onClearCompletedLesson) {
        onClearCompletedLesson();
      }
    }
  }, [completedLessonInfo, awardLessonCompletion, onClearCompletedLesson]);

  // Notification auto-dismiss after 5s
  useEffect(() => {
    if (recentNotification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [recentNotification, clearNotification]);

  const currentRoom: ClassroomDef = CLASSROOMS[currentRoomId] || CLASSROOMS.corridor;

  const handleRoomChange = (newRoomId: RoomId, targetSpawnPos?: Position) => {
    const nextRoom = CLASSROOMS[newRoomId] || CLASSROOMS.corridor;
    const safeSpawn =
      targetSpawnPos ||
      (nextRoom.id === "corridor"
        ? { x: 13, y: 9 }
        : ["maths", "cs", "physics"].includes(nextRoom.id)
        ? { x: 9.5, y: 11.0 }
        : { x: 9.5, y: 2.2 });
    setCurrentRoomId(nextRoom.id);
    setSpawnPosition({ ...safeSpawn });
    setActiveTeacher(null);
  };

  const isModalOpen = Boolean(activeTeacher || showProgressModal || pendingQuiz);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Game HUD (Top overlay) */}
      <GameHUD
        currentRoom={currentRoom}
        progress={progress}
        onSelectRoom={(roomId) => handleRoomChange(roomId)}
        onOpenProgress={() => setShowProgressModal(true)}
        onExitGame={onExitGame}
      />

      {/* 2D Canvas Viewport */}
      <GameCanvas
        currentRoom={currentRoom}
        spawnPosition={spawnPosition}
        onRoomChange={handleRoomChange}
        onInteractTeacher={(teacher) => setActiveTeacher(teacher)}
        isPaused={isModalOpen}
      />

      {/* Achievement Unlocked Notification Toast */}
      {recentNotification && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            backgroundColor: "#234E3C",
            border: "2px solid #E59866",
            borderRadius: 14,
            padding: "12px 20px",
            color: "#FFFFFF",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 80,
            animation: "fadeIn 0.3s ease",
            fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
          }}
        >
          <span style={{ fontSize: 28 }}>{recentNotification.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FEF3C7" }}>
              {recentNotification.title}
            </div>
            <div style={{ fontSize: 12, color: "#E2E8F0" }}>
              {recentNotification.description}
            </div>
          </div>
          <button
            onClick={clearNotification}
            style={{
              background: "none",
              border: "none",
              color: "#DEF0E5",
              cursor: "pointer",
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Teacher Interaction Dialogue Panel */}
      {activeTeacher && (
        <DialogueOverlay
          teacher={activeTeacher}
          onClose={() => setActiveTeacher(null)}
          onLaunchLesson={(payload) => {
            setActiveTeacher(null);
            onLaunchLesson(payload);
          }}
        />
      )}

      {/* Progress & Badges Dossier Modal */}
      {showProgressModal && (
        <ProgressModal
          progress={progress}
          onClose={() => setShowProgressModal(false)}
          onReset={resetAllProgress}
        />
      )}

      {/* Post-Lesson Knowledge Reinforcement Quiz Modal */}
      {pendingQuiz && (
        <QuizModal
          topic={pendingQuiz.topic}
          subject={pendingQuiz.subject}
          questions={pendingQuiz.revisionQuestions}
          onComplete={(xpGained) => {
            if (xpGained > 0) {
              awardQuizXP(xpGained);
            }
            setPendingQuiz(null);
          }}
          onSkip={() => setPendingQuiz(null)}
        />
      )}
    </div>
  );
};
