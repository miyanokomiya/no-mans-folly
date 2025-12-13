import { expect, test, describe, vi } from "vitest";
import { newMovingShapeState } from "./movingShapeState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { TextShape } from "../../../shapes/text";
import { newShapeComposite } from "../../shapeComposite";
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
          createShape(getCommonStruct, "line", { id: "line" }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label", parentId: "line", lineAttached: 0.5 }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label2", parentId: "line", lineAttached: 0.5 }),
        ],
        getStruct: getCommonStruct,
      }),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    setTmpShapeMap: vi.fn(),
    getTmpShapeMap: vi.fn(),
    patchShapes: vi.fn(),
  };
}

describe("newMovingShapeState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
      expect(ctx.setTmpShapeMap).toHaveBeenCalledWith({});
    });
  });

  describe("handle pointermove", () => {
    test("should call setTmpShapeMap with moved shapes", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(result).toBe(undefined);
    });

    test("should not move line labels even when they are selected", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap = vi.fn().mockReturnValue({ a: true, label: true, label2: true });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(result).toBe(undefined);
    });

    test("should clear line attachment when exists and attaching target isn't moving", () => {
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
                to: { x: 0.5, y: 0 },
                anchor: { x: 0.5, y: 0.5 },
                rotationType: "relative",
                rotation: 0,
              },
            }),
            createShape(getCommonStruct, "line", {
              id: "line",
            }),
          ],
          getStruct: getCommonStruct,
        });
      let tmpMap: any = {};
      ctx.setTmpShapeMap.mockImplementation((v) => {
        tmpMap = v;
      });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(tmpMap["a"]).toHaveProperty("attachment");
    });

    test("should not clear line attachment when attaching target is moving together", () => {
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
                to: { x: 0.5, y: 0 },
                anchor: { x: 0.5, y: 0.5 },
                rotationType: "relative",
                rotation: 0,
              },
            }),
            createShape(getCommonStruct, "line", {
              id: "line",
            }),
          ],
          getStruct: getCommonStruct,
        });
      ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, line: true });
      let tmpMap: any = {};
      ctx.setTmpShapeMap.mockImplementation((v) => {
        tmpMap = v;
      });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(tmpMap["a"]).not.toHaveProperty("attachment");
    });

    test("should not clear shape attachment when exists and attaching target isn't moving", () => {
      const ctx = getMockCtx();
      ctx.getShapeComposite = () =>
        newShapeComposite({
          shapes: [
            createShape<RectangleShape>(getCommonStruct, "rectangle", {
              id: "a",
              width: 50,
              height: 50,
              attachment: {
                id: "b",
                to: { x: 0.5, y: 0 },
                anchor: { x: 0.5, y: 0.5 },
                rotationType: "relative",
                rotation: 0,
              },
            }),
            createShape(getCommonStruct, "rectangle", {
              id: "b",
            }),
          ],
          getStruct: getCommonStruct,
        });
      let tmpMap: any = {};
      ctx.setTmpShapeMap.mockImplementation((v) => {
        tmpMap = v;
      });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, { a: { p: { x: 10, y: 0 } } });
      expect(tmpMap["a"]).not.toHaveProperty("attachment");
    });

    test("should move shapes on selected frame shapes if shift isn't passed in the option", () => {
      const ctx = getMockCtx();
      ctx.getShapeComposite = () =>
        newShapeComposite({
          shapes: [
            createShape<RectangleShape>(getCommonStruct, "rectangle", {
              id: "a",
              width: 50,
              height: 50,
              p: { x: 20, y: 20 },
            }),
            createShape<RectangleShape>(getCommonStruct, "rectangle", {
              id: "b",
              width: 50,
              height: 50,
              p: { x: 80, y: 80 },
            }),
            createShape<FrameShape>(getCommonStruct, "frame", { id: "frame", width: 100, height: 100 }),
          ],
          getStruct: getCommonStruct,
        });
      ctx.getSelectedShapeIdMap.mockReturnValue({ frame: true });
      ctx.getLastSelectedShapeId.mockReturnValue("frame");

      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {
        a: { p: expect.anything() },
        frame: { p: expect.anything() },
      });

      ctx.setTmpShapeMap.mockReset();
      const target2 = newMovingShapeState({ shift: true });
      target2.onStart?.(ctx as any);
      target2.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.setTmpShapeMap).toHaveBeenNthCalledWith(1, {
        frame: { p: expect.anything() },
      });
    });
  });

  describe("handle pointerup", () => {
    test("should call patchShapes with moved shapes", () => {
      const ctx = getMockCtx();
      ctx.getTmpShapeMap.mockReturnValue({ a: { value: 1 } });
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.patchShapes).toHaveBeenNthCalledWith(1, { a: { value: 1 } });
      expect((result as any)?.().getLabel()).toEqual("SelectionHub");
    });
  });

  describe("handle selection", () => {
    test("should move to next state", () => {
      const ctx = getMockCtx();
      const target = newMovingShapeState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "selection",
      });
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
