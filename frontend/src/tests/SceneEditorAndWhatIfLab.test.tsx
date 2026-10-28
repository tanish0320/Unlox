import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FractionsLab, TriangleLab, NewtonLab, WhatIfLabModal } from "../components/WhatIfLab";
import { SceneEditor } from "../components/SceneEditor";
import { LessonPlan } from "../components/scenes/sceneTypes";

describe("Interactive Learning Lab (What-If Lab)", () => {
  it("FractionsLab renders fraction strips, sliders, and handles challenge", () => {
    render(<FractionsLab />);
    expect(screen.getByText("Fractions & Proportions Lab")).toBeDefined();
    expect(screen.getByText(/Fraction A:/)).toBeDefined();
    expect(screen.getByText(/Fraction B:/)).toBeDefined();

    // Toggle explanation
    const explainBtn = screen.getByText("Show Explanation");
    fireEvent.click(explainBtn);
    expect(screen.getByText(/Key Pedagogical Concept:/)).toBeDefined();

    // Challenge check
    const correctOpt = screen.getByText("6 / 8");
    fireEvent.click(correctOpt);
    expect(screen.getByText(/Correct! 6\/8 simplifies to 3\/4/)).toBeDefined();

    // Reset button
    const resetBtn = screen.getByText("Reset");
    fireEvent.click(resetBtn);
    expect(screen.queryByText(/Key Pedagogical Concept:/)).toBeNull();
  });

  it("TriangleLab computes hypotenuse, angles, area, and validates 180° Euclidean sum", () => {
    render(<TriangleLab />);
    expect(screen.getByText("Triangle Geometry & Pythagoras Lab")).toBeDefined();
    expect(screen.getByText("Hypotenuse (c)")).toBeDefined();
    expect(screen.getByText("Triangle Area (A)")).toBeDefined();
    expect(screen.getByText(/Sum = 180°/)).toBeDefined();

    // Challenge check
    const opt10 = screen.getByText("10 cm");
    fireEvent.click(opt10);
    expect(screen.getByText(/Correct! By the Pythagorean Theorem/)).toBeDefined();
  });

  it("NewtonLab computes acceleration a = F/m and handles friction toggle", () => {
    render(<NewtonLab />);
    expect(screen.getByText(/Newton's Second Law Lab/)).toBeDefined();
    expect(screen.getByText("Acceleration (a)")).toBeDefined();
    expect(screen.getByText("Net Force (F_net)")).toBeDefined();

    // Friction toggle
    const fricBtn = screen.getByText(/Frictionless/);
    fireEvent.click(fricBtn);
    expect(screen.getByText(/Friction ON/)).toBeDefined();

    // Challenge check
    const optHalf = screen.getByText(/Acceleration is cut in half/);
    fireEvent.click(optHalf);
    expect(screen.getByText(/Correct! From a = F \/ m/)).toBeDefined();
  });

  it("WhatIfLabModal switches between simulation tabs and closes cleanly", () => {
    const handleClose = vi.fn();
    render(<WhatIfLabModal isOpen={true} onClose={handleClose} defaultSimulation="fractions" />);
    expect(screen.getByText(/Interactive Learning Lab/)).toBeDefined();

    // Switch to Triangle tab
    const triTab = screen.getByText(/2. Triangle Geometry/);
    fireEvent.click(triTab);
    expect(screen.getByText("Triangle Geometry & Pythagoras Lab")).toBeDefined();

    // Switch to Newton tab
    const newtonTab = screen.getByText(/3. Newton's Second Law/);
    fireEvent.click(newtonTab);
    expect(screen.getByText(/Newton's Second Law Lab/)).toBeDefined();

    // Close button
    const closeBtn = screen.getByLabelText("Close Learning Lab");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("Modular Scene Editor Component", () => {
  const mockPlan: LessonPlan = {
    schema_version: "1.0.0",
    title: "Test Modular Lesson",
    level: "beginner",
    language: "en",
    target_duration_seconds: 120,
    parts: [
      {
        part_id: "part_1",
        part_number: 1,
        title: "Part 1 - Basics",
        scene_ids: ["scene_01", "scene_02"],
      },
      {
        part_id: "part_2",
        part_number: 2,
        title: "Part 2 - Advanced",
        scene_ids: ["scene_03"],
      },
    ],
    scenes: [
      {
        id: "scene_01",
        type: "title_card",
        heading: "Scene 1 Intro",
        narration: "Welcome to scene 1 narration.",
        part_id: "part_1",
      },
      {
        id: "scene_02",
        type: "diagram",
        heading: "Scene 2 Flowchart",
        narration: "This is scene 2 diagram flow.",
        items: ["Node A", "Node B"],
        layout: "horizontal",
        part_id: "part_1",
      },
      {
        id: "scene_03",
        type: "diagram",
        heading: "Scene 3 Conclusion",
        narration: "Final conclusions and summary of concepts.",
        items: ["Summary 1", "Summary 2"],
        layout: "cycle",
        part_id: "part_2",
      },
    ],
  };

  it("renders parts hierarchy, scenes, and properties panel", () => {
    render(<SceneEditor initialLessonPlan={mockPlan} lessonId="test_lesson_123" />);
    expect(screen.getByText("Blu Scene Editor")).toBeDefined();
    expect(screen.getByText("Test Modular Lesson")).toBeDefined();
    expect(screen.getByText(/Part 1: Part 1 - Basics/)).toBeDefined();
    expect(screen.getByText(/Part 2: Part 2 - Advanced/)).toBeDefined();
    expect(screen.getAllByText("Scene 1 Intro").length).toBeGreaterThan(0);
  });

  it("updates narration and shows unsaved modifications indicator", () => {
    render(<SceneEditor initialLessonPlan={mockPlan} lessonId="test_lesson_123" />);

    const narrationArea = screen.getByPlaceholderText("Spoken narration script...");
    fireEvent.change(narrationArea, { target: { value: "Updated custom narration for scene 1." } });

    expect(screen.getAllByText("Unsaved Changes").length).toBeGreaterThan(0);
  });
});
