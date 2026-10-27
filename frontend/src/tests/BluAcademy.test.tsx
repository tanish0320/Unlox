import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { CollisionSystem } from "../game/engine/CollisionSystem";
import { CLASSROOMS } from "../game/data/classrooms";
import { loadProgress, saveProgress, resetProgress, STORAGE_KEY } from "../game/state/storage";
import { useGameProgress } from "../game/state/useGameProgress";
import { DialogueOverlay } from "../game/components/DialogueOverlay";
import { QuizModal } from "../game/components/QuizModal";
import { GameLaunchPayload, TeacherDef } from "../game/types";

describe("Blu Academy — Collision & Map Navigation System", () => {
  const corridor = CLASSROOMS.corridor;

  it("permits movement in empty walkable tiles and flags solids", () => {
    // Solid boundary out of bounds
    expect(CollisionSystem.isSolid(corridor, -1, 5)).toBe(true);
    expect(CollisionSystem.isSolid(corridor, corridor.gridWidth + 2, 5)).toBe(true);
    // Center open tile in corridor is walkable (not solid)
    expect(CollisionSystem.isSolid(corridor, 10, 5)).toBe(false);
  });

  it("detects door triggers correctly", () => {
    // Check first door in corridor
    const door = corridor.doors[0];
    const trigger = CollisionSystem.checkDoor(corridor, {
      x: door.triggerArea.x,
      y: door.triggerArea.y,
    });
    expect(trigger).not.toBeNull();
    expect(trigger?.targetRoom).toBe(door.targetRoom);
  });

  it("detects teacher proximity for interaction", () => {
    const csLab = CLASSROOMS.cs;
    const teacher = csLab.teacher!;
    // One tile near teacher
    const inRange = CollisionSystem.isNearTeacher(csLab, {
      x: teacher.position.x,
      y: teacher.position.y + 1,
    });
    expect(inRange).toBe(true);

    // Far away position
    const farAway = CollisionSystem.isNearTeacher(csLab, { x: 0, y: 0 });
    expect(farAway).toBe(false);
  });
});

describe("Blu Academy — Progress Persistence & Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with default progress when empty", () => {
    const progress = loadProgress();
    expect(progress.level).toBe(1);
    expect(progress.currentXP).toBe(0);
    expect(progress.completedLessonIds).toEqual([]);
    expect(progress.unlockedBadges).toEqual([]);
  });

  it("recovers gracefully from corrupted JSON in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "{ invalid json corrupt content !!!");
    const progress = loadProgress();
    expect(progress.level).toBe(1);
    expect(progress.currentXP).toBe(0);
  });

  it("saves and reloads progress faithfully", () => {
    const initial = loadProgress();
    initial.currentXP = 50;
    initial.level = 2;
    initial.unlockedBadges = ["first_lesson"];
    saveProgress(initial);

    const loaded = loadProgress();
    expect(loaded.currentXP).toBe(50);
    expect(loaded.level).toBe(2);
    expect(loaded.unlockedBadges).toContain("first_lesson");
  });

  it("resets progress cleanly", () => {
    const initial = loadProgress();
    initial.currentXP = 500;
    saveProgress(initial);

    const reset = resetProgress();
    expect(reset.currentXP).toBe(0);
    expect(reset.level).toBe(1);
    expect(loadProgress().currentXP).toBe(0);
  });
});

describe("Blu Academy — useGameProgress Hook & Gamification Rules", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("awards 100 XP for lesson completion and unlocks badges", () => {
    const { result } = renderHook(() => useGameProgress());

    act(() => {
      result.current.awardLessonCompletion("cs", "lesson-1", "Python Variables");
    });

    expect(result.current.progress.totalLessonsCompleted).toBe(1);
    expect(result.current.progress.subjectStats.cs.lessonsCompleted).toBe(1);
    expect(result.current.progress.subjectStats.cs.xpEarned).toBe(100);
    expect(result.current.progress.level).toBe(2); // 100 XP levels up to 2
    expect(result.current.progress.unlockedBadges).toContain("first_lesson");
    expect(result.current.progress.unlockedBadges).toContain("code_apprentice");
  });

  it("strictly prevents duplicate rewards for the same lesson", () => {
    const { result } = renderHook(() => useGameProgress());

    act(() => {
      result.current.awardLessonCompletion("maths", "maths-intro", "Fractions");
    });
    expect(result.current.progress.totalLessonsCompleted).toBe(1);

    // Attempt to claim same lesson again
    act(() => {
      result.current.awardLessonCompletion("maths", "maths-intro", "Fractions");
    });

    // XP and lesson count must remain identical
    expect(result.current.progress.totalLessonsCompleted).toBe(1);
    expect(result.current.progress.subjectStats.maths.lessonsCompleted).toBe(1);
  });

  it("awards bonus quiz XP", () => {
    const { result } = renderHook(() => useGameProgress());

    act(() => {
      result.current.awardQuizXP(25);
    });

    expect(result.current.progress.currentXP).toBe(25);
  });
});

