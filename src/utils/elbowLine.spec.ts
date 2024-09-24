import { expect, describe, test } from "vitest";
import { getConnectionDirection, getOptimalElbowBody } from "./elbowLine";

describe("getOptimalElbowBody", () => {
  describe("2 - 8", () => {
    test("when they have y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 8, y: 20 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 0, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 15 },
        { x: 8, y: 15 },
      ]);
    });

    test("should return empty when they have y margin and the same x value", () => {
      expect(
        getOptimalElbowBody(
          { x: 5, y: 10 },
          { x: 5, y: 20 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 0, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([]);
    });

    test("when they don't have y margin but have x margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 8, y: 10 },
          { x: 22, y: 5 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 20, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 8, y: 20 },
        { x: 15, y: 20 },
        { x: 15, y: -5 },
        { x: 22, y: -5 },
      ]);

      expect(
        getOptimalElbowBody(
          { x: 8, y: 10 },
          { x: -18, y: 5 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: -20, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 8, y: 20 },
        { x: -5, y: 20 },
        { x: -5, y: -5 },
        { x: -18, y: -5 },
      ]);
    });

    test("when they have neigher x nor y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 8, y: 10 },
          { x: 12, y: 5 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 8, y: 25 },
        { x: 25, y: 25 },
        { x: 25, y: -10 },
        { x: 12, y: -10 },
      ]);
    });
  });

  describe("2 - 4", () => {
    test("when they have both x and y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 20, y: 22 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 20, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([{ x: 2, y: 22 }]);
    });

    test("when they have y margin but not x margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 8, y: 10 },
          { x: 5, y: 22 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 8, y: 15 },
        { x: -5, y: 15 },
        { x: -5, y: 22 },
      ]);
    });

    test("when they have x margin but not y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 30, y: 8 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 30, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 20 },
        { x: 20, y: 20 },
        { x: 20, y: 8 },
      ]);
    });

    test("when they have neither x nor y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 8, y: 10 },
          { x: 5, y: 7 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 8, y: 25 },
        { x: -10, y: 25 },
        { x: -10, y: 7 },
      ]);
    });
  });

  describe("2 - 6", () => {
    test("when they have both x and y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: -10, y: 22 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: -20, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([{ x: 2, y: 22 }]);
    });

    test("when they have y margin but not x margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 15, y: 22 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 15 },
        { x: 25, y: 15 },
        { x: 25, y: 22 },
      ]);
    });

    test("when they have x margin but not y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: -10, y: 8 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: -30, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 20 },
        { x: -10, y: 20 },
        { x: -10, y: 8 },
      ]);
    });

    test("when they have neither x nor y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 15, y: 7 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 25 },
        { x: 25, y: 25 },
        { x: 25, y: 7 },
      ]);
    });
  });

  describe("2 - 2", () => {
    test("when they have x margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 25, y: 30 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 20, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 40 },
        { x: 25, y: 40 },
      ]);

      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: -20, y: 30 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: -25, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 40 },
        { x: -20, y: 40 },
      ]);
    });

    test("when they have y margin but not x margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 3, y: 10 },
          { x: 5, y: 30 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 0, y: 20, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 3, y: 15 },
        { x: -10, y: 15 },
        { x: -10, y: 40 },
        { x: 5, y: 40 },
      ]);

      expect(
        getOptimalElbowBody(
          { x: 3, y: 40 },
          { x: 5, y: 10 },
          { x: 0, y: 30, width: 10, height: 10 },
          { x: 2, y: 0, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 3, y: 50 },
        { x: -10, y: 50 },
        { x: -10, y: 20 },
        { x: 5, y: 20 },
      ]);
    });

    test("when they have neither x nor y margin", () => {
      expect(
        getOptimalElbowBody(
          { x: 2, y: 10 },
          { x: 8, y: 15 },
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 10, height: 10 },
        ),
      ).toEqual([
        { x: 2, y: 25 },
        { x: 8, y: 25 },
      ]);
    });
  });

  describe("8 - 8", () => {
    test("rotated version of 2 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 2, y: 0 },
        { x: 25, y: 20 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(2);
      expect(result[0].y).toBeCloseTo(-10);
      expect(result[1].x).toBeCloseTo(25);
      expect(result[1].y).toBeCloseTo(-10);
    });
  });

  describe("4 - 4", () => {
    test("rotated version of 2 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 0, y: 8 },
        { x: 5, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(-10);
      expect(result[0].y).toBeCloseTo(8);
      expect(result[1].x).toBeCloseTo(-10);
      expect(result[1].y).toBeCloseTo(23);
    });
  });

  describe("6 - 6", () => {
    test("rotated version of 2 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 10, y: 8 },
        { x: 15, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(25);
      expect(result[0].y).toBeCloseTo(8);
      expect(result[1].x).toBeCloseTo(25);
      expect(result[1].y).toBeCloseTo(23);
    });
  });

  describe("6 - 4", () => {
    test("should be rotated version of 2 - 8", () => {
      const result = getOptimalElbowBody(
        { x: 10, y: 8 },
        { x: 20, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(15);
      expect(result[0].y).toBeCloseTo(8);
      expect(result[1].x).toBeCloseTo(15);
      expect(result[1].y).toBeCloseTo(23);
    });
  });

  describe("4 - 6", () => {
    test("should be rotated version of 8 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 0, y: 8 },
        { x: 30, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(-10);
      expect(result[0].y).toBeCloseTo(8);
      expect(result[1].x).toBeCloseTo(-10);
      expect(result[1].y).toBeCloseTo(15);
      expect(result[2].x).toBeCloseTo(40);
      expect(result[2].y).toBeCloseTo(15);
      expect(result[3].x).toBeCloseTo(40);
      expect(result[3].y).toBeCloseTo(23);
    });
  });

  describe("8 - 6", () => {
    test("should be rotated version of 2 - 4", () => {
      const result = getOptimalElbowBody(
        { x: 5, y: 0 },
        { x: 30, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(5);
      expect(result[0].y).toBeCloseTo(-10);
      expect(result[1].x).toBeCloseTo(40);
      expect(result[1].y).toBeCloseTo(-10);
      expect(result[2].x).toBeCloseTo(40);
      expect(result[2].y).toBeCloseTo(23);
    });
  });

  describe("6 - 8", () => {
    test("should be rotated version of 4 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 10, y: 3 },
        { x: 24, y: 20 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(24);
      expect(result[0].y).toBeCloseTo(3);
    });
  });

  describe("4 - 8", () => {
    test("should be rotated version of 2 - 4", () => {
      const result = getOptimalElbowBody(
        { x: 0, y: 3 },
        { x: 24, y: 30 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 30, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(-10);
      expect(result[0].y).toBeCloseTo(3);
      expect(result[1].x).toBeCloseTo(-10);
      expect(result[1].y).toBeCloseTo(20);
      expect(result[2].x).toBeCloseTo(24);
      expect(result[2].y).toBeCloseTo(20);
    });
  });

  describe("8 - 4", () => {
    test("should be rotated version of 4 - 2", () => {
      const result = getOptimalElbowBody(
        { x: 3, y: 0 },
        { x: 20, y: 23 },
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      );
      expect(result[0].x).toBeCloseTo(3);
      expect(result[0].y).toBeCloseTo(-10);
      expect(result[1].x).toBeCloseTo(15);
      expect(result[1].y).toBeCloseTo(-10);
      expect(result[2].x).toBeCloseTo(15);
      expect(result[2].y).toBeCloseTo(23);
    });
  });
});

describe("getConnectionDirection", () => {
  test("should return appropriate direction", () => {
    const bounds = { x: 0, y: 0, width: 10, height: 20 };
    expect(getConnectionDirection({ x: 9, y: 9 }, bounds)).toBe(6);
    expect(getConnectionDirection({ x: 9, y: 20 }, bounds)).toBe(2);
    expect(getConnectionDirection({ x: 1, y: 20 }, bounds)).toBe(2);
    expect(getConnectionDirection({ x: 1, y: 18 }, bounds)).toBe(4);
    expect(getConnectionDirection({ x: 1, y: 3 }, bounds)).toBe(4);
    expect(getConnectionDirection({ x: 1, y: 1 }, bounds)).toBe(8);
    expect(getConnectionDirection({ x: 9, y: 0.4 }, bounds)).toBe(8);
    expect(getConnectionDirection({ x: 9, y: 3 }, bounds)).toBe(6);
  });
});
