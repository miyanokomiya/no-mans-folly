import { describe, test, expect } from "vitest";
import { getDiagonalCrossPath, struct } from "./diagonalCross";
import { IVec2, getInner, sub } from "okageo";

describe("getDiagonalCrossPath", () => {
  function expectCross(path: IVec2[]) {
    expect(path).toHaveLength(12);

    expect(getInner(sub(path[0], path[1]), sub(path[2], path[1]))).toBeCloseTo(0);
    expect(getInner(sub(path[0], path[1]), sub(path[5], path[1]))).toBeCloseTo(0);
    expect(getInner(sub(path[0], path[1]), sub(path[6], path[1]))).toBeCloseTo(0);

    expect(getInner(sub(path[6], path[7]), sub(path[8], path[7]))).toBeCloseTo(0);
    expect(getInner(sub(path[6], path[7]), sub(path[11], path[7]))).toBeCloseTo(0);
    expect(getInner(sub(path[6], path[7]), sub(path[0], path[7]))).toBeCloseTo(0);

    expect(getInner(sub(path[2], path[3]), sub(path[4], path[3]))).toBeCloseTo(0);
    expect(getInner(sub(path[11], path[3]), sub(path[4], path[3]))).toBeCloseTo(0);
    expect(getInner(sub(path[10], path[3]), sub(path[4], path[3]))).toBeCloseTo(0);

    expect(getInner(sub(path[5], path[4]), sub(path[3], path[4]))).toBeCloseTo(0);
    expect(getInner(sub(path[8], path[4]), sub(path[3], path[4]))).toBeCloseTo(0);
    expect(getInner(sub(path[9], path[4]), sub(path[3], path[4]))).toBeCloseTo(0);
  }

  test("should return diagonal cross path", () => {
    expectCross(getDiagonalCrossPath(struct.create({ width: 40, height: 30, crossSize: 5 })).path);
    expectCross(getDiagonalCrossPath(struct.create({ width: 30, height: 50, crossSize: 5 })).path);
  });

  test("should not stick out the bounds even if the bounds isn't big enough to the cross size", () => {
    const path0 = getDiagonalCrossPath(struct.create({ width: 40, height: 30, crossSize: 18 })).path;
    expect(path0[11].x).toBeCloseTo(0);
    expect(path0[5].x).toBeCloseTo(40);
    expect(path0[2].y).not.toBeCloseTo(0);
    expect(path0[8].y).not.toBeCloseTo(30);

    const path1 = getDiagonalCrossPath(struct.create({ width: 30, height: 40, crossSize: 18 })).path;
    expect(path1[11].x).not.toBeCloseTo(0);
    expect(path1[5].x).not.toBeCloseTo(30);
    expect(path1[2].y).toBeCloseTo(0);
    expect(path1[8].y).toBeCloseTo(40);

    const path2 = getDiagonalCrossPath(struct.create({ width: 40, height: 30, crossSize: 40 })).path;
    expect(path2[11].x).toBeCloseTo(0);
    expect(path2[5].x).toBeCloseTo(40);
    expect(path2[2].y).toBeCloseTo(0);
    expect(path2[8].y).toBeCloseTo(30);
  });
});
