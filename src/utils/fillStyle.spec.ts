import { expect, describe, test } from "vitest";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "./fillStyle";
import { COLORS } from "./color";

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
      }),
    );
    expect(ctx.fillStyle).toBe("rgba(1,2,3,0.5)");
  });
});

describe("renderFillSVGAttributes", () => {
  test("should return SVG attributes for the stroke style", () => {
    expect(renderFillSVGAttributes({ color: COLORS.BLACK, disabled: true })).toEqual({ fill: "none" });
    expect(renderFillSVGAttributes({ color: COLORS.BLACK })).toEqual({
      fill: "rgba(0,0,0,1)",
    });
  });
});
