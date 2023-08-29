import { expect, test, describe, vi } from "vitest";
import { newSingleSelectedState } from "./singleSelectedState";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";

function getMockCtx() {
  return {
    getSelectedShapeIdMap: vi.fn().mockReturnValue({}),
    getShapeMap: vi.fn().mockReturnValue({
      a: createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 }),
    }),
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
      const ctx = getMockCtx();
      const event = { type: "state", data: { name: "DroppingNewShape", options: {} } } as const;
      expect(handleStateEvent(ctx, event, [])).toBe(undefined);
      expect((handleStateEvent(ctx, event, ["DroppingNewShape"]) as any)?.().getLabel()).toEqual("DroppingNewShape");
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
