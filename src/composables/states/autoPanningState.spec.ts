import { expect, test, describe, vi } from "vitest";
import { newAutoPanningState } from "./autoPanningState";

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

function getMockCtx() {
  return {
    setViewport: vi.fn(),
    getViewRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
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
