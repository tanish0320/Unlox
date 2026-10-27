import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiagramSceneComponent } from "../components/scenes/DiagramScene";
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
    expect(screen.getByText("Iteration 1: i = 0")).toBeInTheDocument();
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
});
