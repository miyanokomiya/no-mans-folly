import { describe, test, expect } from "vitest";
import { getPaletteColors } from "./palette";
import { fillArray } from "./commons";

describe("getPaletteColors", () => {
  test("should return color values of the palette whose empty items are filled with default color", () => {
    const result = getPaletteColors({
      c_00: { r: 10, g: 20, b: 30, a: 0.1 },
      c_01: { r: 1, g: 2, b: 3, a: 0.5 },
    });
    expect(result).toEqual([
      { r: 10, g: 20, b: 30, a: 0.1 },
      { r: 1, g: 2, b: 3, a: 0.5 },
      ...fillArray(28, { r: 0, g: 0, b: 0, a: 1 }),
    ]);
  });
  test("should get rid of invalid indexed items", () => {
    const result = getPaletteColors({
      c_29: { r: 10, g: 20, b: 30, a: 0.1 },
      c_30: { r: 1, g: 2, b: 3, a: 0.5 },
    } as any);
    expect(result).toEqual([...fillArray(29, { r: 0, g: 0, b: 0, a: 1 }), { r: 10, g: 20, b: 30, a: 0.1 }]);
  });
});
