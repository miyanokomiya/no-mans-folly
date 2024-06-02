import { describe, test, expect } from "vitest";
import { inheritElbowExtraDistance } from "./elbowLineHandler";
import { struct } from "../shapes/line";

describe("inheritElbowExtraDistance", () => {
  test("should return next doby as it is when there's no body in the source line shape", () => {
    const lineShape = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 100, y: 100 },
    });
    const res = inheritElbowExtraDistance(lineShape, [
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ]);
    expect(res[0].p).toEqualPoint({ x: 50, y: 0 });
    expect(res[1].p).toEqualPoint({ x: 50, y: 100 });
  });

  test("should apply elbow extra distance: 2 body vertices", () => {
    const lineShape = struct.create({
      p: { x: 0, y: 0 },
      body: [
        { p: { x: 0, y: 0 }, elbow: { d: 5, p: { x: 50, y: 50 } } },
        { p: { x: 0, y: 0 }, elbow: { d: 5, p: { x: 50, y: 50 } } },
      ],
      q: { x: 100, y: 100 },
    });
    const res = inheritElbowExtraDistance(lineShape, [
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ]);
    expect(res[0].p).toEqualPoint({ x: 55, y: 0 });
    expect(res[1].p).toEqualPoint({ x: 55, y: 100 });
    expect(res[0].elbow?.d).toBe(5);
    expect(res[1].elbow).toBe(undefined);
  });

  test("should apply elbow extra distance: 3 body vertices", () => {
    const lineShape = struct.create({
      p: { x: 0, y: 0 },
      body: [
        { p: { x: 0, y: 0 }, elbow: { d: 5, p: { x: 50, y: 75 } } },
        { p: { x: 0, y: 0 }, elbow: { d: 10, p: { x: 75, y: 150 } } },
        { p: { x: 0, y: 0 }, elbow: { d: 15, p: { x: 50, y: 50 } } },
      ],
      q: { x: 100, y: 100 },
    });
    const res = inheritElbowExtraDistance(lineShape, [
      { x: 50, y: 0 },
      { x: 50, y: 150 },
      { x: 100, y: 150 },
    ]);
    expect(res[0].p).toEqualPoint({ x: 55, y: 0 });
    expect(res[1].p).toEqualPoint({ x: 55, y: 160 });
    expect(res[2].p).toEqualPoint({ x: 100, y: 160 });
    expect(res[0].elbow).toEqual({ d: 5, p: { x: 50, y: 0 } });
    expect(res[1].elbow).toEqual({ d: 10, p: { x: 50, y: 150 } });
    expect(res[2].elbow).toBe(undefined);
  });
});
