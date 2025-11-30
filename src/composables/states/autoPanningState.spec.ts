import { expect, test, describe, vi } from "vitest";
import { newAutoPanningState } from "./autoPanningState";
import { sleep } from "../../testUtils";

function getMockCtx() {
  return {
    setViewport: vi.fn(),
    getViewRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
    addViewportHistory: vi.fn(),
  } as any;
}

describe("newAutoPanningState", () => {
  test('should execute "setViewport" throughout the animation', async () => {
    const ctx = getMockCtx();
    const target = newAutoPanningState({ viewRect: { x: 100, y: 100, width: 100, height: 200 }, duration: 100 });
    target.onStart?.(ctx);
    await sleep(20);
    expect(ctx.setViewport).toHaveBeenCalledTimes(1);
    await sleep(20);
    expect(ctx.setViewport).toHaveBeenCalledTimes(2);
    await target._resolved;
    expect(ctx.setViewport).toHaveBeenCalledTimes(6);
    expect(ctx.addViewportHistory).toHaveBeenCalledTimes(1);
    expect(ctx.addViewportHistory).toHaveBeenCalledWith({ x: 0, y: 0, width: 100, height: 100 }, true);
  });

  test("should regard zero duration", async () => {
    const ctx = getMockCtx();
    const target = newAutoPanningState({ viewRect: { x: 100, y: 100, width: 100, height: 200 }, duration: 0 });
    target.onStart?.(ctx);
    expect(ctx.setViewport).toHaveBeenCalledTimes(1);
  });

  describe("handle pointerdown", () => {
    test("should break the state", async () => {
      const ctx = getMockCtx();
      const target = newAutoPanningState({ viewRect: { x: 100, y: 100, width: 100, height: 200 }, duration: 100 });
      const result0 = target.handleEvent(ctx, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0 } },
      });
      expect(result0).toEqual(undefined);

      const result1 = await target._resolved;
      expect(result1).toEqual({ type: "break" });
      await sleep(20);
      expect(ctx.setViewport).toHaveBeenCalledTimes(0);
    });
  });
});
