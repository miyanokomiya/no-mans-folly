import { expect, describe, test, vi } from "vitest";
import {
  applyStrokeStyle,
  createStrokeStyle,
  getLineDashArrayWithCap,
  isSameStrokeDashStyle,
  isSameStrokeStyle,
  renderStrokeSVGAttributes,
} from "./strokeStyle";
import { COLORS } from "./color";

describe("createStrokeStyle", () => {
  test("should return new StrokeStyle", () => {
    expect(createStrokeStyle()).toEqual({
      color: { r: 0, g: 0, b: 0, a: 1 },
    });
  });
});

describe("isSameStrokeDashStyle", () => {
  test("should return true when two objects have the same line dash", () => {
    expect(isSameStrokeDashStyle({ dash: "solid" }, { dash: "solid" })).toBe(true);
    expect(isSameStrokeDashStyle({ dash: "custom" }, { dash: "solid" })).toBe(false);
    expect(
      isSameStrokeDashStyle(
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 1] },
        },
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 1] },
        },
      ),
    ).toBe(true);
    expect(
      isSameStrokeDashStyle(
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 2] },
        },
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 1] },
        },
      ),
    ).toBe(false);
    expect(
      isSameStrokeDashStyle(
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 2, dash: [1, 1] },
        },
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 1] },
        },
      ),
    ).toBe(false);
    expect(
      isSameStrokeDashStyle(
        {
          dash: "custom",
          dashCustom: { valueType: "raw", offset: 1, dash: [1, 1] },
        },
        {
          dash: "custom",
          dashCustom: { valueType: "scale", offset: 1, dash: [1, 1] },
        },
      ),
    ).toBe(false);
  });
});

describe("isSameStrokeStyle", () => {
  test("should return true if two objects have the same content", () => {
    expect(isSameStrokeStyle()).toBe(true);
    expect(isSameStrokeStyle(createStrokeStyle(), undefined)).toBe(false);
    expect(isSameStrokeStyle(undefined, createStrokeStyle())).toBe(false);
    expect(isSameStrokeStyle(createStrokeStyle(), createStrokeStyle())).toBe(true);
    expect(isSameStrokeStyle(createStrokeStyle({ disabled: true }), createStrokeStyle({ disabled: false }))).toBe(
      false,
    );
    expect(
      isSameStrokeStyle(
        createStrokeStyle({ color: { r: 1, g: 1, b: 1, a: 1 } }),
        createStrokeStyle({ color: { r: 1, g: 1, b: 1, a: 0 } }),
      ),
    ).toBe(false);
    expect(isSameStrokeStyle(createStrokeStyle({ width: 1 }), createStrokeStyle({ width: 2 }))).toBe(false);
    expect(isSameStrokeStyle(createStrokeStyle({ dash: "dot" }), createStrokeStyle({ dash: "short" }))).toBe(false);
    expect(isSameStrokeStyle(createStrokeStyle({ lineCap: "butt" }), createStrokeStyle({ lineCap: "round" }))).toBe(
      false,
    );
    expect(isSameStrokeStyle(createStrokeStyle({ lineJoin: "bevel" }), createStrokeStyle({ lineJoin: "round" }))).toBe(
      false,
    );
  });
});

describe("applyStrokeStyle", () => {
  test("should apply StrokeStyle", () => {
    const ctx = { strokeStyle: "", lineWidth: 0, setLineDash: vi.fn() };
    applyStrokeStyle(
      ctx as any,
      createStrokeStyle({
        color: { r: 1, g: 2, b: 3, a: 0.5 },
      }),
    );
    expect(ctx.strokeStyle).toBe("rgba(1,2,3,0.5)");
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });
});

describe("renderStrokeSVGAttributes", () => {
  test("should return SVG attributes for the stroke style", () => {
    expect(renderStrokeSVGAttributes({ color: COLORS.BLACK, disabled: true })).toEqual({ stroke: "none" });
    expect(renderStrokeSVGAttributes({ color: COLORS.BLACK, width: 10 })).toEqual({
      stroke: "#000000",
      "stroke-width": 10,
      "stroke-linecap": "butt",
      "stroke-linejoin": "round",
    });
    expect(
      renderStrokeSVGAttributes({
        color: { ...COLORS.WHITE, a: 0.9 },
        width: 10,
        lineCap: "round",
        lineJoin: "bevel",
        dash: "dot",
      }),
    ).toEqual({
      stroke: "#ffffff",
      "stroke-opacity": 0.9,
      "stroke-width": 10,
      "stroke-linecap": "round",
      "stroke-linejoin": "bevel",
      "stroke-dasharray": getLineDashArrayWithCap({ dash: "dot", lineCap: "round", width: 10 }).join(" "),
    });
  });
});

describe("getLineDashArrayWithCap", () => {
  test("should adjust dash array when line cap isn't butt", () => {
    expect(getLineDashArrayWithCap({ dash: "dot", lineCap: undefined, width: 10 })).toEqual([10, 10]);
    expect(getLineDashArrayWithCap({ dash: "dot", lineCap: "butt", width: 10 })).toEqual([10, 10]);
    expect(getLineDashArrayWithCap({ dash: "dot", lineCap: "round", width: 10 })).toEqual([0.01, 20]);
    expect(getLineDashArrayWithCap({ dash: "dot", lineCap: "square", width: 10 })).toEqual([0.01, 20]);
    expect(getLineDashArrayWithCap({ dash: "short", lineCap: "round", width: 10 })).toEqual([20, 20]);
    expect(getLineDashArrayWithCap({ dash: "long", lineCap: "round", width: 10 })).toEqual([50, 20]);
  });
});
