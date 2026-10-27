import React from "react";
import { ScienceDiagramSpec } from "./sceneTypes";
import { easeOutCubic, deterministicPulse } from "./animationUtils";

interface ScienceDiagramProps {
  spec: ScienceDiagramSpec;
  progress: number;
  heading?: string;
}

export const ScienceDiagram: React.FC<ScienceDiagramProps> = ({ spec, progress }) => {
  const eased = easeOutCubic(progress);
  const pulse = deterministicPulse(progress, 2.5);
  const elements = spec.elements || [];
  const flow = spec.process_flow || [];

  const width = 960;
  const height = 440;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "6px 0" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        {/* Ambient Stage Background */}
        <rect
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          rx={16}
          fill="#FFFFFF"
          stroke="#E8E2D5"
          strokeWidth={1.5}
        />

        {/* Subject Header Badge */}
        <g transform={`translate(${width / 2}, 44)`}>
          <rect x={-140} y={-14} width={280} height={28} rx={14} fill="#EBF5EF" stroke="#234E3C" strokeWidth={1} />
          <text x={0} y={4} fill="#234E3C" fontSize={12} fontWeight={700} textAnchor="middle" letterSpacing="0.08em">
            SYSTEM: {spec.subject.toUpperCase()}
          </text>
        </g>

        {/* Scientific Elements with Floating Positions & Pulsing Pins */}
        {elements.map((el, idx) => {
          // el.x and el.y are percentages (0-100)
          const px = (el.x / 100) * (width - 160) + 80;
          const py = (el.y / 100) * (height - 180) + 90;

          const elProgress = Math.min(1, Math.max(0, (eased - idx * 0.15) / 0.4));
          const scale = 0.8 + elProgress * 0.2 + pulse * 0.03;

          if (elProgress <= 0) return null;

          return (
            <g key={`el-${idx}`} transform={`translate(${px}, ${py}) scale(${scale})`} opacity={elProgress}>
              {/* Pulsing Target Pin */}
              <circle cx={0} cy={0} r={16} fill="rgba(35, 78, 60, 0.15)" />
              <circle cx={0} cy={0} r={8} fill="#234E3C" />
              <circle cx={0} cy={0} r={3} fill="#FFFFFF" />

              {/* Element Label Card */}
              <g transform="translate(24, -18)">
                <rect
                  x={0}
                  y={0}
                  width={180}
                  height={el.role ? 48 : 34}
                  rx={8}
                  fill="#FFFFFF"
                  stroke="#E8E2D5"
                  strokeWidth={1.5}
                />
                <text x={12} y={20} fill="#1C2B38" fontSize={13} fontWeight={700}>
                  {el.name}
                </text>
                {el.role && (
                  <text x={12} y={36} fill="#64748B" fontSize={11} fontWeight={500}>
                    {el.role}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Process Flow Timeline at Bottom if provided */}
        {flow.length > 0 && (
          <g transform={`translate(60, ${height - 50})`}>
            <rect x={0} y={-16} width={width - 120} height={38} rx={8} fill="#F4EFE6" stroke="#E8E2D5" />
            {flow.map((step, sIdx) => {
              const stepWidth = (width - 140) / flow.length;
              const sx = sIdx * stepWidth + stepWidth / 2;
              const isStepActive = eased > (sIdx / flow.length);

              return (
                <g key={`step-${sIdx}`} transform={`translate(${sx}, 6)`} opacity={isStepActive ? 1 : 0.4}>
                  <text x={0} y={0} fill={isStepActive ? "#234E3C" : "#64748B"} fontSize={12} fontWeight={700} textAnchor="middle">
                    {sIdx + 1}. {step}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};
