import { expect, describe, test, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useLocalStorageAdopter } from "./localStorage";
import { vi } from "vitest";

describe("useLocalStorageAdopter", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should work like usual state and save state to localStorage periodically", async () => {
    const option = {
      key: "a",
      version: "1",
      initialValue: 1,
      duration: 10,
    };
    const rendered = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered.result.current[0]).toBe(1);
    act(() => {
      rendered.result.current[1](2);
    });
    act(() => {
      rendered.result.current[1](3);
    });
    expect(rendered.result.current[0]).toBe(3);

    vi.advanceTimersByTime(6);
    const rendered1 = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered1.result.current[0]).toBe(1);

    vi.advanceTimersByTime(6);
    const rendered2 = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered2.result.current[0]).toBe(3);
  });

  test("should generate initial value by the received function", async () => {
    let count = 0;
    const option = {
      key: "a",
      version: "1",
      initialValue: () => {
        count++;
        return 1;
      },
      duration: 10,
    };
    const rendered = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered.result.current[0]).toBe(1);
    expect(count).toBe(1);
    act(() => {
      rendered.result.current[1](2);
    });
    vi.advanceTimersByTime(15);
    expect(rendered.result.current[0]).toBe(2);
    expect(count).toBe(1);
  });
});
