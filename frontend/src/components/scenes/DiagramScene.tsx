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

export interface NodePosition {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  fontSize: number;
  index: number;
  row?: number;
  col?: number;
}

export interface EdgeLayout {
  id: string;
  from: NodePosition;
  to: NodePosition;
  label?: string;
  pathData: string;
  midX: number;
  midY: number;
  isBackEdge: boolean;
  index: number;
}

/**
 * Intelligent text line-wrapping ensuring labels never overflow node boundaries.
 */
export function wrapLabel(label: string, maxCharsPerLine: number = 22): string[] {
  if (!label) return [];
  const words = label.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [label];
}

/**
 * Calculates dynamic node dimensions based on wrapped text, ensuring minimum spacing.
 */
function computeNodeDimensions(
  label: string,
  availableSlotWidth: number,
  maxAvailableHeight: number = 100
): { width: number; height: number; lines: string[]; fontSize: number } {
  const maxChars = availableSlotWidth < 220 ? 17 : availableSlotWidth < 270 ? 21 : 25;
  const lines = wrapLabel(label, maxChars);
  const fontSize = lines.length <= 2 ? 14 : lines.length === 3 ? 13 : 12;
  const lineHeight = fontSize + 5;

  const maxLineLen = Math.max(...lines.map((l) => l.length), 0);
  const charWidth = fontSize * 0.58;
  const textWidth = maxLineLen * charWidth + 64; // 36px badge + 28px side padding

  const maxAllowedWidth = Math.max(160, availableSlotWidth - 32);
  const width = Math.min(maxAllowedWidth, Math.max(170, Math.round(textWidth)));
  const baseHeight = 36 + lines.length * lineHeight;
  const height = Math.min(maxAvailableHeight, Math.max(54, Math.round(baseHeight)));

  return { width, height, lines, fontSize };
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

  // Unify nodes and edges: support explicit nodes/edges AND problem-statement items/structured_nodes
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

    const hasBackEdge = rawEdges.some((edge) => {
      const fromIdx = rawNodes.findIndex((n) => n.id === edge.from);
      const toIdx = rawNodes.findIndex((n) => n.id === edge.to);
      return fromIdx !== -1 && toIdx !== -1 && toIdx <= fromIdx;
    });

    const isLoop = scene.layout === "loop" || scene.layout === "cycle" || (hasBackEdge && nodeCount >= 3);
    const isVertical = scene.layout === "vertical";
    const positions: NodePosition[] = [];

    const maxLabelLen = Math.max(...rawNodes.map((n) => n.label.length), 0);

    if (isLoop && nodeCount >= 3) {
      // Symmetrical elliptical loop layout
      const centerX = 640;
      const centerY = 285;
      const radiusX = nodeCount === 3 ? 310 : 350;
      const radiusY = nodeCount === 3 ? 145 : 160;
      const slotWidth = 240;

      rawNodes.forEach((node, idx) => {
        const dims = computeNodeDimensions(node.label, slotWidth, 90);
        const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / nodeCount;
        positions.push({
          id: node.id,
          label: node.label,
          x: Math.round(centerX + radiusX * Math.cos(angle)),
          y: Math.round(centerY + radiusY * Math.sin(angle)),
          width: dims.width,
          height: dims.height,
          lines: dims.lines,
          fontSize: dims.fontSize,
          index: idx,
        });
      });
    } else if (isVertical) {
      // Clean vertical stepped layout
      const centerX = 640;
      const totalHeight = 400;
      const spacing = totalHeight / (nodeCount + 1);
      const startY = 80;
      const slotWidth = 360;

      rawNodes.forEach((node, idx) => {
        const dims = computeNodeDimensions(node.label, slotWidth, 80);
        positions.push({
          id: node.id,
          label: node.label,
          x: centerX,
          y: Math.round(startY + spacing * (idx + 1)),
          width: dims.width,
          height: dims.height,
          lines: dims.lines,
          fontSize: dims.fontSize,
          index: idx,
        });
      });
    } else if (nodeCount <= 3 || (nodeCount === 4 && maxLabelLen <= 22)) {
      // Single horizontal row layout with generous inter-node breathing room
      const centerY = 285;
      const totalWidth = 1120;
      const spacing = totalWidth / (nodeCount + 1);
      const startX = 80;
      const slotWidth = Math.round(spacing);

      rawNodes.forEach((node, idx) => {
        const dims = computeNodeDimensions(node.label, slotWidth, 90);
        positions.push({
          id: node.id,
          label: node.label,
          x: Math.round(startX + spacing * (idx + 1)),
          y: centerY,
          width: dims.width,
          height: dims.height,
          lines: dims.lines,
          fontSize: dims.fontSize,
          index: idx,
          row: 0,
          col: idx,
        });
      });
    } else {
      // 2-row multi-flow layout with wide corridor between rows preventing collision
      const row1Count = Math.ceil(nodeCount / 2);
      const row2Count = nodeCount - row1Count;
      const totalWidth = 1120;
      const startX = 80;

      const spacing1 = totalWidth / (row1Count + 1);
      const spacing2 = totalWidth / (row2Count + 1);

      rawNodes.forEach((node, idx) => {
        if (idx < row1Count) {
          const dims = computeNodeDimensions(node.label, Math.round(spacing1), 84);
          positions.push({
            id: node.id,
            label: node.label,
            x: Math.round(startX + spacing1 * (idx + 1)),
            y: 185,
            width: dims.width,
            height: dims.height,
            lines: dims.lines,
            fontSize: dims.fontSize,
            index: idx,
            row: 0,
            col: idx,
          });
        } else {
          const colIdx = idx - row1Count;
          const dims = computeNodeDimensions(node.label, Math.round(spacing2), 84);
          positions.push({
            id: node.id,
            label: node.label,
            x: Math.round(startX + spacing2 * (colIdx + 1)),
            y: 395,
            width: dims.width,
            height: dims.height,
            lines: dims.lines,
            fontSize: dims.fontSize,
            index: idx,
            row: 1,
            col: colIdx,
          });
        }
      });
    }

    const nodeMap = new Map(positions.map((p) => [p.id, p]));
    const validEdges: EdgeLayout[] = [];

    rawEdges.forEach((edge, idx) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      const isBackEdge = to.index <= from.index;
      let pathData = "";
      let midX = (from.x + to.x) / 2;
      let midY = (from.y + to.y) / 2;

      if (isLoop && nodeCount >= 3) {
        const centerX = 640;
        const centerY = 285;
        const angleFrom = Math.atan2(from.y - centerY, from.x - centerX);
        const angleTo = Math.atan2(to.y - centerY, to.x - centerX);
        const startX = from.x + (Math.cos(angleFrom) * from.width) / 2;
        const startY = from.y + (Math.sin(angleFrom) * from.height) / 2;
        const endX = to.x - (Math.cos(angleTo) * to.width) / 2;
        const endY = to.y - (Math.sin(angleTo) * to.height) / 2;

        const midAngle = (angleFrom + angleTo) / 2;
        const cpX = centerX + Math.cos(midAngle) * (350 + 20);
        const cpY = centerY + Math.sin(midAngle) * (160 + 20);
        pathData = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
        midX = cpX;
        midY = cpY;
      } else if (from.row !== undefined && to.row !== undefined && from.row !== to.row) {
        // Inter-row transition: routes through empty middle corridor (Y ≈ 290)
        const startX = from.x;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y - to.height / 2;
        const corridorY = Math.round((from.y + to.y) / 2);

        pathData = `M ${startX} ${startY} C ${startX} ${corridorY}, ${endX} ${corridorY}, ${endX} ${endY}`;
        midX = (startX + endX) / 2;
        midY = corridorY;
      } else if (isBackEdge) {
        const curveOffset = 70;
        const startX = from.x;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y + to.height / 2;
        const cpY = Math.max(startY, endY) + curveOffset;
        pathData = `M ${startX} ${startY} Q ${midX} ${cpY} ${endX} ${endY}`;
        midY = cpY - 20;
      } else {
        // Standard horizontal / vertical connector
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        const startX = from.x + (Math.cos(angle) * from.width) / 2;
        const startY = from.y + (Math.sin(angle) * from.height) / 2;
        const endX = to.x - (Math.cos(angle) * to.width) / 2;
        const endY = to.y - (Math.sin(angle) * to.height) / 2;

        pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
        midX = (startX + endX) / 2;
        midY = (startY + endY) / 2;
      }

      validEdges.push({
        id: `edge-${idx}-${edge.from}-${edge.to}`,
        from,
        to,
        label: edge.label,
        pathData,
        midX,
        midY,
        isBackEdge,
        index: idx,
      });
    });

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
          <FractionBar spec={scene.fraction_bar} progress={progress} />
        ) : scene.diagram_type === "number_line" && scene.number_line ? (
          <NumberLine spec={scene.number_line} progress={progress} />
        ) : scene.diagram_type === "proportion_table" && scene.proportion_table ? (
          <ProportionTable spec={scene.proportion_table} progress={progress} />
        ) : scene.diagram_type === "science_diagram" && scene.science_diagram ? (
          <ScienceDiagram spec={scene.science_diagram} progress={progress} />
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
                <path d="M 0 1 L 11 6 L 0 11 z" fill="#234E3C" />
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
                <path d="M 0 1 L 11 6 L 0 11 z" fill="#CBD5E1" />
              </marker>
              <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {layout.edges.map((edge) => {
              const { from, to, label, pathData, midX, midY } = edge;

              const edgeRevealProgress = staggeredProgress(
                progress,
                from.index,
                layout.nodes.length,
                0.25
              );
              const isEdgeActive = from.index === activeIndex || to.index === activeIndex;
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
                        ? "#234E3C"
                        : isEdgePast
                        ? "#C87A64"
                        : "#CBD5E1"
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
                        fill="#FFFFFF"
                        stroke={isEdgeActive ? "#234E3C" : "#E8E2D5"}
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
                ? "#234E3C"
                : isPast
                ? "#C87A64"
                : "#E8E2D5";
              const strokeWidth = isActive ? 2.5 : 1.5;
              const fillColor = isActive
                ? "#EBF5EF"
                : isPast
                ? "#FAF7F2"
                : "#FFFFFF";

              const lineHeight = node.fontSize + 5;
              const startY = -((node.lines.length - 1) * lineHeight) / 2 + 5;
              const textCenterX = 10;

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

                  {/* Node State Icon Badge */}
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

                  {/* Wrapped Multiline Node Label */}
                  <text
                    x={textCenterX}
                    y={startY}
                    textAnchor="middle"
                    className="blu-diagram-label"
                    style={{
                      fill: isActive ? "#234E3C" : isPast ? "#1C2B38" : "#64748B",
                      fontWeight: isActive ? 700 : 600,
                      fontSize: node.fontSize,
                    }}
                  >
                    {node.lines.map((line, lIdx) => (
                      <tspan
                        key={lIdx}
                        x={textCenterX}
                        dy={lIdx === 0 ? 0 : lineHeight}
                      >
                        {line}
                      </tspan>
                    ))}
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
