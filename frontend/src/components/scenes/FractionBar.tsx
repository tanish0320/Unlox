import React from "react";
import { FractionBarSpec } from "./sceneTypes";
import { easeOutCubic } from "./animationUtils";

interface FractionBarProps {
  spec: FractionBarSpec;
  progress: number; // 0.0 to 1.0
  heading?: string;
}

export const FractionBar: React.FC<FractionBarProps> = ({ spec, progress }) => {
  const eased = easeOutCubic(Math.min(1, progress * 1.3));
  const totalUnits = spec.total_units || 10;
  const barWidth = 960;
  const barHeight = 64;

  const defaultColors = ["#234E3C", "#C87A64", "#D97706", "#2563EB", "#7C3AED"];

  let cumulativeUnits = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "6px 0" }}>
      <svg width={barWidth} height={180} viewBox={`0 0 ${barWidth} 180`} fill="none">
        {/* Outer Background Track */}
        <rect
          x={0}
          y={40}
          width={barWidth}
          height={barHeight}
          rx={12}
          fill="#FFFFFF"
          stroke="#E8E2D5"
          strokeWidth={2}
        />

        {/* Segment Fills */}
        {spec.segments.map((seg, idx) => {
          const segUnits = seg.units;
          const segStartRatio = cumulativeUnits / totalUnits;
          const segWidthRatio = segUnits / totalUnits;
          cumulativeUnits += segUnits;

          const segX = segStartRatio * barWidth;
          const targetWidth = segWidthRatio * barWidth;
          const animatedWidth = Math.max(0, targetWidth * eased);
          const color = seg.color || defaultColors[idx % defaultColors.length];

          const textX = segX + targetWidth / 2;
          const isRevealed = eased > segStartRatio * 0.7;

          return (
            <g key={`seg-${idx}`}>
              {/* Animated Segment Fill */}
              <rect
                x={segX + 2}
                y={42}
                width={Math.max(0, animatedWidth - 4)}
                height={barHeight - 4}
                rx={10}
                fill={color}
                opacity={0.9}
              />

              {/* Segment Label Inside */}
              {isRevealed && targetWidth > 70 && (
                <text
                  x={textX}
                  y={78}
                  fill="#FFFFFF"
                  fontSize={15}
                  fontWeight={800}
                  textAnchor="middle"
                  style={{ userSelect: "none" }}
                >
                  {seg.fraction_text || `${seg.units}/${totalUnits}`}
                </text>
              )}

              {/* Segment Legend Above */}
              <g transform={`translate(${textX}, 24)`} opacity={isRevealed ? 1 : 0}>
                <text
                  x={0}
                  y={0}
                  fill={color}
                  fontSize={13}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {seg.label} ({seg.units} units)
                </text>
              </g>
            </g>
          );
        })}

        {/* Divider ticks */}
        {Array.from({ length: totalUnits - 1 }).map((_, i) => {
          const tickX = ((i + 1) / totalUnits) * barWidth;
          return (
            <line
              key={`tick-${i}`}
              x1={tickX}
              y1={40}
              x2={tickX}
              y2={40 + barHeight}
              stroke="#E8E2D5"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Comparison Equation Banner at Bottom */}
        {spec.comparison_label && (
          <g transform={`translate(${barWidth / 2}, 150)`} opacity={eased}>
            <rect
              x={-240}
              y={-18}
              width={480}
              height={36}
              rx={18}
              fill="#FFFFFF"
              stroke="#234E3C"
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={5}
              fill="#1C2B38"
              fontSize={14}
              fontWeight={700}
              textAnchor="middle"
              letterSpacing="0.04em"
            >
              {spec.comparison_label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
