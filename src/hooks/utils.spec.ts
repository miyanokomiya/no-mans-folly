import { expect, describe, test, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useEffectOnce, useIncrementalKeyMemo } from "./utils";

describe("useEffectOnce", () => {
  beforeEach(() => {
    cleanup();
  });

  test("should trigger the effect once until retuned function is called", () => {
    let count = 0;
    const rendered = renderHook(() =>
      useEffectOnce(() => {
        count++;
      }),
    );
    expect(count).toBe(1);
    rendered.rerender();
    expect(count).toBe(1);
    act(() => {
      rendered.result.current();
    });
    rendered.rerender();
    expect(count).toBe(2);
    rendered.rerender();
    expect(count).toBe(2);
  });
});

describe("useIncrementalKeyMemo", () => {
  beforeEach(() => {
    cleanup();
  });

  test("should return the same key until the dependencies change", () => {
    const deps = [0, 1];
    const rendered = renderHook(() => useIncrementalKeyMemo("label", deps));
    expect(rendered.result.current).toBe("label-1");
    rendered.rerender();
    expect(rendered.result.current).toBe("label-1");
    deps[0] = 10;
    rendered.rerender();
    expect(rendered.result.current).toBe("label-2");
    rendered.rerender();
    expect(rendered.result.current).toBe("label-2");
  });
});
