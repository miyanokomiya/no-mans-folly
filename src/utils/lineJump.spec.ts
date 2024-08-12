import { describe, test, expect } from "vitest";
import { getLineIntersectionMap, makeJumps } from "./lineJump";
import { struct } from "../shapes/line";
import { ISegment } from "./geometry";

describe("getLineIntersectionMap", () => {
  test("should return line jump map", () => {
    const l0 = struct.create({ id: "l0", p: { x: 0, y: 0 }, body: [{ p: { x: 10, y: 0 } }], q: { x: 10, y: 10 } });
    const l1 = struct.create({ id: "l1", p: { x: 5, y: -5 }, q: { x: 5, y: 5 }, jump: true });
    const l2 = struct.create({ id: "l2", p: { x: 5, y: 3 }, q: { x: 15, y: 3 }, jump: true });
    const l3 = struct.create({ id: "l3", p: { x: 5, y: 3 }, q: { x: 15, y: 3 } });
    expect(getLineIntersectionMap([l0, l1, l2, l3])).toEqual(
      new Map([
        [
          "l1",
          {
            segments: [{ points: [{ x: 5, y: 0 }] }],
          },
        ],
        [
          "l2",
          {
            segments: [
              {
                points: [
                  { x: 10, y: 3 },
                  { x: 5, y: 3 },
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
            segments: [{ points: [{ x: 5, y: 0 }] }, undefined],
          },
        ],
      ]),
    );
  });
});

describe("makeJumps", () => {
  const seg: ISegment = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  test("should make jump points", () => {
    const intersections = [
      { x: 2, y: 0 },
      { x: 6, y: 0 },
    ];
    expect(makeJumps(seg, intersections, 1)).toEqual([
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
    const intersections = [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(makeJumps(seg, intersections, 1)).toEqual([
      [
        { x: 1.5, y: 0 },
        { x: 3.5, y: 0 },
      ],
    ]);
  });

  test("should avoid sticking out the src segment", () => {
    const intersections = [
      { x: 1, y: 0 },
      { x: 9, y: 0 },
    ];
    expect(makeJumps(seg, intersections, 4)).toEqual([
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
});
