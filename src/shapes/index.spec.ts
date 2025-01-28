import { expect, describe, test, vi } from "vitest";
import {
  canClip,
  canHaveText,
  canHaveTextPadding,
  canShapeGrouped,
  createShape,
  getAttachmentByUpdatingRotation,
  getCommonStruct,
  getLabel,
  getOrderPriority,
  getShapeTextBounds,
  getTextRangeRect,
  getWrapperRect,
  hasSpecialOrderPriority,
  isPointOn,
  refreshShapeRelations,
  remapShapeIds,
  renderShape,
  shouldResizeOnTextEdit,
  switchShapeType,
} from ".";
import { RectangleShape, struct as rectangleStruct } from "./rectangle";
import { LineShape } from "./line";
import { TextShape } from "./text";
import { createStrokeStyle } from "../utils/strokeStyle";
import { createBoxPadding } from "../utils/boxPadding";
import { TreeRootShape } from "./tree/treeRoot";
import { struct as unknownStruct } from "./unknown";
import { EllipseShape } from "./ellipse";
import { createFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { ShapeAttachment } from "../models";

describe("getCommonStruct", () => {
  test("should return the struct of the type", () => {
    expect(getCommonStruct("rectangle")).toBe(rectangleStruct);
  });
  test("should return fallback struct when the type is unknown", () => {
    expect(getCommonStruct("unexpected")).toBe(unknownStruct);
  });
});

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
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
    };
    renderShape(getCommonStruct, ctx as any, shape, {
      shapeMap: { [shape.id]: shape },
      treeNodeMap: { [shape.id]: { id: shape.id, children: [] } },
      getStruct: getCommonStruct,
      lineJumpMap: new Map(),
    });
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("getLabel", () => {
  test("should return the label of the shape", () => {
    const rect = createShape(getCommonStruct, "rectangle", {});
    const line = createShape(getCommonStruct, "line", {});
    expect(getLabel(getCommonStruct, rect)).toBe("Rectangle");
    expect(getLabel(getCommonStruct, line)).toBe("Line");
    expect(getLabel(getCommonStruct, { ...line, type: "unknown_type" })).toBe("Unknown");
  });
});

