import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DialogueOverlay } from "../game/components/DialogueOverlay";
import { App } from "../App";
import { TeacherDef } from "../game/types";

describe("Duration Options - Seven Presets Verification", () => {
  const expectedDurations = [30, 45, 60, 90, 120, 180, 240];

  const mockTeacher: TeacherDef = {
    id: "ada",
    name: "Prof. Ada",
    title: "Head of Mathematics",
    subject: "maths",
    subjectName: "Mathematics",
    room: "maths",
    color: "#2563EB",
    greeting: "Hello, seeker of logic!",
    dialogueIntro: "Mathematics is the language of the universe.",
    suggestedTopics: ["Pythagorean Theorem", "Ratio and proportion"],
    position: { x: 4, y: 3 },
    direction: "down",
  };

  it("renders all seven duration options in DialogueOverlay", () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    render(
      <DialogueOverlay
        teacher={mockTeacher}
        onClose={onClose}
        onLaunchLesson={onLaunch}
      />
    );

    const options = screen.getAllByRole("option");
    const optionValues = options
      .map((opt) => (opt as HTMLOptionElement).value)
      .filter((val) => !isNaN(Number(val)))
      .map(Number);

    for (const d of expectedDurations) {
      expect(optionValues).toContain(d);
    }
  });

  it("submits the chosen duration in seconds from DialogueOverlay", () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();

    render(
      <DialogueOverlay
        teacher={mockTeacher}
        onClose={onClose}
        onLaunchLesson={onLaunch}
      />
    );

    const selects = screen.getAllByRole("combobox");
    const durationSelect = selects.find((sel) => {
      const opts = Array.from(sel.querySelectorAll("option"));
      return opts.some((o) => o.value === "180");
    });

    expect(durationSelect).toBeDefined();
    if (durationSelect) {
      fireEvent.change(durationSelect, { target: { value: "180" } });
      const launchBtn = screen.getByRole("button", { name: /Launch Lesson in Studio/i });
      fireEvent.click(launchBtn);

      expect(onLaunch).toHaveBeenCalledTimes(1);
      const payload = onLaunch.mock.calls[0][0];
      expect(payload.duration).toBe(180);
    }
  });

  it("renders all seven duration options in App studio settings", () => {
    render(<App />);

    const options = screen.getAllByRole("option");
    const optionValues = options
      .map((opt) => (opt as HTMLOptionElement).value)
      .filter((val) => !isNaN(Number(val)))
      .map(Number);

    for (const d of expectedDurations) {
      expect(optionValues).toContain(d);
    }
  });
});
