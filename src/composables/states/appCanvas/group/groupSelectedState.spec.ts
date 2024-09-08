import { describe, test, expect, vi } from "vitest";
import { createInitialAppCanvasStateContext } from "../../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../../models/factories";
import { newShapeComposite } from "../../../shapeComposite";
import { createShape, getCommonStruct } from "../../../../shapes";
import { RectangleShape } from "../../../../shapes/rectangle";
import { newGroupSelectedState } from "./groupSelectedState";

function getMockCtx() {
  const shapes = [
    createShape(getCommonStruct, "group", { id: "groupA" }),
    createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      width: 50,
      height: 50,
      parentId: "groupA",
    }),
    createShape(getCommonStruct, "group", { id: "groupB" }),
    createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "b",
      p: { x: 100, y: 100 },
      width: 50,
      height: 50,
      parentId: "groupB",
    }),
  ];

  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    selectShape: vi.fn(),
    getLastSelectedShapeId: vi.fn().mockReturnValue(shapes[0].id),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ [shapes[0].id]: true }),
    getShapeComposite: () => newShapeComposite({ shapes, getStruct: getCommonStruct }),
    clearAllSelected: vi.fn(),
  };
}

describe("newGroupSelectedState", () => {
  describe("handle epointerdoubleclick", () => {
    test("should select a child shape of selected group at the point if it exists", () => {
      const ctx = getMockCtx();
      const target = newGroupSelectedState();
      target.onStart?.(ctx as any);

      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdoubleclick",
        data: { point: { x: 20, y: 20 }, options: { button: 0 } },
      });
      expect(ctx.selectShape).toBeCalledWith("a");
      expect(result1).toBe(null);
    });

    test("should not select a child shape at the point if its group isn't selected", () => {
      const ctx = getMockCtx();
      const target = newGroupSelectedState();
      target.onStart?.(ctx as any);

      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdoubleclick",
        data: { point: { x: 120, y: 120 }, options: { button: 0 } },
      });
      expect(ctx.selectShape).not.toBeCalled();
      expect(result1).not.toBe(null);
    });
  });
});
