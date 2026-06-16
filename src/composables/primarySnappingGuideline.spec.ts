import { describe, test, expect } from "vitest";
import { newPrimarySnappingGuidelineHandler } from "./primarySnappingGuideline";
import { SnappingResult } from "./shapeSnapping";

describe("newPrimarySnappingGuidelineHandler", () => {
  test("should store primary guideline info", () => {
    const target = newPrimarySnappingGuidelineHandler();
    const snappingResult: SnappingResult = {
      diff: { x: 4, y: 2 },
      anchorPoints: [],
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
        {
          id: "b",
          line: [
            { x: 0, y: 100 },
            { x: 100, y: 100 },
          ],
        },
        {
          id: "c",
          line: [
            { x: -10, y: 0 },
            { x: -10, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    };

    expect(target.getPrimaryInfo()).toBeUndefined();
    expect(target.getGuidelineRadian()).toBeUndefined();
    expect(target.getDiff({ x: 10, y: 10 }, { x: 5, y: 5 })).toEqualPoint({ x: 5, y: 5 });

    target.update(snappingResult, { x: 20, y: 10 });
    expect(target.getPrimaryInfo(), "should pick the first candidate").toStrictEqual([
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      { x: 0, y: 10 },
    ]);
    expect(target.getGuidelineRadian()).toBeCloseTo(0);
    expect(target.getDiff({ x: 10, y: 20 }, { x: 5, y: 5 }), "src point should stick to y: 10").toEqualPoint({
      x: 5,
      y: -10,
    });

    target.update(snappingResult, { x: 20, y: 10 });
    expect(target.getPrimaryInfo(), "should try to pick other angled guideline once stored").toStrictEqual([
      [
        { x: -10, y: 0 },
        { x: -10, y: 100 },
      ],
      { x: 30, y: 0 },
    ]);
    expect(target.getGuidelineRadian()).toBeCloseTo(Math.PI / 2);
    expect(target.getDiff({ x: 5, y: 10 }, { x: 5, y: 5 }), "src point should stick to x: 20").toEqualPoint({
      x: 15,
      y: 5,
    });

    target.clear();
    expect(target.getPrimaryInfo()).toBeUndefined();
    expect(target.getGuidelineRadian()).toBeUndefined();
    expect(target.getDiff({ x: 10, y: 10 }, { x: 5, y: 5 })).toEqualPoint({ x: 5, y: 5 });
  });
});
