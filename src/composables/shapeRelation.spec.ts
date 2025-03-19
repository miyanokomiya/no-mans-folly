import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { newShapeComposite } from "./shapeComposite";
import { generateKeyBetween } from "../utils/findex";
import { Shape } from "../models";
import { LineShape } from "../shapes/line";
import {
  getLineRelatedDependantMap,
  getLineUnrelatedIds,
  getNextSiblingId,
  isParentDisconnected,
  generateFindexBefore,
  generateFindexAfter,
} from "./shapeRelation";
import { TreeNodeShape } from "../shapes/tree/treeNode";

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

describe("getLineUnrelatedIds", () => {
  test("attached shapes should be excluded", () => {
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "lineA",
    });
    const rect0 = createShape(getCommonStruct, "rectangle", {
      id: "rect0",
      attachment: {
        id: lineA.id,
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [lineA, rect0],
      getStruct: getCommonStruct,
    });
    expect(getLineUnrelatedIds(shapeComposite, [lineA.id])).toEqual([]);
  });

  test("should return unrelated shape ids to the lines: regard tree structure of shapes", () => {
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "lineA",
      findex: generateKeyBetween(null, null),
    });
    const treeRoot = createShape(getCommonStruct, "tree_root", {
      id: "treeRoot",
      findex: generateKeyBetween(lineA.findex, null),
      attachment: {
        id: lineA.id,
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const treeNodeA = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "treeNodeA",
      findex: generateKeyBetween(treeRoot.findex, null),
      parentId: treeRoot.id,
      treeParentId: treeRoot.id,
    });
    const treeNodeB = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "treeNodeB",
      findex: generateKeyBetween(treeNodeA.findex, null),
      parentId: treeRoot.id,
      treeParentId: treeRoot.id,
    });
    const treeRootZ = createShape(getCommonStruct, "tree_root", {
      id: "treeRootZ",
      findex: generateKeyBetween(treeNodeB.findex, null),
    });
    const treeNodeZ = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "treeNodeZ",
      findex: generateKeyBetween(treeRootZ.findex, null),
      parentId: treeRootZ.id,
      treeParentId: treeRootZ.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [lineA, treeRoot, treeNodeA, treeNodeB, treeRootZ, treeNodeZ],
      getStruct: getCommonStruct,
    });
    expect(getLineUnrelatedIds(shapeComposite, [lineA.id])).toEqual([treeRootZ.id, treeNodeZ.id]);
  });
});

describe("isParentDisconnected", () => {
  const group0 = createShape(getCommonStruct, "group", {
    id: "group0",
  });
  const rect0 = createShape(getCommonStruct, "rectangle", {
    id: "rect0",
    parentId: group0.id,
  });
  const rect1 = {
    ...rect0,
    id: "rect1",
    parentId: undefined,
  };
  const shapeComposite = newShapeComposite({
    shapes: [group0, rect0, rect1],
    getStruct: getCommonStruct,
  });

  test("should return true when the shape has a parent but will have none by the patch", () => {
    expect(isParentDisconnected(shapeComposite, rect0)).toBe(false);
    expect(isParentDisconnected(shapeComposite, rect0, {})).toBe(false);
    expect(isParentDisconnected(shapeComposite, rect0, { parentId: "unknown" })).toBe(false);
    expect(isParentDisconnected(shapeComposite, rect0, { parentId: undefined })).toBe(true);
    expect(isParentDisconnected(shapeComposite, rect1, { parentId: undefined })).toBe(false);
  });
});

describe("getNextSiblingId", () => {
  test("should return next sibling id: root shapes", () => {
    const rect0 = createShape(getCommonStruct, "rectangle", {
      id: "rect0",
      findex: generateKeyBetween(null, null),
    });
    const rect1 = {
      ...rect0,
      id: "rect1",
      findex: generateKeyBetween(rect0.findex, null),
    };
    const shapeComposite = newShapeComposite({
      shapes: [rect0, rect1],
      getStruct: getCommonStruct,
    });
    expect(getNextSiblingId(shapeComposite, rect0.id)).toBe(rect1.id);
    expect(getNextSiblingId(shapeComposite, rect1.id)).toBe(undefined);
  });

  test("should return next sibling id: child shapes", () => {
    const group = createShape(getCommonStruct, "group", {
      id: "group",
      findex: generateKeyBetween(null, null),
    });
    const rect0 = createShape(getCommonStruct, "rectangle", {
      id: "rect0",
      findex: generateKeyBetween(group.findex, null),
      parentId: group.id,
    });
    const rect1 = {
      ...rect0,
      id: "rect1",
      findex: generateKeyBetween(rect0.findex, null),
    };
    const shapeComposite = newShapeComposite({
      shapes: [group, rect0, rect1],
      getStruct: getCommonStruct,
    });
    expect(getNextSiblingId(shapeComposite, group.id)).toBe(undefined);
    expect(getNextSiblingId(shapeComposite, rect0.id)).toBe(rect1.id);
    expect(getNextSiblingId(shapeComposite, rect1.id)).toBe(undefined);
  });
});

describe("generateFindexBefore, generateFindexNext", () => {
  const rect0 = createShape(getCommonStruct, "rectangle", {
    id: "rect0",
    findex: generateKeyBetween(null, null),
  });
  const rect1 = {
    ...rect0,
    id: "rect1",
    findex: generateKeyBetween(rect0.findex, null),
  };
  const rect2 = {
    ...rect0,
    id: "rect2",
    findex: generateKeyBetween(rect1.findex, null),
  };
  const shapeComposite = newShapeComposite({
    shapes: [rect0, rect1, rect2],
    getStruct: getCommonStruct,
  });

  test("should generate findex before the target shape", () => {
    const result0 = generateFindexBefore(shapeComposite, rect0.id);
    expect(result0 < rect0.findex).toBe(true);

    const result1 = generateFindexBefore(shapeComposite, rect1.id);
    expect(rect0.findex < result1).toBe(true);
    expect(result1 < rect1.findex).toBe(true);

    const result2 = generateFindexBefore(shapeComposite, rect2.id);
    expect(rect1.findex < result2).toBe(true);
    expect(result2 < rect2.findex).toBe(true);
  });

  test("should generate findex after the target shape", () => {
    const result0 = generateFindexAfter(shapeComposite, rect0.id);
    console.log(rect0.findex, result0);
    expect(rect0.findex < result0).toBe(true);

    const result1 = generateFindexAfter(shapeComposite, rect1.id);
    expect(rect1.findex < result1).toBe(true);
    expect(result1 < rect2.findex).toBe(true);

    const result2 = generateFindexAfter(shapeComposite, rect2.id);
    expect(rect2.findex < result2).toBe(true);
  });

  test("should handle unknown shape id", () => {
    const result0 = generateFindexBefore(shapeComposite, "unknown");
    expect(rect2.findex < result0).toBe(true);

    const result1 = generateFindexAfter(shapeComposite, "unknown");
    expect(rect2.findex < result1).toBe(true);
  });
});
