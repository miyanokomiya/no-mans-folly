import { expect, test, describe, vi } from "vitest";
import { newDefaultState } from "./defaultState";
import { newPanningState } from "../commons";

function getMockCtx() {
  return { getShapeAt: vi.fn(), clearAllSelected: vi.fn(), selectShape: vi.fn() };
}

describe("newDefaultState", () => {
  describe("handle pointerdown: left", () => {
    test("should select a shape at the point if it exists", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();

      ctx.getShapeAt.mockReturnValue({ id: "a" });
      await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "a", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();

      await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "a", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
    });

    test("should deselect if there's no shape at the point", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
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
      const target = newDefaultState();
      const result = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 1, ctrl: false } },
      });
      expect(result).toBe(newPanningState);
    });
  });
});
