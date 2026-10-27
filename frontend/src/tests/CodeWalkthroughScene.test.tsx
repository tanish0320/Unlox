import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeWalkthroughSceneComponent } from "../components/scenes/CodeWalkthroughScene";
import { CodeWalkthroughScene } from "../components/scenes/sceneTypes";

describe("CodeWalkthroughScene Component", () => {
  const sampleCode: CodeWalkthroughScene = {
    id: "cw-1",
    type: "code_walkthrough",
    heading: "Iterating with Python",
    filename: "demo.py",
    language: "python",
    code: "for num in range(5):\n    if num % 2 == 0:\n        print('Even:', num)",
    highlight_lines: [1, 2, 3],
    narration: "Trace the condition.",
  };

  it("renders code preserving lines, line numbers, and indentation", () => {
    render(<CodeWalkthroughSceneComponent scene={sampleCode} timeSeconds={0} durationSeconds={10} />);
    expect(screen.getByTestId("blu-code-walkthrough-scene")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-1")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-2")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-3")).toBeInTheDocument();
    expect(screen.getByText("demo.py")).toBeInTheDocument();
  });

  it("progresses active highlighted line based on timeSeconds", () => {
    const { rerender } = render(
      <CodeWalkthroughSceneComponent scene={sampleCode} timeSeconds={1} durationSeconds={10} />
    );
    // At t=1 (10%), line 1 is active
    expect(screen.getByTestId("code-line-1")).toHaveAttribute("data-active", "true");

    // At t=5 (50%), line 2 is active
    rerender(<CodeWalkthroughSceneComponent scene={sampleCode} timeSeconds={5} durationSeconds={10} />);
    expect(screen.getByTestId("code-line-2")).toHaveAttribute("data-active", "true");

    // At t=9 (90%), line 3 is active
    rerender(<CodeWalkthroughSceneComponent scene={sampleCode} timeSeconds={9} durationSeconds={10} />);
    expect(screen.getByTestId("code-line-3")).toHaveAttribute("data-active", "true");
  });

  it("renders malicious or script tags inertly without executing", () => {
    const maliciousScene: CodeWalkthroughScene = {
      id: "cw-xss",
      type: "code_walkthrough",
      heading: "Security Test",
      code: "<script>window.pwned = true;</script>\neval('dangerous()')\n__proto__.polluted = true;",
      highlight_lines: [1],
      narration: "Safe text display.",
    };

    render(<CodeWalkthroughSceneComponent scene={maliciousScene} timeSeconds={1} durationSeconds={5} />);
    const line1 = screen.getByTestId("code-line-1");
    expect(line1.textContent).toContain("<script>window.pwned = true;</script>");
    expect(document.querySelector("script:not([type])")).toBeNull();
    expect((window as any).pwned).toBeUndefined();
  });

  it("handles out-of-bounds line numbers in highlight_lines safely", () => {
    const outOfBoundsScene: CodeWalkthroughScene = {
      id: "cw-oob",
      type: "code_walkthrough",
      heading: "Range Check",
      code: "x = 42\ny = 100",
      highlight_lines: [999, -5],
      narration: "Safe handling.",
    };

    render(<CodeWalkthroughSceneComponent scene={outOfBoundsScene} timeSeconds={1} durationSeconds={5} />);
    expect(screen.getByTestId("code-line-1")).toBeInTheDocument();
    expect(screen.getByTestId("code-line-2")).toBeInTheDocument();
  });
});
