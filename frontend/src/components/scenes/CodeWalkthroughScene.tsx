import React, { useMemo } from "react";
import { CodeWalkthroughProps } from "./sceneTypes";
import {
  normalizedProgress,
  codeLineProgression,
  deterministicPulse,
} from "./animationUtils";

interface SyntaxToken {
  type: "keyword" | "function" | "string" | "number" | "comment" | "operator" | "text";
  value: string;
}

function tokenizeLine(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let i = 0;
  const len = line.length;

  const keywords = new Set([
    "for", "in", "def", "return", "if", "else", "elif", "while",
    "break", "continue", "import", "from", "as", "class", "try",
    "except", "finally", "with", "yield", "lambda", "const", "let",
    "var", "function", "async", "await"
  ]);

  const builtins = new Set([
    "print", "range", "len", "str", "int", "float", "list", "dict",
    "set", "tuple", "enumerate", "zip", "console", "log"
  ]);

  while (i < len) {
    const ch = line[i];

    if (ch === "#" || (ch === "/" && line[i + 1] === "/")) {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < len && line[j] !== quote) {
        if (line[j] === "\\" && j + 1 < len) j++;
        j++;
      }
      tokens.push({ type: "string", value: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    if (/[0-9]/.test(ch) && (i === 0 || /[\s,(:=+\-*/%]/.test(line[i - 1]))) {
      let j = i;
      while (j < len && /[0-9.]/.test(line[j])) j++;
      tokens.push({ type: "number", value: line.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (keywords.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (builtins.has(word)) {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "text", value: word });
      }
      i = j;
      continue;
    }

    if (/[:=+\-*/%><!&|^~]/.test(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    tokens.push({ type: "text", value: ch });
    i++;
  }

  return tokens;
}

export const CodeWalkthroughSceneComponent: React.FC<CodeWalkthroughProps> = ({
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

  const rawCode = scene.code || "";
  const highlightLines = scene.highlight_lines || [];

  const lines = useMemo(() => {
    return rawCode.split("\n");
  }, [rawCode]);

  const { activeLine } = codeLineProgression(progress, highlightLines);
  const pulse = deterministicPulse(progress, 2.5);

  return (
    <div
      className={`blu-stage-inner ${className}`}
      data-testid="blu-code-walkthrough-scene"
      data-scene-id={scene.id}
    >
      <div className="blu-scene-header">
        <h2 className="blu-scene-heading">
          <span className="blu-scene-badge">Code</span>
          <span>{scene.heading}</span>
        </h2>
        {activeLine !== null && (
          <div className="blu-scene-badge">
            Focus: Line {activeLine}
          </div>
        )}
      </div>

      <div className="blu-code-container">
        <div className="blu-code-header">
          <div className="blu-code-dots">
            <span className="blu-code-dot blu-code-dot-red" />
            <span className="blu-code-dot blu-code-dot-yellow" />
            <span className="blu-code-dot blu-code-dot-green" />
          </div>
          <div className="blu-code-filename">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>{scene.filename || "main.py"}</span>
          </div>
          <div className="blu-code-badge">{lines.length} lines</div>
        </div>

        <div className="blu-code-body">
          {lines.map((lineText, idx) => {
            const lineNumber = idx + 1;
            const isHighlighted = highlightLines.includes(lineNumber);
            const isActive = activeLine === lineNumber;

            const tokens = tokenizeLine(lineText);

            return (
              <div
                key={`line-${lineNumber}`}
                className={`blu-code-line ${isActive ? "active" : ""}`}
                style={{
                  backgroundColor: isActive
                    ? `rgba(56, 189, 248, ${0.14 + pulse * 0.06})`
                    : isHighlighted
                    ? "rgba(56, 189, 248, 0.06)"
                    : undefined,
                }}
                data-testid={`code-line-${lineNumber}`}
                data-active={isActive ? "true" : "false"}
              >
                <span className="blu-code-lineno">{lineNumber}</span>
                <span className="blu-code-text">
                  {tokens.map((token, tIdx) => (
                    <span
                      key={`tok-${tIdx}`}
                      className={`blu-token-${token.type}`}
                    >
                      {token.value}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
