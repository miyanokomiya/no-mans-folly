import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getWavePathControl } from "../../utils/path";
import { clamp, divideBezier3, getCrossLineAndBezier3WithT } from "okageo";

export type WaveShape = SimplePolygonShape & {
  waveSize: number; // represents the length of unit wave
  waveDepth: number; // represents the depth of wave
};

const baseStruct = getStructForSimplePolygon<WaveShape>(getPath);

export const struct: ShapeStruct<WaveShape> = {
  ...baseStruct,
  label: "Wave",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "wave",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 40,
      waveSize: arg.waveSize ?? 100,
      waveDepth: arg.waveDepth ?? 20,
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      waveSize: Math.max(0, shape.waveSize * scaleValue.x),
      waveDepth: Math.max(0, shape.waveDepth * scaleValue.y),
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: WaveShape): SimplePath {
  return getRawPath(shape);
}

function getRawPath(shape: WaveShape): SimplePath {
  const depth = clamp(0, shape.height, shape.waveDepth);
  const size = clamp(10, undefined, shape.waveSize);
  const rawLoopCount = shape.width / size;
  const loopCount = Math.floor(rawLoopCount);

  const path: SimplePath["path"] = [];
  const curves: SimplePath["curves"] = [];

  const upperY = depth / 2;
  const upperBaseC = getWavePathControl({ x: 0, y: upperY }, { x: size, y: upperY }, depth);
  path.push({ x: 0, y: upperY });
  for (let i = 1; i <= loopCount; i++) {
    path.push({ x: size * i, y: upperY });
  }
  for (let i = 0; i < loopCount; i++) {
    curves.push({
      c1: { x: upperBaseC.c1.x + size * i, y: upperBaseC.c1.y },
      c2: { x: upperBaseC.c2.x + size * i, y: upperBaseC.c2.y },
    });
  }

  if (rawLoopCount > loopCount) {
    const p = path[path.length - 1];
    const q = { x: size * path.length, y: upperY };
    const c1 = { x: upperBaseC.c1.x + size * (path.length - 1), y: upperBaseC.c1.y };
    const c2 = { x: upperBaseC.c2.x + size * (path.length - 1), y: upperBaseC.c2.y };
    const bezier = [p, c1, c2, q] as const;
    const cross = getCrossLineAndBezier3WithT(
      [
        { x: shape.width, y: 0 },
        { x: shape.width, y: shape.height },
      ],
      bezier,
    )[0];

    if (cross) {
      const divided = divideBezier3(bezier, cross[1])[0];
      path.push(divided[3]);
      curves.push({ c1: divided[1], c2: divided[2] });
    }
  }

  const dy = shape.height - 1 * depth;
  const psize = path.length;
  for (let i = 0; i < psize; i++) {
    const p = path[psize - 1 - i];
    path.push({ x: p.x, y: p.y + dy });
  }

  const csize = curves.length;
  curves.push(undefined);
  for (let i = 0; i < csize; i++) {
    const c = curves[csize - 1 - i];
    curves.push(
      c
        ? {
            c1: { x: c.c2.x, y: c.c2.y + dy },
            c2: { x: c.c1.x, y: c.c1.y + dy },
          }
        : undefined,
    );
  }

  return { path, curves };
}
