import { expect, test, describe } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";
import { newPanToShapeState } from "./panToShapeState";

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
  };
}

describe("newPanToShapeState", () => {
  describe("onStart", () => {
    test("should break when no id is provided", () => {
      const ctx = getMockCtx();
      const target = newPanToShapeState({ ids: [] });
      const res = target.onStart?.(ctx) as any;
      expect(res).toBe(undefined);
    });

    test("should move to AutoPanning state when ids are provided", () => {
      const ctx = getMockCtx();
      const target = newPanToShapeState({ ids: ["a"] });
      const res = target.onStart?.(ctx) as any;
      expect(res.toString()).contains("newAutoPanningState");
    });
  });
});
