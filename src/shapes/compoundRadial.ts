import { Shape } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { ShapeSnappingLines, ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { groupBy, mapReduce } from "../utils/commons";
import { SVGElementInfo } from "../utils/svgElements";
import { GridItem, GridValueType, resolveGridValues } from "./compoundGrid";
import { divideSafely, ISegment, isSameValue, logRound, getRotateFn, normalizeLineRotation, TAU } from "../utils/geometry";
import { applyDefaultTextStyle, applyLocalSpace } from "../utils/renderer";
import { add, getRadian, getRectCenter, getUnit, IRectangle, IVec2, MINVALUE, sub } from "okageo";
import { newClipoutRenderer } from "../composables/clipRenderer";
import { getStandardSnappingLines } from "./utils/snapping";

export type CompoundRadial = {
  items: GridItem[];
  type: GridValueType;
};

export type CompoundRadialShape = EllipseShape & {
  /**
   * Each value represents radius
   */
  radial: CompoundRadial;
  /**
   * Each value represents radian
   */
  polar: CompoundRadial;
};

/**
 * Let "getWrapperRect" with "includeBounds" on ignore "getOutlineWidth".
 * Regarding various conditions such as grid value, scale and line cap is a bit unexpectable.
 * => Just apply the same rule of rectangle shape.
 */
export const struct: ShapeStruct<CompoundRadialShape> = {
  ...ellipseStruct,
  label: "CompoundRadial",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "compound_radial",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ width: 2 }),
      rx: arg.rx ?? 50,
      ry: arg.ry ?? 50,
      radial: arg.radial ?? {
        items: [
          { value: 25, scale: 0.5 },
          { value: 25, labeled: true },
        ],
        type: 1,
      },
      polar: arg.polar ?? {
        items: [
          { value: Math.PI / 4, scale: 0.5 },
          { value: Math.PI / 4, labeled: true },
        ],
        type: 1,
      },
    };
  },
  render(ctx, shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
    applyLocalSpace(ctx, rect, shape.rotation, () => {
      const baseStrokeWidth = getStrokeWidth(shape.stroke);

      ctx.beginPath();
      ctx.ellipse(shape.rx, shape.ry, shape.rx, shape.ry, 0, 0, TAU);
      if (!shape.fill.disabled) {
        applyFillStyle(ctx, shape.fill);
        ctx.fill();
      }

      const clipout = newClipoutRenderer({
        ctx,
        fillRange: (region) =>
          region.rect(
            -baseStrokeWidth,
            -baseStrokeWidth,
            rect.width + baseStrokeWidth * 2,
            rect.height + baseStrokeWidth * 2,
          ),
      });

      const rx = shape.rx;
      const ryRate = divideSafely(shape.ry, shape.rx, 0);
      const gridValues = resolveGridValues(shape.radial, rx);
      const polarValues = resolvePolarValues(shape.polar);
      const girdLabels = computeGridLabelLayout(shape, gridValues);
      const polarLabels = computePolarLabelLayout(shape, polarValues);

      ctx.save();
      girdLabels.forEach((label) => {
        clipout.applyClip((region) => {
          region.rect(label.rect.x, label.rect.y, label.rect.width, label.rect.height);
        });
      });
      polarLabels.forEach((label) => {
        clipout.applyClip((region) => {
          region.rect(label.rect.x, label.rect.y, label.rect.width, label.rect.height);
        });
      });

      gridValues.forEach((item) => {
        applyStrokeStyle(ctx, { ...shape.stroke, width: baseStrokeWidth * item.scale });
        ctx.beginPath();
        ctx.ellipse(shape.rx, shape.ry, item.v, item.v * ryRate, 0, 0, TAU);
        ctx.stroke();
      });

      const groupsByScale = groupBy(polarValues, (item) => item.scale);
      Object.values(groupsByScale).forEach((group) => {
        const lineScale = group[0].scale;
        if (lineScale <= 0) return;

        applyStrokeStyle(ctx, { ...shape.stroke, width: baseStrokeWidth * lineScale });
        ctx.beginPath();
        group.forEach((item) => {
          const v = getPolarPerimeterVector(shape, item.v);
          ctx.moveTo(shape.rx, shape.ry);
          ctx.lineTo(shape.rx + v.x, shape.ry + v.y);
        });
        ctx.stroke();
      });

      ctx.restore();

      girdLabels.forEach((label) => {
        applyDefaultTextStyle(ctx, label.fontSize, "center", true);
        applyFillStyle(ctx, { color: shape.stroke.color });
        ctx.beginPath();
        const c = getRectCenter(label.rect);
        ctx.fillText(label.label, c.x, c.y);
      });
      polarLabels.forEach((label) => {
        applyDefaultTextStyle(ctx, label.fontSize, "center", true);
        applyFillStyle(ctx, { color: shape.stroke.color });
        ctx.beginPath();
        const c = getRectCenter(label.rect);
        ctx.fillText(label.label, c.x, c.y);
      });
    });
  },
  createSVGElementInfo(shape): SVGElementInfo | undefined {
    return;
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  getSnappingLines(shape): ShapeSnappingLines {
    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const rotateFn = getRotateFn(shape.rotation, center);
    const wrapperRect = ellipseStruct.getWrapperRect(shape);
    const localRectPolygon = ellipseStruct.getLocalRectPolygon(shape);
    const { linesByRotation } = getStandardSnappingLines(wrapperRect, localRectPolygon, shape.rotation);

    resolvePolarValues(shape.polar).forEach((item) => {
      const v = getPolarPerimeterVector(shape, item.v);
      const localSeg: ISegment = [center, add(center, v)];
      const worldSeg: ISegment = [rotateFn(localSeg[0]), rotateFn(localSeg[1])];
      const angle = normalizeLineRotation(getRadian(worldSeg[1], worldSeg[0]));
      const existing = linesByRotation.get(angle);
      if (existing) {
        existing.push(worldSeg);
      } else {
        linesByRotation.set(angle, [worldSeg]);
      }
    });

    return { linesByRotation };
  },
};

