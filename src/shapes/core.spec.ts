import { expect, describe, test } from "vitest";
import { getCommonStyle, updateCommonStyle } from "./core";
import { createShape, getCommonStruct } from ".";
import { RectangleShape } from "./rectangle";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { createColor } from "../models/factories";

describe("getCommonStyle", () => {
  test("should return common style", () => {
    const fill = createFillStyle({ color: createColor(1, 2, 3) });
    const stroke = createStrokeStyle({ color: createColor(3, 2, 1) });

    expect(getCommonStyle(createShape<RectangleShape>(getCommonStruct, "rectangle", { fill, stroke }))).toEqual({
      fill,
      stroke,
    });
  });
});

describe("updateCommonStyle", () => {
  test("should return common style to patch the shape", () => {
    const fill = createFillStyle({ color: createColor(1, 2, 3) });
    const stroke = createStrokeStyle({ color: createColor(3, 2, 1) });
    const fill1 = createFillStyle({ color: createColor(10, 2, 3) });
    const stroke1 = createStrokeStyle({ color: createColor(30, 2, 1) });
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { fill, stroke });

    expect(updateCommonStyle(shape, { fill, stroke })).toEqual({});
    expect(updateCommonStyle(shape, { fill: fill1, stroke })).toEqual({ fill: fill1 });
    expect(updateCommonStyle(shape, { fill, stroke: stroke1 })).toEqual({ stroke: stroke1 });
    expect(updateCommonStyle(shape, { fill: fill1, stroke: stroke1 })).toEqual({ fill: fill1, stroke: stroke1 });
  });
});
