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

  test("should regard curved elbow", () => {
    const lineShape = struct.create({
      p: { x: 0, y: 0 },
      body: [
        { p: { x: 0, y: 10 } },
        { p: { x: 0, y: 20 }, elbow: { d: 10, p: { x: 50, y: 50 } } },
        { p: { x: 100, y: 80 } },
        { p: { x: 100, y: 90 } },
      ],
      q: { x: 100, y: 100 },
      curveType: "auto",
    });

    // With curved vertices
    const res0 = inheritElbowExtraDistance(lineShape, [
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ]);
    expect(res0).toHaveLength(2);
    expect(res0[0].p).toEqualPoint({ x: 60, y: 0 });
    expect(res0[1].p).toEqualPoint({ x: 60, y: 100 });
    expect(res0[0].elbow).toEqual({ d: 10, p: { x: 50, y: 0 } });
    expect(res0[1].elbow).toBe(undefined);

    // Without curved vertices
    const res1 = inheritElbowExtraDistance(
      { ...lineShape, body: [{ p: { x: 0, y: 20 }, elbow: { d: 10, p: { x: 50, y: 50 } } }, { p: { x: 100, y: 80 } }] },
      [
        { x: 50, y: 0 },
        { x: 50, y: 100 },
      ],
    );
    expect(res1, "should return the same result regardless of whether the line has curved vertices").toEqual(res0);
  });
});
