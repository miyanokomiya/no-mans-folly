import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { TextShape } from "../../../shapes/text";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [
          createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label", lineAttached: 0.5 }),
        ],
        getStruct: getCommonStruct,
      }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getShapeStruct: getCommonStruct,
    getStyleScheme: createStyleScheme,
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setCursor: vi.fn(),
    getScale: () => 1,
    hideFloatMenu: vi.fn(),
  };
}

describe("newSingleSelectedByPointerOnState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should move to MovingHub state when the pointer moves or time passes beyond respective threshold", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);

      const result0 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      }) as any;
      expect(result0?.().getLabel(), "moved beyond threshold").toBe("MovingHub");

      target.onEnd?.(ctx as any);
      target.onStart?.(ctx as any);
      const result1 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 2, y: 0 }, scale: 1 },
      }) as any;
      expect(result1, "moved within threshold").toBe(undefined);

      target.onEnd?.(ctx as any);
      target.onStart?.(ctx as any);
      vi.advanceTimersByTime(150);
      const result2 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 2, y: 0 }, scale: 1 },
      }) as any;
      expect(result2?.().getLabel(), "moved within threshold but time passes beyond threshold").toBe("MovingHub");
    });

    test("should move to MovingAnchorOnLine instead of MovingHub state when shift-key held the shape is attached", () => {
      const ctx = getMockCtx();
      ctx.getShapeComposite = () =>
        newShapeComposite({
          shapes: [
            createShape(getCommonStruct, "line", { id: "line" }),
            createShape<RectangleShape>(getCommonStruct, "rectangle", {
              id: "a",
              attachment: {
                id: "line",
                to: { x: 0.2, y: 0 },
                anchor: { x: 0.5, y: 0.5 },
                rotation: 0,
                rotationType: "relative",
              },
            }),
          ],
          getStruct: getCommonStruct,
        });
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);

      const result0 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      }) as any;
      expect(result0?.().getLabel(), "moved beyond threshold").toBe("MovingHub");

      const result1 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1, shift: true },
      }) as any;
      expect(result1?.().getLabel(), "moved beyond threshold").toBe("MovingAnchorOnLine");
    });
  });

  describe("handle pointerup", () => {
    test("should move to SelectionHub state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      });
      expect(result).toBe(ctx.states.newSelectionHubState);
    });

    test("should move to TextEditing state when concurrent option is set true", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState({ concurrent: true });
      const result0 = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      }) as any;
      expect(result0, "timeout").toEqual(ctx.states.newSelectionHubState);

      target.onStart?.(ctx as any);
      const result1 = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      }) as any;
      expect(result1.toString(), "in time").contains("newTextEditingState");
    });
  });

  describe("handle selection", () => {
    test("should move to SelectionHub state", () => {
      const ctx = getMockCtx();
      const target = newSingleSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
