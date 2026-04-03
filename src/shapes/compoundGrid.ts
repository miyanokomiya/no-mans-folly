import { getRectCenter, IRectangle, IVec2, MINVALUE } from "okageo";
import { Shape, Size, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeSnappingLines, ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { groupBy, mapReduce } from "../utils/commons";
import { applyDefaultTextStyle, applyLocalSpace } from "../utils/renderer";
import { ISegment, divideSafely, getRotatedRectAffine, logRound, normalizeLineRotation } from "../utils/geometry";
import { CanvasCTX } from "../utils/types";
import { SVGElementInfo, renderTransform } from "../utils/svgElements";
import { colorToHex } from "../utils/color";
import { newClipoutRenderer, newSVGClipoutRenderer } from "../composables/clipRenderer";

/**
 * 1: Absolute distance: [10, 20] represents "10px, 20px" repeat
 * 2: Relative ratio: [10, 20] represents "10:20" ratio repeat
 */
export type GridValueType = 1 | 2;

/**
 * 1: Horizontal
 * 2: Vertical
 * 3: Horizontal & Vertical
 */
export type GridDirection = 1 | 2 | 3;

export type GridItem = {
  value: number;
  scale?: number;
  labeled?: boolean;
};

export type CompoundGrid = {
  items: GridItem[];
  type: GridValueType;
  direction: GridDirection;
};

export type CompoundGridShape = RectangleShape & {
  grid: CompoundGrid;
};

/**
 * Let "getWrapperRect" with "includeBounds" on ignore "getOutlineWidth".
 * Regarding various conditions such as grid value, scale and line cap is a bit unexpectable.
 * => Just apply the same rule of rectangle shape.
 */
export const struct: ShapeStruct<CompoundGridShape> = {
  ...recntagleStruct,
  label: "CompoundGrid",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "compound_grid",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ width: 2 }),
      width: arg.width ?? 100,
      height: arg.height ?? 25,
      grid: arg.grid ?? {
        items: [
          { value: 10, scale: 0.5 },
          { value: 10, scale: 0.5 },
          { value: 10, scale: 0.5 },
          { value: 10, scale: 0.5 },
          { value: 10, labeled: true },
        ],
        type: 1,
        direction: 1,
      },
    };
  },
  render(ctx, shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    applyLocalSpace(ctx, rect, shape.rotation, () => {
      if (!shape.fill.disabled) {
        applyFillStyle(ctx, shape.fill);
        ctx.beginPath();
        ctx.rect(0, 0, shape.width, shape.height);
        ctx.fill();
      }

      const gridItems = shape.grid.items;
      const lastItem = gridItems.at(-1);
      if (!lastItem) return;

      const horizontalOnly = shape.grid.direction === 1;
      const verticalOnly = shape.grid.direction === 2;
      const outlineWidth = getOutlineWidth(shape);
      const baseStrokeWidth = getStrokeWidth(shape.stroke);

      if (outlineWidth > 0) {
        applyStrokeStyle(ctx, {
          ...shape.stroke,
          width: outlineWidth,
        });
        ctx.beginPath();
        if (!verticalOnly) {
          ctx.moveTo(0, 0);
          ctx.lineTo(0, shape.height);
        }
        if (!horizontalOnly) {
          ctx.moveTo(0, 0);
          ctx.lineTo(shape.width, 0);
        }
        ctx.stroke();
      }

      const xList = verticalOnly ? [] : resolveGridValues(shape.grid, shape.width);
      const yList = horizontalOnly ? [] : resolveGridValues(shape.grid, shape.height);
      const labelSize = getGridLabelSize(shape);
      renderGridLabels(ctx, rect, outlineWidth, baseStrokeWidth, labelSize, shape.stroke, xList, yList);
    });
  },
  createSVGElementInfo(shape): SVGElementInfo | undefined {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const horizontalOnly = shape.grid.direction === 1;
    const verticalOnly = shape.grid.direction === 2;
    const outlineWidth = getOutlineWidth(shape);
    const baseStrokeWidth = getStrokeWidth(shape.stroke);
    const xList = verticalOnly ? [] : resolveGridValues(shape.grid, shape.width);
    const yList = horizontalOnly ? [] : resolveGridValues(shape.grid, shape.height);
    const labelSize = getGridLabelSize(shape);
    const labelLayout = computeGridLabelLayout(
      shape.width,
      shape.height,
      outlineWidth,
      baseStrokeWidth,
      labelSize,
      xList,
      yList,
    );

    const children: SVGElementInfo[] = [];
    const rectToPathStr = ({ x, y, width, height }: IRectangle) => `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;

    const svgClipout = newSVGClipoutRenderer({
      clipId: `grid-clip-${shape.id}`,
      rangeStr: rectToPathStr(labelLayout.clipoutArea),
    });
    svgClipout.applyClip(labelLayout.labels.map(({ rect }) => rectToPathStr(rect)));
    children.push(...svgClipout.getClipElementList());

    if (!shape.fill.disabled) {
      children.push({
        tag: "rect",
        attributes: {
          width: shape.width,
          height: shape.height,
          stroke: "none",
          ...renderFillSVGAttributes(shape.fill),
        },
      });
    }

    if (outlineWidth > 0) {
      const outlineParts: string[] = [];
      if (!verticalOnly) outlineParts.push(`M 0 0 L 0 ${shape.height}`);
      if (!horizontalOnly) outlineParts.push(`M 0 0 L ${shape.width} 0`);
      if (outlineParts.length > 0) {
        children.push({
          tag: "path",
          attributes: {
            d: outlineParts.join(" "),
            fill: "none",
            ...renderStrokeSVGAttributes({ ...shape.stroke, width: outlineWidth }),
          },
        });
      }
    }

    const buildXPathElements = (list: ResolvedGridValue[]): SVGElementInfo[] =>
      Object.values(groupBy(list, (v) => v.scale)).flatMap((group) => {
        const lineScale = group[0].scale;
        if (lineScale <= 0) return [];
        const d = group.map(({ v }) => `M ${v} 0 L ${v} ${shape.height}`).join(" ");
        return [
          {
            tag: "path" as const,
            attributes: {
              d,
              fill: "none",
              ...renderStrokeSVGAttributes({ ...shape.stroke, width: baseStrokeWidth * lineScale }),
            },
          },
        ];
      });
    const buildYPathElements = (list: ResolvedGridValue[]): SVGElementInfo[] =>
      Object.values(groupBy(list, (v) => v.scale)).flatMap((group) => {
        const lineScale = group[0].scale;
        if (lineScale <= 0) return [];
        const d = group.map(({ v }) => `M 0 ${v} L ${shape.width} ${v}`).join(" ");
        return [
          {
            tag: "path" as const,
            attributes: {
              d,
              fill: "none",
              ...renderStrokeSVGAttributes({ ...shape.stroke, width: baseStrokeWidth * lineScale }),
            },
          },
        ];
      });

    const currentClipId = svgClipout.getCurrentClipId();
    const clippedLineChildren: SVGElementInfo[] = [...buildXPathElements(xList), ...buildYPathElements(yList)];
    children.push({
      tag: "g",
      attributes: currentClipId ? { "clip-path": `url(#${currentClipId})` } : undefined,
      children: clippedLineChildren,
    });

    if (labelLayout.labels) {
      children.push({
        tag: "g",
        attributes: {
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: colorToHex(shape.stroke.color),
          "fill-opacity": shape.stroke.color.a !== 1 ? shape.stroke.color.a : undefined,
          stroke: "none",
        },
        children: labelLayout.labels.map(({ label, fontSize, rect }) => {
          const c = getRectCenter(rect);
          return {
            tag: "text",
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
  // Note: It may be nice to have "getClosestOutline" and "getIntersectedOutlines" like "compound_radial" but not for sure.
  getSnappingLines(shape): ShapeSnappingLines {
    const w = shape.width;
    const h = shape.height;
    const r = shape.rotation;
    const cx = shape.p.x + w / 2;
    const cy = shape.p.y + h / 2;
    const cosR = Math.cos(r);
    const sinR = Math.sin(r);

    function localToWorld(lx: number, ly: number): IVec2 {
      const ox = lx - w / 2;
      const oy = ly - h / 2;
      return { x: cx + ox * cosR - oy * sinR, y: cy + ox * sinR + oy * cosR };
    }

    // Rotation keys for local vertical and horizontal lines in world space
    const vLocalKey = normalizeLineRotation(r + Math.PI / 2);
    const hLocalKey = normalizeLineRotation(r);

    const horizontalOnly = shape.grid.direction === 1;
    const verticalOnly = shape.grid.direction === 2;

    // Local vertical lines (at x = const, from y=0 to y=h), sorted left to right
    const xPositions = [0, ...(verticalOnly ? [] : resolveGridValues(shape.grid, w).map((v) => v.v)), w];
    const vSegments: ISegment[] = xPositions.map((x) => [localToWorld(x, 0), localToWorld(x, h)]);

    // Local horizontal lines (at y = const, from x=0 to x=w), sorted top to bottom
    const yPositions = [0, ...(horizontalOnly ? [] : resolveGridValues(shape.grid, h).map((v) => v.v)), h];
    const hSegments: ISegment[] = yPositions.map((y) => [localToWorld(0, y), localToWorld(w, y)]);

    const linesByRotation = new Map<number, ISegment[]>([
      [vLocalKey, vSegments],
      [hLocalKey, hSegments],
    ]);
    return { linesByRotation };
  },
};

export function isCompoundGridShape(shape: Shape): shape is CompoundGridShape {
  return shape.type === "compound_grid";
}

/**
 * v: Represents absolute distance
 */
type ResolvedGridValue = { v: number; scale: number; labeled?: boolean };

/**
 * Returned list contains neither "0" nor "bound".
 * Each value in the returned list represents absolute distance.
 */
export function resolveGridValues(grid: Omit<CompoundGrid, "direction">, bound: number): ResolvedGridValue[] {
  const items = grid.items.filter((v) => v.value >= 0);
  if (items.length === 0) return [];

  const list: ReturnType<typeof resolveGridValues> = [];
  let total = 0;

  switch (grid.type) {
    case 2: {
      const totalValue = items.reduce((sum, v) => sum + v.value, 0);
      items.forEach((v) => {
        total += (bound * v.value) / totalValue;
        list.push({ v: total, scale: v.scale ?? 1, labeled: v.labeled });
      });
      break;
    }
    default: {
      let gridIndex = 0;
      // Avoid too many lines: a line for each pixel should be more than enough
      while (list.length < bound) {
        const item = items[gridIndex];
        total += item.value;
        // Accept small error to include the last value
        if (bound + MINVALUE < total) break;

        list.push({ v: total, scale: item.scale ?? 1, labeled: item.labeled });
        gridIndex = (gridIndex + 1) % items.length;
      }
      break;
    }
  }

  return list;
}

function getOutlineWidth(shape: CompoundGridShape): number {
  const strokeWidth = getStrokeWidth(shape.stroke);
  const lastItem = shape.grid.items.at(-1);
  return lastItem ? strokeWidth * (lastItem.scale ?? 1) : strokeWidth;
}

type GridLabelLayout = {
  clipoutArea: IRectangle;
  labels: { label: string; fontSize: number; rect: IRectangle }[];
};

function computeGridLabelLayout(
  width: number,
  height: number,
  outlineWidth: number,
  baseStrokeWidth: number,
  labelSize: number,
  xList: ResolvedGridValue[],
  yList: ResolvedGridValue[],
): GridLabelLayout {
  const clipoutArea = {
    x: -outlineWidth,
    y: -outlineWidth,
    width: width + outlineWidth * 2,
    height: height + outlineWidth * 2,
  };

  const labels: GridLabelLayout["labels"] = [];
  xList.forEach(({ v, labeled }, i) => {
    if (!labeled) return;

    const d = v - (0 < i ? xList[i - 1].v : 0);
    const label = `${logRound(-1, v)}`;
    const fontSize = Math.min(labelSize, d * 0.5);
    const width = getLabelWidth(fontSize, label) * 1.2 + baseStrokeWidth / 2;
    const height = fontSize * 1.2;
    const rect = { x: v + baseStrokeWidth / 2 - width, y: labelSize, width, height };
    labels.push({ label, fontSize, rect });
  });
  yList.map(({ v, labeled }, i) => {
    if (!labeled || (i === 0 && xList.length > 0)) return;

    const d = v - (0 < i ? yList[i - 1].v : 0);
    const label = `${logRound(-1, v)}`;
    const fontSize = Math.min(labelSize, d * 0.5);
    const width = getLabelWidth(fontSize, label) * 1.2 + baseStrokeWidth / 2;
    const height = fontSize * 1.2;
    const rect = { x: labelSize, y: v + baseStrokeWidth / 2 - height, width, height };
    labels.push({ label, fontSize, rect });
  });

  return { clipoutArea, labels };
}

function renderGridLabels(
  ctx: CanvasCTX,
  rectSize: Size,
  outlineWidth: number,
  baseStrokeWidth: number,
  labelSize: number,
  stroke: StrokeStyle,
  xList: ResolvedGridValue[],
  yList: ResolvedGridValue[],
) {
  const labelLayout = computeGridLabelLayout(
    rectSize.width,
    rectSize.height,
    outlineWidth,
    baseStrokeWidth,
    labelSize,
    xList,
    yList,
  );

  ctx.save();
  const clipout = newClipoutRenderer({
    ctx,
    fillRange: (region) => {
      region.rect(
        labelLayout.clipoutArea.x,
        labelLayout.clipoutArea.y,
        labelLayout.clipoutArea.width,
        labelLayout.clipoutArea.height,
      );
    },
  });
  labelLayout.labels.forEach((item) => {
    clipout.applyClip((region) => {
      region.rect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
    });
  });

  renderXGroups(ctx, rectSize, stroke, xList);
  renderYGroups(ctx, rectSize, stroke, yList);
  ctx.restore();

  labelLayout.labels.forEach((item) => {
    applyDefaultTextStyle(ctx, item.fontSize, "center", true);
    applyFillStyle(ctx, { color: stroke.color });
    ctx.beginPath();
    const c = getRectCenter(item.rect);
    ctx.fillText(item.label, c.x, c.y);
  });
}

function renderXGroups(ctx: CanvasCTX, rectSize: Size, stroke: StrokeStyle, xList: ResolvedGridValue[]) {
  const xGroups = groupBy(xList, (v) => v.scale);
  const baseStrokeWidth = getStrokeWidth(stroke);

  Object.values(xGroups).forEach((group) => {
    const lineScale = group[0].scale;
    if (lineScale <= 0) return;

    applyStrokeStyle(ctx, {
      ...stroke,
      width: baseStrokeWidth * lineScale,
    });
    ctx.beginPath();
    group.forEach(({ v }) => {
      ctx.moveTo(v, 0);
      ctx.lineTo(v, rectSize.height);
    });
    ctx.stroke();
  });
}

function renderYGroups(ctx: CanvasCTX, rectSize: Size, stroke: StrokeStyle, yList: ResolvedGridValue[]) {
  const yGroups = groupBy(yList, (v) => v.scale);
  const baseStrokeWidth = getStrokeWidth(stroke);

  Object.values(yGroups).forEach((group) => {
    const lineScale = group[0].scale;
    if (lineScale <= 0) return;

    applyStrokeStyle(ctx, {
      ...stroke,
      width: baseStrokeWidth * lineScale,
    });
    ctx.beginPath();
    group.forEach(({ v }) => {
      ctx.moveTo(0, v);
      ctx.lineTo(rectSize.width, v);
    });
    ctx.stroke();
  });
}

function getGridLabelSize(shape: CompoundGridShape): number {
  const sum = shape.grid.items.reduce((sum, item) => sum + item.value, 0);
  const ave = divideSafely(sum, shape.grid.items.length, shape.width);
  return Math.min(shape.width * 0.3, shape.height * 0.3, ave * 0.5);
}

function getLabelWidth(fontSize: number, label: string): number {
  return (fontSize / 2) * label.length;
}
