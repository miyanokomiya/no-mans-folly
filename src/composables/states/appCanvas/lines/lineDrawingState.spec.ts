import { describe, test, expect, vi } from "vitest";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape, getCommonStruct } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";
import { createInitialAppCanvasStateContext } from "../../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../../models/factories";
import { newShapeComposite } from "../../../shapeComposite";

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
    addShapes: vi.fn(),
    selectShape: vi.fn(),
  };
}

describe("handleEvent", () => {
  describe("pointerup", () => {
    test("should create line shape when it has non-zero length", () => {
      const shape = createShape<LineShape>(getCommonStruct, "line", { id: "a", p: { x: 10, y: 0 } });
      const ctx = getMockCtx();
      const target = newLineDrawingState({ shape });
      target.onStart?.(ctx);
      target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 11, y: 0 }, ctrl: true, scale: 1 },
      });
      expect(
        target.handleEvent(ctx, {
          type: "pointerup",
          data: { point: { x: 0, y: 0 }, options: { button: 0 } },
        }),
      ).toBe(ctx.states.newSelectionHubState);
      expect(ctx.addShapes).toHaveBeenCalled();
      expect(ctx.selectShape).toHaveBeenCalledWith("a");
    });

    test("should not cancel drawing the line when it has zero length twice", () => {
      const shape = createShape<LineShape>(getCommonStruct, "line", { id: "a", p: { x: 10, y: 0 } });
      const ctx = getMockCtx();
      const target = newLineDrawingState({ shape });
      target.onStart?.(ctx);
      target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(
        target.handleEvent(ctx, {
          type: "pointerup",
          data: { point: { x: 0, y: 0 }, options: { button: 0 } },
        }),
      ).toBe(undefined);
      expect(
        target.handleEvent(ctx, {
          type: "pointerup",
          data: { point: { x: 0, y: 0 }, options: { button: 0 } },
        }),
      ).toBe(ctx.states.newSelectionHubState);
      expect(ctx.addShapes).not.toHaveBeenCalled();
      expect(ctx.selectShape).not.toHaveBeenCalled();
    });

    test("should create line shape when it has zero length firxt but has non-zero length second", () => {
      const shape = createShape<LineShape>(getCommonStruct, "line", { id: "a", p: { x: 10, y: 0 } });
      const ctx = getMockCtx();
      const target = newLineDrawingState({ shape });
      target.onStart?.(ctx);
      target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 10, y: 0 }, ctrl: true, scale: 1 },
      });
      expect(
        target.handleEvent(ctx, {
          type: "pointerup",
          data: { point: { x: 0, y: 0 }, options: { button: 0 } },
        }),
      ).toBe(undefined);
      target.handleEvent(ctx, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, current: { x: 11, y: 0 }, ctrl: true, scale: 1 },
      });
      expect(
        target.handleEvent(ctx, {
          type: "pointerup",
          data: { point: { x: 0, y: 0 }, options: { button: 0 } },
        }),
      ).toBe(ctx.states.newSelectionHubState);
      expect(ctx.addShapes).toHaveBeenCalled();
      expect(ctx.selectShape).toHaveBeenCalledWith("a");
    });
  });
});
