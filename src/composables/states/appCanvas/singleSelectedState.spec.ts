import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newPanningState } from "../commons";
import { translateOnSelection } from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { createStyleScheme } from "../../../models/factories";
import { RectangleShape } from "../../../shapes/rectangle";

function getMockCtx() {
  return {
    getScale: () => 1,
    getShapeAt: vi.fn(),
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    setCursor: vi.fn(),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getShapeStruct: getCommonStruct,
    getStyleScheme: createStyleScheme,
    getTimestamp: vi.fn().mockReturnValue(1000),
    showFloatMenu: vi.fn(),
    hideFloatMenu: vi.fn(),
  };
}

describe("newSingleSelectedState", () => {
  describe("handle pointerdown: left", () => {
    test("should move to Resizing if the point is at the resizing control", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedState();
      await target.onStart?.(ctx as any);

      const result1 = (await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 0, y: 0 }, options: { button: 0, ctrl: false } },
      })) as any;
      expect(result1().getLabel()).toBe("Resizing");

      const result2 = (await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 25, y: 0 }, options: { button: 0, ctrl: false } },
      })) as any;
      expect(result2().getLabel()).toBe("Resizing");
    });

    test("should select a shape at the point if it exists", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedState();
      await target.onStart?.(ctx as any);

      ctx.getShapeAt.mockReturnValue({ id: "b" });
      const result1 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -100, y: -200 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "b", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSingleSelectedByPointerOnState);

      const result2 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -10, y: -20 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "b", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result2).toBe(undefined);
    });

    test("should move to RectangleSelecting state if there's no shape at the point", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedState();
      await target.onStart?.(ctx as any);
      ctx.getShapeAt.mockReturnValue(undefined);
      const result = (await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -10, y: -20 }, options: { button: 0, ctrl: false } },
      })) as any;
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result().getLabel()).toBe("RectangleSelecting");
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: -10, y: -20 }, options: { button: 1, ctrl: false } },
      });
      expect(result).toEqual({ type: "stack-restart", getState: newPanningState });
    });
  });

  describe("handle selection", () => {
    test("should move to next state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
