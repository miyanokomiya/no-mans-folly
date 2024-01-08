import { expect, describe, test } from "vitest";
import { struct, getHeadControlPoint, getTailControlPoint } from "./oneSidedArrow";

describe("getHeadControlPoint", () => {
  test("should return abstruct head control point", () => {
    const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, headControl: { x: 0.2, y: 0.3 } });
    expect(getHeadControlPoint(shape)).toEqual({ x: 1160, y: 2035 });
  });
});

describe("getTailControlPoint", () => {
  test("should return abstruct tail control point", () => {
    const shape0 = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, tailControl: { x: 0.2, y: 0.4 } });
    expect(getTailControlPoint(shape0)).toEqual({ x: 1000, y: 2040 });

    const shape1 = struct.create({
      width: 100,
      height: 200,
      headControl: { x: 0.5, y: 0.8 },
      tailControl: { x: 0, y: 0.5 },
    });
    expect(getTailControlPoint(shape1)).toEqual({ x: 0, y: 60 });
  });
});
