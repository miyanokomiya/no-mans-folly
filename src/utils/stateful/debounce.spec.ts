import { describe, test, expect } from "vitest";
import { newDebounce } from "./debounce";
import { sleep } from "../../testUtils";

describe("newDebounce", () => {
  test("should debounce the operation", async () => {
    let count = 0;
    const target = newDebounce((v: number) => {
      count += v;
    }, 10);

    target(1);
    expect(count).toBe(0);
    await sleep(12);
    expect(count).toBe(1);

    target(1);
    await sleep(5);
    target(10);
    await sleep(5);
    target(100);
    expect(count).toBe(1);
    await sleep(12);
    expect(count).toBe(101);

    target(100);
    target.flush();
    expect(count).toBe(201);

    target(100);
    target.clear();
    target.flush();
    expect(count).toBe(201);
  });
});
