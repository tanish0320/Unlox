import React, { useState } from "react";

export const FractionsLab: React.FC = () => {
  const [num1, setNum1] = useState<number>(2);
  const [den1, setDen1] = useState<number>(4);
  const [num2, setNum2] = useState<number>(3);
  const [den2, setDen2] = useState<number>(6);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  const val1 = num1 / den1;
  const val2 = num2 / den2;
  const isEquivalent = Math.abs(val1 - val2) < 0.0001;

  const handleReset = () => {
    setNum1(1);
    setDen1(2);
    setNum2(2);
    setDen2(4);
    setSelectedChallenge(null);
    setChallengeFeedback(null);
    setShowExplanation(false);
  };

  const checkChallenge = (optionIndex: number) => {
    setSelectedChallenge(optionIndex);
    // Question: Which fraction is equivalent to 3/4? Options: 0: 6/8, 1: 5/8, 2: 9/16, 3: 4/5
    if (optionIndex === 0) {
      setChallengeFeedback("Correct! 6/8 simplifies to 3/4 because dividing both numerator and denominator by 2 gives 3/4.");
    } else {
      setChallengeFeedback("Not quite. Remember: equivalent fractions maintain the exact same ratio when multiplied or divided by the same non-zero number.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "#f8fafc" }}>
      {/* Header & Reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#38bdf8" }}>
            Fractions & Proportions Lab
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8" }}>
            Adjust the sliders to visualize parts of a whole, equivalent ratios, and segment scaling.
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
          <strong style={{ color: "#38bdf8" }}>Key Pedagogical Concept:</strong> A fraction{" "}
          <code>a / b</code> represents <code>a</code> parts out of <code>b</code> equal portions of a unit whole.
          Two fractions <code>a / b</code> and <code>c / d</code> are <em>equivalent</em> if their cross-products are equal:{" "}
          <code>a &times; d = b &times; c</code>. Scaling the numerator and denominator by the exact same multiplier preserves the total proportion.
        </div>
      )}

      {/* Comparison Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "10px",
          background: isEquivalent ? "rgba(16, 185, 129, 0.15)" : "rgba(30, 41, 59, 0.6)",
          border: `1px solid ${isEquivalent ? "#10b981" : "#334155"}`,
          borderRadius: "8px",
        }}
      >
        <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#38bdf8" }}>
          Fraction A: {num1}/{den1} ({val1.toFixed(3)})
        </span>
        <span
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: isEquivalent ? "#10b981" : "#f59e0b",
          }}
        >
          {isEquivalent ? "=" : val1 > val2 ? ">" : "<"}
        </span>
        <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#a78bfa" }}>
          Fraction B: {num2}/{den2} ({val2.toFixed(3)})
        </span>
        {isEquivalent && (
          <span
            style={{
              background: "#065f46",
              color: "#34d399",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Equivalent!
          </span>
        )}
      </div>

      {/* Fraction Strips SVG */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <svg viewBox="0 0 700 180" style={{ width: "100%", height: "auto" }}>
          {/* Fraction 1 Strip */}
          <text x="10" y="25" fill="#38bdf8" fontSize="14" fontWeight="600">
            Fraction A ({num1}/{den1})
          </text>
          <g transform="translate(10, 35)">
            <rect x="0" y="0" width="680" height="42" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
            {Array.from({ length: den1 }).map((_, i) => {
              const segW = 680 / den1;
              const isFilled = i < num1;
              return (
                <g key={`f1_seg_${i}`}>
                  <rect
                    x={i * segW}
                    y="0"
                    width={segW}
                    height="42"
                    fill={isFilled ? "rgba(56, 189, 248, 0.65)" : "transparent"}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    rx={i === 0 ? 6 : i === den1 - 1 ? 6 : 0}
                  />
                  <text
                    x={i * segW + segW / 2}
                    y="26"
                    fill={isFilled ? "#ffffff" : "#64748b"}
                    fontSize="12"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    1/{den1}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Fraction 2 Strip */}
          <text x="10" y="115" fill="#a78bfa" fontSize="14" fontWeight="600">
            Fraction B ({num2}/{den2})
          </text>
          <g transform="translate(10, 125)">
            <rect x="0" y="0" width="680" height="42" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
            {Array.from({ length: den2 }).map((_, i) => {
              const segW = 680 / den2;
              const isFilled = i < num2;
              return (
                <g key={`f2_seg_${i}`}>
                  <rect
                    x={i * segW}
                    y="0"
                    width={segW}
                    height="42"
                    fill={isFilled ? "rgba(167, 139, 250, 0.65)" : "transparent"}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    rx={i === 0 ? 6 : i === den2 - 1 ? 6 : 0}
                  />
                  <text
                    x={i * segW + segW / 2}
                    y="26"
                    fill={isFilled ? "#ffffff" : "#64748b"}
                    fontSize="12"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    1/{den2}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Sliders Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Strip 1 Controls */}
        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: "0.95rem" }}>Fraction A Controls</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>Numerator: {num1}</span>
                <span style={{ color: "#94a3b8" }}>shaded parts</span>
              </div>
              <input
                type="range"
                min="0"
                max={den1}
                value={num1}
                onChange={(e) => setNum1(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>Denominator: {den1}</span>
                <span style={{ color: "#94a3b8" }}>total equal parts</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={den1}
                onChange={(e) => {
                  const newDen = parseInt(e.target.value, 10);
                  setDen1(newDen);
                  if (num1 > newDen) setNum1(newDen);
                }}
                style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>

        {/* Strip 2 Controls */}
        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#a78bfa", fontSize: "0.95rem" }}>Fraction B Controls</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>Numerator: {num2}</span>
                <span style={{ color: "#94a3b8" }}>shaded parts</span>
              </div>
              <input
                type="range"
                min="0"
                max={den2}
                value={num2}
                onChange={(e) => setNum2(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>Denominator: {den2}</span>
                <span style={{ color: "#94a3b8" }}>total equal parts</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={den2}
                onChange={(e) => {
                  const newDen = parseInt(e.target.value, 10);
                  setDen2(newDen);
                  if (num2 > newDen) setNum2(newDen);
                }}
                style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Challenge / Prediction Mode */}
      <div style={{ background: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "#facc15" }}>
          Target Challenge: Equivalent Fractions
        </h4>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
          Which of the following fractions is strictly equivalent to <strong>3/4</strong>?
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["6 / 8", "5 / 8", "9 / 16", "4 / 5"].map((opt, idx) => (
            <button
              key={`opt_${idx}`}
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
