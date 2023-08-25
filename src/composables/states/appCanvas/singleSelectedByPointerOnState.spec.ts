import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedState } from "./singleSelectedState";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setCursor: vi.fn(),
  };
}

describe("newSingleSelectedByPointerOnState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      await target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      await target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should move to MovingShape state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      const result = await target.handleEvent(ctx as any, { type: "pointermove" } as any);
      expect(result).toBe(newMovingShapeState);
    });
  });

  describe("handle pointerup", () => {
    test("should move to SingleSelected state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      const result = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(result).toBe(newSingleSelectedState);
    });
  });

  describe("handle selection", () => {
    test("should move to next state", async () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
