import { Shape } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeSnappingLines, ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { groupBy, mapReduce } from "../utils/commons";
import { SVGElementInfo, renderTransform } from "../utils/svgElements";
import { GridItem, GridValueType, resolveGridValues } from "./compoundGrid";
import {
  divideSafely,
  getClosestOutlineOnEllipse,
  getClosestPointOnSegment,
  getCrossLineAndEllipseRotated,
  getCrossSegAndSeg,
  getD2,
  ISegment,
  isSameValue,
  logRound,
  getRotateFn,
  getRotatedRectAffine,
  normalizeLineRotation,
  sortPointFrom,
  TAU,
} from "../utils/geometry";
import { applyDefaultTextStyle, applyLocalSpace } from "../utils/renderer";
import { add, getDistance, getRadian, getRectCenter, getUnit, IRectangle, IVec2, isOnSeg, MINVALUE, sub } from "okageo";
import { newClipoutRenderer, newSVGClipoutRenderer } from "../composables/clipRenderer";
import { colorToHex } from "../utils/color";
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
      stroke: arg.stroke ?? createStrokeStyle({ lineCap: "round" }),
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
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const baseStrokeWidth = getStrokeWidth(shape.stroke);
    const ryRate = divideSafely(shape.ry, shape.rx, 0);
    const gridValues = resolveGridValues(shape.radial, shape.rx);
    const polarValues = resolvePolarValues(shape.polar);
    const gridLabels = computeGridLabelLayout(shape, gridValues);
    const polarLabels = computePolarLabelLayout(shape, polarValues);

    const children: SVGElementInfo[] = [];
    const rectToPathStr = ({ x, y, width, height }: IRectangle) => `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
    const m = baseStrokeWidth;
    const wrapperRangeStr = rectToPathStr({ x: -m, y: -m, width: shape.rx * 2 + m * 2, height: shape.ry * 2 + m * 2 });

    const svgClipout = newSVGClipoutRenderer({
      clipId: `radial-clip-${shape.id}`,
      rangeStr: wrapperRangeStr,
    });
    [...gridLabels, ...polarLabels].forEach(({ rect: labelRect }) => {
      svgClipout.applyClip([rectToPathStr(labelRect)]);
    });
    children.push(...svgClipout.getClipElementList());

    if (!shape.fill.disabled) {
      children.push({
        tag: "ellipse",
        attributes: {
          cx: shape.rx,
          cy: shape.ry,
          rx: shape.rx,
          ry: shape.ry,
          stroke: "none",
          ...renderFillSVGAttributes(shape.fill),
        },
      });
    }

    const clippedChildren: SVGElementInfo[] = [];

    Object.values(groupBy(gridValues, (item) => item.scale)).forEach((group) => {
      const lineScale = group[0].scale;
      if (lineScale <= 0) return;
      group.forEach(({ v }) => {
        clippedChildren.push({
          tag: "ellipse" as const,
          attributes: {
            cx: shape.rx,
            cy: shape.ry,
            rx: v,
            ry: v * ryRate,
            fill: "none",
            ...renderStrokeSVGAttributes({ ...shape.stroke, width: baseStrokeWidth * lineScale }),
          },
        });
      });
    });

    Object.values(groupBy(polarValues, (item) => item.scale)).forEach((group) => {
      const lineScale = group[0].scale;
      if (lineScale <= 0) return;
      const d = group
        .map((item) => {
          const v = getPolarPerimeterVector(shape, item.v);
          return `M ${shape.rx} ${shape.ry} L ${shape.rx + v.x} ${shape.ry + v.y}`;
        })
        .join(" ");
      clippedChildren.push({
        tag: "path" as const,
        attributes: {
          d,
          fill: "none",
          ...renderStrokeSVGAttributes({ ...shape.stroke, width: baseStrokeWidth * lineScale }),
        },
      });
    });

    const currentClipId = svgClipout.getCurrentClipId();
    children.push({
      tag: "g",
      attributes: currentClipId ? { "clip-path": `url(#${currentClipId})` } : undefined,
      children: clippedChildren,
    });

    const allLabels = [...gridLabels, ...polarLabels];
    if (allLabels.length > 0) {
      children.push({
        tag: "g",
        attributes: {
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: colorToHex(shape.stroke.color),
          "fill-opacity": shape.stroke.color.a !== 1 ? shape.stroke.color.a : undefined,
          stroke: "none",
        },
        children: allLabels.map(({ label, fontSize, rect: labelRect }) => {
          const c = getRectCenter(labelRect);
          return {
            tag: "text" as const,
            attributes: {
              x: c.x,
              y: c.y,
              "font-size": fontSize,
            },
            children: [label],
          };
        }),
      });
    }

    return {
      tag: "g",
      attributes: { transform: renderTransform(affine) },
      children,
    };
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  /**
   * Although letting "getClosestOutline" and "getIntersectedOutlines" regard the inner curves may allow lines to connect to them,
   * "getSnappingLines" can't provide the guides of inner ellipses on its own.
   */
  getClosestOutline(shape, p, threshold, thresholdForMarker = threshold) {
    const center = add(shape.p, { x: shape.rx, y: shape.ry });
    const rotateFn = getRotateFn(shape.rotation, center);
    const rotatedP = rotateFn(p, true);
    const ryRate = divideSafely(shape.ry, shape.rx, 0);
    const allRadii = [shape.rx, ...resolveGridValues(shape.radial, shape.rx).map((item) => item.v)];

    // Check cardinal markers of all ellipses
    for (const rx of allRadii) {
      const ry = rx * ryRate;
      const markers = [
        { x: center.x, y: center.y - ry },
        { x: center.x + rx, y: center.y },
        { x: center.x, y: center.y + ry },
        { x: center.x - rx, y: center.y },
      ];
      const closest = markers.find((m) => getDistance(m, rotatedP) <= thresholdForMarker);
      if (closest) return rotateFn(closest);
    }

    // Collect candidates from ellipse outlines and polar segments, pick closest
    let bestCandidate: IVec2 | undefined;
    let bestD2 = threshold * threshold;

    for (const rx of allRadii) {
      const ry = rx * ryRate;
      const candidate = getClosestOutlineOnEllipse(center, rx, ry, rotatedP, threshold);
      if (candidate) {
        const d2 = getD2(sub(candidate, rotatedP));
        if (d2 <= bestD2) {
          bestD2 = d2;
          bestCandidate = candidate;
        }
      }
    }

    for (const item of resolvePolarValues(shape.polar)) {
      const v = getPolarPerimeterVector(shape, item.v);
      const seg: ISegment = [center, add(center, v)];
      const candidate = getClosestPointOnSegment(seg, rotatedP);
      const d2 = getD2(sub(candidate, rotatedP));
      if (d2 <= bestD2) {
        bestD2 = d2;
        bestCandidate = candidate;
      }
    }

    return bestCandidate ? rotateFn(bestCandidate) : undefined;
  },
  getIntersectedOutlines(shape, from, to) {
    const center = add(shape.p, { x: shape.rx, y: shape.ry });
    const rotateFn = getRotateFn(shape.rotation, center);
    const ryRate = divideSafely(shape.ry, shape.rx, 0);
    const allRadii = [shape.rx, ...resolveGridValues(shape.radial, shape.rx).map((item) => item.v)];
    const points: IVec2[] = [];

    for (const rx of allRadii) {
      const ry = rx * ryRate;
      const candidates = getCrossLineAndEllipseRotated([from, to], center, rx, ry, shape.rotation);
      if (!candidates) continue;
      const onSeg = candidates.filter((p) => isOnSeg(p, [from, to]) ?? p);
      points.push(...onSeg);
    }

    const localFrom = rotateFn(from, true);
    const localTo = rotateFn(to, true);
    for (const item of resolvePolarValues(shape.polar)) {
      const v = getPolarPerimeterVector(shape, item.v);
      const seg: ISegment = [center, add(center, v)];
      const inter = getCrossSegAndSeg([localFrom, localTo], seg);
      if (inter) points.push(rotateFn(inter));
    }

    return points.length === 0 ? undefined : sortPointFrom(from, points);
  },
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
  const nonzeroItems = shape.radial.items.filter((item) => item.value > 0);
  const sum = shape.radial.type === 2 ? shape.rx : nonzeroItems.reduce((sum, item) => sum + item.value, 0);
  const ave = divideSafely(sum, nonzeroItems.length, shape.rx);
  return Math.min(shape.rx * 0.2, shape.ry * 0.2, ave * 0.3);
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
      const label = `${logRound(-1, item.v)}`;
      const fontSize = baseFontSize * (0.5 + item.scale / 2);
      const width = (fontSize / 2) * label.length * 1.2 + baseStrokeWidth / 2;
      const height = fontSize * 1.2;
      return {
        label,
        fontSize,
        rect: { x: shape.rx + item.v - width + baseStrokeWidth / 2, y: shape.ry - height / 2, width, height },
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
        const label = `${logRound(-1, (item.v * 180) / Math.PI)}°`;
        const fontSize = baseFontSize * (0.5 + item.scale / 2);
        const width = (fontSize / 2) * label.length * 1.2 + baseStrokeWidth / 2;
        const height = fontSize * 1.2;
        const v = getPolarPerimeterVector(shape, item.v);
        const unitV = getUnit(v);
        const d = {
          x: (0.5 * baseStrokeWidth + width / 2) * unitV.x,
          y: (0.5 * baseStrokeWidth + height / 2) * unitV.y,
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
