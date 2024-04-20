import { IVec2, applyAffine, clamp, multiAffines } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getDirectionalSimplePath,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type StarShape = SimplePolygonShape & {
  c0: IVec2;
  size: number;
};

export const struct: ShapeStruct<StarShape> = {
  ...getStructForSimplePolygon<StarShape>(getPath),
  label: "Star",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "star",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100 * (Math.sqrt(3) / 2),
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.5, y: 0.25 },
      size: arg.size ?? 5,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const c = { x: s.width / 2, y: s.height / 2 };
      const r = Math.PI / 4;
      const rate = getRadiusRate(s);
      const dx = Math.cos(r) * s.width * rate;
      const dy = Math.sin(r) * s.height * rate;
      const rect = { x: c.x - dx, y: c.y - dy, width: dx * 2, height: dy * 2 };

      const gapRate = getSizeGapRate(s);
      const gapW = rect.width * gapRate.x;
      const adjusted = {
        x: rect.x - gapW / 2,
        y: rect.y * (1 + gapRate.y),
        width: rect.width + gapW,
        height: rect.height * (1 + gapRate.y),
      };

      return { x: adjusted.x + s.p.x, y: adjusted.y + s.p.y, width: adjusted.width, height: adjusted.height };
    });
  },
  canAttachSmartBranch: true,
};

function getRadiusRate(src: StarShape): number {
  return clamp(0, 0.5, 0.5 - src.c0.y);
}

function getSize(src: StarShape): number {
  return clamp(3, 20, src.size);
}

function getPath(src: StarShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: StarShape): SimplePath {
  const size = getSize(shape);
  const unitR = (Math.PI * 2) / size;
  const arr = [...Array(size)].map((_, i) => i);

  const c = { x: shape.width / 2, y: shape.height / 2 };
  const ops = arr.map<IVec2>((i) => {
    const r = unitR * i - Math.PI / 2;
    return { x: Math.cos(r) * c.x, y: Math.sin(r) * c.y };
  });

  const rate = getRadiusRate(shape);
  const innerRadius = { x: shape.width * rate, y: shape.height * rate };
  const indexDiff = Math.floor(size / 2);
  const ips = arr.map<IVec2>((i) => {
    const r = unitR * (i - indexDiff) + Math.PI / 2;
    return { x: Math.cos(r) * innerRadius.x, y: Math.sin(r) * innerRadius.y };
  });

  const path: IVec2[] = [];
  for (let i = 0; i < ops.length; i++) {
    path.push(ops[i], ips[i]);
  }

  const gapX = c.x + Math.min(...path.map((p) => p.x));
  const gapY = c.y - Math.max(...path.map((p) => p.y));
  const affine = multiAffines([
    [1, 0, 0, 1, c.x, 0],
    [1 + (2 * gapX) / shape.width, 0, 0, 1 + gapY / shape.height, 0, 0],
    [1, 0, 0, 1, 0, c.y],
  ]);

  return { path: path.map((p) => applyAffine(affine, p)) };
}

function getSizeGapRate(shape: StarShape): IVec2 {
  const size = getSize(shape);
  const unitR = (Math.PI * 2) / size;
  const from = -Math.PI / 2;
  const bottomIndex = Math.ceil(size / 2);
  const rightIndex = Math.max(1, Math.floor(size / 4));
  return { x: (1 - Math.cos(from + unitR * rightIndex)) * 2, y: 1 - Math.sin(from + unitR * bottomIndex) };
}
