import { describe, test, expect } from "vitest";
import { avoidEmptyRange } from "./imageBuilder";

describe("avoidEmptyRange", () => {
  test("should return placeholder range when passed range is invalid", () => {
    const placeholder = { x: 0, y: 0, width: 10, height: 10 };
    expect(avoidEmptyRange({ x: -1, y: -2, width: 1, height: 2 })).toEqualRect({ x: -1, y: -2, width: 1, height: 2 });
    expect(avoidEmptyRange({ x: -1, y: -2, width: 0, height: 2 })).toEqualRect(placeholder);
    expect(avoidEmptyRange({ x: -1, y: -2, width: 1, height: 0 })).toEqualRect(placeholder);
    expect(avoidEmptyRange({ x: -1, y: -2, width: -1, height: 2 })).toEqualRect(placeholder);
    expect(avoidEmptyRange({ x: -1, y: -2, width: 1, height: -2 })).toEqualRect(placeholder);
  });
});
