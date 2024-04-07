import { IVec2, clamp } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getDirectionalSimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type CapsuleShape = SimplePolygonShape & {
  c0: IVec2;
  c1: IVec2;
};

export const struct: ShapeStruct<CapsuleShape> = {
  ...getStructForSimplePolygon(getPath, { outlineSnap: "trbl" }),
  label: "Capsule",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "capsule",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0, y: 0.5 },
      c1: arg.c1 ?? { x: 0.75, y: 0.5 },
    };
  },
  getTextRangeRect(shape) {
    switch (shape.direction) {
      case 0: {
        const r0y = shape.height * (1 - shape.c0.x);
        const r1y = shape.height * (1 - shape.c1.x);
        const rect = {
          x: shape.p.x,
          y: shape.p.y + r1y,
          width: shape.width,
          height: r0y - r1y,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      default: {
        const r0x = shape.width * shape.c0.x;
        const r1x = shape.width * shape.c1.x;
        const rect = {
          x: shape.p.x + r0x,
          y: shape.p.y,
          width: r1x - r0x,
          height: shape.height,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
    }
  },
  canAttachSmartBranch: true,
};

function getPath(src: CapsuleShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: CapsuleShape): SimplePath {
  const [r0, r1] = getCornerRadius(shape);
  const [b0, b1] = getCornerValue(shape);

  return {
    path: [
      { x: shape.width - r1.x, y: 0 },
      { x: shape.width, y: r1.y },
      { x: shape.width, y: shape.height - r1.y },
      { x: shape.width - r1.x, y: shape.height },
      { x: r0.x, y: shape.height },
      { x: 0, y: shape.height - r0.y },
      { x: 0, y: r0.y },
      { x: r0.x, y: 0 },
    ],
    curves: [
      { c1: { x: shape.width - b1.x, y: 0 }, c2: { x: shape.width, y: b1.y } },
      undefined,
      { c1: { x: shape.width, y: shape.height - b1.y }, c2: { x: shape.width - b1.x, y: shape.height } },
      undefined,
      { c1: { x: b0.x, y: shape.height }, c2: { x: 0, y: shape.height - b0.y } },
      undefined,
      { c1: { x: 0, y: b0.y }, c2: { x: b0.x, y: 0 } },
    ],
  };
}

function getCornerValue(shape: CapsuleShape): [IVec2, IVec2] {
  const [r0, r1] = getCornerRadius(shape);
  const rate = 0.44772; // Magic value to approximate border-radius via cubic-bezier
  return [
    { x: r0.x * rate, y: r0.y * rate },
    { x: r1.x * rate, y: r1.y * rate },
  ];
}

function getCornerRadius(shape: CapsuleShape): [IVec2, IVec2] {
  return [
    { x: shape.width * clamp(0, 0.5, shape.c0.x), y: shape.height / 2 },
    { x: shape.width * clamp(0, 0.5, 1 - shape.c1.x), y: shape.height / 2 },
  ];
}
