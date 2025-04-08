import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newShapeComposite } from "../../shapeComposite";
import {
  CONTEXT_MENU_ITEM_SRC,
  createAlignBox,
  createFrameForShapes,
  getMenuItemsForSelectedShapes,
  getPatchByDissolveShapes,
  groupShapes,
  handleContextItemEvent,
  isSameContextItem,
  ungroupShapes,
} from "./contextMenuItems";
import { RectPolygonShape } from "../../../shapes/rectPolygon";
import { generateNKeysBetween } from "../../../utils/findex";
import { AlignBoxShape } from "../../../shapes/align/alignBox";

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
    updateShapes: vi.fn(),
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
    const findexList = generateNKeysBetween(undefined, undefined, 2);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "rectangle", { id: "a" }),
          createShape(getCommonStruct, "rectangle", { id: "b" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
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
    expect(ctx.addShapes).toHaveBeenCalledWith(
      [createShape(getCommonStruct, "group", { id: "group", findex: "a2" })],
      undefined,
      {
        a: { parentId: "group" },
        b: { parentId: "group" },
      },
    );
    expect(ctx.selectShape).toHaveBeenCalledWith("group");
  });

  test("should not make a group when a frame shape exists in the targets", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 3);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "rectangle", { id: "a" }),
          createShape(getCommonStruct, "rectangle", { id: "b" }),
          createShape(getCommonStruct, "frame", { id: "frame" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
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

  test("should group shapes within a group", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 4);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "group", { id: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "a", parentId: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "b", parentId: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "c", parentId: "root_group" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
        getStruct: getCommonStruct,
      });

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    ctx.generateUuid = () => "new_group";
    const res1 = groupShapes(ctx);
    expect(res1).toBe(true);
    expect(ctx.addShapes).toHaveBeenCalledWith(
      [createShape(getCommonStruct, "group", { id: "new_group", parentId: "root_group", findex: "a2V" })],
      undefined,
      {
        a: { parentId: "new_group" },
        b: { parentId: "new_group" },
      },
    );
    expect(ctx.selectShape).toHaveBeenCalledWith("new_group");
  });
});

describe("ungroupShapes", () => {
  test("should ungroup shapes", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 3);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "group", { id: "group" }),
          createShape(getCommonStruct, "rectangle", { id: "a", parentId: "group" }),
          createShape(getCommonStruct, "rectangle", { id: "b", parentId: "group" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
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
      a: { parentId: undefined, findex: "a0V" },
      b: { parentId: undefined, findex: "a0k" },
    });
    expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a", "b"]);
  });

  test("should ungroup child agroup within a group", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 5);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "group", { id: "parent_group" }),
          createShape(getCommonStruct, "rectangle", { id: "a", parentId: "parent_group" }),
          createShape(getCommonStruct, "group", { id: "child_group", parentId: "parent_group" }),
          createShape(getCommonStruct, "rectangle", { id: "b", parentId: "child_group" }),
          createShape(getCommonStruct, "rectangle", { id: "c", parentId: "child_group" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
        getStruct: getCommonStruct,
      });

    ctx.getSelectedShapeIdMap.mockReturnValue({ child_group: true });
    const res1 = ungroupShapes(ctx);
    expect(res1).toBe(true);
    expect(ctx.deleteShapes).toHaveBeenCalledWith(["child_group"], {
      b: { parentId: "parent_group", findex: "a2V" },
      c: { parentId: "parent_group", findex: "a2k" },
    });
    expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["b", "c"]);
  });
});

describe("getPatchByDissolveShapes", () => {
  test("should return patch by dissolving shapes", () => {
    const findexList = generateNKeysBetween(undefined, undefined, 3);
    const group = createShape(getCommonStruct, "group", { id: "group" });
    const sc = newShapeComposite({
      shapes: [
        group,
        createShape(getCommonStruct, "rectangle", { id: "a", parentId: "group" }),
        createShape(getCommonStruct, "rectangle", { id: "b", parentId: "group" }),
      ].map((s, i) => ({ ...s, findex: findexList[i] })),
      getStruct: getCommonStruct,
    });

    const res0 = getPatchByDissolveShapes(sc, [group]);
    expect(res0).toEqual({
      a: {
        findex: "a0V",
        parentId: undefined,
      },
      b: {
        findex: "a0k",
        parentId: undefined,
      },
    });
    expect(res0.a).toHaveProperty("parentId");
    expect(res0.b).toHaveProperty("parentId");
  });
});

describe("createAlignBox", () => {
  test("should create align box shape as a parent of shapes", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 2);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "rectangle", { id: "a" }),
          createShape(getCommonStruct, "rectangle", { id: "b" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
        getStruct: getCommonStruct,
      });

    const res0 = createAlignBox(ctx);
    expect(res0).toBe(false);
    expect(ctx.addShapes).not.toHaveBeenCalled();
    expect(ctx.selectShape).not.toHaveBeenCalled();

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    ctx.generateUuid = () => "align";
    const res1 = createAlignBox(ctx);
    expect(res1).toBe(true);
    expect(ctx.updateShapes).toHaveBeenCalledWith({
      add: [
        createShape<AlignBoxShape>(getCommonStruct, "align_box", {
          id: "align",
          findex: "a2",
          baseWidth: undefined,
          baseHeight: undefined,
        }),
      ],
      update: {
        a: { parentId: "align" },
        b: { parentId: "align" },
      },
    });
    expect(ctx.selectShape).toHaveBeenCalledWith("align");
  });

  test("should create align box shape as a parent of shapes within a group", () => {
    const ctx = getMockCtx();
    const findexList = generateNKeysBetween(undefined, undefined, 4);
    ctx.getShapeComposite = () =>
      newShapeComposite({
        shapes: [
          createShape(getCommonStruct, "group", { id: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "a", parentId: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "b", parentId: "root_group" }),
          createShape(getCommonStruct, "rectangle", { id: "c", parentId: "root_group" }),
        ].map((s, i) => ({ ...s, findex: findexList[i] })),
        getStruct: getCommonStruct,
      });

    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    ctx.generateUuid = () => "new_align";
    const res1 = createAlignBox(ctx);
    expect(res1).toBe(true);
    expect(ctx.updateShapes).toHaveBeenCalledWith({
      add: [
        createShape<AlignBoxShape>(getCommonStruct, "align_box", {
          id: "new_align",
          parentId: "root_group",
          findex: "a2V",
          baseWidth: undefined,
          baseHeight: undefined,
        }),
      ],
      update: {
        a: { parentId: "new_align" },
        b: { parentId: "new_align" },
      },
    });
    expect(ctx.selectShape).toHaveBeenCalledWith("new_align");
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
