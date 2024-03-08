import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { createStyleScheme } from "../../../models/factories";
import { RectangleShape } from "../../../shapes/rectangle";
import { newResizingState } from "./resizingState";
import { newBoundingBox } from "../../boundingBox";
import { getRectPoints } from "../../../utils/geometry";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { newShapeComposite } from "../../shapeComposite";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 })],
        getStruct: getCommonStruct,
      }),
    setTmpShapeMap: vi.fn(),
  };
}

describe("newResizingState", () => {
  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with resized shapes", () => {
      const ctx = getMockCtx();
      const boundingBox = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 50, height: 50 }),
      });
      const hitResult = boundingBox.hitTest({ x: 0, y: 0 }, 1)!;
      const target = newResizingState({
        boundingBox,
        hitResult,
      });

      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
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
