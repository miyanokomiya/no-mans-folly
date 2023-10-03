import { expect, test, describe, vi } from "vitest";
import { newDefaultState } from "./defaultState";
import { newPanningState } from "../commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newSelectionHubState } from "./selectionHubState";
import { newShapeComposite } from "../../shapeComposite";

function getMockCtx() {
  return {
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 })],
        getStruct: getCommonStruct,
      }),
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    setCursor: vi.fn(),
  };
}

describe("newDefaultState", () => {
  describe("handle pointerdown: left", () => {
    test("should select a shape at the point if it exists", () => {
      const ctx = getMockCtx();
      const target = newDefaultState();

      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "a", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSingleSelectedByPointerOnState);

      ctx.getSelectedShapeIdMap.mockReturnValue({});
      const result2 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: true } },
      });
      expect(result2).toBe(newSelectionHubState);
    });

    test("should move to RectangleSelecting state if there's no shape at the point", () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      const result = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -1, y: -2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result).toEqual(newRectangleSelectingState);
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      const result = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(result).toBe(newPanningState);
    });
  });
});
