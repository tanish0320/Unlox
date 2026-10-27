import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TitleCard } from "../components/scenes/TitleCard";
import { TitleCardScene } from "../components/scenes/sceneTypes";

describe("TitleCard Component", () => {
  const sample: TitleCardScene = {
    id: "tc-1",
    type: "title_card",
    heading: "How Binary Search Works",
    subtitle: "Divide and conquer algorithm in O(log n) time",
    tag: "Algorithms",
    narration: "Binary search efficiently finds an element in a sorted list.",
  };

  it("renders heading and subtitle accurately", () => {
    render(<TitleCard scene={sample} timeSeconds={3} durationSeconds={10} />);
    expect(screen.getByTestId("title-heading")).toHaveTextContent("How Binary Search Works");
    expect(screen.getByTestId("title-subtitle")).toHaveTextContent("Divide and conquer algorithm");
    expect(screen.getByText("Algorithms")).toBeInTheDocument();
  });

  it("renders safely without subtitle when omitted", () => {
    const withoutSubtitle: TitleCardScene = {
      id: "tc-2",
      type: "title_card",
      heading: "Simple Loops",
      narration: "A simple loop repeats code.",
    };
    render(<TitleCard scene={withoutSubtitle} timeSeconds={1} durationSeconds={5} />);
    expect(screen.getByTestId("title-heading")).toHaveTextContent("Simple Loops");
    expect(screen.queryByTestId("title-subtitle")).not.toBeInTheDocument();
  });

  it("handles normalized time phases: start (0), mid (5), end (10)", () => {
    const { rerender } = render(<TitleCard scene={sample} timeSeconds={0} durationSeconds={10} />);
    expect(screen.getByTestId("blu-title-card")).toBeInTheDocument();

    rerender(<TitleCard scene={sample} timeSeconds={5} durationSeconds={10} />);
    expect(screen.getByTestId("blu-title-card")).toBeInTheDocument();

    rerender(<TitleCard scene={sample} timeSeconds={10} durationSeconds={10} />);
    expect(screen.getByTestId("blu-title-card")).toBeInTheDocument();
  });

  it("handles extremely long headings gracefully without clipping errors", () => {
    const longHeading: TitleCardScene = {
      id: "tc-long",
      type: "title_card",
      heading: "An In-Depth Comprehensive Guide to Asynchronous Event Loops, Promises, and Concurrency in Modern Systems",
      narration: "A very detailed narration.",
    };
    render(<TitleCard scene={longHeading} timeSeconds={2} durationSeconds={8} />);
    expect(screen.getByTestId("title-heading")).toHaveTextContent("An In-Depth Comprehensive Guide");
  });
});
