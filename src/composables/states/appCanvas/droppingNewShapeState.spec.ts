import { expect, test, describe, vi } from "vitest";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { createShape, getCommonStruct } from "../../../shapes";
import { newSingleSelectedState } from "./singleSelectedState";
import { RectangleShape } from "../../../shapes/rectangle";
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
    selectShape: vi.fn(),
  };
}

describe("newDroppingNewShapeState", () => {
  const getOption = () => ({
    shape: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 }),
  });

  describe("lifecycle", () => {
    test("should setup and clean the state", async () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
      await target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      await target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap", async () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
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
    test("should call addShapes and selectShape if pointermove has been called", async () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
      await target.onStart?.(ctx as any);

      await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      const result2 = await target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [{ ...getOption().shape, p: { x: -40, y: -50 } }]);
      expect(result2).toEqual(newSingleSelectedState);
    });
  });
});
