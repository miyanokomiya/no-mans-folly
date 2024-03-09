import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { newShapeComposite } from "../../shapeComposite";
import { createStyleScheme } from "../../../models/factories";
import { defineIntransientState } from "./intransientState";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 })],
        getStruct: getCommonStruct,
      }),
    setCursor: vi.fn(),
  };
}

describe("defineIntransientState", () => {
  const createFn = defineIntransientState(() => ({
    getLabel: () => "test",
    handleEvent: () => {},
  }));

  describe("handle pointerhover", () => {
    test("should save hovered shape and render it", () => {
      const ctx = getMockCtx();
      const renderCtx = {
        setLineDash: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        beginPath: vi.fn(),
        stroke: vi.fn(),
      };
      const target = createFn();

      target.handleEvent(ctx as any, {
        type: "pointerhover",
        data: { current: { x: -10, y: 10 }, scale: 1 },
      });
      target.render?.(ctx, renderCtx as any);
      expect(renderCtx.stroke).toHaveBeenCalledTimes(0);

      target.handleEvent(ctx as any, {
        type: "pointerhover",
        data: { current: { x: 10, y: 10 }, scale: 1 },
      });
      target.render?.(ctx, renderCtx as any);
      expect(renderCtx.stroke).toHaveBeenCalledTimes(1);
    });
  });
});
