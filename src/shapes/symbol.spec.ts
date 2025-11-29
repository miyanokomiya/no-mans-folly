import { struct } from "./symbol";

import { describe, test, expect } from "vitest";

describe("immigrateShapeIds", () => {
  test("should immigrate src", () => {
    const shape = struct.create({ src: ["a", "b"] });
    expect(struct.immigrateShapeIds!(shape, { b: "bb" }, false)).toEqual({ src: ["a", "bb"] });
    expect(struct.immigrateShapeIds!(shape, { b: "bb" }, true)).toEqual({ src: ["bb"] });
  });
});

describe("refreshRelation", () => {
  test("should refresh src", () => {
    const shape = struct.create({ src: ["a", "b"] });
    expect(struct.refreshRelation!(shape, new Set())).toEqual({ src: [] });
    expect(struct.refreshRelation!(shape, new Set("a"))).toEqual({ src: ["a"] });
  });
});
