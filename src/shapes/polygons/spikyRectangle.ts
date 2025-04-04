import { IRectangle, IVec2, clamp } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getBezierControlPaddingForBorderRadius, getRoundedRectInnerBounds } from "../../utils/geometry";
import { RoundedRectangleShape } from "./roundedRectangle";
import { Size } from "../../models";

export type SpikyRectangleShape = RoundedRectangleShape & {
  spikeSize: Size;
};

const baseStruct = getStructForSimplePolygon(getPath, { outlineSnap: "trbl" });

export const struct: ShapeStruct<SpikyRectangleShape> = {
  ...baseStruct,
  label: "SpikyRectangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "spiky_rectangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      rx: arg.rx ?? 10,
      ry: arg.ry ?? 10,
      spikeSize: arg.spikeSize ?? { width: 20 / Math.sqrt(3), height: 10 },
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      rx: Math.max(0, shape.rx * scaleValue.x),
      ry: Math.max(0, shape.ry * scaleValue.y),
      spikeSize: {
        width: Math.max(0, shape.spikeSize.width * scaleValue.x),
        height: Math.max(0, shape.spikeSize.height * scaleValue.y),
      },
    };
  },
  getTextRangeRect(shape) {
    const { rx, ry, spikeHeightV, spikeHeightH } = getSpikeParameters(shape);
    const rect = getRoundedRectInnerBounds(
      {
        x: shape.p.x + spikeHeightH,
        y: shape.p.y + spikeHeightV,
        width: shape.width - spikeHeightH * 2,
        height: shape.height - spikeHeightV * 2,
      },
      rx,
      ry,
    );
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
};

function getPath(shape: SpikyRectangleShape): SimplePath {
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const { rx, ry, spikeWidthV, spikeWidthH, spikeHeightV, spikeHeightH } = getSpikeParameters(shape);
  const [bx, by] = getBezierControlPaddingForBorderRadius(rx, ry);
  const top = spikeHeightV;
  const right = shape.width - spikeHeightH;
  const bottom = shape.height - spikeHeightV;
  const left = spikeHeightH;

  return {
    path: [
      { x: left + rx, y: top },

      { x: c.x - spikeWidthV / 2, y: top },
      { x: c.x, y: 0 },
      { x: c.x + spikeWidthV / 2, y: top },

      { x: right - rx, y: top },
      { x: right, y: top + ry },

      { x: right, y: c.y - spikeWidthH / 2 },
      { x: shape.width, y: c.y },
      { x: right, y: c.y + spikeWidthH / 2 },

      { x: right, y: bottom - ry },
      { x: right - rx, y: bottom },

      { x: c.x + spikeWidthV / 2, y: bottom },
      { x: c.x, y: shape.height },
      { x: c.x - spikeWidthV / 2, y: bottom },

      { x: left + rx, y: bottom },
      { x: left, y: bottom - ry },

      { x: left, y: c.y + spikeWidthH / 2 },
      { x: 0, y: c.y },
      { x: left, y: c.y - spikeWidthH / 2 },

      { x: left, y: top + ry },
      { x: left + rx, y: top },
    ],
    curves:
      rx === 0 || ry === 0
        ? undefined
        : [
            undefined,
            undefined,
            undefined,
            undefined,
            { c1: { x: right - bx, y: top }, c2: { x: right, y: top + by } },
            undefined,
            undefined,
            undefined,
            undefined,
            { c1: { x: right, y: bottom - by }, c2: { x: right - bx, y: bottom } },
            undefined,
            undefined,
            undefined,
            undefined,
            { c1: { x: left + bx, y: bottom }, c2: { x: left, y: bottom - by } },
            undefined,
            undefined,
            undefined,
            undefined,
            { c1: { x: left, y: top + by }, c2: { x: left + bx, y: top } },
          ],
  };
}

function getCornerRadius(shape: SpikyRectangleShape): IVec2 {
  return { x: clamp(0, shape.width / 2, shape.rx), y: clamp(0, shape.height / 2, shape.ry) };
}

export function getSpikeParameters(shape: SpikyRectangleShape) {
  const cr = getCornerRadius(shape);
  const spikeWidth = shape.spikeSize.width;
  const spikeHeight = shape.spikeSize.height;
  const [rx, ry] = [
    clamp(0, (shape.width - spikeHeight * 2 - spikeWidth) / 2, cr.x),
    clamp(0, (shape.height - spikeHeight * 2 - spikeWidth) / 2, cr.y),
  ];
  const spikeWidthV = clamp(0, shape.width - (spikeHeight + rx) * 2, spikeWidth);
  const spikeWidthH = clamp(0, shape.height - (spikeHeight + ry) * 2, spikeWidth);
  const spikeHeightV = clamp(0, shape.height / 2 - ry, spikeHeight);
  const spikeHeightH = clamp(0, shape.width / 2 - rx, spikeHeight);

  return {
    rx,
    ry,
    spikeWidthV,
    spikeWidthH,
    spikeHeightV,
    spikeHeightH,
  };
}

export function getSpikyInnerRectangle(shape: SpikyRectangleShape): IRectangle {
  const { spikeHeightV, spikeHeightH } = getSpikeParameters(shape);
  return {
    x: spikeHeightH,
    y: spikeHeightV,
    width: shape.width - spikeHeightH * 2,
    height: shape.height - spikeHeightV * 2,
  };
}
