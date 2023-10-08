import { expect, test, describe, vi } from "vitest";
import { newPanningState } from "./commons";
import { mapFilter } from "../../utils/commons";

function getMockCtx() {
  return {
    panView: vi.fn(),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
  } as any;
}

describe("newPanningState", () => {
  describe("onStart", () => {
    test('should execute "startDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      target.onStart?.(ctx);
      expect(ctx.startDragging).toHaveBeenCalledOnce();
    });
  });

  describe("onEnd", () => {
    test('should execute "stopDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      target.onEnd?.(ctx);
      expect(ctx.stopDragging).toHaveBeenCalledOnce();
    });
  });

  describe("handle pointermove", () => {
    test('should execute "panView"', () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      const data = { current: { x: 1, y: 2 }, start: { x: 10, y: 20 }, scale: 1 };
      const result = target.handleEvent(ctx, {
        type: "pointermove",
        data,
      });
      expect(ctx.panView).toHaveBeenNthCalledWith(1, data);
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should break the state", () => {
      const ctx = getMockCtx();
      const target = newPanningState();
      const result = target.handleEvent(ctx, {
        type: "pointerup",
        data: { point: { x: 1, y: 2 }, options: { button: 0 } },
      });
      expect(result).toEqual({ type: "break" });
    });
  });
});

describe("mapFilter", () => {
  test("drop origin if returns false", () => {
    expect(
      mapFilter(
        {
          1: { a: 1 },
          2: { a: 2 },
          3: { a: 3 },
          4: { a: 4 },
        },
        (val) => val.a % 2 === 0,
      ),
    ).toEqual({
      2: { a: 2 },
      4: { a: 4 },
    });
  });
});
