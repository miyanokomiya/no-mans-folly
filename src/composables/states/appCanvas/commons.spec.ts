import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";

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

describe("handleStateEvent", () => {
  describe("DroppingNewShape", () => {
    test("should move to DroppingNewShape state", async () => {
      const event = { type: "state", data: { name: "DroppingNewShape", options: {} } } as const;
      expect(handleStateEvent(event, [])).toBe(undefined);
      expect(handleStateEvent(event, ["DroppingNewShape"])?.().getLabel()).toEqual("DroppingNewShape");
    });
  });
});

describe("handleHistoryEvent", () => {
  describe("DroppingNewShape", () => {
    test("should move to DroppingNewShape state", async () => {
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