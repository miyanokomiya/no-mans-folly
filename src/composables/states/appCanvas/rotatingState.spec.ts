import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { createStyleScheme } from "../../../models/factories";
import { RectangleShape } from "../../../shapes/rectangle";
import { newRotatingState } from "./rotatingState";
import { newBoundingBox } from "../../boundingBox";
import { getRectPoints } from "../../../utils/geometry";

function getMockCtx() {
  return {
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
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

describe("newRotatingState", () => {
  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with rotated shapes", () => {
      const ctx = getMockCtx();
      const boundingBox = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 50, height: 50 }),
        styleScheme: ctx.getStyleScheme(),
      });
      const target = newRotatingState({
        boundingBox,
      });

      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 10, y: 0 }, current: { x: 0, y: 10 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenCalled();
    });
  });
});
