import { IVec2, isSame } from "okageo";
import { expect } from "vitest";

function printPoint(p: IVec2): string {
  return `(${p.x}, ${p.y})`;
}

function printPoints(list: IVec2[]): string {
  return `[${list.map((p) => printPoint(p)).join(", ")}]`;
}

expect.extend({
  toEqualPoint(received: IVec2, expected: IVec2) {
    const { isNot } = this;
    return {
      pass: isSame(received, expected),
      message: () => `${printPoint(received)} is${isNot ? " not" : ""} ${printPoint(expected)}`,
    };
  },

  toEqualPoints(received: IVec2[], expected: IVec2[]) {
    const { isNot } = this;
    return {
      pass: received.every((p, i) => isSame(p, expected[i])),
      message: () => `${printPoints(received)} is${isNot ? " not" : ""} ${printPoints(expected)}`,
    };
  },
});
