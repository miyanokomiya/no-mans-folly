import { expect, test, describe, vi } from "vitest";
import {
  getCommonAcceptableEvents,
  getSnappableCandidates,
  handleHistoryEvent,
  handleStateEvent,
  selectShapesInRange,
} from "./commons";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
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
    getSelectedShapeIdMap: vi.fn().mockReturnValue({}),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
  };
}

describe("getCommonAcceptableEvents", () => {
  test("should return common acceptable events without excluded ones", () => {
    expect(getCommonAcceptableEvents([])).contains("Break");
    expect(getCommonAcceptableEvents(["Break"])).not.contains("Break");
  });
});

describe("handleStateEvent", () => {
  describe("DroppingNewShape", () => {
    test("should move to DroppingNewShape state", () => {
      const ctx = getMockCtx();
      const event = { type: "state", data: { name: "DroppingNewShape", options: {} } } as const;
      expect(handleStateEvent(ctx, event, [])).toBe(undefined);
      expect((handleStateEvent(ctx, event, ["DroppingNewShape"]) as any)?.().getLabel()).toEqual("DroppingNewShape");
    });
  });
});

describe("handleHistoryEvent", () => {
  describe("DroppingNewShape", () => {
    test("should move to DroppingNewShape state", () => {
      const ctx = {
        undo: vi.fn(),
        redo: vi.fn(),
      };
      expect(handleHistoryEvent(ctx, { type: "history", data: "undo" })).toBe(undefined);
      expect(ctx.undo).toHaveBeenCalled();
      expect(handleHistoryEvent(ctx, { type: "history", data: "redo" })).toBe(undefined);
      expect(ctx.redo).toHaveBeenCalled();
    });
  });
});

describe("selectShapesInRange", () => {
  function getCtx() {
    return {
      getLastSelectedShapeId: vi.fn(),
      multiSelectShapes: vi.fn(),
      getShapeComposite: () =>
        newShapeComposite({
          shapes: [
            createShape(getCommonStruct, "group", { id: "group" }),
            createShape(getCommonStruct, "rectangle", { id: "child0", parentId: "group" }),
            createShape(getCommonStruct, "rectangle", { id: "child1", parentId: "group" }),
            createShape(getCommonStruct, "rectangle", { id: "child2", parentId: "group" }),
            createShape(getCommonStruct, "rectangle", { id: "root1" }),
            createShape(getCommonStruct, "rectangle", { id: "root2" }),
          ],
          getStruct: getCommonStruct,
        }),
    };
  }

  test("should select shapes in the range and set the target shape the latest", () => {
    const ctx0 = getCtx();
    ctx0.getLastSelectedShapeId.mockReturnValue("child0");
    selectShapesInRange(ctx0, "child2");
    expect(ctx0.multiSelectShapes).toHaveBeenCalledWith(["child0", "child1", "child2"], true);

    const ctx1 = getCtx();
    ctx1.getLastSelectedShapeId.mockReturnValue("child2");
    selectShapesInRange(ctx1, "child0");
    expect(ctx1.multiSelectShapes).toHaveBeenCalledWith(["child1", "child2", "child0"], true);
  });

  test("should select shapes in the range: for root shapes", () => {
    const ctx0 = getCtx();
    ctx0.getLastSelectedShapeId.mockReturnValue("group");
    selectShapesInRange(ctx0, "root2");
    expect(ctx0.multiSelectShapes).toHaveBeenCalledWith(["group", "root1", "root2"], true);
  });

  test("should not change selection when target shape isn't in the same scope of selected shapes", () => {
    const ctx0 = getCtx();
    ctx0.getLastSelectedShapeId.mockReturnValue("child0");
    selectShapesInRange(ctx0, "root2");
    expect(ctx0.multiSelectShapes).not.toHaveBeenCalled();
  });

  test("should select the target when no shape is selected", () => {
    const ctx0 = getCtx();
    ctx0.getLastSelectedShapeId.mockReturnValue(undefined);
    selectShapesInRange(ctx0, "child2");
    expect(ctx0.multiSelectShapes).toHaveBeenCalledWith(["child2"], true);
  });
});

describe("getSnappableCandidates", () => {
  const shapeComposite = newShapeComposite({
    shapes: [
      createShape(getCommonStruct, "rectangle", { id: "rect" }),
      createShape(getCommonStruct, "line", { id: "line" }),
    ],
    getStruct: getCommonStruct,
  });
  const viewRect = { x: 0, y: 0, width: 200, height: 200 };

  test("should ignore shapes outside the viewport", () => {
    expect(
      getSnappableCandidates(
        {
          getShapeComposite: () => shapeComposite,
          getViewRect: () => ({ x: 0, y: 5, width: 200, height: 200 }),
          getUserSetting: () => ({}),
        },
        [],
      ),
    ).toEqual([shapeComposite.shapes[0]]);
  });

  test("should ignore lines when the setting is set on", () => {
    expect(
      getSnappableCandidates(
        {
          getShapeComposite: () => shapeComposite,
          getViewRect: () => viewRect,
          getUserSetting: () => ({}),
        },
        [],
      ),
    ).toEqual(shapeComposite.shapes);
    expect(
      getSnappableCandidates(
        {
          getShapeComposite: () => shapeComposite,
          getViewRect: () => viewRect,
          getUserSetting: () => ({ snapIgnoreLine: "on" }),
        },
        [],
      ),
    ).toEqual([shapeComposite.shapes[0]]);
  });
});
