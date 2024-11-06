import { describe, test, expect } from "vitest";
import {
  mergeEntityPatchInfo,
  normalizeEntityPatchInfo,
  patchByPartialProperties,
  shouldEntityOrderUpdate,
  shouldEntityTreeUpdate,
} from "./entities";
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

describe("shouldEntityOrderUpdate", () => {
  test("should return true shen the order would change", () => {
    type Tmp = Entity & { val: number };
    expect(shouldEntityOrderUpdate<Tmp>({})).toBe(false);
    expect(shouldEntityOrderUpdate<Tmp>({ add: [{ id: "a", findex: "aa", val: 1 }] })).toBe(true);
    expect(shouldEntityOrderUpdate<Tmp>({ update: { a: { val: 1 } } })).toBe(false);
    expect(shouldEntityOrderUpdate<Tmp>({ update: { a: { findex: "aa" } } })).toBe(true);
    expect(shouldEntityOrderUpdate<Tmp>({ delete: ["a"] })).toBe(false);
  });
});

describe("shouldEntityTreeUpdate", () => {
  test("should return true shen the tree structure would change", () => {
    type Tmp = Entity & { val: number };
    expect(shouldEntityTreeUpdate<Tmp>({}, () => true)).toBe(false);
    expect(shouldEntityTreeUpdate<Tmp>({ add: [{ id: "a", findex: "aa", val: 1 }] }, () => false)).toBe(true);
    expect(shouldEntityTreeUpdate<Tmp>({ update: { a: { val: 1 } } }, () => false)).toBe(false);
    expect(shouldEntityTreeUpdate<Tmp>({ update: { a: { val: 1 } } }, () => true)).toBe(true);
    expect(shouldEntityTreeUpdate<Tmp>({ update: { a: { val: 1, findex: "aa" } } }, () => false)).toBe(true);
    expect(shouldEntityTreeUpdate<Tmp>({ delete: ["a"] }, () => false)).toBe(true);
  });
});
