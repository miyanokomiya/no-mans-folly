import { expect, describe, test, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useEffectOnce } from "./utils";

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
