import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newPanningState } from "../commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { newSelectionHubState } from "./selectionHubState";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getScale: () => 1,
    getShapeAt: vi.fn(),
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getShapeStruct: getCommonStruct,
    getStyleScheme: createStyleScheme,
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    setCursor: vi.fn(),
    getTimestamp: vi.fn().mockReturnValue(1000),
    showFloatMenu: vi.fn(),
    hideFloatMenu: vi.fn(),
    setContextMenuList: vi.fn(),
  };
}

describe("newMultipleSelectedState", () => {
  describe("handle pointerdown: left", () => {
    test("should move to Resizing if the point is at the resizing control", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);

      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 0, y: 0 }, options: { button: 0, ctrl: false } },
      }) as any;
      expect(result1().getLabel()).toBe("Resizing");

      const result2 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 25, y: 0 }, options: { button: 0, ctrl: false } },
      }) as any;
      expect(result2().getLabel()).toBe("Resizing");
    });

    test("should select a shape at the point if it exists", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);

      ctx.getShapeAt.mockReturnValue({ id: "b" });
      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -100, y: -200 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "b", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSingleSelectedByPointerOnState);

      const result2 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -10, y: -20 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "b", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result2).toBe(undefined);
    });

    test("should move to RectangleSelecting state if there's no shape at the point", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);
      ctx.getShapeAt.mockReturnValue(undefined);
      const result = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -10, y: -20 }, options: { button: 0, ctrl: false } },
      }) as any;
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result().getLabel()).toBe("RectangleSelecting");
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(result).toEqual({ type: "stack-resume", getState: newPanningState });
    });
  });

  describe("handle selection", () => {
    test("should move to next state", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(newSelectionHubState);
    });
  });
});
