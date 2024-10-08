import { describe, test, expect } from "vitest";
import { getNakedLineShape } from "./line";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";
import { createLineHead } from "../lineHeads";

describe("getNakedLineShape", () => {
  test("should return the line with minimum styles", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      pHead: createLineHead("dot"),
      qHead: createLineHead("dot"),
    });
    const result = getNakedLineShape(line);
    expect(result.stroke.width).toBe(0);
    expect(result.pHead).toBe(undefined);
    expect(result.qHead).toBe(undefined);
  });
});
