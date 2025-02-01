import { IRectangle, IVec2, isSame } from "okageo";
import { expect } from "vitest";

function printPoint(p: IVec2): string {
  return `{ x: ${p.x}, y: ${p.y} }`;
}

function printRect(rect: IRectangle): string {
  return `{ x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height} }`;
}

function printPoints(list: IVec2[]): string {
  return `[${list.map((p) => printPoint(p)).join(", ")}]`;
}

expect.extend({
  toEqualPoint(received: IVec2, expected: IVec2) {
    const { isNot } = this;
    return {
      pass: !!received && isSame(received, expected),
      message: () => `${received ? printPoint(received) : received} is${isNot ? " not" : ""} ${printPoint(expected)}`,
    };
  },

  toEqualPoints(received: IVec2[], expected: IVec2[]) {
    const { isNot } = this;
    return {
      pass: received.length === expected.length && received.every((p, i) => isSame(p, expected[i])),
      message: () => `${printPoints(received)} is${isNot ? " not" : ""} ${printPoints(expected)}`,
    };
  },

  toEqualRect(received: IRectangle, expected: IRectangle) {
    const { isNot } = this;
    return {
      pass:
        isSame(received, expected) &&
        isSame({ x: received.width, y: received.height }, { x: expected.width, y: expected.height }),
      message: () => `${printRect(received)} is${isNot ? " not" : ""} ${printRect(expected)}`,
    };
  },
});

if (!global.localStorage) {
  let storage: { [key: string]: any } = {};
  global.localStorage = {
    getItem: (key: string) => storage[key],
    setItem: (key: string, value: any) => (storage[key] = value),
    clear: () => (storage = {}),
  } as any;
}
