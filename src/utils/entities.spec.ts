import { describe, test, expect } from "vitest";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo, patchByPartialProperties } from "./entities";
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

describe("mergeEntityPatchInfo", () => {
  test("should prioritize 'add' of 'src'", () => {
    expect(
      mergeEntityPatchInfo(
        {
          add: [
            { id: "a", findex: "aa" },
            { id: "b", findex: "bb" },
          ],
        },
        {
          add: [
            { id: "b", findex: "zz" },
            { id: "c", findex: "cc" },
          ],
        },
      ),
    ).toEqual({
      add: [
        { id: "a", findex: "aa" },
        { id: "b", findex: "zz" },
        { id: "c", findex: "cc" },
      ],
    });
  });

  test("should merge 'update'", () => {
    expect(
      mergeEntityPatchInfo<any>(
        {
          update: {
            a: { id: "a", findex: "aa" },
            b: { id: "b", findex: "bb", val0: 0 },
          },
        },
        {
          update: {
            b: { id: "b", findex: "bb", val1: 1 },
            c: { id: "c", findex: "cc" },
          },
        },
      ),
    ).toEqual({
      update: {
        a: { id: "a", findex: "aa" },
        b: { id: "b", findex: "bb", val0: 0, val1: 1 },
        c: { id: "c", findex: "cc" },
      },
    });
  });

  test("should merge 'delete'", () => {
    expect(mergeEntityPatchInfo({ delete: ["a", "b"] }, { delete: ["b", "c"] })).toEqual({
      delete: ["a", "b", "c"],
    });
  });
});

describe("patchByPartialProperties", () => {
  test("should return patch for pertial properties", () => {
    const src = { id: "a", findex: "aa", val: { x: 1, y: 2 } };
    expect(patchByPartialProperties(src, { findex: "bb" })).toEqual({ findex: "bb" });
    expect(patchByPartialProperties(src, { findex: "bb", val: { x: 10 } })).toEqual({
      findex: "bb",
      val: { x: 10, y: 2 },
    });
    expect(patchByPartialProperties(src, { findex: "bb", val: {} })).toEqual({
      findex: "bb",
    });
    expect(patchByPartialProperties(src, { findex: "bb", val: { x: undefined } })).toEqual({
      findex: "bb",
      val: { x: undefined, y: 2 },
    });
  });
});
