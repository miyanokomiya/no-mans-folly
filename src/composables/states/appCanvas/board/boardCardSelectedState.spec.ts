import { describe, test, expect } from "vitest";
import { newBoardCardSelectedState } from "./boardCardSelectedState";
import { createInitialAppCanvasStateContext } from "../../../../contexts/AppCanvasContext";
import { generateUuid } from "../../../../utils/random";
import { createStyleScheme } from "../../../../models/factories";
import { newShapeComposite } from "../../../shapeComposite";
import { createShape, getCommonStruct } from "../../../../shapes";
import { BoardCardShape } from "../../../../shapes/board/boardCard";
import { newSingleSelectedState } from "../singleSelectedState";

describe("newBoardCardSelectedState", () => {
  function getCtx() {
    return createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: generateUuid,
      getStyleScheme: () => createStyleScheme(),
    });
  }

  const board0 = createShape(getCommonStruct, "board_root", {
    id: "board0",
  });
  const column0 = createShape(getCommonStruct, "board_column", {
    id: "column0",
  });
  const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
    id: "card0",
    parentId: board0.id,
    columnId: column0.id,
  });

  describe("onStart", () => {
    test("should translate to SingleSelectedState when the target card has invalid parent", () => {
      const ctx = getCtx();
      const shapeComposite = newShapeComposite({
        shapes: [column0, card0],
        getStruct: getCommonStruct,
      });
      ctx.getShapeComposite = () => shapeComposite;
      ctx.getLastSelectedShapeId = () => card0.id;
      const target = newBoardCardSelectedState();
      const result = target.onStart?.(ctx);
      expect(result).toEqual(newSingleSelectedState);
    });

    test("should translate to SingleSelectedState when the target card has invalid column", () => {
      const ctx = getCtx();
      const shapeComposite = newShapeComposite({
        shapes: [board0, card0],
        getStruct: getCommonStruct,
      });
      ctx.getShapeComposite = () => shapeComposite;
      ctx.getLastSelectedShapeId = () => card0.id;
      const target = newBoardCardSelectedState();
      const result = target.onStart?.(ctx);
      expect(result).toEqual(newSingleSelectedState);
    });

    test("should stay the state when the target card has valid parent and column", () => {
      const ctx = getCtx();
      const shapeComposite = newShapeComposite({
        shapes: [board0, column0, card0],
        getStruct: getCommonStruct,
      });
      ctx.getShapeComposite = () => shapeComposite;
      ctx.getLastSelectedShapeId = () => card0.id;
      const target = newBoardCardSelectedState();
      const result = target.onStart?.(ctx);
      expect(result).toEqual(undefined);
    });
  });
});
