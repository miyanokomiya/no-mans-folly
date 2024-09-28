import { expect, describe, test } from "vitest";
import {
  canHaveOutlineWithinGroup,
  getCommonStyle,
  hasStrokeStyle,
  isInvisibleClippingShape,
  isSameShapeParentScope,
  isSameShapeSelectionScope,
  textContainerModule,
  updateCommonStyle,
} from "./core";
import { createShape, getCommonStruct } from ".";
import { RectangleShape } from "./rectangle";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { createColor } from "../models/factories";
import { createBoxPadding } from "../utils/boxPadding";

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

describe("getTextPadding", () => {
  test("should return text padding property", () => {
    expect(textContainerModule.getTextPadding({})).toEqual(undefined);
    const padding = createBoxPadding([1, 2, 3, 4]);
    expect(textContainerModule.getTextPadding({ textPadding: padding })).toEqual(padding);
  });
});

describe("patchTextPadding", () => {
  test("should return patch object for text padding", () => {
    const padding = createBoxPadding([1, 2, 3, 4]);
    expect(textContainerModule.patchTextPadding({}, padding)).toEqual({ textPadding: padding });
    expect(textContainerModule.patchTextPadding({ textPadding: padding }, padding)).toEqual({});
    expect(textContainerModule.patchTextPadding({ textPadding: padding }, undefined)).toEqual({
      textPadding: undefined,
    });
  });
});

describe("isSameShapeSelectionScope", () => {
  test("should return true when two values have same information", () => {
    expect(isSameShapeSelectionScope(undefined, undefined)).toBe(true);
    expect(isSameShapeSelectionScope({}, {})).toBe(true);
    expect(isSameShapeSelectionScope({ parentId: "a" }, { parentId: "a" })).toBe(true);
    expect(isSameShapeSelectionScope({ parentId: "a", scopeKey: "b" }, { parentId: "a", scopeKey: "b" })).toBe(true);
    expect(isSameShapeSelectionScope({ parentId: "a" }, { parentId: "b" })).toBe(false);
    expect(isSameShapeSelectionScope({ parentId: "a", scopeKey: "b" }, { parentId: "a", scopeKey: "c" })).toBe(false);
    expect(isSameShapeSelectionScope({ parentId: "a", scopeKey: "b" }, { parentId: "c", scopeKey: "b" })).toBe(false);
  });
});

describe("isSameShapeParentScope", () => {
  test("should return true when two values have same parent information", () => {
    expect(isSameShapeParentScope(undefined, undefined)).toBe(true);
    expect(isSameShapeParentScope({}, {})).toBe(true);
    expect(isSameShapeParentScope({ parentId: "a" }, { parentId: "a" })).toBe(true);
    expect(isSameShapeParentScope({ parentId: "a", scopeKey: "b" }, { parentId: "a", scopeKey: "b" })).toBe(true);
    expect(isSameShapeParentScope({ parentId: "a" }, { parentId: "b" })).toBe(false);
    expect(isSameShapeParentScope({ parentId: "a", scopeKey: "b" }, { parentId: "a", scopeKey: "c" })).toBe(true);
    expect(isSameShapeParentScope({ parentId: "a", scopeKey: "b" }, { parentId: "c", scopeKey: "b" })).toBe(false);
  });
});

describe("hasStrokeStyle", () => {
  test("should return true when a shape has stroke property", () => {
    expect(hasStrokeStyle(createShape(getCommonStruct, "group", {}))).toBe(false);
    expect(hasStrokeStyle(createShape(getCommonStruct, "line", {}))).toBe(true);
    expect(hasStrokeStyle(createShape(getCommonStruct, "rectangle", {}))).toBe(true);
  });
});

describe("isInvisibleClippingShape", () => {
  test("should return true when a shape an invisible clipping shape", () => {
    expect(isInvisibleClippingShape(createShape(getCommonStruct, "line", {}))).toBe(false);
    expect(
      isInvisibleClippingShape(createShape<RectangleShape>(getCommonStruct, "rectangle", { clipping: true })),
    ).toBe(false);
    expect(
      isInvisibleClippingShape(
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          clipping: true,
          stroke: createStrokeStyle({ disabled: true }),
        }),
      ),
    ).toBe(true);
  });
});

describe("canHaveOutlineWithinGroup", () => {
  test("should return true when a shape can outline of its parent group", () => {
    const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {});
    expect(canHaveOutlineWithinGroup({ ...rect, clipping: false })).toBe(true);
    expect(
      canHaveOutlineWithinGroup({
        ...rect,
        clipping: true,
        stroke: createStrokeStyle({ disabled: true }),
      } as RectangleShape),
    ).toBe(false);
    expect(
      canHaveOutlineWithinGroup({
        ...rect,
        clipping: true,
        stroke: createStrokeStyle({ disabled: false }),
      } as RectangleShape),
    ).toBe(true);
    expect(
      canHaveOutlineWithinGroup({
        ...rect,
        clipping: true,
        cropClipBorder: true,
        stroke: createStrokeStyle({ disabled: false }),
      } as RectangleShape),
    ).toBe(false);
  });
});
