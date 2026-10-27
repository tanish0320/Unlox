import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneRenderer } from "../components/scenes/SceneRenderer";
import {
  TitleCardScene,
  DiagramScene,
  CodeWalkthroughScene,
  LessonScene,
} from "../components/scenes/sceneTypes";

describe("SceneRenderer (Person 3 Contract: scene, timeSeconds, durationSeconds)", () => {
  const titleScene: TitleCardScene = {
    id: "s1",
    type: "title_card",
    heading: "Introduction to Recursion",
    subtitle: "A function that calls itself",
    narration: "Let's explore recursion.",
  };

  const diagramScene: DiagramScene = {
    id: "s2",
    type: "diagram",
    heading: "Call Stack Growth",
    narration: "The stack grows with each invocation.",
    nodes: [
      { id: "a", label: "Base Case" },
      { id: "b", label: "Recursive Call" },
    ],
    edges: [{ from: "b", to: "a", label: "Resolves" }],
  };

  const codeScene: CodeWalkthroughScene = {
    id: "s3",
    type: "code_walkthrough",
    heading: "Factorial in Python",
    narration: "Look at the recursive condition.",
    code: "def fact(n):\n    if n <= 1: return 1\n    return n * fact(n-1)",
    highlight_lines: [2, 3],
  };

  it("renders title_card scene correctly with timeSeconds and durationSeconds", () => {
    render(<SceneRenderer scene={titleScene} timeSeconds={2} durationSeconds={10} />);
    expect(screen.getByTestId("blu-title-card")).toBeInTheDocument();
    expect(screen.getByTestId("title-heading")).toHaveTextContent("Introduction to Recursion");
    expect(screen.getByTestId("title-subtitle")).toHaveTextContent("A function that calls itself");
  });

  it("renders diagram scene correctly", () => {
    render(<SceneRenderer scene={diagramScene} timeSeconds={5} durationSeconds={10} />);
    expect(screen.getByTestId("blu-diagram-scene")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-a")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-b")).toBeInTheDocument();
  });

  it("renders code_walkthrough scene correctly", () => {
    render(<SceneRenderer scene={codeScene} timeSeconds={5} durationSeconds={10} />);
    expect(screen.getByTestId("blu-code-walkthrough-scene")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-1")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-2")).toBeInTheDocument();
  });

  it("handles unknown scene types gracefully without throwing or crashing", () => {
    const unknownScene = {
      id: "unknown-1",
      type: "unsupported_3d_mesh" as any,
      heading: "3D Quantum Physics",
      narration: "This scene type is unrecognized.",
    } as LessonScene;

    render(<SceneRenderer scene={unknownScene} timeSeconds={1} durationSeconds={5} />);
    expect(screen.getByTestId("blu-unknown-scene")).toBeInTheDocument();
    expect(screen.getByText(/Unsupported Scene/i)).toBeInTheDocument();
    expect(screen.getByText("3D Quantum Physics")).toBeInTheDocument();
  });

  it("forwards timeSeconds and durationSeconds to container attributes", () => {
    const { rerender } = render(
      <SceneRenderer scene={titleScene} timeSeconds={0} durationSeconds={10} />
    );
    const container = screen.getByTestId("blu-scene-renderer");
    expect(container).toHaveAttribute("data-time-seconds", "0");
    expect(container).toHaveAttribute("data-duration-seconds", "10");

    // Seek forward
    rerender(<SceneRenderer scene={titleScene} timeSeconds={7.5} durationSeconds={10} />);
    expect(container).toHaveAttribute("data-time-seconds", "7.5");

    // Seek backward restores exact time
    rerender(<SceneRenderer scene={titleScene} timeSeconds={2} durationSeconds={10} />);
    expect(container).toHaveAttribute("data-time-seconds", "2");
  });
});
