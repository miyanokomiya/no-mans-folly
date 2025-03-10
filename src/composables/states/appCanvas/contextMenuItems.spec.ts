import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newShapeComposite } from "../../shapeComposite";
import {
  CONTEXT_MENU_ITEM_SRC,
  createFrameForShapes,
  getMenuItemsForSelectedShapes,
  groupShapes,
  handleContextItemEvent,
  isSameContextItem,
  ungroupShapes,
} from "./contextMenuItems";
import { RectPolygonShape } from "../../../shapes/rectPolygon";

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
          createShape(getCommonStruct, "rectangle", { id: "unlocked", locked: false }),
          createShape(getCommonStruct, "rectangle", { id: "locked", locked: true }),
        ],
        getStruct: getCommonStruct,
      }),
    getDocumentMap: () => ({ a: [{ insert: "text" }] }),
    addShapes: vi.fn(),
    deleteShapes: vi.fn(),
    multiSelectShapes: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    selectShape: vi.fn(),
    generateUuid: () => "duplicated",
    createLastIndex: () => "aa",
    getScale: () => 2,
  };
}

describe("getMenuItemsForSelectedShapes", () => {
  test("should differentiate lock items based on locked status of shapes", () => {
    const ctx = getMockCtx();

    ctx.getSelectedShapeIdMap.mockReturnValue({});
    expect(getMenuItemsForSelectedShapes(ctx)).toEqual([]);

    ctx.getSelectedShapeIdMap.mockReturnValue({ locked: true });
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.UNLOCK))).toBe(
      true,
    );
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.LOCK))).toBe(
      false,
    );

    ctx.getSelectedShapeIdMap.mockReturnValue({ unlocked: true });
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.UNLOCK))).toBe(
      false,
    );
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.LOCK))).toBe(true);

    ctx.getSelectedShapeIdMap.mockReturnValue({ locked: true, unlocked: true });
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.UNLOCK))).toBe(
      true,
    );
    expect(getMenuItemsForSelectedShapes(ctx).some((a) => isSameContextItem(a, CONTEXT_MENU_ITEM_SRC.LOCK))).toBe(true);
  });
});

describe("isSameContextItem", () => {
  test("should return true when two items are same ones", () => {
    expect(isSameContextItem(CONTEXT_MENU_ITEM_SRC.LOCK, CONTEXT_MENU_ITEM_SRC.LOCK)).toBe(true);
    expect(isSameContextItem(CONTEXT_MENU_ITEM_SRC.LOCK, CONTEXT_MENU_ITEM_SRC.UNLOCK)).toBe(false);
    expect(isSameContextItem(CONTEXT_MENU_ITEM_SRC.LOCK, { separator: true })).toBe(false);
    expect(isSameContextItem({ separator: true }, { separator: true })).toBe(true);
  });
});

describe("handleContextItemEvent", () => {
  describe("DELETE_SHAPE", () => {
    test("should call deleteShapes to delete selected shapes", () => {
      const ctx = getMockCtx();

      handleContextItemEvent(ctx, {
        type: "contextmenu-item",
        data: { key: CONTEXT_MENU_ITEM_SRC.DELETE_SHAPE.key },
      });
      expect(ctx.deleteShapes).toHaveBeenNthCalledWith(1, ["a"]);
    });
  });

  describe("DUPLICATE_SHAPE", () => {
    test("should call addShapes and multiSelectShapes to duplicate selected shapes", () => {
      const ctx = getMockCtx();

      handleContextItemEvent(ctx, {
        type: "contextmenu-item",
        data: { key: CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE.key },
      });
      const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "duplicated",
        findex: "ab",
        width: 50,
        height: 50,
        p: { x: 40, y: 40 },
      });
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [rect], { [rect.id]: [{ insert: "text" }] }, undefined);
      expect(ctx.multiSelectShapes).toHaveBeenNthCalledWith(1, [rect.id]);
    });
  });
});

