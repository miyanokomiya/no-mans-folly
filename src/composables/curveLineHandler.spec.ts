import { describe, test, expect } from "vitest";
import { getCurveLinePatch } from "./curveLineHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";

describe("getCurveLinePatch", () => {
  const a = createShape<LineShape>(getCommonStruct, "line", {
    id: "a",
    body: [{ p: { x: 50, y: 50 } }],
    q: { x: 100, y: 0 },
  });
  const shapeComposite = newShapeComposite({
    getStruct: getCommonStruct,
    shapes: [a],
  });

  test("should patch curve lines up to date", () => {
    const res0 = getCurveLinePatch(shapeComposite, {
      update: {
        a: { curveType: "auto" } as Partial<LineShape>,
      },
    });
    expect(res0["a"].curveType, "shouldn't include source patch").toBe(undefined);
    expect(res0["a"].curves).not.toBe(undefined);
    expect(res0["a"].body).toBe(undefined);

    const res1 = getCurveLinePatch(shapeComposite, {
      update: {
        a: { curveType: "auto", lineType: "elbow" } as Partial<LineShape>,
      },
    });
    expect(res1["a"].curves).not.toBe(undefined);
    expect(res1["a"].body).not.toBe(undefined);
  });

  test("should do nothing to straight line", () => {
    const res = getCurveLinePatch(shapeComposite, {
      update: {
        a: { p: { x: 10, y: 10 } } as Partial<LineShape>,
      },
    });
    expect(res["a"]).toBe(undefined);
  });

  test("should remove curves when a curve line turns into straight line", () => {
    const patch = getCurveLinePatch(shapeComposite, {
      update: {
        a: { curveType: "auto" } as Partial<LineShape>,
      },
    });
    const res = getCurveLinePatch(
      newShapeComposite({
        getStruct: shapeComposite.getShapeStruct,
        shapes: [{ ...a, ...patch.a, curveType: "auto" } as LineShape],
      }),
      {
        update: {
          a: { curveType: undefined } as Partial<LineShape>,
        },
      },
    );
    expect(res["a"]).toHaveProperty("curves");
    expect(res["a"].curves).toBe(undefined);
  });
});
