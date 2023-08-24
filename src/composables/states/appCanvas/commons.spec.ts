import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { translateOnSelection } from "./commons";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({}),
  };
}

describe("translateOnSelection", () => {
  test("should move to Default state if no shape is selected", async () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({});
    const result = translateOnSelection(ctx);
    expect(result).toEqual(newDefaultState);
  });

  test("should move to MultipleSelected state if no shape is selected", async () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true });
    const result = translateOnSelection(ctx);
    expect(result).toEqual(newSingleSelectedState);
  });

  test("should move to MultipleSelected state if no shape is selected", async () => {
    const ctx = getMockCtx();
    ctx.getSelectedShapeIdMap.mockReturnValue({ a: true, b: true });
    const result = translateOnSelection(ctx);
    expect(result).toEqual(newMultipleSelectedState);
  });
});
