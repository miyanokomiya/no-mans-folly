import { expect, describe, test } from "vitest";
import { newValueStore } from "./values";

describe("newValueStore", () => {
  test("should set/get value", () => {
    let count = 0;
    const onWatch = () => count++;
    const target = newValueStore(1);
    target.watch(onWatch);
    target.setValue(2);
    expect(target.getValue()).toEqual(2);
    expect(count).toEqual(1);
    target.setValue(10);
    expect(target.getValue()).toEqual(10);
    expect(count).toEqual(2);
  });
});
