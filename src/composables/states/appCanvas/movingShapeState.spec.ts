import { expect, test, describe, vi } from "vitest";
import { newMovingShapeState } from "./movingShapeState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { TextShape } from "../../../shapes/text";
import { newSelectionHubState } from "./selectionHubState";
import { newShapeComposite } from "../../shapeComposite";

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
          createShape(getCommonStruct, "line", { id: "line" }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label", parentId: "line", lineAttached: 0.5 }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label2", parentId: "line", lineAttached: 0.5 }),
        ],
        getStruct: getCommonStruct,
      }),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setTmpShapeMap: vi.fn(),
    getTmpShapeMap: vi.fn(),
    patchShapes: vi.fn(),
  };
}

describe("newMovingShapeState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
      expect(ctx.setTmpShapeMap).toHaveBeenCalledWith({});
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with moved shapes", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(result).toBe(undefined);
    });

    test("should not move line labels even when they are selected", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap = vi.fn().mockReturnValue({ a: true, label: true, label2: true });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call patchShapes with moved shapes", () => {
      const ctx = getMockCtx();
      ctx.getTmpShapeMap.mockReturnValue({ a: { value: 1 } });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.patchShapes).toHaveBeenNthCalledWith(1, { a: { value: 1 } });
      expect((result as any)?.().getLabel()).toEqual("SelectionHub");
    });
  });

  describe("handle selection", () => {
    test("should move to next state", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(newSelectionHubState);
    });
  });
});
