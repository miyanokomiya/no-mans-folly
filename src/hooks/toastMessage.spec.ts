import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useToastMessages } from "./toastMessage";

describe("useToastMessages", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should push and close items", () => {
    const rendered = renderHook(() => useToastMessages());
    act(() => {
      rendered.result.current.pushToastMessage({ text: "a", type: "error" });
      rendered.result.current.pushToastMessage({ text: "b", type: "error" });
    });
    expect(rendered.result.current.toastMessages).toEqual([
      { text: "a", type: "error" },
      { text: "b", type: "error" },
    ]);
    act(() => {
      rendered.result.current.closeToastMessage("a");
    });
    expect(rendered.result.current.toastMessages).toEqual([{ text: "b", type: "error" }]);
  });

  test("should override same items", () => {
    const rendered = renderHook(() => useToastMessages());
    act(() => {
      rendered.result.current.pushToastMessage({ text: "a", type: "error" });
      rendered.result.current.pushToastMessage({ text: "b", type: "error" });
      rendered.result.current.pushToastMessage({ text: "a", type: "error" });
    });
    expect(rendered.result.current.toastMessages).toEqual([
      { text: "b", type: "error" },
      { text: "a", type: "error" },
    ]);
  });

  test("should close automatically when an item type is info", () => {
    const rendered = renderHook(() => useToastMessages({ timeout: 5 }));
    act(() => {
      rendered.result.current.pushToastMessage({ text: "a", type: "info" });
      rendered.result.current.pushToastMessage({ text: "b", type: "error" });
      rendered.result.current.pushToastMessage({ text: "c", type: "warn" });
      rendered.result.current.pushToastMessage({ text: "d", type: "info" });
    });
    expect(rendered.result.current.toastMessages).toEqual([
      { text: "a", type: "info" },
      { text: "b", type: "error" },
      { text: "c", type: "warn" },
      { text: "d", type: "info" },
    ]);

    vi.advanceTimersByTime(15);
    rendered.rerender();
    expect(rendered.result.current.toastMessages).toEqual([
      { text: "b", type: "error" },
      { text: "c", type: "warn" },
    ]);
  });
});
