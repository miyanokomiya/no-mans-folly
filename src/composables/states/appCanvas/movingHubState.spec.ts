import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { createStyleScheme } from "../../../models/factories";
import { TextShape } from "../../../shapes/text";
import { newShapeComposite } from "../../shapeComposite";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { newMovingHubState } from "./movingHubState";

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
          createShape<TextShape>(getCommonStruct, "text", { id: "label2", parentId: "unknow", lineAttached: 0.5 }),
          createShape(getCommonStruct, "rectangle", { id: "locked0", locked: true }),
          createShape(getCommonStruct, "rectangle", { id: "locked1", locked: true }),
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
    multiSelectShapes: vi.fn(),
  };
}

describe("newMovingHubState", () => {
  test("should move to SelectionHub state if no shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({});
    const result = newMovingHubState().onStart?.(ctx as any);
    expect((result as any)().getLabel()).toEqual("SelectionHub");
  });

  test("should move to MultipleSelected state if multiple shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, label: true });
    const result = newMovingHubState().onStart?.(ctx as any);
    expect((result as any)().getLabel()).toEqual("MovingShape");
  });

  test("should move to MovingLineLabel state if a line label is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ label: true });
    const result = newMovingHubState().onStart?.(ctx as any);
    expect((result as any)().getLabel()).toEqual("MovingLineLabel");
  });

  test("should not move to MovingLineLabel state if selected line label has invalid parent", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ label2: true });
    const result = newMovingHubState().onStart?.(ctx as any);
    expect((result as any)().getLabel()).toEqual("MovingShape");
  });

  test("should unselect and ignore locked shapes: unlocked shape exists", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, locked0: true, locked1: true });
    const result = newMovingHubState().onStart?.(ctx as any);
    expect(ctx.multiSelectShapes).toHaveBeenCalledWith(["a"]);
    expect((result as any)().getLabel()).toEqual("MovingShape");
  });

  test("should unselect and ignore locked shapes: unlocked shape doesn't exist", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ locked0: true, locked1: true });
    const result = newMovingHubState().onStart?.(ctx as any);
    expect(ctx.multiSelectShapes).not.toHaveBeenCalled();
    expect((result as any)().getLabel()).toEqual("SelectionHub");
  });
});
