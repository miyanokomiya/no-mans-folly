import { expect, test, describe, vi } from "vitest";
import { newPanningState } from "./commons";

function getMockCtx() {
  return {
    panView: vi.fn(),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
  } as any;
}

describe("newPanningState", () => {
  describe("handle pointermove", () => {
    test('should execute "panView"', async () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      const data = { current: { x: 1, y: 2 }, start: { x: 10, y: 20 }, scale: 1 };
      const result = await target.handleEvent(ctx, {
        type: "pointermove",
        data,
      });
      expect(ctx.panView).toHaveBeenNthCalledWith(1, data);
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should break the state", async () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      const result = await target.handleEvent(ctx, {
        type: "pointerup",
        data: { point: { x: 1, y: 2 }, options: { button: 0 } },
      });
      expect(ctx.stopDragging).toHaveBeenCalledOnce();
      expect(result).toEqual({ type: "break" });
    });
  });
});
