import { expect, test, describe, vi } from "vitest";
import { newRectangleSelectingState } from "./rectangleSelectingState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newShapeComposite } from "../../shapeComposite";
import { TreeRootShape } from "../../../shapes/tree/treeRoot";
import { TreeNodeShape } from "../../../shapes/tree/treeNode";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";

function getMockCtx() {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
    }),
    setCommandExams: vi.fn(),
    startDragging: vi.fn(),
    stopDragging: vi.fn(),
    clearAllSelected: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    getLastSelectedShapeId: vi.fn().mockReturnValue("a"),
    redraw: vi.fn(),
    setCursor: vi.fn(),
    getShapeStruct: getCommonStruct,
    setTmpShapeMap: vi.fn(),
    multiSelectShapes: vi.fn(),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [
          createShape<RectangleShape>(getCommonStruct, "rectangle", {
            id: "a",
            p: { x: 0, y: 0 },
            width: 50,
            height: 50,
          }),
          createShape<RectangleShape>(getCommonStruct, "rectangle", {
            id: "b",
            p: { x: 40, y: 40 },
            width: 50,
            height: 50,
          }),
          createShape<RectangleShape>(getCommonStruct, "rectangle", {
            id: "c",
            p: { x: 100, y: 100 },
            width: 50,
            height: 50,
          }),
          createShape<TreeRootShape>(getCommonStruct, "tree_root", {
            id: "tree_root",
            p: { x: -100, y: 0 },
            width: 50,
            height: 50,
          }),
          createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
            id: "tree_node0",
            parentId: "tree_root",
            p: { x: -100, y: 100 },
            width: 50,
            height: 50,
          }),
          createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
            id: "tree_node1",
            parentId: "tree_root",
            p: { x: -100, y: 200 },
            width: 50,
            height: 50,
          }),
        ],
        getStruct: getCommonStruct,
      }),
  };
}

describe("newRectangleSelectingState", () => {
  describe("pointermove", () => {
    test("should not create scope when the first selected shape has no parent", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap.mockReturnValue({});
      ctx.getLastSelectedShapeId.mockReturnValue(undefined);
      const target = newRectangleSelectingState();
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: -10 }, startAbs: { x: -200, y: -10 }, current: { x: 10, y: 80 }, scale: 1 },
      });
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: -10 }, startAbs: { x: -200, y: -10 }, current: { x: 10, y: 280 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_root"], false);
    });

    test("should create scope when the first selected shape has a parent", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap.mockReturnValue({});
      ctx.getLastSelectedShapeId.mockReturnValue(undefined);
      const target = newRectangleSelectingState();
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 280 }, startAbs: { x: -200, y: 280 }, current: { x: 10, y: 180 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_node1"], false);

      ctx.multiSelectShapes.mockReset();
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 280 }, startAbs: { x: -200, y: 280 }, current: { x: 10, y: 80 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_node0", "tree_node1"], false);

      ctx.multiSelectShapes.mockReset();
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 280 }, startAbs: { x: -200, y: 280 }, current: { x: 10, y: -10 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes, "should pick parent scope when whole family are inside").toHaveBeenCalledWith(
        ["tree_root"],
        false,
      );
    });

    test("should keep current selection scope when keepSelection is true", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap.mockReturnValue({ tree_node0: true });
      ctx.getLastSelectedShapeId.mockReturnValue("tree_node0");
      const target = newRectangleSelectingState({ keepSelection: true });
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 10 }, startAbs: { x: -200, y: 10 }, current: { x: 10, y: 80 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).not.toHaveBeenCalled();

      ctx.multiSelectShapes.mockReset();
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 10 }, startAbs: { x: -200, y: 10 }, current: { x: 10, y: 180 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_node0"], true);

      ctx.multiSelectShapes.mockReset();
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: -10 }, startAbs: { x: -200, y: -10 }, current: { x: 10, y: 280 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes, "should respect initial scope").toHaveBeenCalledWith(
        ["tree_node0", "tree_node1"],
        true,
      );
    });

    test("should prioritize the parent scope when the parent is covered by the range", () => {
      const ctx = getMockCtx();
      ctx.getSelectedShapeIdMap.mockReturnValue({});
      ctx.getLastSelectedShapeId.mockReturnValue(undefined);
      const target = newRectangleSelectingState();
      target.onStart?.(ctx as any);

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 210 }, startAbs: { x: -200, y: 210 }, current: { x: 10, y: 80 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_node0"], false);

      ctx.multiSelectShapes.mockReset();
      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -200, y: 210 }, startAbs: { x: -200, y: 210 }, current: { x: 10, y: -10 }, scale: 1 },
      });
      target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["tree_root"], false);
    });
  });

  describe("handle pointermove pointerup", () => {
    test("should clear current selection and select shapes in the rectangle", () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState();
      target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).toHaveBeenCalled();

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, startAbs: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], false);
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });

    test("should keep current selection and select shapes in the rectangle when keepSelection is true", () => {
      const ctx = getMockCtx();
      const target = newRectangleSelectingState({ keepSelection: true });
      target.onStart?.(ctx as any);
      expect(ctx.clearAllSelected).not.toHaveBeenCalled();

      target.handleEvent(ctx as any, {
        type: "pointermove",
        data: { start: { x: -10, y: -10 }, startAbs: { x: -10, y: -10 }, current: { x: 60, y: 60 }, scale: 1 },
      });
      const result = target.handleEvent(ctx as any, { type: "pointerup" } as any);
      expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"], true);
      expect(result).toEqual(ctx.states.newSelectionHubState);
    });
  });
});
