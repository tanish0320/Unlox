import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RenderPage } from "../render/RenderPage";

describe("RenderPage (Playwright Export Viewport)", () => {
  beforeEach(() => {
    // Reset document.fonts mock if necessary
    if (!document.fonts) {
      Object.defineProperty(document, "fonts", {
        value: { ready: Promise.resolve() },
        writable: true,
      });
    }
  });

  it("renders #render-root element with fixed 1280x720 dimensions", async () => {
    render(<RenderPage initialSearch="?lesson=default&scene=0&t=0" />);

    const root = screen.getByTestId("render-root");
    expect(root).toBeInTheDocument();
    expect(root.id).toBe("render-root");

    // Dimensions check
    expect(root).toHaveStyle({ width: "1280px", height: "720px" });

    // Wait for readiness signal
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });
  });

  it("selects the correct scene by index and sets timestamp attributes", async () => {
    render(<RenderPage initialSearch="?lesson=default&scene=1&t=3.5&duration=12" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });

    expect(root).toHaveAttribute("data-scene-index", "1");
    expect(root).toHaveAttribute("data-scene-type", "diagram");
    expect(root).toHaveAttribute("data-time-seconds", "3.5");
    expect(root).toHaveAttribute("data-duration-seconds", "12");
  });

  it("selects scene by scene ID (e.g. scene_02 in Person 1 lesson)", async () => {
    render(<RenderPage initialSearch="?lesson=p1&scene=scene_02&t=4.0" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });

    expect(root).toHaveAttribute("data-scene-id", "scene_02");
    expect(root).toHaveAttribute("data-scene-type", "code_walkthrough");
    expect(screen.getByText("Step 1: Read the code")).toBeInTheDocument();
  });

  it("renders Person 1 items[] diagram scene cleanly", async () => {
    render(<RenderPage initialSearch="?lesson=p1&scene=scene_03&t=2.0" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });

    expect(root).toHaveAttribute("data-scene-type", "diagram");
    expect(screen.getByText("Step 2: Watch each iteration")).toBeInTheDocument();
  });

  it("renders non-English script lessons (Hindi fixture)", async () => {
    render(<RenderPage initialSearch="?lesson=hi&scene=0&t=1.0" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });

    expect(root).toHaveAttribute("data-scene-type", "title_card");
    expect(screen.getByText("पायथन लूप कैसे काम करता है?")).toBeInTheDocument();
  });

  it("exposes clear error state and data-render-ready='false' for invalid scene index", async () => {
    render(<RenderPage initialSearch="?lesson=default&scene=99" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "false");
      expect(root).toHaveAttribute("data-render-error", "true");
    });

    expect(screen.getByTestId("render-error")).toBeInTheDocument();
    expect(screen.getByText(/Scene '99' does not exist/i)).toBeInTheDocument();
  });

  it("exposes clear error state for unknown lesson key", async () => {
    render(<RenderPage initialSearch="?lesson=non_existent_lesson_xyz" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "false");
      expect(root).toHaveAttribute("data-render-error", "true");
    });

    expect(screen.getByTestId("render-error")).toBeInTheDocument();
    expect(screen.getByText(/Lesson 'non_existent_lesson_xyz' not found/i)).toBeInTheDocument();
  });

  it("renders captions when captions=true parameter is provided", async () => {
    render(<RenderPage initialSearch="?lesson=default&scene=0&t=2.0&captions=true" />);

    const root = screen.getByTestId("render-root");
    await waitFor(() => {
      expect(root).toHaveAttribute("data-render-ready", "true");
    });

    expect(screen.getByTestId("blu-caption-track")).toBeInTheDocument();
  });
});
