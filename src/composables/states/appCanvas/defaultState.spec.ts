import { expect, test, describe, vi } from "vitest";
import { newDefaultState } from "./defaultState";
import { newPanningState } from "../commons";
import { translateOnSelection } from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";

function getMockCtx() {
  return {
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getShapeAt: vi.fn(),
    clearAllSelected: vi.fn(),
    selectShape: vi.fn(),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    setCursor: vi.fn(),
  };
}

describe("newDefaultState", () => {
  describe("handle pointerdown: left", () => {
    test("should select a shape at the point if it exists", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();

      ctx.getShapeAt.mockReturnValue({ id: "a" });
      const result1 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(1, "a", false);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result1).toBe(newSingleSelectedByPointerOnState);

      const result2 = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: true } },
      });
      expect(ctx.selectShape).toHaveBeenNthCalledWith(2, "a", true);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();
      expect(result2).toBe(undefined);
    });

    test("should move to RectangleSelecting state if there's no shape at the point", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      ctx.getShapeAt.mockReturnValue(undefined);
      const result = await target.handleEvent(ctx as any, {
        type: "pointerdown",
        data: { point: { x: 1, y: 2 }, options: { button: 0, ctrl: false } },
      });
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result).toEqual(newRectangleSelectingState);
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

  describe("handle selection", () => {
    test("should move to next state", async () => {
      const ctx = getMockCtx();
      const target = newDefaultState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(translateOnSelection(ctx));
    });
  });
});
