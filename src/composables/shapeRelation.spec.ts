import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { newShapeComposite } from "./shapeComposite";
import { generateKeyBetween } from "../utils/findex";
import { Shape } from "../models";
import { LineShape } from "../shapes/line";
import { getLineRelatedDependantMap } from "./shapeRelation";

describe("getLineRelatedDependantMap", () => {
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
      id: "rectB",
      findex: generateKeyBetween(lineA.findex, null),
    };
    const shapeComposite = newShapeComposite({
      shapes: [ellipseA, lineA, rectA, rectB],
      getStruct: getCommonStruct,
    });
    expect(getLineRelatedDependantMap(shapeComposite, [ellipseA.id])).toEqual(
      new Map([
        [ellipseA.id, new Set()],
        [lineA.id, new Set([ellipseA.id])],
        [rectA.id, new Set([lineA.id])],
        [rectB.id, new Set([lineA.id])],
      ]),
    );
    expect(getLineRelatedDependantMap(shapeComposite, [lineA.id])).toEqual(
      new Map([
        [lineA.id, new Set([ellipseA.id])],
        [rectA.id, new Set([lineA.id])],
        [rectB.id, new Set([lineA.id])],
      ]),
    );
    expect(getLineRelatedDependantMap(shapeComposite, [rectA.id])).toEqual(new Map([[rectA.id, new Set([lineA.id])]]));
  });

  test("should regard dependants to lines", () => {
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "lineA",
      findex: generateKeyBetween(null, null),
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
    const lineB: LineShape = {
      ...lineA,
      id: "lineB",
      findex: generateKeyBetween(rectA.findex, null),
      pConnection: { id: rectA.id, rate: { x: 0.5, y: 0.5 } },
    };
    const rectB: Shape = {
      ...rectA,
      id: "rectB",
      findex: generateKeyBetween(lineB.findex, null),
      attachment: {
        id: lineB.id,
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    };
    const shapeComposite = newShapeComposite({
      shapes: [lineA, rectA, lineB, rectB],
      getStruct: getCommonStruct,
    });
    expect(getLineRelatedDependantMap(shapeComposite, [lineA.id])).toEqual(
      new Map([
        [lineA.id, new Set()],
        [rectA.id, new Set([lineA.id])],
        [lineB.id, new Set([rectA.id])],
        [rectB.id, new Set([lineB.id])],
      ]),
    );
    expect(getLineRelatedDependantMap(shapeComposite, [rectA.id])).toEqual(
      new Map([
        [rectA.id, new Set([lineA.id])],
        [lineB.id, new Set([rectA.id])],
        [rectB.id, new Set([lineB.id])],
      ]),
    );
    expect(getLineRelatedDependantMap(shapeComposite, [lineB.id])).toEqual(
      new Map([
        [lineB.id, new Set([rectA.id])],
        [rectB.id, new Set([lineB.id])],
      ]),
    );
    expect(getLineRelatedDependantMap(shapeComposite, [rectB.id])).toEqual(new Map([[rectB.id, new Set([lineB.id])]]));
  });
});