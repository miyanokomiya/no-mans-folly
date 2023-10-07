import { expect, describe, test, vi } from "vitest";
import {
  canHaveText,
  canHaveTextPadding,
  createShape,
  getCommonStruct,
  getLocationRateOnShape,
  getShapeTextBounds,
  getWrapperRect,
  isPointOn,
  refreshShapeRelations,
  remapShapeIds,
  renderShape,
} from ".";
import { RectangleShape } from "./rectangle";
import { LineShape } from "./line";
import { TextShape } from "./text";
import { createStrokeStyle } from "../utils/strokeStyle";
import { createBoxPadding } from "../utils/boxPadding";

describe("createShape", () => {
  test("should return new shape", () => {
    const result = createShape(getCommonStruct, "rectangle", { id: "test" });
    expect(result.id).toBe("test");
    expect(result.type).toBe("rectangle");
  });
});

describe("renderShape", () => {
  test("should render the shape", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "test" });
    const ctx = {
      beginPath: vi.fn(),
      closePath: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
    };
    renderShape(getCommonStruct, ctx as any, shape, {
      shapeMap: { [shape.id]: shape },
      treeNodeMap: { [shape.id]: { id: shape.id, children: [] } },
      getStruct: getCommonStruct,
    });
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("getWrapperRect", () => {
  test("should return rectangle", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(getWrapperRect(getCommonStruct, shape)).toEqual({ x: 0, y: 0, width: 10, height: 20 });
  });

  test("should include bounds when the flag is supplied", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test",
      width: 10,
      height: 20,
      stroke: createStrokeStyle({ width: 100 }),
    });
    expect(getWrapperRect(getCommonStruct, shape, undefined, true)).toEqual({
      x: -50,
      y: -50,
      width: 110,
      height: 120,
    });
  });
});

describe("canHaveText", () => {
  test("should return true when the shape's struct has getTextRangeRect", () => {
    const rect = createShape(getCommonStruct, "rectangle", {});
    const line = createShape(getCommonStruct, "line", {});
    expect(canHaveText(getCommonStruct, rect)).toBe(true);
    expect(canHaveText(getCommonStruct, line)).toBe(false);
  });
});

describe("canHaveTextPadding", () => {
  test("should return true when the shape's struct has functions for text padding", () => {
    const rect = createShape(getCommonStruct, "rectangle", {});
    const text = createShape(getCommonStruct, "text", {});
    expect(canHaveTextPadding(getCommonStruct, rect)).toBe(true);
    expect(canHaveTextPadding(getCommonStruct, text)).toBe(false);
  });
});

describe("isPointOn", () => {
  test("should return true if the point is on the shape", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(isPointOn(getCommonStruct, shape, { x: -3, y: 3 }, {} as any)).toBe(false);
    expect(isPointOn(getCommonStruct, shape, { x: 3, y: 3 }, {} as any)).toBe(true);
  });
});

describe("getLocationRateOnShape", () => {
  test("should return location rate on the shape", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    const result0 = getLocationRateOnShape(getCommonStruct, shape, { x: 0, y: 0 });
    expect(result0.x).toBeCloseTo(0);
    expect(result0.y).toBeCloseTo(0);

    const result1 = getLocationRateOnShape(getCommonStruct, shape, { x: 2, y: 15 });
    expect(result1.x).toBeCloseTo(0.2);
    expect(result1.y).toBeCloseTo(3 / 4);

    const result2 = getLocationRateOnShape(getCommonStruct, { ...shape, rotation: Math.PI / 2 }, { x: 5, y: 14 });
    expect(result2.x).toBeCloseTo(0.9);
    expect(result2.y).toBeCloseTo(0.5);
  });
});

