import { expect, describe, test } from "vitest";
import { applyStrokeStyle, createStrokeStyle } from "./strokeStyle";

describe("createStrokeStyle", () => {
  test("should return new StrokeStyle", () => {
    expect(createStrokeStyle()).toEqual({
      color: { r: 0, g: 0, b: 0, a: 1 },
    });
  });
});

describe("applyStrokeStyle", () => {
  test("should apply StrokeStyle", () => {
    const ctx = { strokeStyle: "" };
    applyStrokeStyle(
      ctx as any,
      createStrokeStyle({
        color: { r: 1, g: 2, b: 3, a: 0.5 },
      })
    );
    expect(ctx.strokeStyle).toBe("rgba(1,2,3,0.5)");
  });
});
