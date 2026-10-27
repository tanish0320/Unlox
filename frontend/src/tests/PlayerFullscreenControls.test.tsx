import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../App";

const mockSampleData = {
  lesson_plan: {
    topic: "Test Lesson",
    level: "beginner",
    language: "en",
    scenes: [
      {
        id: "s1",
        type: "title_card",
        heading: "Welcome to Test",
        subtitle: "Subtitle",
        narration: "Narration text",
      },
      {
        id: "s2",
        type: "title_card",
        heading: "Next Scene",
        subtitle: "Subtitle 2",
        narration: "Second narration text",
      },
    ],
  },
  audio_manifest: {
    entries: [
      {
        scene_id: "s1",
        audio_file: "/api/audio/sample_en/scene_01_en.wav",
        duration_seconds: 5.0,
        caption_segments: [
          { start_seconds: 0.0, end_seconds: 5.0, text: "Narration text" },
        ],
      },
      {
        scene_id: "s2",
        audio_file: "/api/audio/sample_en/scene_02_en.wav",
        duration_seconds: 6.0,
        caption_segments: [
          { start_seconds: 0.0, end_seconds: 6.0, text: "Second narration text" },
        ],
      },
    ],
  },
  lesson_notes: {
    summary: "Summary",
    learning_objectives: ["Obj 1"],
    key_takeaways: ["Takeaway 1"],
  },
};

describe("Player Controls & Fullscreen Integration", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/lessons/fixtures/sample")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSampleData,
          });
        }
        if (url.includes("/api/tts/voices")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              en: { available: true, engine: "Kokoro" },
              hi: { available: true, engine: "Piper" },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      })
    );
  });

  it("renders the player wrapper with both animated stage and custom controls", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector(".bvt-player-wrapper")).toBeInTheDocument();
    });

    const wrapper = document.querySelector(".bvt-player-wrapper") as HTMLElement;
    const stage = document.querySelector(".bvt-player-stage-wrap") as HTMLElement;
    const controls = document.querySelector(".bvt-player-controls") as HTMLElement;

    expect(wrapper).toBeInTheDocument();
    expect(stage).toBeInTheDocument();
    expect(controls).toBeInTheDocument();

    expect(wrapper).toContainElement(stage);
    expect(wrapper).toContainElement(controls);
  });

  it("contains all essential media controls within the fullscreen wrapper", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector(".bvt-player-wrapper")).toBeInTheDocument();
    });

    // Play/pause button
    const playBtn = screen.getByTitle(/play|pause/i);
    expect(playBtn).toBeInTheDocument();

    // Fullscreen button
    const fsBtn = screen.getByTitle(/fullscreen/i);
    expect(fsBtn).toBeInTheDocument();

    // Captions toggle (CC)
    const ccBtn = screen.getByTitle(/toggle captions/i);
    expect(ccBtn).toBeInTheDocument();

    // Mute toggle
    const muteBtn = screen.getByTitle(/mute/i);
    expect(muteBtn).toBeInTheDocument();

    // Next scene button
    const nextBtn = screen.getByTitle(/next scene/i);
    expect(nextBtn).toBeInTheDocument();
  });

  it("activates controls visibility on mouse activity", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector(".bvt-player-wrapper")).toBeInTheDocument();
    });

    const wrapper = document.querySelector(".bvt-player-wrapper");
    expect(wrapper).toHaveClass("controls-visible");

    fireEvent.mouseMove(wrapper!);
    expect(wrapper).toHaveClass("controls-visible");
  });
});
