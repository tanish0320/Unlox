import React, { useState } from "react";
import { FractionsLab } from "./FractionsLab";
import { TriangleLab } from "./TriangleLab";
import { NewtonLab } from "./NewtonLab";

export interface WhatIfLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSimulation?: "fractions" | "triangle" | "newton";
}

export const WhatIfLabModal: React.FC<WhatIfLabModalProps> = ({
  isOpen,
  onClose,
  defaultSimulation = "fractions",
}) => {
  const [activeTab, setActiveTab] = useState<"fractions" | "triangle" | "newton">(defaultSimulation);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "24px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "90vh",
          backgroundColor: "#0b0f19",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #1e293b",
            background: "#0f172a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.25rem" }}>🔬</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
              Interactive Learning Lab (&quot;What-If Lab&quot;)
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "#0369a1",
                color: "#e0f2fe",
                fontWeight: 600,
              }}
            >
              Offline Ready
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Learning Lab"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            &times;
          </button>
        </div>

        {/* Simulation Switcher Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "8px 24px",
            background: "#0b1120",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <button
            onClick={() => setActiveTab("fractions")}
            style={{
              padding: "8px 16px",
              background: activeTab === "fractions" ? "#1e293b" : "transparent",
              color: activeTab === "fractions" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "fractions" ? "2px solid #38bdf8" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            1. Fractions &amp; Proportions
          </button>

          <button
            onClick={() => setActiveTab("triangle")}
            style={{
              padding: "8px 16px",
              background: activeTab === "triangle" ? "#1e293b" : "transparent",
              color: activeTab === "triangle" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "triangle" ? "2px solid #38bdf8" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            2. Triangle Geometry &amp; Pythagoras
          </button>

          <button
            onClick={() => setActiveTab("newton")}
            style={{
              padding: "8px 16px",
              background: activeTab === "newton" ? "#1e293b" : "transparent",
              color: activeTab === "newton" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "newton" ? "2px solid #38bdf8" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            3. Newton&apos;s Second Law (F = m&middot;a)
          </button>
        </div>

        {/* Active Simulation Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            maxHeight: "calc(90vh - 120px)",
          }}
        >
          {activeTab === "fractions" && <FractionsLab />}
          {activeTab === "triangle" && <TriangleLab />}
          {activeTab === "newton" && <NewtonLab />}
        </div>
      </div>
    </div>
  );
};
