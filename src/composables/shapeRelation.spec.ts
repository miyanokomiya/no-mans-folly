import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { newShapeComposite } from "./shapeComposite";
import { generateKeyBetween } from "../utils/findex";
import { Shape } from "../models";
import { LineShape } from "../shapes/line";
import { getLineRelatedDepMap } from "./shapeRelation";

describe("getLineRelatedDepMap", () => {
  test("should return line related dependency map", () => {
    const ellipseA = createShape(getCommonStruct, "ellipse", {
      id: "ellipseA",
      findex: generateKeyBetween(null, null),
    });
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "lineA",
      findex: generateKeyBetween(ellipseA.id, null),
      pConnection: { id: ellipseA.id, rate: { x: 0, y: 0 } },
    });
    const rectA = createShape(getCommonStruct, "rectangle", {
      id: "rectA",
      findex: generateKeyBetween(lineA.findex, null),
      attachment: {
        id: lineA.id,
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const rectB: Shape = {
      ...rectA,
      id: "rectA",
      findex: generateKeyBetween(lineA.findex, null),
    };
    const shapeComposite = newShapeComposite({
      shapes: [ellipseA, lineA, rectA, rectB],
      getStruct: getCommonStruct,
    });
    expect(getLineRelatedDepMap(shapeComposite, [rectA.id])).toEqual(
      new Map([
        [ellipseA.id, new Set()],
        [lineA.id, new Set([ellipseA.id])],
        [rectA.id, new Set([lineA.id])],
        [rectB.id, new Set([lineA.id])],
      ]),
    );
  });
});
