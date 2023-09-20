import { expect, test, describe, vi } from "vitest";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newSelectionHubState } from "./selectionHubState";

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
    test("should clear current selection and select shapes in the rectangle", () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState();
      target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).toHaveBeenCalled();

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], false);
      expect(result).toEqual(newSelectionHubState);
    });

    test("should keep current selection and select shapes in the rectangle when keepSelection is true", () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState({ keepSelection: true });
      target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], true);
      expect(result).toEqual(newSelectionHubState);
    });
  });
});
