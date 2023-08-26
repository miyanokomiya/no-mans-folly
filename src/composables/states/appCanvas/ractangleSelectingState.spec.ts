import { expect, test, describe, vi } from "vitest";
import { translateOnSelection } from "./commons";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";

function getMockCtx() {
  return {
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    clearAllSelected: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    setCursor: vi.fn(),
    getShapeStruct: getCommonStruct,
    setTmpShapeMap: vi.fn(),
    multiSelectShapes: vi.fn(),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "a",
        p: { x: 0, y: 0 },
        width: 50,
        height: 50,
      }),
      b: createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 40, y: 40 },
        width: 50,
        height: 50,
      }),
      c: createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "c",
        p: { x: 100, y: 100 },
        width: 50,
        height: 50,
      }),
    }),
  };
}

describe("newRectangleSelectingState", () => {
  describe("handle pointermove pointerup", () => {
    test("should clear current selection and select shapes in the rectangle", async () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState();
      await target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).toHaveBeenCalled();

      await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], false);
      expect(result).toEqual(translateOnSelection(ctx));
    });

    test("should keep current selection and select shapes in the rectangle when keepSelection is true", async () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState({ keepSelection: true });
      await target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();

      await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], true);
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
