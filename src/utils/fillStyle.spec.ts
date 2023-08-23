import { expect, describe, test } from "vitest";
import { applyFillStyle, createFillStyle } from "./fillStyle";

describe("createFillStyle", () => {
  test("should return new FillStyle", () => {
    expect(createFillStyle()).toEqual({
      color: { r: 255, g: 255, b: 255, a: 1 },
    });
  });
});

describe("applyFillStyle", () => {
  test("should apply StrokeStyle", () => {
    const ctx = { fillStyle: "" };
    applyFillStyle(
      ctx as any,
      createFillStyle({
        color: { r: 1, g: 2, b: 3, a: 0.5 },
      })
    );
    expect(ctx.fillStyle).toBe("rgba(1,2,3,0.5)");
  });
});
