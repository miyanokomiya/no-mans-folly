import { expect, test, describe, vi } from "vitest";
import { newPanningReadyState } from "./panningReadyState";

function getMockCtx() {
  return {
    panView: vi.fn(),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setCursor: vi.fn(),
  } as any;
}

describe("newPanningReadyState", () => {
  describe("onStart", () => {
    test('should not execute "startDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      expect(ctx.startDragging).not.toHaveBeenCalledOnce();
    });
  });

  describe("onEnd", () => {
    test('should execute "stopDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      target.onEnd?.(ctx);
      expect(ctx.stopDragging).toHaveBeenCalledOnce();
    });
  });

  describe("handle pointerdown", () => {
    test('should execute "startDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      const result = target.handleEvent(ctx, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0 } },
      });
      expect(result).toBe(undefined);
      expect(ctx.startDragging).toHaveBeenCalledOnce();
      expect(ctx.setCursor).toHaveBeenCalledWith("grabbing");
    });
  });

  describe("handle pointermove", () => {
    test('should execute "panView"', () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      const data = { current: { x: 1, y: 2 }, start: { x: 10, y: 20 }, startAbs: { x: 20, y: 20 }, scale: 1 };
      const result = target.handleEvent(ctx, {
        type: "pointermove",
        data,
      });
      expect(ctx.panView).toHaveBeenNthCalledWith(1, data);
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test('should execute "stopDragging"', () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      const result = target.handleEvent(ctx, {
        type: "pointerup",
        data: { point: { x: 1, y: 2 }, options: { button: 0 } },
      });
      expect(result).toBe(undefined);
      expect(ctx.stopDragging).toHaveBeenCalledOnce();
      expect(ctx.setCursor).toHaveBeenCalledWith("grab");
    });
  });

  describe("handle keyup", () => {
    test("should break the state", () => {
      const ctx = getMockCtx();
      const target = newPanningReadyState();
      target.onStart?.(ctx);
      const result = target.handleEvent(ctx, {
        type: "keyup",
        data: { key: "" },
      });
      expect(result).toEqual({ type: "break" });
    });
  });
});
