import React, { useMemo } from "react";
import { DiagramSceneProps, DiagramNode, DiagramEdge } from "./sceneTypes";
import { FractionBar } from "./FractionBar";
import { NumberLine } from "./NumberLine";
import { ProportionTable } from "./ProportionTable";
import { ScienceDiagram } from "./ScienceDiagram";
import {
  normalizedProgress,
  staggeredProgress,
  activeStepIndex,
  easeOutCubic,
  deterministicPulse,
} from "./animationUtils";

interface NodePosition {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

export const DiagramSceneComponent: React.FC<DiagramSceneProps> = ({
  scene,
  timeSeconds,
  durationSeconds,
  currentTime,
  duration,
  className = "",
}) => {
  const resolvedTime = Number.isFinite(timeSeconds) ? timeSeconds : (Number.isFinite(currentTime) ? currentTime! : 0);
  const resolvedDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : (Number.isFinite(duration) && duration! > 0 ? duration! : 1);

  const progress = normalizedProgress(resolvedTime, resolvedDuration);

  // Unify nodes and edges: support both explicit nodes/edges AND problem-statement items/structured_nodes
  const { rawNodes, rawEdges } = useMemo(() => {
    let nodes: DiagramNode[] = scene.nodes || [];
    let edges: DiagramEdge[] = scene.edges || [];

    if (nodes.length === 0 && scene.items && scene.items.length > 0) {
      nodes = scene.items.map((item, idx) => ({
        id: `item-${idx}`,
        label: item,
      }));
      edges = scene.items.slice(0, -1).map((_, idx) => ({
        from: `item-${idx}`,
        to: `item-${idx + 1}`,
      }));
    } else if (nodes.length === 0 && scene.structured_nodes && scene.structured_nodes.length > 0) {
      nodes = scene.structured_nodes.map((node, idx) => ({
        id: `snode-${idx}`,
        label: node.label,
        description: node.detail,
      }));
      edges = scene.structured_nodes.slice(0, -1).map((_, idx) => ({
        from: `snode-${idx}`,
        to: `snode-${idx + 1}`,
      }));
    }

    return { rawNodes: nodes, rawEdges: edges };
  }, [scene.nodes, scene.edges, scene.items, scene.structured_nodes]);

  const layout = useMemo(() => {
    const nodeCount = rawNodes.length;
    if (nodeCount === 0) return { nodes: [], edges: [] };

    const nodeWidth = 240;
    const nodeHeight = 76;

    const hasBackEdge = rawEdges.some((edge) => {
      const fromIdx = rawNodes.findIndex((n) => n.id === edge.from);
      const toIdx = rawNodes.findIndex((n) => n.id === edge.to);
      return fromIdx !== -1 && toIdx !== -1 && toIdx <= fromIdx;
    });

    const isLoop = scene.layout === "loop" || scene.layout === "cycle" || (hasBackEdge && nodeCount >= 3);
    const positions: NodePosition[] = [];

    if (isLoop && nodeCount >= 3) {
      const centerX = 640;
      const centerY = 370;
      const radiusX = nodeCount === 3 ? 320 : 360;
      const radiusY = nodeCount === 3 ? 160 : 170;

      rawNodes.forEach((node, idx) => {
        const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / nodeCount;
        positions.push({
          id: node.id,
          label: node.label,
          x: Math.round(centerX + radiusX * Math.cos(angle)),
          y: Math.round(centerY + radiusY * Math.sin(angle)),
          width: nodeWidth,
          height: nodeHeight,
          index: idx,
        });
      });
    } else if (nodeCount <= 4) {
      const centerY = 370;
      const totalWidth = 1100;
      const spacing = totalWidth / (nodeCount + 1);
      const startX = (1280 - totalWidth) / 2;

      rawNodes.forEach((node, idx) => {
        positions.push({
          id: node.id,
          label: node.label,
          x: Math.round(startX + spacing * (idx + 1)),
          y: centerY,
          width: nodeWidth,
          height: nodeHeight,
          index: idx,
        });
      });
    } else {
      const row1Count = Math.ceil(nodeCount / 2);
      const row2Count = nodeCount - row1Count;

      rawNodes.forEach((node, idx) => {
        if (idx < row1Count) {
          const spacing = 1100 / (row1Count + 1);
          positions.push({
            id: node.id,
            label: node.label,
            x: Math.round(90 + spacing * (idx + 1)),
            y: 280,
            width: nodeWidth,
            height: nodeHeight,
            index: idx,
          });
        } else {
          const colIdx = idx - row1Count;
          const spacing = 1100 / (row2Count + 1);
          positions.push({
            id: node.id,
            label: node.label,
            x: Math.round(90 + spacing * (colIdx + 1)),
            y: 440,
            width: nodeWidth,
            height: nodeHeight,
            index: idx,
          });
        }
      });
    }

    const nodeMap = new Map(positions.map((p) => [p.id, p]));
    const validEdges = rawEdges
      .map((edge, idx) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        return {
          id: `edge-${idx}-${edge.from}-${edge.to}`,
          from: fromNode,
          to: toNode,
          label: edge.label,
          index: idx,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { nodes: positions, edges: validEdges };
  }, [rawNodes, rawEdges, scene.layout]);

  const activeIndex = activeStepIndex(progress, layout.nodes.length);
  const pulse = deterministicPulse(progress, 3);
  const isRatioTopic = /ratio|proportion|अनुपात|समानुपात|तुलना/i.test(scene.heading || "") || layout.nodes.some((n) => /ratio|proportion|अनुपात|:/i.test(n.label));

  return (
    <div
      className={`blu-stage-inner ${className}`}
      data-testid="blu-diagram-scene"
      data-scene-id={scene.id}
    >
      <div className="blu-scene-header">
        <h2 className="blu-scene-heading">
          <span className="blu-scene-badge">Diagram</span>
          <span>{scene.heading}</span>
        </h2>
        <div className="blu-scene-badge">
          Step {Math.min(activeIndex + 1, layout.nodes.length)} of{" "}
          {layout.nodes.length}
        </div>
      </div>

      <div className="blu-diagram-container">
        {scene.diagram_type === "fraction_bar" && scene.fraction_bar ? (
          <FractionBar spec={scene.fraction_bar} progress={progress} heading={scene.heading} />
        ) : scene.diagram_type === "number_line" && scene.number_line ? (
          <NumberLine spec={scene.number_line} progress={progress} heading={scene.heading} />
        ) : scene.diagram_type === "proportion_table" && scene.proportion_table ? (
          <ProportionTable spec={scene.proportion_table} progress={progress} heading={scene.heading} />
        ) : scene.diagram_type === "science_diagram" && scene.science_diagram ? (
          <ScienceDiagram spec={scene.science_diagram} progress={progress} heading={scene.heading} />
        ) : layout.nodes.length === 0 ? (
          <div style={{ color: "var(--blu-muted)", fontSize: 18 }}>
            No diagram nodes provided.
          </div>
        ) : (
          <svg
            className="blu-diagram-svg"
            viewBox="0 0 1280 600"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="diagram-arrow"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 11 6 L 0 11 z" fill="#38BDF8" />
              </marker>
              <marker
                id="diagram-arrow-muted"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 11 6 L 0 11 z" fill="rgba(148, 163, 184, 0.4)" />
              </marker>
              <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {layout.edges.map((edge) => {
              const { from, to, label } = edge;

              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const angle = Math.atan2(dy, dx);

              const startX = from.x + (Math.cos(angle) * from.width) / 2;
              const startY = from.y + (Math.sin(angle) * from.height) / 2;
              const endX = to.x - (Math.cos(angle) * to.width) / 2;
              const endY = to.y - (Math.sin(angle) * to.height) / 2;

              const isBackEdge = to.index <= from.index;
              let pathData = "";
              let midX = (startX + endX) / 2;
              let midY = (startY + endY) / 2;

              if (isBackEdge) {
                const curveOffset = 90;
                const cpX = midX;
                const cpY = Math.max(startY, endY) + curveOffset;
                pathData = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
                midY = cpY - 40;
              } else {
                pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
              }

              const edgeRevealProgress = staggeredProgress(
                progress,
                from.index,
                layout.nodes.length,
                0.25
              );
              const isEdgeActive =
                from.index === activeIndex || to.index === activeIndex;
              const isEdgePast = to.index <= activeIndex;

              return (
                <g
                  key={edge.id}
                  opacity={edgeRevealProgress}
                  data-testid={`diagram-edge-${edge.from.id}-${edge.to.id}`}
                >
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      isEdgeActive
                        ? "#38BDF8"
                        : isEdgePast
                        ? "rgba(52, 211, 153, 0.7)"
                        : "rgba(148, 163, 184, 0.3)"
                    }
                    strokeWidth={isEdgeActive ? 3 : 2}
                    strokeDasharray={isEdgeActive ? "none" : isEdgePast ? "none" : "5 5"}
                    markerEnd={
                      isEdgeActive || isEdgePast
                        ? "url(#diagram-arrow)"
                        : "url(#diagram-arrow-muted)"
                    }
                  />

                  {label && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-45"
                        y="-12"
                        width="90"
                        height="24"
                        rx="6"
                        fill="#111A2E"
                        stroke={isEdgeActive ? "#38BDF8" : "rgba(255, 255, 255, 0.15)"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        className="blu-diagram-edge-label"
                      >
                        {label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {layout.nodes.map((node) => {
              const nodeProgress = staggeredProgress(
                progress,
                node.index,
                layout.nodes.length,
                0.2
              );
              const eased = easeOutCubic(nodeProgress);

              const isActive = node.index === activeIndex;
              const isPast = node.index < activeIndex;

              const scale = 0.9 + eased * 0.1 + (isActive ? pulse * 0.04 : 0);
              const opacity = nodeProgress;

              const strokeColor = isActive
                ? "#38BDF8"
                : isPast
                ? "#34D399"
                : "rgba(56, 189, 248, 0.25)";
              const strokeWidth = isActive ? 3 : 1.5;
              const fillColor = isActive
                ? "#17243B"
                : isPast
                ? "rgba(17, 26, 46, 0.95)"
                : "rgba(11, 16, 32, 0.85)";

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                  opacity={opacity}
                  filter={isActive ? "url(#nodeGlow)" : undefined}
                  data-testid={`diagram-node-${node.id}`}
                >
                  <rect
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={14}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="blu-diagram-node-rect"
                  />

                  {isPast ? (
                    <g transform={`translate(${-node.width / 2 + 20}, 0)`}>
                      <circle cx="0" cy="0" r="10" fill="rgba(52, 211, 153, 0.2)" />
                      <path
                        d="M -4 0 L -1 3 L 4 -3"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : isActive ? (
                    <g transform={`translate(${-node.width / 2 + 20}, 0)`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="rgba(56, 189, 248, 0.25)"
                      />
                      <circle cx="0" cy="0" r="4" fill="#38BDF8" />
                    </g>
                  ) : (
                    <g transform={`translate(${-node.width / 2 + 20}, 0)`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="8"
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.4)"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  <text
                    x={8}
                    y={5}
                    textAnchor="middle"
                    className="blu-diagram-label"
                    style={{
                      fill: isActive ? "#F8FAFC" : isPast ? "#E2E8F0" : "#94A3B8",
                      fontWeight: isActive ? 700 : 600,
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
            {isRatioTopic && (
              <g transform="translate(640, 510)">
                <rect x="-340" y="-32" width="680" height="64" rx="14" fill="#111A2E" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" />
                <rect x="-310" y="-12" width="240" height="26" rx="6" fill="#38BDF8" opacity="0.85" />
                <text x="-190" y="5" fill="#0B1020" fontSize="13" fontWeight="bold" textAnchor="middle">Quantity A (2 units)</text>
                <text x="-50" y="6" fill="#38BDF8" fontSize="18" fontWeight="bold" textAnchor="middle">:</text>
                <rect x="-30" y="-12" width="340" height="26" rx="6" fill="#34D399" opacity="0.85" />
                <text x="140" y="5" fill="#0B1020" fontSize="13" fontWeight="bold" textAnchor="middle">Quantity B (3 units)</text>
                <text x="-310" y="-18" fill="#94A3B8" fontSize="11" fontWeight="600" letterSpacing="0.5">RATIO &amp; PROPORTION VISUALIZER</text>
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
