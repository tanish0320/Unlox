import React, { useState, useEffect, useRef } from "react";

export const NewtonLab: React.FC = () => {
  const [mass, setMass] = useState<number>(10); // kg
  const [force, setForce] = useState<number>(40); // N
  const [hasFriction, setHasFriction] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cartX, setCartX] = useState<number>(50); // pixels along track
  const [velocity, setVelocity] = useState<number>(0); // m/s
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  // Physics calculations
  const g = 9.8; // m/s²
  const mu = hasFriction ? 0.15 : 0.0;
  const frictionForce = hasFriction ? Math.min(force, mu * mass * g) : 0.0;
  const netForce = Math.max(0, force - frictionForce);
  const acceleration = netForce / mass; // a = F_net / m

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      lastTimeRef.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const step = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // cap dt at 50ms
      lastTimeRef.current = time;

      setVelocity((v) => {
        const nextV = v + acceleration * dt;
        setCartX((x) => {
          // Scale 1 meter = 40 pixels on screen
          const nextX = x + nextV * dt * 40;
          if (nextX > 560) {
            // Hit end of track, stop simulation
            setIsRunning(false);
            return 560;
          }
          return nextX;
        });
        return nextV;
      });

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRunning, acceleration]);

  const handleReset = () => {
    setIsRunning(false);
    setCartX(50);
    setVelocity(0);
    setMass(10);
    setForce(40);
    setHasFriction(false);
    setSelectedChallenge(null);
    setChallengeFeedback(null);
    setShowExplanation(false);
  };

  const checkChallenge = (optIndex: number) => {
    setSelectedChallenge(optIndex);
    // Question: If mass doubles while the applied force remains strictly constant, what happens to acceleration?
    // Options: 0: Acceleration halves, 1: Acceleration doubles, 2: Remains unchanged, 3: Drops to zero
    if (optIndex === 0) {
      setChallengeFeedback("Correct! From a = F / m, acceleration is inversely proportional to mass. Doubling mass cuts acceleration in half.");
    } else {
      setChallengeFeedback("Incorrect. Remember the inverse relationship in a = F / m: increasing mass creates greater inertia, reducing acceleration.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "#f8fafc" }}>
      {/* Header & Reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#38bdf8" }}>
            Newton&apos;s Second Law Lab (F = m &middot; a)
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8" }}>
            Examine how applied force, mass inertia, and friction govern acceleration and velocity.
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
          <strong style={{ color: "#38bdf8" }}>Newton&apos;s Second Law of Motion:</strong> The acceleration <code>a</code> of an object
          is directly proportional to the net force <code>F_net</code> acting upon it and inversely proportional to its mass <code>m</code>:{" "}
          <code>a = F_net / m</code>. Net force is the vector sum of all forces: applied force minus resisting friction:{" "}
          <code>F_net = F_applied - f_k</code>.
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Acceleration (a)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
            {acceleration.toFixed(2)} m/s&sup2;
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>a = F_net / m</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Velocity (v)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
            {velocity.toFixed(2)} m/s
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>v(t) = &int; a dt</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Net Force (F_net)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#facc15", marginTop: "2px" }}>
            {netForce.toFixed(1)} N
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{force} N applied {hasFriction ? `- ${frictionForce.toFixed(1)} N fric` : ""}</div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Distance (x)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#a78bfa", marginTop: "2px" }}>
            {((cartX - 50) / 40).toFixed(2)} m
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Track length = 12.75 m</div>
        </div>
      </div>

      {/* Physics Simulation Canvas */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "8px",
          padding: "20px 10px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <svg viewBox="0 0 680 160" style={{ width: "100%", height: "auto" }}>
          {/* Ground surface track */}
          <line x1="20" y1="120" x2="660" y2="120" stroke="#475569" strokeWidth="4" />
          {/* Track hatch marks */}
          {Array.from({ length: 33 }).map((_, i) => (
            <line key={`h_${i}`} x1={20 + i * 20} y1="122" x2={10 + i * 20} y2="134" stroke="#334155" strokeWidth="1.5" />
          ))}

          {/* Cart assembly */}
          <g transform={`translate(${cartX}, 72)`}>
            {/* Cart body */}
            <rect x="0" y="0" width="70" height="36" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="35" y="22" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">
              {mass} kg
            </text>

            {/* Wheels */}
            <circle cx="16" cy="40" r="7" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
            <circle cx="54" cy="40" r="7" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
            <circle cx="16" cy="40" r="2" fill="#e2e8f0" />
            <circle cx="54" cy="40" r="2" fill="#e2e8f0" />

            {/* Applied Force Vector (Green Arrow) */}
            {force > 0 && (
              <g transform="translate(70, 18)">
                <line x1="0" y1="0" x2={Math.min(90, force * 0.9)} y2="0" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-green)" />
                <polygon points={`${Math.min(90, force * 0.9)},-4 ${Math.min(90, force * 0.9) + 8},0 ${Math.min(90, force * 0.9)},4`} fill="#10b981" />
                <text x={Math.min(90, force * 0.9) / 2} y="-6" fill="#34d399" fontSize="10" fontWeight="600" textAnchor="middle">
                  F = {force} N
                </text>
              </g>
            )}

            {/* Friction Force Vector (Red Arrow) */}
            {hasFriction && frictionForce > 0 && (
              <g transform="translate(0, 36)">
                <line x1="0" y1="0" x2={-Math.min(60, frictionForce * 1.5)} y2="0" stroke="#ef4444" strokeWidth="2.5" />
                <polygon points={`${-Math.min(60, frictionForce * 1.5)},-4 ${-Math.min(60, frictionForce * 1.5) - 6},0 ${-Math.min(60, frictionForce * 1.5)},4`} fill="#ef4444" />
                <text x={-Math.min(60, frictionForce * 1.5) / 2} y="14" fill="#f87171" fontSize="9" fontWeight="600" textAnchor="middle">
                  f_k = {frictionForce.toFixed(1)} N
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Start / Stop / Reset controls */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              padding: "8px 24px",
              background: isRunning ? "#dc2626" : "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            {isRunning ? "Pause Simulation" : cartX > 550 ? "Completed (Reset to re-run)" : "Start Motion"}
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setCartX(50);
              setVelocity(0);
            }}
            style={{
              padding: "8px 18px",
              background: "#334155",
              color: "#e2e8f0",
              border: "1px solid #475569",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Reset Track
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        {/* Applied Force Slider */}
        <div style={{ background: "#1e293b", padding: "14px", borderRadius: "8px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
            <span>Applied Force (F): <strong>{force} N</strong></span>
            <span style={{ color: "#94a3b8" }}>0 - 100 N</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={force}
            onChange={(e) => setForce(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "#10b981", cursor: "pointer" }}
          />
        </div>

        {/* Mass Slider */}
        <div style={{ background: "#1e293b", padding: "14px", borderRadius: "8px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
            <span>Cart Mass (m): <strong>{mass} kg</strong></span>
            <span style={{ color: "#94a3b8" }}>1 - 50 kg</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={mass}
            onChange={(e) => setMass(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        {/* Friction Toggle */}
        <div style={{ background: "#1e293b", padding: "14px", borderRadius: "8px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Surface Friction</span>
            <button
              onClick={() => setHasFriction(!hasFriction)}
              style={{
                padding: "4px 12px",
                background: hasFriction ? "#7c2d12" : "#1e3a8a",
                color: "#ffffff",
                border: `1px solid ${hasFriction ? "#ea580c" : "#3b82f6"}`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {hasFriction ? "Friction ON (μ=0.15)" : "Frictionless (μ=0)"}
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "6px" }}>
            {hasFriction ? `Opposing force = ${(0.15 * mass * g).toFixed(1)} N` : "Zero surface resistance"}
          </div>
        </div>
      </div>

      {/* Challenge / Prediction Mode */}
      <div style={{ background: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #374151" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "#facc15" }}>
          Physics Challenge: Proportionality
        </h4>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
          If a student doubles the mass of the cart from <strong>10 kg to 20 kg</strong> while keeping the applied force constant at <strong>40 N</strong>, what happens to the acceleration?
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["Acceleration is cut in half", "Acceleration doubles", "Acceleration remains unchanged", "Acceleration drops to zero"].map((opt, idx) => (
            <button
              key={`newton_opt_${idx}`}
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
