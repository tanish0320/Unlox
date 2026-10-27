import React from "react";
import { NumberLineSpec } from "./sceneTypes";
import { easeOutCubic } from "./animationUtils";

interface NumberLineProps {
  spec: NumberLineSpec;
  progress: number;
  heading?: string;
}

export const NumberLine: React.FC<NumberLineProps> = ({ spec, progress }) => {
  const eased = easeOutCubic(progress);
  const minVal = spec.min_val ?? 0;
  const maxVal = spec.max_val ?? 10;
  const step = spec.step ?? 1;
  const totalSteps = Math.max(1, Math.round((maxVal - minVal) / step));

  const width = 940;
  const height = 160;
  const lineY = 80;
  const paddingX = 50;
  const usableWidth = width - 2 * paddingX;

  const valueToX = (val: number) => {
    const ratio = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
    return paddingX + ratio * usableWidth;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "6px 0" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <defs>
          <marker id="nl-arrow-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#234E3C" />
          </marker>
          <marker id="nl-arrow-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#234E3C" />
          </marker>
        </defs>

        {/* Highlight Interval if provided */}
        {spec.highlight_range && (
          <rect
            x={valueToX(spec.highlight_range[0])}
            y={lineY - 20}
            width={(valueToX(spec.highlight_range[1]) - valueToX(spec.highlight_range[0])) * eased}
            height={40}
            rx={8}
            fill="rgba(35, 78, 60, 0.12)"
            stroke="rgba(35, 78, 60, 0.4)"
            strokeWidth={1.5}
          />
        )}

        {/* Main Axis Line */}
        <line
          x1={paddingX - 20}
          y1={lineY}
          x2={width - paddingX + 20}
          y2={lineY}
          stroke="#234E3C"
          strokeWidth={3}
          markerStart="url(#nl-arrow-left)"
          markerEnd="url(#nl-arrow-right)"
        />

        {/* Ticks and Number Labels */}
        {Array.from({ length: totalSteps + 1 }).map((_, idx) => {
          const val = minVal + idx * step;
          const x = valueToX(val);
          const isMajor = idx % 2 === 0 || totalSteps <= 10;
          const tickHeight = isMajor ? 16 : 10;

          return (
            <g key={`tick-${idx}`}>
              <line
                x1={x}
                y1={lineY - tickHeight / 2}
                x2={x}
                y2={lineY + tickHeight / 2}
                stroke="#64748B"
                strokeWidth={isMajor ? 2 : 1}
              />
              <text
                x={x}
                y={lineY + 28}
                fill="#1C2B38"
                fontSize={13}
                fontWeight={isMajor ? 700 : 500}
                textAnchor="middle"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Marked Dynamic Points */}
        {(spec.marked_points || []).map((pt, pIdx) => {
          const targetX = valueToX(pt.value);
          const color = pt.color || "#234E3C";
          const pointProgress = Math.min(1, Math.max(0, (eased - pIdx * 0.2) / 0.5));

          if (pointProgress <= 0) return null;

          return (
            <g key={`pt-${pIdx}`} transform={`translate(${targetX}, ${lineY})`} opacity={pointProgress}>
              {/* Pulsing indicator circle */}
              <circle cx={0} cy={0} r={8 * pointProgress} fill={color} />
              <circle cx={0} cy={0} r={14 * pointProgress} fill="none" stroke={color} strokeWidth={2} opacity={0.5} />

              {/* Point Label Box Above */}
              <g transform="translate(0, -32)">
                <rect x={-45} y={-14} width={90} height={26} rx={6} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
                <text x={0} y={3} fill="#1C2B38" fontSize={12} fontWeight={700} textAnchor="middle">
                  {pt.label}: {pt.value}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
