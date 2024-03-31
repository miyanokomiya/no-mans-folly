import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { newSelectionHubState } from "./selectionHubState";
import { TextShape } from "../../../shapes/text";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [
          createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label", lineAttached: 0.5 }),
        ],
        getStruct: getCommonStruct,
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
    test("should move to MovingHub state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      }) as any;
      expect(result?.().getLabel()).toBe("MovingHub");

      target.onStart?.(ctx as any);
      const result1 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      }) as any;
      expect(result1, "in early time").toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should move to SelectionHub state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      });
      expect(result).toBe(newSelectionHubState);
    });

    test("should move to TextEditing state when concurrent option is set true", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState({ concurrent: true });
      const result0 = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      }) as any;
      expect(result0, "timeout").toEqual(newSelectionHubState);

      target.onStart?.(ctx as any);
      const result1 = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      }) as any;
      expect(result1.toString(), "in time").contains("newTextEditingState");
    });
  });

  describe("handle selection", () => {
    test("should move to SelectionHub state", () => {
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
