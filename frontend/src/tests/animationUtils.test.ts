import { describe, it, expect } from "vitest";
import {
  clamp,
  clamp01,
  normalizedProgress,
  lerp,
  easeInOutQuad,
  easeOutCubic,
  staggeredProgress,
  activeStepIndex,
  codeLineProgression,
  deterministicPulse,
} from "../components/scenes/animationUtils";

describe("animationUtils - Pure Determinism", () => {
  it("clamps values strictly within [0, 1]", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.75)).toBe(0.75);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
  });

  it("calculates normalizedProgress(timeSeconds, durationSeconds) deterministically", () => {
    expect(normalizedProgress(0, 10)).toBe(0);
    expect(normalizedProgress(5, 10)).toBe(0.5);
    expect(normalizedProgress(10, 10)).toBe(1);
    expect(normalizedProgress(15, 10)).toBe(1);
    expect(normalizedProgress(0, 0)).toBe(0);
    expect(normalizedProgress(-5, 10)).toBe(0);
    expect(normalizedProgress(NaN, 10)).toBe(0);
  });

  it("lerp performs exact linear interpolation", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("easing functions satisfy boundary conditions [0 -> 0, 1 -> 1]", () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(1)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("staggeredProgress progresses elements in orderly sequence", () => {
    const p1 = staggeredProgress(0.1, 0, 3, 0.2);
    const p3 = staggeredProgress(0.1, 2, 3, 0.2);
    expect(p1).toBeGreaterThan(0);
    expect(p3).toBe(0);
  });

  it("activeStepIndex partitions progress across discrete steps", () => {
    expect(activeStepIndex(0.0, 3)).toBe(0);
    expect(activeStepIndex(0.2, 3)).toBe(0);
    expect(activeStepIndex(0.4, 3)).toBe(1);
    expect(activeStepIndex(0.8, 3)).toBe(2);
    expect(activeStepIndex(1.0, 3)).toBe(2);
  });

  it("codeLineProgression returns correct active line", () => {
    const lines = [1, 2, 5];
    expect(codeLineProgression(0.1, lines).activeLine).toBe(1);
    expect(codeLineProgression(0.5, lines).activeLine).toBe(2);
    expect(codeLineProgression(0.9, lines).activeLine).toBe(5);
    expect(codeLineProgression(0.5, []).activeLine).toBeNull();
  });

  it("seeking backward guarantees identical return values", () => {
    const forwardVal = deterministicPulse(0.35, 2);
    deterministicPulse(0.9, 2);
    const backwardVal = deterministicPulse(0.35, 2);
    expect(forwardVal).toBe(backwardVal);
  });
});