describe("canClip", () => {
  test("should true when a shape can clip other shapes", () => {
    const rect = createShape(getCommonStruct, "rectangle", {});
    const line = createShape(getCommonStruct, "line", {});
    expect(canClip(getCommonStruct, rect)).toBe(true);
    expect(canClip(getCommonStruct, line)).toBe(false);
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

describe("getTextRangeRect", () => {
  test("should regard boundsType option of the text bounds", () => {
    const shape = createShape<EllipseShape>(getCommonStruct, "ellipse", { rx: 10, ry: 20 });
    expect(
      getTextRangeRect(getCommonStruct, { ...shape, textPadding: createBoxPadding() } as EllipseShape),
    ).not.toEqual({
      x: 0,
      y: 0,
      width: 20,
      height: 40,
    });
    expect(
      getTextRangeRect(getCommonStruct, {
        ...shape,
        textPadding: createBoxPadding(undefined, undefined, "outer"),
      } as EllipseShape),
    ).toEqual({
      x: 0,
      y: 0,
      width: 20,
      height: 40,
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

describe("shouldResizeOnTextEdit", () => {
  test("should return undefined when a shape doesn't need it", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(shouldResizeOnTextEdit(getCommonStruct, shape)).toBe(undefined);
  });

  test("should return information for resizing when a shape needs it", () => {
    const shape0 = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
      id: "test",
      width: 10,
      height: 20,
      textPadding: createBoxPadding([1, 2, 3, 4]),
      maxWidth: 20,
    });
    expect(shouldResizeOnTextEdit(getCommonStruct, shape0)).toEqual({
      maxWidth: 14,
    });
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
      true,
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
    expect(result.shapes[0].parentId).toBe("unknown");
    expect(result.shapes[1].id).toBe("new_1");
    expect(result.shapes[1].parentId).toBe("new_0");
  });

  test("should remove parent ids that aren't found in the new ids when removeNotFound is true", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0", parentId: "unknown" });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test1",
      parentId: "test0",
    });
    let count = -1;
    const result = remapShapeIds(
      getCommonStruct,
      [shape0, shape1],
      () => {
        count++;
        return `new_${count}`;
      },
      true,
    );

    expect(result.shapes[0].id).toBe("new_0");
    expect(result.shapes[0].parentId).toBe(undefined);
    expect(result.shapes[1].id).toBe("new_1");
    expect(result.shapes[1].parentId).toBe("new_0");
  });

  describe("attachment", () => {
    const a = createShape(getCommonStruct, "rectangle", {
      id: "a",
      attachment: {
        id: "line",
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const b = createShape(getCommonStruct, "rectangle", {
      id: "b",
      attachment: {
        id: "line",
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const line = createShape(getCommonStruct, "line", {
      id: "line",
    });

    test("should remap attachment", () => {
      let count = -1;
      const result = remapShapeIds(getCommonStruct, [a, b, line], () => {
        count++;
        return `new_${count}`;
      });
      expect(result.shapes[0].attachment?.id).toBe("new_2");
      expect(result.shapes[1].attachment?.id).toBe("new_2");
    });

    test("should remove attachment that aren't found in the new ids when removeNotFound is true", () => {
      let count = -1;
      const result0 = remapShapeIds(
        getCommonStruct,
        [a, b],
        () => {
          count++;
          return `new_${count}`;
        },
        true,
      );
      expect(result0.shapes[0].attachment).toBe(undefined);
      expect(result0.shapes[1].attachment).toBe(undefined);

      const result1 = remapShapeIds(getCommonStruct, [a, b], () => {
        count++;
        return `new_${count}`;
      });
      expect(result1.shapes[0].attachment?.id).toBe("line");
    });
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

  test("should clear attachment when target shapes aren't available", () => {
    const a = createShape(getCommonStruct, "rectangle", {
      id: "a",
      attachment: {
        id: "line",
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });

    const result0 = refreshShapeRelations(getCommonStruct, [a], new Set([]));
    expect(result0).toEqual({
      a: { attachment: undefined },
    });
    expect(result0.a).toHaveProperty("attachment");

    const result1 = refreshShapeRelations(getCommonStruct, [a], new Set(["line"]));
    expect(result1).toEqual({});
  });
});

describe("switchShapeType", () => {
  test("should return switched shape: keep size", () => {
    const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      p: { x: 100, y: 200 },
      width: 100,
      height: 200,
    });
    const result0 = switchShapeType(getCommonStruct, rect, "rectangle") as RectangleShape;
    expect(result0.p).toEqual({ x: 100, y: 200 });
    expect(result0.width).toBeCloseTo(100);
    expect(result0.height).toBeCloseTo(200);

    const result1 = switchShapeType(getCommonStruct, rect, "ellipse") as EllipseShape;
    expect(result1.p).toEqual({ x: 100, y: 200 });
    expect(result1.rx).toBeCloseTo(50);
    expect(result1.ry).toBeCloseTo(100);
  });

  test("should return switched shape: keep rotation", () => {
    const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      p: { x: 100, y: 200 },
      width: 100,
      height: 200,
      rotation: Math.PI / 2,
    });
    const result0 = switchShapeType(getCommonStruct, rect, "ellipse") as EllipseShape;
    expect(result0.p).toEqual({ x: 100, y: 200 });
    expect(result0.rotation).toBeCloseTo(Math.PI / 2);
    expect(result0.rx).toBeCloseTo(50);
    expect(result0.ry).toBeCloseTo(100);
  });

  test("should return switched shape: keep shared properties", () => {
    const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      fill: createFillStyle({ color: COLORS.GRAY_1 }),
      stroke: createStrokeStyle({ color: COLORS.YELLOW }),
      alpha: 0.3,
      parentId: "p",
    });
    const result0 = switchShapeType(getCommonStruct, rect, "ellipse") as EllipseShape;
    expect(result0.fill).toEqual(rect.fill);
    expect(result0.stroke).toEqual(rect.stroke);
    expect(result0.alpha).toBe(0.3);
    expect(result0.parentId).toBe("p");
  });
});

describe("getAttachmentByUpdatingRotation", () => {
  test("should return attachment for new rotation if it's passed", () => {
    const attachment: ShapeAttachment = {
      id: "line",
      to: { x: 0.2, y: 0 },
      anchor: { x: 0, y: 0 },
      rotationType: "relative",
      rotation: 0.2,
    };
    const shape = createShape(getCommonStruct, "rectangle", {
      id: "a",
      rotation: 0.1,
      attachment,
    });
    expect(getAttachmentByUpdatingRotation(shape)).toEqual(undefined);
    expect(getAttachmentByUpdatingRotation(shape, 0.1)).toEqual(undefined);
    expect(getAttachmentByUpdatingRotation(shape, 0.3)).toEqual({ ...attachment, rotation: 0.4 });
    expect(getAttachmentByUpdatingRotation(shape, -0.1)).toEqual({ ...attachment, rotation: 0 });
  });
});

describe("getOrderPriority", () => {
  test("should return order priority for each shape type", () => {
    expect(getOrderPriority(getCommonStruct, createShape(getCommonStruct, "rectangle", {}))).toBe(0);
    expect(getOrderPriority(getCommonStruct, createShape(getCommonStruct, "frame", {}))).toBe(-10);
  });
});

describe("hasSpecialOrderPriority", () => {
  test("should return true when the priority isn't 0", () => {
    expect(hasSpecialOrderPriority(getCommonStruct, createShape(getCommonStruct, "rectangle", {}))).toBe(false);
    expect(hasSpecialOrderPriority(getCommonStruct, createShape(getCommonStruct, "frame", {}))).toBe(true);
  });
});

describe("canShapeGrouped", () => {
  test("should return true when a shape can be grouped", () => {
    expect(canShapeGrouped(getCommonStruct, createShape(getCommonStruct, "rectangle", {}))).toBe(true);
    expect(canShapeGrouped(getCommonStruct, createShape(getCommonStruct, "rectangle", { parentId: "a" }))).toBe(true);
    expect(canShapeGrouped(getCommonStruct, createShape(getCommonStruct, "frame", {}))).toBe(false);
  });
});
