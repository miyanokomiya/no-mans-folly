import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newShapeComposite } from "../../shapeComposite";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "./contextMenuItems";

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
    getDocumentMap: () => ({ a: [{ insert: "text" }] }),
    addShapes: vi.fn(),
    deleteShapes: vi.fn(),
    multiSelectShapes: vi.fn(),
    getSelectedShapeIdMap: vi.fn().mockReturnValue({ a: true }),
    generateUuid: () => "duplicated",
    createLastIndex: () => "aa",
    getScale: () => 2,
  };
}

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
      expect(ctx.addShapes).toHaveBeenNthCalledWith(1, [rect], { [rect.id]: [{ insert: "text" }] });
      expect(ctx.multiSelectShapes).toHaveBeenNthCalledWith(1, [rect.id]);
    });
  });
});