export function isCompoundRadialShape(shape: Shape): shape is CompoundRadialShape {
  return shape.type === "compound_radial";
}

/**
 * v: Represents absolute rotation
 */
type ResolvedPolarValue = { v: number; scale: number; labeled?: boolean };

export function resolvePolarValues(polar: CompoundRadial): ResolvedPolarValue[] {
  const items = polar.items.filter((v) => v.value >= 0);
  if (items.length === 0) return [];

  const boundAngle = 360;
  const boundRadian = TAU;
  const list: ResolvedPolarValue[] = [];
  let total = 0;

  switch (polar.type) {
    case 2: {
      const totalValue = items.reduce((sum, v) => sum + v.value, 0);
      items.forEach((v) => {
        total += (boundRadian * v.value) / totalValue;
        list.push({ v: total, scale: v.scale ?? 1, labeled: v.labeled });
      });
      break;
    }
    default: {
      let index = 0;
      // Avoid too many lines: a line for each angle should be more than enough
      while (list.length < boundAngle) {
        const item = items[index];
        total += item.value;
        // Accept small error to include the last value
        if (boundRadian + MINVALUE < total) break;

        list.push({ v: total, scale: item.scale ?? 1, labeled: item.labeled });
        index = (index + 1) % items.length;
      }
      break;
    }
  }

  return list;
}

/**
 * Returns the vector from the ellipse center to the perimeter at the given polar angle.
 * Result is in local (pre-rotation) coordinates, relative to center.
 */
function getPolarPerimeterVector(shape: CompoundRadialShape, angleRad: number): IVec2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const t = Math.atan2(shape.rx * sin, shape.ry * cos);
  return { x: shape.rx * Math.cos(t), y: shape.ry * Math.sin(t) };
}

function getRadialLabelSize(shape: CompoundRadialShape): number {
  const sum = shape.radial.items.reduce((sum, item) => sum + item.value, 0);
  const ave = divideSafely(sum, shape.radial.items.length, shape.rx * 2);
  return Math.min(shape.rx * 2 * 0.3, shape.ry * 2 * 0.3, ave * 0.5);
}

function computeGridLabelLayout(
  shape: CompoundRadialShape,
  items: ResolvedPolarValue[],
): { label: string; fontSize: number; rect: IRectangle }[] {
  const baseStrokeWidth = getStrokeWidth(shape.stroke);
  const baseFontSize = getRadialLabelSize(shape);
  return items
    .filter((item) => item.labeled)
    .map((item) => {
      const label = `${item.v}`;
      const fontSize = baseFontSize * (0.5 + item.scale / 2);
      const width = (fontSize / 2) * label.length * 1.2 + baseStrokeWidth / 2;
      const height = fontSize * 1.2;
      return {
        label,
        fontSize,
        rect: { x: shape.rx + item.v - width + baseStrokeWidth, y: shape.ry - height / 2, width, height },
      };
    });
}

function computePolarLabelLayout(
  shape: CompoundRadialShape,
  items: ResolvedPolarValue[],
): { label: string; fontSize: number; rect: IRectangle }[] {
  const baseStrokeWidth = getStrokeWidth(shape.stroke);
  const baseFontSize = getRadialLabelSize(shape) * 0.75;
  return (
    items
      // Omit labels for 0 and TAU that are obvious and overlap ones for radial.
      .filter((item) => item.labeled && !isSameValue(Math.cos(item.v), 1))
      .map((item) => {
        const label = `${logRound(1, (item.v * 180) / Math.PI)}°`;
        const fontSize = baseFontSize * item.scale;
        const width = (fontSize / 2) * label.length * 1.2 + baseStrokeWidth / 2;
        const height = fontSize * 1.2;
        const v = getPolarPerimeterVector(shape, item.v);
        const unitV = getUnit(v);
        const d = {
          x: (1.5 * baseStrokeWidth + width / 2) * unitV.x,
          y: (1.5 * baseStrokeWidth + height / 2) * unitV.y,
        };
        const p = sub(v, d);
        return {
          label,
          fontSize,
          rect: { x: shape.rx + p.x - width / 2, y: shape.ry + p.y - height / 2, width, height },
        };
      })
  );
}
