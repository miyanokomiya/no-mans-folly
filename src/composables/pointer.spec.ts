import { describe, test, expect } from "vitest";
import { newFuzzyDrag } from "./pointer";

describe("newFuzzyDrag", () => {
  test("should fuzzily detect dragging", () => {
    const target = newFuzzyDrag();
    target.onDown(100);
    expect(target.isDragging()).toBe(false);
    target.onMove(150, { start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, scale: 1 });
    expect(target.isDragging()).toBe(false);
    target.onMove(1000, { start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, scale: 1 });
    expect(target.isDragging()).toBe(true);
    expect(target.getTimestampOnDown()).toBe(100);

    target.onDown(100);
    expect(target.isDragging()).toBe(false);
    target.onMove(100, { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 });
    expect(target.isDragging()).toBe(true);

    target.onUp();
    expect(target.isDragging()).toBe(false);
    expect(target.getTimestampOnDown()).toBe(0);
  });
});
