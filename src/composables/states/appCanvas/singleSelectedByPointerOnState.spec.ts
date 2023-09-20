import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { newSelectionHubState } from "./selectionHubState";

function getMockCtx() {
  return {
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getShapeStruct: getCommonStruct,
    getStyleScheme: createStyleScheme,
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setCursor: vi.fn(),
    getScale: () => 1,
    hideFloatMenu: vi.fn(),
  };
}

describe("newSingleSelectedByPointerOnState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should move to MovingShape state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      }) as any;
      expect(result?.().getLabel()).toBe("MovingShape");
    });
  });

  describe("handle pointerup", () => {
    test("should move to SingleSelected state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(result).toBe(newSelectionHubState);
    });
  });

  describe("handle selection", () => {
    test("should move to next state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(newSelectionHubState);
    });
  });
});
