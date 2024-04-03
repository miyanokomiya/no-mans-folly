import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newSelectionHubState } from "./selectionHubState";
import { newShapeComposite } from "../../shapeComposite";
import { TextShape } from "../../../shapes/text";
import { newLineLabelSelectedState } from "./lines/lineLabelSelectedState";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({}),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [
          createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
          createShape(getCommonStruct, "line", { id: "line" }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label", parentId: "line", lineAttached: 0.5 }),
          createShape<TextShape>(getCommonStruct, "text", { id: "label2", parentId: "unknow", lineAttached: 0.5 }),
        ],
        getStruct: getCommonStruct,
      }),
  };
}

describe("newSelectionHubState", () => {
  test("should move to Default state if no shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({});
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newDefaultState);
  });

  test("should move to MultipleSelected state if a shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newSingleSelectedState);
  });

  test("should move to MultipleSelected state if multiple shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newMultipleSelectedState);
  });

  test("should move to LineLabelSelected state if selected line label has invalid parent", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ label: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newLineLabelSelectedState);
  });

  test("should not move to LineLabelSelected state if selected line label has invalid parent", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ label2: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newSingleSelectedState);
  });
});
