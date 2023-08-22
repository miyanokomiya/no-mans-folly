import { describe, expect, test } from "vitest";
import { expandRect } from "./geometry";

describe("expandRect", () => {
  test("should return expanded rectangle", () => {
    expect(expandRect({ x: 1, y: 2, width: 10, height: 20 }, 5)).toEqual({
      x: -4,
      y: -3,
      width: 20,
      height: 30,
    });
  });
});
