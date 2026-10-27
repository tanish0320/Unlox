import React from "react";
import { CaptionTrackProps, CaptionSegment } from "./scenes/sceneTypes";
import "../styles/fonts.css";

/**
 * Pure helper function for player or parent to resolve active caption from timed segments.
 * Uses interval semantics: start_seconds <= timeSeconds < end_seconds.
 * Deterministic tie-breaking: selects matching segment with greatest start_seconds.
 */
export function getActiveCaption(
  segments: CaptionSegment[] = [],
  timeSeconds: number = 0
): string {
  if (!segments || segments.length === 0) return "";
  const safeTime = Number.isFinite(timeSeconds) ? timeSeconds : 0;

  const matching = segments.filter(
    (c) => safeTime >= c.start_seconds && safeTime < c.end_seconds
  );

  if (matching.length === 0) return "";
  if (matching.length === 1) return matching[0].text;

  const best = matching.reduce((prev, curr) =>
    curr.start_seconds > prev.start_seconds ? curr : prev
  );
  return best.text;
}

/**
 * Person 3's exact CaptionTrack contract:
 * <CaptionTrack text={activeCaptionText} visible={captionsEnabled} />
 * Pure visual presentation component.
 */
export const CaptionTrack: React.FC<CaptionTrackProps> = ({
  text = "",
  visible = true,
  className = "",
  language = "en",
}) => {
  const hasText = Boolean(text && text.trim());
  const isShown = visible && hasText;
  const scriptClass = `blu-script-${(language || "en").toLowerCase()}`;

  return (
    <div
      className={`blu-caption-container ${className}`}
      data-testid="blu-caption-track"
      data-visible={visible ? "true" : "false"}
      data-has-text={hasText ? "true" : "false"}
      data-active={isShown ? "true" : "false"}
    >
      <div
        className={`blu-caption-box ${scriptClass}`}
        style={{
          opacity: isShown ? 1 : 0,
          transform: isShown ? "translateY(0)" : "translateY(8px)",
          visibility: isShown ? "visible" : "hidden",
        }}
        data-testid="blu-caption-box"
      >
        <p className="blu-caption-text" data-testid="blu-caption-text">
          {text || ""}
        </p>
      </div>
    </div>
  );
};
