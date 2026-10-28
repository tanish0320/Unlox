import React, { useState } from "react";

export const TriangleLab: React.FC = () => {
  const [base, setBase] = useState<number>(8); // cm
  const [height, setHeight] = useState<number>(6); // cm
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  // Computations
  const hypotenuse = Math.sqrt(base * base + height * height);
  const area = 0.5 * base * height;
  const angleA = (Math.atan(height / base) * 180) / Math.PI; // Base angle
  const angleB = 90 - angleA; // Top angle
  const angleC = 90; // Right angle
  const angleSum = angleA + angleB + angleC;

  const handleReset = () => {
    setBase(8);
    setHeight(6);
    setShowExplanation(false);
    setSelectedChallenge(null);
    setChallengeFeedback(null);
  };

  const checkChallenge = (optIndex: number) => {
    setSelectedChallenge(optIndex);
    // Question: For a right triangle with base = 6 cm and height = 8 cm, what is the hypotenuse?
    // Options: 0: 10 cm, 1: 14 cm, 2: 12 cm, 3: 48 cm
    if (optIndex === 0) {
      setChallengeFeedback("Correct! By the Pythagorean Theorem: √(6² + 8²) = √(36 + 64) = √100 = 10 cm.");
    } else {
      setChallengeFeedback("Incorrect. Remember: c = √(a² + b²). Do not simply add the lengths together.");
    }
  };

  // Canvas coordinates for SVG
  const originX = 120;
  const originY = 220;
  const scale = 16; // pixels per cm
  const cornerX = originX + base * scale;
  const topY = originY - height * scale;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "#f8fafc" }}>
      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#38bdf8" }}>
            Triangle Geometry & Pythagoras Lab
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8" }}>
            Investigate real-time right triangles, Euclidean angle sums (180°), and Pythagorean relationships.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            style={{
              padding: "6px 12px",
              background: showExplanation ? "#0284c7" : "#1e293b",
              color: "#fff",
              border: "1px solid #38bdf8",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {showExplanation ? "Hide Explanation" : "Show Explanation"}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: "6px 12px",
              background: "#334155",
              color: "#e2e8f0",
              border: "1px solid #475569",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      {showExplanation && (
        <div
          style={{
            background: "rgba(14, 165, 233, 0.1)",
            border: "1px solid #0284c7",
            borderRadius: "8px",
            padding: "14px 18px",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#38bdf8" }}>The Pythagorean Theorem:</strong> In any right-angled Euclidean triangle,
          the square of the hypotenuse <code>c</code> equals the sum of the squares of the other two legs <code>a</code> and <code>b</code>:{" "}
          <code>a² + b² = c²</code>. Furthermore, Euclidean geometry proves that the internal angles of any triangle always sum to exactly{" "}
          <code>180°</code>: <code>α + β + γ = 180°</code>.
        </div>
      )}

      {/* Real-time Math Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Hypotenuse (c)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
            {hypotenuse.toFixed(2)} cm
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>√(a² + b²)</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Triangle Area (A)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
            {area.toFixed(1)} cm²
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>½ &times; base &times; height</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Angles (α, β, γ)</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#facc15", marginTop: "4px" }}>
            {angleA.toFixed(1)}°, {angleB.toFixed(1)}°, 90°
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Sum = {angleSum.toFixed(0)}°</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Pythagorean Identity</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#a78bfa", marginTop: "4px" }}>
            {Math.round(base * base)} + {Math.round(height * height)} = {Math.round(hypotenuse * hypotenuse)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>a² + b² = c²</div>
        </div>
      </div>

      {/* Dynamic SVG Visualizer */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 600 260" style={{ width: "100%", height: "auto", maxHeight: "260px" }}>
          {/* Grid lines background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="600" height="260" fill="url(#grid)" />

          {/* Shaded Triangle Body */}
          <polygon
            points={`${originX},${originY} ${cornerX},${originY} ${originX},${topY}`}
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Right Angle Square Marker at Origin */}
          <rect
            x={originX}
            y={originY - 18}
            width="18"
            height="18"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />

          {/* Side Labels */}
          {/* Base Leg (a) */}
          <text
            x={(originX + cornerX) / 2}
            y={originY + 24}
            fill="#38bdf8"
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
          >
            Base a = {base} cm
          </text>

          {/* Height Leg (b) */}
          <text
            x={originX - 16}
            y={(originY + topY) / 2}
            fill="#34d399"
            fontSize="13"
            fontWeight="600"
            textAnchor="end"
            dominantBaseline="middle"
          >
            Height b = {height} cm
          </text>

          {/* Hypotenuse (c) */}
          <text
            x={(originX + cornerX) / 2 + 15}
            y={(originY + topY) / 2 - 15}
            fill="#a78bfa"
            fontSize="13"
            fontWeight="700"
            textAnchor="middle"
          >
            c = {hypotenuse.toFixed(2)} cm
          </text>

          {/* Vertex Labels */}
          <circle cx={originX} cy={originY} r="4" fill="#f59e0b" />
          <text x={originX - 14} y={originY + 16} fill="#94a3b8" fontSize="12" fontWeight="600">
            C (90°)
          </text>

          <circle cx={cornerX} cy={originY} r="4" fill="#38bdf8" />
          <text x={cornerX + 8} y={originY + 16} fill="#94a3b8" fontSize="12" fontWeight="600">
            B ({angleA.toFixed(1)}°)
          </text>

          <circle cx={originX} cy={topY} r="4" fill="#a78bfa" />
          <text x={originX - 14} y={topY - 8} fill="#94a3b8" fontSize="12" fontWeight="600">
            A ({angleB.toFixed(1)}°)
          </text>
        </svg>
      </div>

      {/* Sliders Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
            <span>Base Length (Leg a): <strong>{base} cm</strong></span>
            <span style={{ color: "#94a3b8" }}>Range: 4 - 20 cm</span>
          </div>
          <input
            type="range"
            min="4"
            max="20"
            value={base}
            onChange={(e) => setBase(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
            <span>Height (Leg b): <strong>{height} cm</strong></span>
            <span style={{ color: "#94a3b8" }}>Range: 3 - 14 cm</span>
          </div>
          <input
            type="range"
            min="3"
            max="14"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "#34d399", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* Prediction Challenge */}
      <div style={{ background: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "#facc15" }}>
          Geometry Challenge: Classic 3-4-5 Triangle
        </h4>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
          If a carpenter builds a triangular roof truss with base <strong>6 cm</strong> and height <strong>8 cm</strong>, what is the exact length of the diagonal rafter (hypotenuse)?
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["10 cm", "14 cm", "12 cm", "48 cm"].map((opt, idx) => (
            <button
              key={`tri_opt_${idx}`}
              onClick={() => checkChallenge(idx)}
              style={{
                padding: "8px 16px",
                background: selectedChallenge === idx ? (idx === 0 ? "#065f46" : "#7f1d1d") : "#1f2937",
                color: selectedChallenge === idx ? "#ffffff" : "#e5e7eb",
                border: `1px solid ${selectedChallenge === idx ? (idx === 0 ? "#10b981" : "#ef4444") : "#4b5563"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        {challengeFeedback && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "6px",
              background: selectedChallenge === 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: selectedChallenge === 0 ? "#34d399" : "#f87171",
              fontSize: "0.85rem",
              lineHeight: 1.4,
            }}
          >
            {challengeFeedback}
          </div>
        )}
      </div>
    </div>
  );
};
