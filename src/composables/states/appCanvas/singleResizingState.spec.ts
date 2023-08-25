import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { createStyleScheme } from "../../../models/factories";
import { RectangleShape } from "../../../shapes/rectangle";
import { newSingleResizingState } from "./singleResizingState";
import { newBoundingBox } from "../../boundingBox";
import { getRectPoints } from "../../../utils/geometry";

function getMockCtx() {
  return {
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
    getShapeStruct: getCommonStruct,
    getStyleScheme: createStyleScheme,
    setTmpShapeMap: vi.fn(),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
  };
}

describe("newSingleResizingState", () => {
  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with resizing affine matrix", async () => {
      const ctx = getMockCtx();
      const boundingBox = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 50, height: 50 }),
        styleScheme: ctx.getStyleScheme(),
      });
      const hitResult = boundingBox.hitTest({ x: 0, y: 0 })!;
      const target = newSingleResizingState({
        boundingBox,
        hitResult,
      });

      await target.onStart?.(ctx as any);
      await target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 10 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenCalledWith({
        a: {
          p: { x: 10, y: 10 },
          width: 40,
          height: 40,
        },
      });
    });
  });
});
