import { expect, test, describe, vi } from "vitest";
import { getCommonAcceptableEvents, handleCommonWheel, handleHistoryEvent, handleStateEvent } from "./commons";
import { createShape, getCommonStruct } from "../../../shapes";
import { RectangleShape } from "../../../shapes/rectangle";
import { UserSetting } from "../../../models";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";

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

describe("handleCommonWheel", () => {
  function getCtx() {
    return {
      zoomView: vi.fn().mockReturnValue(3),
      scrollView: vi.fn(),
      getScale: () => 2,
      getUserSetting: () => ({}),
    };
  }

  test("should proc zooming by default", () => {
    const ctx = getCtx();
    expect(handleCommonWheel(ctx, { type: "wheel", data: { delta: { x: 1, y: 2 }, options: { button: 1 } } })).toBe(3);
    expect(ctx.zoomView).toHaveBeenCalledWith(2);
    expect(ctx.scrollView).not.toHaveBeenCalled();
  });

  test("should proc scrolling when the user setting is set fot it and ctrl key isn't held", () => {
    const ctx1 = {
      ...getCtx(),
      getUserSetting: () => ({ wheelAction: "pan" }) as UserSetting,
    };
    expect(handleCommonWheel(ctx1, { type: "wheel", data: { delta: { x: 1, y: 2 }, options: { button: 1 } } })).toBe(2);
    expect(ctx1.zoomView).not.toHaveBeenCalled();
    expect(ctx1.scrollView).toHaveBeenCalledWith({ x: 1, y: 2 });

    // Swap scroll directions when shift key is held
    expect(
      handleCommonWheel(ctx1, { type: "wheel", data: { delta: { x: 1, y: 2 }, options: { button: 1, shift: true } } }),
    ).toBe(2);
    expect(ctx1.scrollView).toHaveBeenCalledWith({ x: 2, y: 1 });

    const ctx2 = {
      ...getCtx(),
      getUserSetting: () => ({ wheelAction: "pan" }) as UserSetting,
    };
    expect(
      handleCommonWheel(ctx2, { type: "wheel", data: { delta: { x: 1, y: 2 }, options: { button: 1, ctrl: true } } }),
    ).toBe(3);
    expect(ctx2.zoomView).toHaveBeenCalledWith(2);
    expect(ctx2.scrollView).not.toHaveBeenCalled();
  });
});
