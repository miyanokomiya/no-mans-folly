import { expect, describe, test } from "vitest";
import { resolvePolarValues } from "./compoundRadial";

const TAU = Math.PI * 2;

describe("resolvePolarValues", () => {
  test("should return [] when items is empty", () => {
    expect(resolvePolarValues({ items: [], type: 1 })).toEqual([]);
  });

  test("should return [] when all items have negative values", () => {
    expect(resolvePolarValues({ items: [{ value: -1 }, { value: -2 }], type: 1 })).toEqual([]);
  });

  describe("type 2 (proportional)", () => {
    test("should distribute equal weights evenly across TAU", () => {
      const result = resolvePolarValues({ items: [{ value: 1 }, { value: 1 }], type: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].v).toBeCloseTo(TAU / 2);
      expect(result[1].v).toBeCloseTo(TAU);
    });

    test("should distribute unequal weights proportionally", () => {
      const result = resolvePolarValues({ items: [{ value: 1 }, { value: 2 }], type: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].v).toBeCloseTo(TAU / 3);
      expect(result[1].v).toBeCloseTo(TAU);
    });

    test("should propagate scale and labeled fields", () => {
      const result = resolvePolarValues({
        items: [
          { value: 1, scale: 2, labeled: true },
          { value: 1 },
        ],
        type: 2,
      });
      expect(result[0]).toMatchObject({ scale: 2, labeled: true });
      expect(result[1]).toMatchObject({ scale: 1, labeled: undefined });
    });
  });

  describe("default type (repeating/absolute)", () => {
    test("should repeat a single item until TAU is exhausted", () => {
      const result = resolvePolarValues({ items: [{ value: TAU / 4 }], type: 1 });
      expect(result).toHaveLength(4);
      expect(result[0].v).toBeCloseTo(TAU / 4);
      expect(result[1].v).toBeCloseTo(TAU / 2);
      expect(result[2].v).toBeCloseTo((3 * TAU) / 4);
      expect(result[3].v).toBeCloseTo(TAU);
    });

    test("should cycle through multiple items until TAU is exhausted", () => {
      const result = resolvePolarValues({ items: [{ value: TAU / 4 }, { value: TAU / 2 }], type: 1 });
      expect(result).toHaveLength(3);
      expect(result[0].v).toBeCloseTo(TAU / 4);
      expect(result[1].v).toBeCloseTo((3 * TAU) / 4);
      expect(result[2].v).toBeCloseTo(TAU);
    });

    test("should include the value at exactly TAU and stop", () => {
      const result = resolvePolarValues({ items: [{ value: TAU }], type: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].v).toBeCloseTo(TAU);
    });

    test("should propagate scale and labeled fields", () => {
      const result = resolvePolarValues({
        items: [
          { value: TAU / 2, scale: 3, labeled: true },
          { value: TAU / 2 },
        ],
        type: 1,
      });
      expect(result[0]).toMatchObject({ scale: 3, labeled: true });
      expect(result[1]).toMatchObject({ scale: 1, labeled: undefined });
    });
  });
});