describe("groupShapes", () => {
  test("should group shapes", () => {
    const ctx = getMockCtx();
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "rectangle", { id: "a" }),
          createShape(getCommonStruct, "rectangle", { id: "b" }),
        ],
        getStruct: getCommonStruct,
      });

    const res0 = groupShapes(ctx);
    expect(res0).toBe(false);
    expect(ctx.addShapes).not.toHaveBeenCalled();
    expect(ctx.selectShape).not.toHaveBeenCalled();

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    ctx.generateUuid = () => "group";
    const res1 = groupShapes(ctx);
    expect(res1).toBe(true);
    expect(ctx.addShapes).toHaveBeenCalledWith([createShape(getCommonStruct, "group", { id: "group" })], undefined, {
      a: { parentId: "group" },
      b: { parentId: "group" },
    });
    expect(ctx.selectShape).toHaveBeenCalledWith("group");
  });

  test("should not make a group when a frame shape exists in the targets", () => {
    const ctx = getMockCtx();
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "rectangle", { id: "a" }),
          createShape(getCommonStruct, "rectangle", { id: "b" }),
          createShape(getCommonStruct, "frame", { id: "frame" }),
        ],
        getStruct: getCommonStruct,
      });

    const res0 = groupShapes(ctx);
    expect(res0).toBe(false);
    expect(ctx.addShapes).not.toHaveBeenCalled();
    expect(ctx.selectShape).not.toHaveBeenCalled();

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true, frame: true });
    ctx.generateUuid = () => "group";
    const res1 = groupShapes(ctx);
    expect(res1).toBe(false);
  });
});

describe("ungroupShapes", () => {
  test("should ungroup shapes", () => {
    const ctx = getMockCtx();
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "group", { id: "group" }),
          createShape(getCommonStruct, "rectangle", { id: "a", parentId: "group" }),
          createShape(getCommonStruct, "rectangle", { id: "b", parentId: "group" }),
        ],
        getStruct: getCommonStruct,
      });

    const res0 = ungroupShapes(ctx);
    expect(res0).toBe(false);
    expect(ctx.deleteShapes).not.toHaveBeenCalled();
    expect(ctx.multiSelectShapes).not.toHaveBeenCalled();

    ctx.getSelectedShapeIdMap.mockReturnValue({ group: true });
    const res1 = ungroupShapes(ctx);
    expect(res1).toBe(true);
    expect(ctx.deleteShapes).toHaveBeenCalledWith(["group"], {
      a: { parentId: undefined },
      b: { parentId: undefined },
    });
    expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a", "b"]);
  });
});

describe("createFrameForShapes", () => {
  test("should create a frame accommodating shapes", () => {
    const ctx = getMockCtx();
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape<RectPolygonShape>(getCommonStruct, "rectangle", {
            id: "a",
            p: { x: 0, y: 0 },
            width: 30,
            height: 30,
          }),
          createShape<RectPolygonShape>(getCommonStruct, "rectangle", {
            id: "b",
            p: { x: 100, y: 0 },
            width: 30,
            height: 30,
          }),
        ],
        getStruct: getCommonStruct,
      });

    const res0 = createFrameForShapes(ctx, 10);
    expect(res0).toBe(false);
    expect(ctx.addShapes).not.toHaveBeenCalled();
    expect(ctx.selectShape).not.toHaveBeenCalled();

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    ctx.generateUuid = () => "frame";
    const res1 = createFrameForShapes(ctx, 10);
    expect(res1).toBe(true);
    expect(ctx.addShapes).toHaveBeenCalledWith([
      createShape<RectPolygonShape>(getCommonStruct, "frame", {
        id: "frame",
        p: { x: -10.5, y: -10.5 },
        width: 151,
        height: 51,
      }),
    ]);
    expect(ctx.selectShape).toHaveBeenCalledWith("frame");
  });
});
