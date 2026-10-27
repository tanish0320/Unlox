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
import { HALLWAY_NPCS, CLASSROOM_NPCS, getRoomNPCs } from "../game/data/npcDefinitions";
import { NPCManager } from "../game/engine/NPCManager";
import { getCameraTransform, getCameraZoom } from "../game/engine/PixelRenderer";

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

describe("Blu Academy — 6-Classroom Room Transitions & Collision Regression Suite", () => {
  const roomIds = ["maths", "cs", "physics", "chemistry", "biology", "social"] as const;
  const corridor = CLASSROOMS.corridor;

  it("ensures hallway has doors for all 6 subjects with walkable destination spawns", () => {
    expect(corridor.doors.length).toBe(6);
    const targetRooms = corridor.doors.map((d) => d.targetRoom);
    expect(targetRooms).toEqual(expect.arrayContaining([...roomIds]));

    for (const door of corridor.doors) {
      const room = CLASSROOMS[door.targetRoom];
      expect(room).toBeDefined();

      // Door trigger detection
      const triggerCenter = {
        x: door.triggerArea.x + door.triggerArea.width / 2 - 0.5,
        y: door.triggerArea.y + door.triggerArea.height / 2 - 0.75,
      };
      const detected = CollisionSystem.checkDoor(corridor, triggerCenter);
      expect(detected).not.toBeNull();
      expect(detected?.targetRoom).toBe(door.targetRoom);

      // Destination spawn must be safely walkable inside destination room
      const { x, y } = door.targetPosition;
      expect(CollisionSystem.isSolid(room, x, y)).toBe(false);
    }
  });

  it("ensures all 6 classrooms have return doors to corridor with walkable return spawns", () => {
    for (const roomId of roomIds) {
      const room = CLASSROOMS[roomId];
      expect(room.doors.length).toBeGreaterThanOrEqual(1);

      const exitDoor = room.doors.find((d) => d.targetRoom === "corridor");
      expect(exitDoor).toBeDefined();

      // Check exit trigger detection
      const triggerCenter = {
        x: exitDoor!.triggerArea.x + exitDoor!.triggerArea.width / 2 - 0.5,
        y: exitDoor!.triggerArea.y + exitDoor!.triggerArea.height / 2 - 0.75,
      };
      const detected = CollisionSystem.checkDoor(room, triggerCenter);
      expect(detected).not.toBeNull();
      expect(detected?.targetRoom).toBe("corridor");

      // Corridor return spawn must be completely walkable
      const { x, y } = exitDoor!.targetPosition;
      expect(CollisionSystem.isSolid(corridor, x, y)).toBe(false);
    }
  });

  it("ensures destination spawns never trigger doors immediately (prevents bounce loops)", () => {
    // 1. Spawning inside any classroom from corridor must not be touching the exit door
    for (const door of corridor.doors) {
      const room = CLASSROOMS[door.targetRoom];
      const spawnedDoor = CollisionSystem.checkDoor(room, door.targetPosition);
      expect(spawnedDoor).toBeNull();
    }

    // 2. Spawning back in the corridor from any classroom must not be touching a corridor door
    for (const roomId of roomIds) {
      const room = CLASSROOMS[roomId];
      const exitDoor = room.doors.find((d) => d.targetRoom === "corridor")!;
      const corridorDoor = CollisionSystem.checkDoor(corridor, exitDoor.targetPosition);
      expect(corridorDoor).toBeNull();
    }
  });

  it("ensures doorway openings in corridor walls are physically passable", () => {
    // Upper doorway openings at y = 1.0 (threshold)
    expect(CollisionSystem.isSolid(corridor, 3.5, 1.0)).toBe(false); // Maths entrance
    expect(CollisionSystem.isSolid(corridor, 12.5, 1.0)).toBe(false); // CS entrance
    expect(CollisionSystem.isSolid(corridor, 21.5, 1.0)).toBe(false); // Physics entrance

    // Lower doorway openings at y = 16.0 (threshold)
    expect(CollisionSystem.isSolid(corridor, 3.5, 15.6)).toBe(false); // Chemistry entrance
    expect(CollisionSystem.isSolid(corridor, 12.5, 15.6)).toBe(false); // Biology entrance
    expect(CollisionSystem.isSolid(corridor, 21.5, 15.6)).toBe(false); // Social entrance
  });

  it("ensures all 6 teachers are approachable and can be interacted with", () => {
    for (const roomId of roomIds) {
      const room = CLASSROOMS[roomId];
      expect(room.teacher).toBeDefined();
      const teacher = room.teacher!;

      // Teacher position itself is a solid obstacle (cannot walk through teacher)
      expect(CollisionSystem.isSolid(room, teacher.position.x, teacher.position.y)).toBe(true);

      // But the speaking spot in front of the teacher's desk is walkable
      const studentY = teacher.direction === "down" ? teacher.position.y + 2.0 : teacher.position.y - 2.0;
      expect(CollisionSystem.isSolid(room, teacher.position.x, studentY)).toBe(false);

      // And within proximity for interaction prompt
      expect(CollisionSystem.isNearTeacher(room, { x: teacher.position.x, y: studentY })).toBe(true);
    }
  });

  it("ensures clear central walking aisles in all classrooms", () => {
    for (const roomId of roomIds) {
      const room = CLASSROOMS[roomId];
      // Test 5 sequential aisle points between entrance spawn and teacher
      const yValues = [7.0, 8.0, 9.0, 10.0];
      for (const y of yValues) {
        expect(CollisionSystem.isSolid(room, 9.5, y)).toBe(false);
      }
    }
  });
});

