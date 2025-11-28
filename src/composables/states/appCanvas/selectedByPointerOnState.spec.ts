import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { newSelectedByPointerOnState } from "./selectedByPointerOnState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { TextShape } from "../../../shapes/text";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { FrameShape } from "../../../shapes/frame";

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
          createShape<FrameShape>(getCommonStruct, "frame", {
            id: "frame",
            p: { x: 100, y: 100 },
            width: 50,
            height: 50,
          }),
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
    selectShape: vi.fn(),
  };
}

describe("newSelectedByPointerOnState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should move to MovingHub state when the pointer moves or time passes beyond respective threshold", () => {
      const ctx = getMockCtx();
      const target = newSelectedByPointerOnState();
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
      const target = newSelectedByPointerOnState();
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

    test("should deselect the frame and move to RectangleSelecting state when a newly selected frame is about to move", () => {
      const ctx = getMockCtx();
      ctx.getLastSelectedShapeId.mockReturnValue("frame");
      ctx.getSelectedShapeIdMap.mockReturnValue({ frame: true });
      const target = newSelectedByPointerOnState();
      target.onStart?.(ctx as any);

      const result0 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 110, y: 110 }, current: { x: 120, y: 120 }, scale: 1 },
      }) as any;
      expect(ctx.selectShape).toHaveBeenCalledWith("frame", true);
      expect(result0?.().getLabel(), "moved beyond threshold").toBe("RectangleSelecting");
    });

    test("should move to MovingHub state when the already selected frame is about to move", () => {
      const ctx = getMockCtx();
      ctx.getLastSelectedShapeId.mockReturnValue("frame");
      ctx.getSelectedShapeIdMap.mockReturnValue({ frame: true });
      const target = newSelectedByPointerOnState({ concurrent: true });
      target.onStart?.(ctx as any);

      const result0 = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 110, y: 110 }, current: { x: 120, y: 120 }, scale: 1 },
      }) as any;
      expect(ctx.selectShape).not.toHaveBeenCalled();
      expect(result0?.().getLabel(), "moved beyond threshold").toBe("MovingHub");
    });
  });

  describe("handle pointerup", () => {
    test("should move to SelectionHub state", () => {
      const ctx = getMockCtx();
      const target = newSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointerup",
        data: { point: { x: 0, y: 0 }, options: { button: 0 } },
      });
      expect(result).toBe(ctx.states.newSelectionHubState);
    });

    test("should move to TextEditing state when concurrent option is set true", () => {
      const ctx = getMockCtx();
      const target = newSelectedByPointerOnState({ concurrent: true });
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
      const target = newSelectedByPointerOnState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
