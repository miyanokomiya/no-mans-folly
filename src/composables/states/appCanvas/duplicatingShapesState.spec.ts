import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newShapeComposite } from "../../shapeComposite";

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
          createShape(getCommonStruct, "group", { id: "group" }),
          createShape<RectangleShape>(getCommonStruct, "rectangle", {
            id: "child",
            parentId: "group",
            width: 10,
            height: 10,
          }),
          createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
        ],
        getStruct: getCommonStruct,
      }),
    getDocumentMap: () => ({ a: [{ insert: "text" }] }),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    redraw: vi.fn(),
    addShapes: vi.fn(),
    multiSelectShapes: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true, group: true, child: true }),
    generateUuid: () => "duplicated",
    createLastIndex: () => "aa",
  };
}

describe("newDuplicatingShapesState", () => {
  describe("lifecycle", () => {
    test("should setup and clean the state", () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);
      expect(ctx.startDragging).toHaveBeenCalled();
      target.onEnd?.(ctx as any);
      expect(ctx.stopDragging).toHaveBeenCalled();
    });
  });

  describe("handle pointermove", () => {
    test("should call redraw", () => {
      const ctx = getMockCtx();
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);
      const result = target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 10, y: 0 }, scale: 1 },
      });
      expect(ctx.redraw).toHaveBeenNthCalledWith(1);
      expect(result).toBe(undefined);
    });
  });

  describe("handle pointerup", () => {
    test("should call addShapes and multiSelectShapes", () => {
      const ctx = getMockCtx();
      let count = 0;
      ctx.generateUuid = () => {
        count++;
        return count.toString();
      };
      const target = newDuplicatingShapesState();
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: 0, y: 0 }, startAbs: { x: 0, y: 0 }, current: { x: 200, y: 0 }, scale: 1, ctrl: true },
      });
      const result2 = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      const group = createShape(getCommonStruct, "group", { id: "1", findex: "ab" });
      const child = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "2",
        parentId: "1",
        findex: "ac",
        width: 10,
        height: 10,
        p: { x: 190, y: -10 },
      });
      const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "3",
        findex: "ad",
        width: 50,
        height: 50,
        p: { x: 190, y: -10 },
      });
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [group, child, rect], {
        [(group.id, child.id, rect.id)]: [{ insert: "text" }],
      });
      expect(ctx.multiSelectShapes).toHaveBeenNthCalledWith(1, [group.id, child.id, rect.id]);
      expect(result2).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
