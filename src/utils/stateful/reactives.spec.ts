import { expect, describe, test } from "vitest";
import { newCallback } from "./reactives";

describe("newCallback", () => {
  test("should return functions to bind and to dispatch", () => {
    const ret = newCallback();
    let count = 0;
    const unbind = ret.bind(() => count++);
    ret.dispatch();
    expect(count).toBe(1);
    ret.dispatch();
    expect(count).toBe(2);
    unbind();
    ret.dispatch();
    expect(count).toBe(2);
  });
});
