import { expect, describe, test } from "vitest";
import { resolveGridValues } from "./compoundGrid";

describe("resolveGridValues", () => {
  test("should return [] when items is empty", () => {
    expect(resolveGridValues({ items: [], type: 1 }, 100)).toEqual([]);
  });

  test("should return [] when all items have negative values", () => {
    expect(resolveGridValues({ items: [{ value: -1 }, { value: -2 }], type: 1 }, 100)).toEqual([]);
  });

  describe("type 2 (proportional)", () => {
    test("should distribute equal weights evenly across bound", () => {
      const result = resolveGridValues({ items: [{ value: 1 }, { value: 1 }], type: 2 }, 100);
      expect(result).toHaveLength(2);
      expect(result[0].v).toBeCloseTo(50);
      expect(result[1].v).toBeCloseTo(100);
    });

    test("should distribute unequal weights proportionally", () => {
      const result = resolveGridValues({ items: [{ value: 1 }, { value: 3 }], type: 2 }, 100);
      expect(result).toHaveLength(2);
      expect(result[0].v).toBeCloseTo(25);
      expect(result[1].v).toBeCloseTo(100);
    });

    test("should propagate scale and labeled fields", () => {
      const result = resolveGridValues(
        {
          items: [{ value: 1, scale: 2, labeled: true }, { value: 1 }],
          type: 2,
        },
        100,
      );
      expect(result[0]).toMatchObject({ scale: 2, labeled: true });
      expect(result[1]).toMatchObject({ scale: 1, labeled: undefined });
    });
  });

  describe("default type (repeating/absolute)", () => {
    test("should repeat a single item until bound is exhausted", () => {
      const result = resolveGridValues({ items: [{ value: 25 }], type: 1 }, 100);
      expect(result).toHaveLength(4);
      expect(result[0].v).toBeCloseTo(25);
      expect(result[1].v).toBeCloseTo(50);
      expect(result[2].v).toBeCloseTo(75);
      expect(result[3].v).toBeCloseTo(100);
    });

    test("should cycle through multiple items until bound is exhausted", () => {
      const result = resolveGridValues({ items: [{ value: 25 }, { value: 50 }], type: 1 }, 100);
      expect(result).toHaveLength(3);
      expect(result[0].v).toBeCloseTo(25);
      expect(result[1].v).toBeCloseTo(75);
      expect(result[2].v).toBeCloseTo(100);
    });

    test("should include the value at exactly bound and stop", () => {
      const result = resolveGridValues({ items: [{ value: 100 }], type: 1 }, 100);
      expect(result).toHaveLength(1);
      expect(result[0].v).toBeCloseTo(100);
    });

    test("should propagate scale and labeled fields", () => {
      const result = resolveGridValues(
        {
          items: [{ value: 50, scale: 3, labeled: true }, { value: 50 }],
          type: 1,
        },
        100,
      );
      expect(result[0]).toMatchObject({ scale: 3, labeled: true });
      expect(result[1]).toMatchObject({ scale: 1, labeled: undefined });
    });
  });
});
