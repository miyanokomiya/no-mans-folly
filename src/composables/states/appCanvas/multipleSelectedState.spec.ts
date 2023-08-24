import { expect, test, describe, vi } from "vitest";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newPanningState } from "../commons";
import { translateOnSelection } from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";

function getMockCtx() {
  return {
    getShapeAt: vi.fn(),
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
  };
}

describe("newMultipleSelectedState", () => {
  describe("handle pointerdown: left", () => {
    test("should select a shape at the point if it exists", async () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      await target.onStart?.(ctx as any);

      ctx.getShapeAt.mockReturnValue({ id: "b" });
      const result1 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "b", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSingleSelectedByPointerOnState);

      const result2 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "b", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result2).toBe(undefined);
    });

    test("should deselect if there's no shape at the point", async () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      await target.onStart?.(ctx as any);
      ctx.getShapeAt.mockReturnValue(undefined);
      await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(ctx.clearAllSelected).toHaveBeenCalled();
    });
  });

  describe("handle pointerdown: middle", () => {
    test("should move to panning state", async () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(result).toEqual({ type: "stack-restart", getState: newPanningState });
    });
  });

  describe("handle selection", () => {
    test("should move to next state", async () => {
      const ctx = getMockCtx();
      const target = newMultipleSelectedState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