describe("Blu Academy — Teacher Dialogue Overlay", () => {
  const teacher: TeacherDef = {
    id: "byte",
    name: "Prof. Byte",
    title: "Lead Computer Scientist & Code Wizard",
    subject: "cs",
    subjectName: "Computer Science",
    color: "#6366F1",
    room: "cs",
    position: { x: 10, y: 4 },
    direction: "down",
    greeting: "Welcome to the Computer Science Lab!",
    dialogueIntro: "What will we build today?",
    suggestedTopics: [
      "How does a Python loop work?",
      "What is a variable in code?",
      "How does the Internet send data?",
      "What is an algorithm?",
    ],
  };

  it("renders teacher profile, greeting and suggested topics", () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    render(
      <DialogueOverlay
        teacher={teacher}
        onClose={onClose}
        onLaunchLesson={onLaunch}
      />
    );

    expect(screen.getByText("Prof. Byte")).toBeInTheDocument();
    expect(screen.getByText("Lead Computer Scientist & Code Wizard")).toBeInTheDocument();
    expect(screen.getByText(/What will we build today/i)).toBeInTheDocument();
    expect(screen.getByText("How does a Python loop work?")).toBeInTheDocument();
  });

  it("launches lesson with selected topic payload", () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    render(
      <DialogueOverlay
        teacher={teacher}
        onClose={onClose}
        onLaunchLesson={onLaunch}
      />
    );

    // Click on second topic
    fireEvent.click(screen.getByText("What is a variable in code?"));

    // Click launch button
    const launchBtn = screen.getByText(/Launch Lesson in Studio/i);
    fireEvent.click(launchBtn);

    expect(onLaunch).toHaveBeenCalledTimes(1);
    const payload: GameLaunchPayload = onLaunch.mock.calls[0][0];
    expect(payload.subject).toBe("cs");
    expect(payload.teacherName).toBe("Prof. Byte");
    expect(payload.topic).toBe("What is a variable in code?");
    expect(payload.level).toBe("beginner");
  });

  it("allows entering and launching a custom topic", () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    render(
      <DialogueOverlay
        teacher={teacher}
        onClose={onClose}
        onLaunchLesson={onLaunch}
      />
    );

    // Switch to custom topic mode
    fireEvent.click(screen.getByText(/Or enter my own topic/i));

    // Type custom input
    const input = screen.getByPlaceholderText(/How does quantum entanglement work/i);
    fireEvent.change(input, { target: { value: "How binary search trees work" } });

    // Click launch
    const launchBtn = screen.getByText(/Launch Lesson in Studio/i);
    fireEvent.click(launchBtn);

    expect(onLaunch).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "How binary search trees work",
        subject: "cs",
      })
    );
  });
});

describe("Blu Academy — Quiz Modal Revision", () => {
  it("evaluates quiz questions and rewards XP", () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    render(
      <QuizModal
        topic="Python Loops"
        subject="cs"
        questions={[
          {
            question: "What keyword is used to repeat actions in Python?",
            answer: "for loop",
          },
        ]}
        onComplete={onComplete}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText(/Quick Knowledge Check/i)).toBeInTheDocument();
    expect(screen.getByText("What keyword is used to repeat actions in Python?")).toBeInTheDocument();

    // Click the correct answer
    const correctBtn = screen.getByText("for loop");
    fireEvent.click(correctBtn);

    // Finish quiz
    const finishBtn = screen.getByText(/Claim 25 XP & Finish/i);
    fireEvent.click(finishBtn);

    expect(onComplete).toHaveBeenCalledWith(25);
  });
});