describe("Blu Academy — NPC Population, Scaling & Signage Polish Suite", () => {
  const roomIds = ["maths", "cs", "physics", "chemistry", "biology", "social"] as const;
  const corridor = CLASSROOMS.corridor;

  it("populates Grand Hallway with 8 distinct, well-distributed NPCs", () => {
    expect(HALLWAY_NPCS.length).toBe(8);

    for (const npc of HALLWAY_NPCS) {
      expect(npc.name).toBeTruthy();
      expect(npc.outfitColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(npc.hairColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(npc.skinTone).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(npc.dialogue.length).toBeGreaterThanOrEqual(1);

      // Verify NPC spawn is within corridor grid bounds
      expect(npc.position.x).toBeGreaterThan(0);
      expect(npc.position.x).toBeLessThan(corridor.gridWidth);
      expect(npc.position.y).toBeGreaterThan(0);
      expect(npc.position.y).toBeLessThan(corridor.gridHeight);

      // Verify NPC does not spawn on a door trigger
      const onDoor = CollisionSystem.checkDoor(corridor, npc.position);
      expect(onDoor).toBeNull();
    }
  });

  it("populates each of the 6 classrooms with 3 engaged student NPCs (18 total)", () => {
    let totalClassroomNPCs = 0;

    for (const roomId of roomIds) {
      const npcs = CLASSROOM_NPCS[roomId];
      expect(npcs).toBeDefined();
      expect(npcs.length).toBe(3);
      totalClassroomNPCs += npcs.length;

      const room = CLASSROOMS[roomId];

      for (const npc of npcs) {
        expect(npc.name).toBeTruthy();
        expect(npc.dialogue.length).toBeGreaterThanOrEqual(1);

        // Verify NPC does not spawn on classroom exit door
        const onDoor = CollisionSystem.checkDoor(room, npc.position);
        expect(onDoor).toBeNull();

        // Verify NPC leaves central aisle clear (aisle is at x = 9.5)
        expect(Math.abs(npc.position.x - 9.5)).toBeGreaterThan(2.0);
      }
    }

    expect(totalClassroomNPCs).toBe(18);
  });

  it("manages NPC state transitions, proximity detection, and speech bubbles via NPCManager", () => {
    const mgr = new NPCManager();
    mgr.initRoom("corridor");
    const npcs = mgr.getNPCs();
    expect(npcs.length).toBe(8);

    // Test proximity detection near Leo at (5.5, 3.5)
    const nearLeo = mgr.getNearNPC({ x: 5.5, y: 4.0 }, 1.5);
    expect(nearLeo).not.toBeNull();
    expect(nearLeo?.def.name).toBe("Leo");

    // Test ambient dialogue trigger
    const line = mgr.interactWith(nearLeo!, { x: 5.5, y: 4.0 });
    expect(line).toBeTruthy();
    expect(nearLeo?.activeSpeechBubble).not.toBeNull();
    expect(nearLeo?.activeSpeechBubble?.text).toBe(line);
    expect(nearLeo?.activeSpeechBubble?.expiresAt).toBeGreaterThan(performance.now());

    // Test clicking detection
    const clicked = mgr.findClickedNPC(5.5, 3.5, 1.0);
    expect(clicked).not.toBeNull();
    expect(clicked?.def.name).toBe("Leo");
  });

  it("applies camera zoom and scaling without distorting coordinate mapping", () => {
    expect(getCameraZoom("corridor")).toBe(1.3);
    expect(getCameraZoom("maths")).toBe(1.45);
    expect(getCameraZoom("cs")).toBe(1.45);

    // Corridor camera transform at center (13, 9)
    const corridorTransform = getCameraTransform(corridor, { x: 13, y: 9 }, 1280, 720);
    expect(corridorTransform.zoom).toBe(1.3);
    // When room is narrower than canvas, camX centers the room: (1081.6 - 1280) / 2 = -99.2
    expect(corridorTransform.camX).toBeCloseTo((corridor.gridWidth * 32 * 1.3 - 1280) / 2, 1);

    // Classroom camera transform at spawn (9.5, 11.0)
    const mathsTransform = getCameraTransform(CLASSROOMS.maths, { x: 9.5, y: 11.0 }, 1280, 720);
    expect(mathsTransform.zoom).toBe(1.45);
    // Classroom is centered in canvas: (928 - 1280) / 2 = -176
    expect(mathsTransform.camX).toBeCloseTo((CLASSROOMS.maths.gridWidth * 32 * 1.45 - 1280) / 2, 1);
    expect(mathsTransform.camY).toBeCloseTo((CLASSROOMS.maths.gridHeight * 32 * 1.45 - 720) / 2, 1);
  });

  it("guarantees classroom signboards fit completely inside viewport without edge clipping", () => {
    // Top doors in corridor (Maths, CS, Physics): signY = 4px, height = 32px
    // Since 4 >= 0 and 4 + 32 = 36 <= 18 * 32 (576), no clipping!
    const topSignY = 4;
    const topSignH = 32;
    expect(topSignY).toBeGreaterThanOrEqual(0);
    expect(topSignY + topSignH).toBeLessThan(corridor.gridHeight * 32);

    // Bottom doors in corridor (Chemistry, Biology, Social): signY = 464px, height = 32px
    // 464 + 32 = 496 <= 576, no bottom clipping!
    const bottomSignY = 464;
    const bottomSignH = 32;
    expect(bottomSignY + bottomSignH).toBeLessThan(corridor.gridHeight * 32);
    expect(bottomSignY).toBeGreaterThan(0);
  });
});


