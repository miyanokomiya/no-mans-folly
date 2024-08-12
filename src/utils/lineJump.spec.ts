import { describe, test, expect } from "vitest";
import { getLineIntersectionMap, makeJumps } from "./lineJump";
import { struct } from "../shapes/line";
import { ISegment } from "./geometry";

describe("getLineIntersectionMap", () => {
  test("should return line jump map", () => {
    const l0 = struct.create({ id: "l0", p: { x: 0, y: 0 }, body: [{ p: { x: 10, y: 0 } }], q: { x: 10, y: 10 } });
    const l1 = struct.create({ id: "l1", p: { x: 5, y: -5 }, q: { x: 5, y: 5 }, jump: true });
    const l2 = struct.create({ id: "l2", p: { x: 5, y: 3 }, q: { x: 15, y: 3 }, jump: true });
    const l3 = struct.create({ id: "l3", p: { x: 5, y: 3 }, q: { x: 15, y: 3 }, jump: false });
    expect(getLineIntersectionMap([l0, l1, l2, l3])).toEqual(
      new Map([
        [
          "l1",
          {
            segments: [{ points: [[{ x: 5, y: 0 }, 2]] }],
          },
        ],
        [
          "l2",
          {
            segments: [
              {
                points: [
                  [{ x: 10, y: 3 }, 2],
                  [{ x: 5, y: 3 }, 2],
                ],
              },
            ],
          },
        ],
      ]),
    );
  });

  test("should insert undefined when the segment has no intersection", () => {
    const l0 = struct.create({ id: "l0", p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const l1 = struct.create({
      id: "l1",
      p: { x: 5, y: -5 },
      body: [{ p: { x: 5, y: 5 } }],
      q: { x: 0, y: 5 },
      jump: true,
    });
    expect(getLineIntersectionMap([l0, l1])).toEqual(
      new Map([
        [
          "l1",
          {
            segments: [{ points: [[{ x: 5, y: 0 }, 2]] }, undefined],
          },
        ],
      ]),
    );
  });

  test("should ignore curves", () => {
    const l0 = struct.create({ id: "l0", p: { x: 0, y: 0 }, q: { x: 10, y: 0 }, curves: [{ d: { x: 0, y: 5 } }] });
    const l1 = struct.create({ id: "l1", p: { x: 5, y: -5 }, q: { x: 5, y: 5 }, jump: true });
    expect(getLineIntersectionMap([l0, l1])).toEqual(new Map([]));

    const l2 = struct.create({ id: "l2", p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const l3 = struct.create({
      id: "l3",
      p: { x: 5, y: -5 },
      q: { x: 5, y: 5 },
      curves: [{ d: { x: 0, y: 5 } }],
      jump: true,
    });
    expect(getLineIntersectionMap([l2, l3])).toEqual(new Map([]));
  });
});

describe("makeJumps", () => {
  const seg: ISegment = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  test("should make jump points", () => {
    expect(
      makeJumps(
        seg,
        [
          [{ x: 2, y: 0 }, 0],
          [{ x: 6, y: 0 }, 0],
        ],
        1,
      ),
    ).toEqual([
      [
        { x: 1.5, y: 0 },
        { x: 2.5, y: 0 },
      ],
      [
        { x: 5.5, y: 0 },
        { x: 6.5, y: 0 },
      ],
    ]);
  });

  test("should merge close jump points", () => {
    expect(
      makeJumps(
        seg,
        [
          [{ x: 2, y: 0 }, 0],
          [{ x: 3, y: 0 }, 0],
        ],
        1,
      ),
    ).toEqual([
      [
        { x: 1.5, y: 0 },
        { x: 3.5, y: 0 },
      ],
    ]);
  });

  test("should avoid sticking out the src segment", () => {
    expect(
      makeJumps(
        seg,
        [
          [{ x: 1, y: 0 }, 0],
          [{ x: 9, y: 0 }, 0],
        ],
        4,
      ),
    ).toEqual([
      [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
      ],
      [
        { x: 7, y: 0 },
        { x: 10, y: 0 },
      ],
    ]);
  });

  test("should align segments in order", () => {
    expect(
      makeJumps(
        seg,
        [
          [{ x: 6, y: 0 }, 0],
          [{ x: 2, y: 0 }, 0],
        ],
        1,
      ),
    ).toEqual([
      [
        { x: 1.5, y: 0 },
        { x: 2.5, y: 0 },
      ],
      [
        { x: 5.5, y: 0 },
        { x: 6.5, y: 0 },
      ],
    ]);
  });
});
