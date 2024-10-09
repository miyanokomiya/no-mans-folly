import { describe, test, expect } from "vitest";
import { checkSymmetricAvailable } from "./movingLineBezierState";
import { createShape, getCommonStruct } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";

describe("checkSymmetricAvailable", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", {
    p: { x: 0, y: 0 },
    body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 100 } }],
    q: { x: 0, y: 100 },
  });

  test("should check if the bezier control can move symmetrically", () => {
    expect(checkSymmetricAvailable(line, 0, 0)).toBe(undefined);
    expect(checkSymmetricAvailable(line, 0, 1)).toBe("next");
    expect(checkSymmetricAvailable(line, 1, 0)).toBe("prev");
    expect(checkSymmetricAvailable(line, 1, 1)).toBe("next");
    expect(checkSymmetricAvailable(line, 2, 0)).toBe("prev");
    expect(checkSymmetricAvailable(line, 2, 1)).toBe(undefined);

    const loop = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 100 } }],
      q: { x: 0, y: 0 },
    });
    expect(checkSymmetricAvailable(loop, 0, 0)).toBe("loop-first");
    expect(checkSymmetricAvailable(loop, 2, 1)).toBe("loop-last");
  });

  test("should not change arc segments", () => {
    const arc0 = {
      ...line,
      curves: [{ d: { x: 0, y: -50 } }],
    };
    expect(checkSymmetricAvailable(arc0, 1, 0)).toBe(undefined);
    expect(checkSymmetricAvailable(arc0, 1, 1)).toBe("next");
    expect(checkSymmetricAvailable(arc0, 2, 0)).toBe("prev");

    const arc1 = {
      ...line,
      curves: [undefined, { d: { x: 0, y: -50 } }],
    };
    expect(checkSymmetricAvailable(arc1, 0, 1)).toBe(undefined);
    expect(checkSymmetricAvailable(arc1, 2, 0)).toBe(undefined);
  });
});
