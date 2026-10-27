import React from "react";
import { ProportionTableSpec } from "./sceneTypes";
import { easeOutCubic } from "./animationUtils";

interface ProportionTableProps {
  spec: ProportionTableSpec;
  progress: number;
  heading?: string;
}

export const ProportionTable: React.FC<ProportionTableProps> = ({ spec, progress }) => {
  const eased = easeOutCubic(progress);
  const rows = spec.rows || [];
  const headers = spec.headers || ["Quantity A", "Quantity B"];

  const rowCount = rows.length;
  const activeRowIdx = Math.min(rowCount - 1, Math.floor(eased * rowCount));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "6px 0" }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1.5px solid #E8E2D5",
        borderRadius: 14,
        overflow: "hidden",
        width: 720,
        boxShadow: "0 6px 20px rgba(28, 43, 56, 0.08)",
      }}>
        {/* Table Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
          backgroundColor: "#F4EFE6",
          borderBottom: "1.5px solid #E8E2D5",
          padding: "14px 20px",
        }}>
          {headers.map((h, hIdx) => (
            <div
              key={`h-${hIdx}`}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: hIdx === 0 ? "#234E3C" : "#C87A64",
                textAlign: "center",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        <div style={{ padding: "8px 12px" }}>
          {rows.map((row, rIdx) => {
            const isRevealed = rIdx <= activeRowIdx;
            const isCurrent = rIdx === activeRowIdx;

            return (
              <div
                key={`r-${rIdx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
                  padding: "12px 16px",
                  borderRadius: 8,
                  marginBottom: 6,
                  backgroundColor: isCurrent ? "rgba(35, 78, 60, 0.08)" : "transparent",
                  border: isCurrent ? "1.5px solid rgba(35, 78, 60, 0.3)" : "1.5px solid transparent",
                  opacity: isRevealed ? 1 : 0.2,
                  transform: isRevealed ? "none" : "translateY(8px)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {row.values.map((val, vIdx) => (
                  <div
                    key={`v-${vIdx}`}
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: isCurrent ? "#234E3C" : "#1C2B38",
                      textAlign: "center",
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Scaling Multiplier Footnote */}
        {spec.scale_factor_label && (
          <div style={{
            backgroundColor: "#F4EFE6",
            padding: "10px 18px",
            borderTop: "1px solid #E8E2D5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13,
            color: "#234E3C",
            fontWeight: 600,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Scaling Invariant: {spec.scale_factor_label}
          </div>
        )}
      </div>
    </div>
  );
};