describe("getShapeTextBounds", () => {
  test("should return text bounds", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test",
      p: { x: 1, y: 2 },
      width: 10,
      height: 20,
      textPadding: createBoxPadding([0, 0, 0, 0]),
    });

    expect(getShapeTextBounds(getCommonStruct, shape)).toEqual({
      affine: [1, 0, 0, 1, 1, 2],
      affineReverse: [1, 0, 0, 1, -1, -2],
      range: { x: 0, y: 0, width: 10, height: 20 },
    });
  });

  test("should take rotation into account", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test",
      p: { x: 0, y: 0 },
      width: 10,
      height: 20,
      textPadding: createBoxPadding([0, 0, 0, 0]),
      rotation: Math.PI / 2,
    });

    const result = getShapeTextBounds(getCommonStruct, shape);
    expect(result.affine[0]).toBeCloseTo(0);
    expect(result.affine[1]).toBeCloseTo(1);
    expect(result.affine[2]).toBeCloseTo(-1);
    expect(result.affine[3]).toBeCloseTo(0);
    expect(result.range.width).toBeCloseTo(10);
    expect(result.range.height).toBeCloseTo(20);
  });

  test("should take text padding into account", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test",
      p: { x: 0, y: 0 },
      width: 10,
      height: 20,
      textPadding: { value: [1, 2, 3, 4] },
    });

    expect(getShapeTextBounds(getCommonStruct, shape)).toEqual({
      affine: [1, 0, 0, 1, 4, 1],
      affineReverse: [1, 0, 0, 1, -4, -1],
      range: { x: 0, y: 0, width: 4, height: 16 },
    });
  });

  test("should return default text bounds when the shape's struct doesn't have text information", () => {
    const shape = createShape<LineShape>(getCommonStruct, "line", {
      id: "test",
      p: { x: 1, y: 2 },
      q: { x: 10, y: 20 },
    });

    expect(getShapeTextBounds(getCommonStruct, shape)).toEqual({
      affine: [1, 0, 0, 1, 1, 2],
      affineReverse: [1, 0, 0, 1, -1, -2],
      range: { x: 0, y: 0, width: 9, height: 18 },
    });
  });

  test("rhombus case", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rhombus", {
      id: "test",
      p: { x: 0, y: 0 },
      width: 10,
      height: 20,
      textPadding: { value: [0, 0, 0, 0] },
    });

    expect(getShapeTextBounds(getCommonStruct, shape)).toEqual({
      affine: [1, 0, 0, 1, 2.5, 5],
      affineReverse: [1, 0, 0, 1, -2.5, -5],
      range: { x: 0, y: 0, width: 5, height: 10 },
    });

    const shape1 = createShape<RectangleShape>(getCommonStruct, "rhombus", {
      id: "test",
      p: { x: 0, y: 0 },
      width: 100,
      height: 200,
      textPadding: { value: [1, 2, 3, 4] },
    });

    expect(getShapeTextBounds(getCommonStruct, shape1)).toEqual({
      affine: [1, 0, 0, 1, 29, 51],
      affineReverse: [1, 0, 0, 1, -29, -51],
      range: { x: 0, y: 0, width: 44, height: 96 },
    });
  });
});

describe("remapShapeIds", () => {
  test("should return remapped information", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0" });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test1",
    });
    let count = -1;
    const result = remapShapeIds(getCommonStruct, [shape0, shape1], () => {
      count++;
      return `new_${count}`;
    });

    expect(result.shapes[0].id).toBe("new_0");
    expect(result.shapes[1].id).toBe("new_1");
  });

  test("should return remap shape properties related to ids", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0" });
    const shape1 = createShape<LineShape>(getCommonStruct, "line", {
      id: "test1",
      pConnection: { id: "test0", rate: { x: 0, y: 0 } },
    });
    let count = -1;
    const result = remapShapeIds(getCommonStruct, [shape0, shape1], () => {
      count++;
      return `new_${count}`;
    });

    expect((result.shapes[1] as LineShape).pConnection?.id).toBe("new_0");
  });

  test("should remove relation that aren't found in the new ids when removeNotFound is true", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0" });
    const shape1 = createShape<LineShape>(getCommonStruct, "line", {
      id: "test1",
      pConnection: { id: "unknown", rate: { x: 0, y: 0 } },
    });
    let count = -1;
    const result = remapShapeIds(
      getCommonStruct,
      [shape0, shape1],
      () => {
        count++;
        return `new_${count}`;
      },
      true
    );

    expect((result.shapes[1] as LineShape).pConnection).toBe(undefined);
  });

  test("should remap parent ids", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0", parentId: "unknown" });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test1",
      parentId: "test0",
    });
    let count = -1;
    const result = remapShapeIds(getCommonStruct, [shape0, shape1], () => {
      count++;
      return `new_${count}`;
    });

    expect(result.shapes[0].id).toBe("new_0");
    expect(result.shapes[0].parentId).toBe(undefined);
    expect(result.shapes[1].id).toBe("new_1");
    expect(result.shapes[1].parentId).toBe("new_0");
  });
});

describe("refreshShapeRelations", () => {
  test("should return patch map to refresh shape relations", () => {
    const text = createShape<TextShape>(getCommonStruct, "text", { id: "text", parentId: "line", lineAttached: 0.5 });

    const result0 = refreshShapeRelations(getCommonStruct, [text], new Set([]));
    expect(result0).toEqual({
      text: { parentId: undefined, lineAttached: undefined },
    });
    expect(result0.text).toHaveProperty("parentId");
    expect(result0.text).toHaveProperty("lineAttached");

    const result1 = refreshShapeRelations(getCommonStruct, [text], new Set(["line"]));
    expect(result1).toEqual({});
  });
});
