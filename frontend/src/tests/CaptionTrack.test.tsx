import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaptionTrack, getActiveCaption } from "../components/CaptionTrack";
import { CaptionSegment } from "../components/scenes/sceneTypes";

describe("CaptionTrack Component (Person 3 Contract: <CaptionTrack text visible />)", () => {
  it("renders supplied caption text when visible=true", () => {
    render(<CaptionTrack text="Hello world from Blu Visual Teacher" visible={true} />);
    expect(screen.getByTestId("blu-caption-track")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("blu-caption-track")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("blu-caption-text")).toHaveTextContent("Hello world from Blu Visual Teacher");
  });

  it("hides captions when visible=false", () => {
    render(<CaptionTrack text="Hidden caption" visible={false} />);
    const track = screen.getByTestId("blu-caption-track");
    expect(track).toHaveAttribute("data-visible", "false");
    expect(track).toHaveAttribute("data-active", "false");
    const box = screen.getByTestId("blu-caption-box");
    expect(box).toHaveStyle({ opacity: "0", visibility: "hidden" });
  });

  it("hides caption box when text is empty even if visible=true", () => {
    render(<CaptionTrack text="" visible={true} />);
    const track = screen.getByTestId("blu-caption-track");
    expect(track).toHaveAttribute("data-active", "false");
    const box = screen.getByTestId("blu-caption-box");
    expect(box).toHaveStyle({ opacity: "0", visibility: "hidden" });
  });

  it("renders Devanagari Hindi Unicode text faithfully without character corruption", () => {
    const hindiText = "पायथन लूप के इस पाठ में आपका स्वागत है।";
    render(<CaptionTrack text={hindiText} visible={true} language="hi" />);
    expect(screen.getByTestId("blu-caption-text")).toHaveTextContent(hindiText);
  });

  it("renders Kannada Unicode text faithfully", () => {
    const kannadaText = "ಪೈಥಾನ್ ಲೂಪ್ ಪಾಠಕ್ಕೆ ನಿಮಗೆ ಸ್ವಾಗತ.";
    render(<CaptionTrack text={kannadaText} visible={true} language="kn" />);
    expect(screen.getByTestId("blu-caption-text")).toHaveTextContent(kannadaText);
  });
});

describe("getActiveCaption pure helper utility", () => {
  const captions: CaptionSegment[] = [
    {
      start_seconds: 0.0,
      end_seconds: 3.0,
      text: "First sentence in English.",
      language: "en",
    },
    {
      start_seconds: 3.0,
      end_seconds: 6.5,
      text: "Second sentence explaining variables.",
      language: "en",
    },
    {
      start_seconds: 7.0, // Gap between 6.5 and 7.0
      end_seconds: 10.0,
      text: "Third sentence after a brief pause.",
      language: "en",
    },
  ];

  it("resolves active caption using [start <= time < end] semantics", () => {
    expect(getActiveCaption(captions, 1.5)).toBe("First sentence in English.");
    expect(getActiveCaption(captions, 3.0)).toBe("Second sentence explaining variables.");
    expect(getActiveCaption(captions, 5.0)).toBe("Second sentence explaining variables.");
  });

  it("returns empty string during timeline gaps", () => {
    expect(getActiveCaption(captions, 6.7)).toBe("");
  });

  it("deterministically breaks ties for overlapping segments using latest start_seconds", () => {
    const overlapping: CaptionSegment[] = [
      { start_seconds: 1.0, end_seconds: 5.0, text: "Broad segment", language: "en" },
      { start_seconds: 2.0, end_seconds: 4.0, text: "Specific sub-segment", language: "en" },
    ];
    expect(getActiveCaption(overlapping, 2.5)).toBe("Specific sub-segment");
  });

  it("handles empty segment arrays safely", () => {
    expect(getActiveCaption([], 2.5)).toBe("");
  });
});
