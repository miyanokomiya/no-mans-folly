import { expect, test, describe, vi } from "vitest";
import { newDefaultState } from "./defaultState";
import { newSelectedByPointerOnState } from "./selectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newShapeComposite } from "../../shapeComposite";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newStateMachine } from "../core";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
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
    getScale: () => 1,
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
      expect(result1).toBe(newSelectedByPointerOnState);

      ctx.getSelectedShapeIdMap.mockReturnValue({});
      const result2 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: true } },
      });
      expect(result2).toBe(ctx.states.newSelectionHubState);
    });

    test("should move to RectangleSelecting state if there's no shape at the point", () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      const result = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -1, y: -2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result).toEqual(newPointerDownEmptyState);
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", () => {
      const ctx = getMockCtx();
      const sm = newStateMachine(() => ctx as any, newDefaultState);
      sm.handleEvent({
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(sm.getStateSummary().label).toBe("Panning");
    });
  });
});
