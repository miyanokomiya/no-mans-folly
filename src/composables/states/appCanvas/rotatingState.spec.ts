import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { createStyleScheme } from "../../../models/factories";
import { RectangleShape } from "../../../shapes/rectangle";
import { newRotatingState } from "./rotatingState";
import { newBoundingBox } from "../../boundingBox";
import { getRectPoints } from "../../../utils/geometry";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { Shape } from "../../../models";
import { LineShape } from "../../../shapes/line";

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
      });
      const target = newRotatingState({
        boundingBox,
      });

      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 10, y: 0 }, startAbs: { x: 10, y: 0 }, current: { x: 0, y: 10 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenCalled();
    });

    test("should update attachment.rotation when exists", () => {
      const ctx = getMockCtx();
      ctx.getShapeComposite = () =>
        newShapeComposite({
          shapes: [
            createShape<RectangleShape>(getCommonStruct, "rectangle", {
              id: "a",
              width: 50,
              height: 50,
              attachment: {
                id: "line",
                to: { x: 0, y: 0 },
                anchor: { x: 0, y: 0 },
                rotationType: "relative",
                rotation: Math.PI / 2,
              },
            }),
            createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } }),
          ],
          getStruct: getCommonStruct,
        });
      let data: { [id: string]: Partial<Shape> } = {};
      ctx.setTmpShapeMap.mockImplementation((v) => {
        data = v;
      });
      const boundingBox = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 50, height: 50 }),
      });
      const target = newRotatingState({
        boundingBox,
      });

      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 50, y: 25 }, startAbs: { x: 50, y: 25 }, current: { x: 25, y: 50 }, scale: 1 },
      });
      expect(data["a"].rotation).toBeCloseTo(-Math.PI * 0.75);
      expect(data["a"].attachment?.rotation).toBeCloseTo(Math.PI);
    });
  });
});
