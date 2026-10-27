import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiagramSceneComponent, wrapLabel } from "../components/scenes/DiagramScene";
import { DiagramScene } from "../components/scenes/sceneTypes";

describe("DiagramScene Component", () => {
  const linearDiagram: DiagramScene = {
    id: "diag-1",
    type: "diagram",
    heading: "Data Pipeline",
    narration: "Raw data transforms into insights.",
    nodes: [
      { id: "ingest", label: "Ingest Data" },
      { id: "clean", label: "Clean & Normalize" },
      { id: "store", label: "Database Store" },
    ],
    edges: [
      { from: "ingest", to: "clean", label: "Validate" },
      { from: "clean", to: "store", label: "Persist" },
    ],
  };

  it("renders all nodes and valid edges with timeSeconds", () => {
    render(<DiagramSceneComponent scene={linearDiagram} timeSeconds={5} durationSeconds={10} />);
    expect(screen.getByTestId("diagram-node-ingest")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-clean")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-store")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-edge-ingest-clean")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-edge-clean-store")).toBeInTheDocument();
    expect(screen.getByText("Persist")).toBeInTheDocument();
  });

  it("renders problem-statement / Person 1 items array seamlessly", () => {
    const itemsDiagram: DiagramScene = {
      id: "diag-items",
      type: "diagram",
      heading: "Watch Each Iteration",
      items: [
        "Iteration 1: i = 0",
        "Iteration 2: i = 1",
        "Iteration 3: i = 2",
      ],
      narration: "Each pass takes the next value.",
    };
    render(<DiagramSceneComponent scene={itemsDiagram} timeSeconds={2} durationSeconds={6} />);
    expect(screen.getByTestId("diagram-node-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-node-item-2")).toBeInTheDocument();
  });

  it("safely filters invalid edges referring to nonexistent nodes", () => {
    const invalidEdgeDiagram: DiagramScene = {
      id: "diag-invalid",
      type: "diagram",
      heading: "Network Graph",
      narration: "Some edges are invalid.",
      nodes: [
        { id: "n1", label: "Node 1" },
        { id: "n2", label: "Node 2" },
      ],
      edges: [
        { from: "n1", to: "n2", label: "Valid" },
        { from: "n1", to: "ghost_node_99", label: "Broken" },
        { from: "phantom_0", to: "n2" },
      ],
    };

    render(<DiagramSceneComponent scene={invalidEdgeDiagram} timeSeconds={3} durationSeconds={6} />);
    expect(screen.getByTestId("diagram-edge-n1-n2")).toBeInTheDocument();
    expect(screen.queryByTestId("diagram-edge-n1-ghost_node_99")).not.toBeInTheDocument();
  });

  it("handles loop / cycle topologies deterministically", () => {
    const loopDiagram: DiagramScene = {
      id: "diag-loop",
      type: "diagram",
      heading: "Feedback Loop",
      layout: "loop",
      narration: "A cycle continuously adapts.",
      nodes: [
        { id: "plan", label: "Plan" },
        { id: "execute", label: "Execute" },
        { id: "review", label: "Review" },
      ],
      edges: [
        { from: "plan", to: "execute" },
        { from: "execute", to: "review" },
        { from: "review", to: "plan", label: "Loop Back" },
      ],
    };

    render(<DiagramSceneComponent scene={loopDiagram} timeSeconds={2} durationSeconds={6} />);
    expect(screen.getByTestId("diagram-node-plan")).toBeInTheDocument();
    expect(screen.getByTestId("diagram-edge-review-plan")).toBeInTheDocument();
  });

  it("handles empty nodes gracefully", () => {
    const emptyDiagram: DiagramScene = {
      id: "diag-empty",
      type: "diagram",
      heading: "Empty Graph",
      narration: "Nothing here.",
      nodes: [],
      edges: [],
    };

    render(<DiagramSceneComponent scene={emptyDiagram} timeSeconds={1} durationSeconds={4} />);
    expect(screen.getByText(/No diagram nodes provided/i)).toBeInTheDocument();
  });

  it("wraps long labels into multiple lines without clipping", () => {
    const longText = "Horizontal Distance (Δx = x₂ - x₁)";
    const lines = wrapLabel(longText, 20);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe("Horizontal Distance");
    expect(lines[1]).toBe("(Δx = x₂ - x₁)");
  });

  it("renders 4 nodes with long labels in responsive multi-row layout without overlap", () => {
    const fourLongNodes: DiagramScene = {
      id: "diag-4-long",
      type: "diagram",
      heading: "Pythagorean Coordinate Geometry",
      items: [
        "Horizontal Distance (Δx = x₂ - x₁)",
        "Vertical Distance (Δy = y₂ - y₁)",
        "Sum of Squares (Δx² + Δy²)",
        "Euclidean Distance (d = √(Δx² + Δy²))",
      ],
      narration: "Distance formula derived directly from right triangle geometry.",
    };

    const { container } = render(
      <DiagramSceneComponent scene={fourLongNodes} timeSeconds={3} durationSeconds={8} />
    );

    const nodeElements = container.querySelectorAll("[data-testid^='diagram-node-item-']");
    expect(nodeElements.length).toBe(4);

    // Verify all 4 nodes have valid rect dimensions
    const rects = container.querySelectorAll(".blu-diagram-node-rect");
    expect(rects.length).toBe(4);
    rects.forEach((rect) => {
      const width = parseFloat(rect.getAttribute("width") || "0");
      const height = parseFloat(rect.getAttribute("height") || "0");
      expect(width).toBeGreaterThan(150);
      expect(height).toBeGreaterThan(50);
    });
  });

  it("renders 6 nodes with safe spacing and corridor arrow routing", () => {
    const sixNodesDiagram: DiagramScene = {
      id: "diag-6-nodes",
      type: "diagram",
      heading: "Scientific Method Steps",
      items: [
        "Observation & Question",
        "Background Research",
        "Formulate Hypothesis",
        "Experimental Design",
        "Data Analysis",
        "Draw Conclusion",
      ],
      narration: "The systematic empirical method for exploring natural phenomena.",
    };

    const { container } = render(
      <DiagramSceneComponent scene={sixNodesDiagram} timeSeconds={4} durationSeconds={10} />
    );

    const nodeElements = container.querySelectorAll("[data-testid^='diagram-node-item-']");
    expect(nodeElements.length).toBe(6);

    // Verify edge count
    const edgeElements = container.querySelectorAll("[data-testid^='diagram-edge-']");
    expect(edgeElements.length).toBe(5);

    // Verify the inter-row transition edge (item-2 to item-3) uses smooth corridor path
    const transitionEdge = container.querySelector("[data-testid='diagram-edge-item-2-item-3'] path");
    expect(transitionEdge).toBeDefined();
    const dAttr = transitionEdge?.getAttribute("d") || "";
    // Cubic bezier path: contains 'C'
    expect(dAttr).toContain("C");
  });
});
