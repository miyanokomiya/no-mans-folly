import { expect, test, describe, vi } from "vitest";
import { translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    getShapeMap: vi.fn(),
    setTmpShapeMap: vi.fn(),
    getTmpShapeMap: vi.fn(),
    patchShapes: vi.fn(),
    setCursor: vi.fn(),
  };
}

describe("newMovingShapeState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", async () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      await target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      await target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
      expect(ctx.setTmpShapeMap).toHaveBeenCalledWith({});
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with moved shapes", async () => {
      const ctx = getMockCtx();
      ctx.getShapeMap.mockReturnValue({ a: { p: { x: 0, y: 0 } } });
      const target = newMovingShapeState();
      const result = await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call patchShapes with moved shapes", async () => {
      const ctx = getMockCtx();
      ctx.getTmpShapeMap.mockReturnValue({ a: { value: 1 } });
      const target = newMovingShapeState();
      const result = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.patchShapes).toHaveBeenNthCalledWith(1, { a: { value: 1 } });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });

  describe("handle selection", () => {
    test("should move to next state", async () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
