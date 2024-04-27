import { expect, test, describe, vi } from "vitest";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { getInitialOutput } from "../../../utils/textEditor";
import { newShapeComposite } from "../../shapeComposite";
import { newSelectionHubState } from "./selectionHubState";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [],
        getStruct: getCommonStruct,
      }),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    redraw: vi.fn(),
    addShapes: vi.fn(),
    selectShape: vi.fn(),
  };
}

describe("newDroppingNewShapeState", () => {
  const getOption = () => ({
    shapes: [
      createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "a",
        p: { x: 10, y: 20 },
        width: 100,
        height: 100,
      }),
    ],
    docMap: { a: getInitialOutput() },
  });

  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should call redraw", () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.redraw).toHaveBeenNthCalledWith(1);
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call addShapes and selectShape if pointermove has been called", () => {
      const ctx = getMockCtx();
      const target = newDroppingNewShapeState(getOption());
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      const result2 = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [{ ...getOption().shapes[0], p: { x: -40, y: -50 } }], {
        [getOption().shapes[0].id]: getInitialOutput(),
      });
      expect(result2).toEqual(newSelectionHubState);
    });
  });
});
