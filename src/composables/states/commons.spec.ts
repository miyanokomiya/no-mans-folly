import { describe, test, expect, vi } from "vitest";
import { handleCommonWheel } from "./commons";
import { UserSetting } from "../../models";

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
