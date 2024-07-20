import { describe, test, expect } from "vitest";
import { normalizeEntityPatchInfo } from "./entities";
import { Entity, EntityPatchInfo } from "../models";

describe("normalizeEntityPatchInfo", () => {
  test("should prioritize 'delete' and merge 'update' to 'add'", () => {
    const src: EntityPatchInfo<Entity> = {
      add: [
        { id: "a", findex: "aa" },
        { id: "b", findex: "bb" },
        { id: "c", findex: "cc" },
      ],
      update: { a: { findex: "az" }, b: { findex: "bz" }, d: { findex: "dd" } },
      delete: ["a", "z"],
    };
    const result = normalizeEntityPatchInfo(src);
    expect(result).toEqual({
      add: [
        { id: "b", findex: "bz" },
        { id: "c", findex: "cc" },
      ],
      update: { d: { findex: "dd" } },
      delete: ["a", "z"],
    });
  });
});
