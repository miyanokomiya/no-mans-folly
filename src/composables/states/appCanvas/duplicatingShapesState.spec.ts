import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { newSingleSelectedState } from "./singleSelectedState";
import { RectangleShape } from "../../../shapes/rectangle";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";

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
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setTmpShapeMap: vi.fn(),
    addShapes: vi.fn(),
    multiSelectShapes: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    generateUuid: () => "duplicated",
  };
}

describe("newDuplicatingShapesState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", async () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      await target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      await target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap", async () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      await target.onStart?.(ctx as any);
      const result = await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {});
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call addShapes and multiSelectShapes", async () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      await target.onStart?.(ctx as any);

      await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 200, y: 0 }, scale: 1 },
      });
      const result2 = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "duplicated",
        width: 50,
        height: 50,
        p: { x: 210, y: 10 },
      });
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [rect]);
      expect(ctx.multiSelectShapes).toHaveBeenNthCalledWith(1, [rect.id]);
      expect(result2).toEqual(newSingleSelectedState);
    });
  });
});
