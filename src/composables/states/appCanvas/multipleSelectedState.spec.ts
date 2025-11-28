import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { newShapeComposite } from "../../shapeComposite";
import { newStateMachine } from "../core";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getScale: () => 1,
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [
          createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
          createShape<RectangleShape>(getCommonStruct, "rectangle", {
            id: "b",
            p: { x: 100, y: 100 },
            width: 50,
            height: 50,
          }),
        ],
        getStruct: getCommonStruct,
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

      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 110, y: 110 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "b", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSelectedByPointerOnState);
    });

    test("should toggle select a shape at the point when holding ctrl", () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      target.onStart?.(ctx as any);

      ctx.getSelectedShapeIdMap.mockReturnValue({ b: true });
      const result1 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 10, y: 20 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "a", true);
      expect(result1).toBe(undefined);

      const result2 = target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 110, y: 120 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "b", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect((result2 as any)().getLabel()).toBe("SelectedByPointerOn");
    });

    test("should move to RectangleSelecting state if there's no shape at the point", () => {
      const ctx = getMockCtx();
      const sm = newStateMachine(() => ctx as any, newMultipleSelectedState);
      sm.handleEvent({
        type: "pointerdown",
        data: { point: { x: -90, y: -20 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(sm.getStateSummary().label).toBe("RectangleSelecting");
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", () => {
      const ctx = getMockCtx();
      const sm = newStateMachine(() => ctx as any, newMultipleSelectedState);
      sm.handleEvent({
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(sm.getStateSummary().label).toBe("Panning");
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
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
