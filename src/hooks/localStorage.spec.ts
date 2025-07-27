import { expect, describe, test, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useLocalStorageAdopter } from "./localStorage";
import { sleep } from "../testUtils";

describe("useLocalStorageAdopter", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
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

    await sleep(6);
    const rendered1 = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered1.result.current[0]).toBe(1);

    await sleep(6);
    const rendered2 = renderHook(() => useLocalStorageAdopter(option));
    expect(rendered2.result.current[0]).toBe(3);
  });
});
