import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newSelectionHubState } from "./selectionHubState";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getDocumentMap: () => ({ a: [{ insert: "text" }] }),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setTmpShapeMap: vi.fn(),
    addShapes: vi.fn(),
    multiSelectShapes: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    generateUuid: () => "duplicated",
    createLastIndex: () => "aa",
  };
}

describe("newDuplicatingShapesState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap", () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {});
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call addShapes and multiSelectShapes", () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 200, y: 0 }, scale: 1 },
      });
      const result2 = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "duplicated",
        findex: "ab",
        width: 50,
        height: 50,
        p: { x: 190, y: -10 },
      });
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [rect], { [rect.id]: [{ insert: "text" }] });
      expect(ctx.multiSelectShapes).toHaveBeenNthCalledWith(1, [rect.id]);
      expect(result2).toEqual(newSelectionHubState);
    });
  });
});
