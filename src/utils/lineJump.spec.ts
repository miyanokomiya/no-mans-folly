import { describe, test, expect } from "vitest";
import { getLineJumpMap } from "./lineJump";
import { struct } from "../shapes/line";

describe("getLineJumpMap", () => {
  test("should return line jump map", () => {
    const l0 = struct.create({ id: "l0", p: { x: 0, y: 0 }, body: [{ p: { x: 10, y: 0 } }], q: { x: 10, y: 10 } });
    const l1 = struct.create({ id: "l1", p: { x: 5, y: -5 }, q: { x: 5, y: 5 }, jump: true });
    const l2 = struct.create({ id: "l2", p: { x: 5, y: 3 }, q: { x: 15, y: 3 }, jump: true });
    const l3 = struct.create({ id: "l3", p: { x: 5, y: 3 }, q: { x: 15, y: 3 } });
    expect(getLineJumpMap([l0, l1, l2, l3])).toEqual(
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
    expect(getLineJumpMap([l0, l1])).toEqual(
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
