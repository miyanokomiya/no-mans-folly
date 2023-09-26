import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { newSelectionHubState } from "./selectionHubState";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({}),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
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

  test("should move to MultipleSelected state if no shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newSingleSelectedState);
  });

  test("should move to MultipleSelected state if no shape is selected", () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    const result = newSelectionHubState().onStart?.(ctx as any);
    expect(result).toEqual(newMultipleSelectedState);
  });
});