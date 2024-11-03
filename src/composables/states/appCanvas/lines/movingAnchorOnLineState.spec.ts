import { describe, test, expect, vi } from "vitest";
import { newMovingAnchorOnLineState } from "./movingAnchorOnLineState";
import { createShape, getCommonStruct } from "../../../../shapes";
import { createStyleScheme } from "../../../../models/factories";
import { createInitialAppCanvasStateContext } from "../../../../contexts/AppCanvasContext";
import { newShapeComposite } from "../../../shapeComposite";
import { LineShape } from "../../../../shapes/line";
import { RectangleShape } from "../../../../shapes/rectangle";

const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
const a = createShape<RectangleShape>(getCommonStruct, "rectangle", {
  id: "a",
  p: { x: 0, y: -50 },
  width: 100,
  height: 100,
  attachment: {
    id: line.id,
    to: { x: 0.5, y: 0 },
    anchor: { x: 0.5, y: 0.5 },
    rotationType: "relative",
    rotation: 0,
  },
});
function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    setTmpShapeMap: vi.fn(),
    patchShapes: vi.fn(),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [line, a],
        getStruct: getCommonStruct,
      }),
  };
}

describe("newMovingAnchorOnLineState", () => {
  describe("handleEvent: pointermove", () => {
    test("should not call setTmpShapeMap when alt-key isn't held", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap = () => ({ a: true });
      ctx.getLastSelectedShapeId = () => "a";
      const target = newMovingAnchorOnLineState({ lineId: "line", shapeId: "a" });
      target.onStart?.(ctx);

      const result0 = target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 50, y: 0 }, current: { x: 60, y: 0 }, scale: 1 },
      });
      expect(result0).toEqual({ type: "break" });
      expect(ctx.setTmpShapeMap).not.toHaveBeenCalled();

      target.onEnd?.(ctx);
      expect(ctx.setTmpShapeMap).not.toHaveBeenCalled();
    });

    test("should call setTmpShapeMap with updated anchor", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap = () => ({ a: true });
      ctx.getLastSelectedShapeId = () => "a";
      const target = newMovingAnchorOnLineState({ lineId: "line", shapeId: "a" });
      target.onStart?.(ctx);

      const result0 = target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 50, y: 0 }, current: { x: 60, y: 0 }, scale: 1, alt: true, ctrl: true },
      });
      expect(result0).toBe(undefined);
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {
        a: {
          p: { x: 10, y: -50 },
          attachment: {
            id: line.id,
            to: { x: 0.5, y: 0 },
            anchor: { x: 0.4, y: 0.5 },
            rotationType: "relative",
            rotation: 0,
          },
        },
      });
    });
  });

  describe("handleEvent: pointerup", () => {
    test("should call patchShapes with temprorary shapes", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap = () => ({ a: true });
      ctx.getLastSelectedShapeId = () => "a";
      ctx.getTmpShapeMap = () => ({ a: { p: { x: 1, y: 2 } } });
      const target = newMovingAnchorOnLineState({ lineId: "line", shapeId: "a" });
      target.onStart?.(ctx);

      const result0 = target.handleEvent(ctx, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      });
      expect(result0).toEqual(ctx.states.newSelectionHubState);
      expect(ctx.patchShapes).toHaveBeenNthCalledWith(1, ctx.getTmpShapeMap());

      target.onEnd?.(ctx);
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {});
    });
  });
});
