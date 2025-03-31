import { describe, expect, test } from "vitest";
import { arcToCubicCurves } from "./arc";

describe("arcToCubicCurves", () => {
  test("should convert arc to cubic beziers", () => {
    const result0 = arcToCubicCurves({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 5, 0, false, false);
    expect(result0).toHaveLength(2);
    expect(result0[0].p).toEqualPoint({ x: 5, y: 5 });
    expect(result0[0].c!.c1).toEqualPoint({ x: 0, y: 2.742918851 });
    expect(result0[0].c!.c2).toEqualPoint({ x: 2.2570811, y: 5 });
    expect(result0[1].p).toEqualPoint({ x: 10, y: 0 });

    const result1 = arcToCubicCurves({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 5, 0, false, true);
    expect(result1[0].p).toEqualPoint({ x: 5, y: -5 });
    expect(result1[0].c!.c1).toEqualPoint({ x: 0, y: -2.74291885177 });

    const result2 = arcToCubicCurves({ x: 0, y: 0 }, { x: 10, y: 0 }, 7, 7, 0, false, false);
    expect(result2[0].p).toEqualPoint({ x: 5, y: 2.101020514 });
    expect(result2[0].c!.c1).toEqualPoint({ x: 1.3160905, y: 1.34322927 });
  });

  test("should convert arc to cubic beziers: practical case 1", () => {
    const result0 = arcToCubicCurves({ x: 275, y: 25 }, { x: 125, y: 175 }, 150, 150, 0, false, false);
    expect(result0).toHaveLength(1);
    expect(result0[0].p).toEqualPoint({ x: 125, y: 175 });
  });

  test("should convert arc to cubic beziers: practical case 2", () => {
    const result0 = arcToCubicCurves({ x: 0, y: 0 }, { x: 50, y: -25 }, 25, 100, -30, false, true);
    expect(result0).toHaveLength(3);
    expect(result0[0].p).toEqualPoint({ x: -29.21427, y: -82.05438 });
    expect(result0[1].p).toEqualPoint({ x: -6.8158682, y: -93.253582 });
  });
});
