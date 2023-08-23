import { expect, test, describe, vi } from "vitest";
import { newDefaultState } from "./defaultState";
import { newPanningState } from "../commons";

function getMockCtx() {
  return { getShapeAt: vi.fn() } as any;
}

describe("newDefaultState", () => {
  describe("handle pointerdown: middle", () => {
    test("should move to panning state", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      const result1 = await target.handleEvent(ctx, { type: "pointerdown", data: { options: { button: 1 } } } as any);
      expect(result1).toBe(newPanningState);
      const result2 = await target.handleEvent(ctx, { type: "pointerdown", data: { options: { button: 0 } } } as any);
      expect(result2).not.toBe(newPanningState);
    });
  });
});
