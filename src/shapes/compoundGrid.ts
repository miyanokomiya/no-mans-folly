import { IVec2, MINVALUE } from "okageo";
import { Color, Shape, Size } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { ShapeSnappingLines, ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { groupBy, mapReduce } from "../utils/commons";
import { applyDefaultTextStyle, applyLocalSpace } from "../utils/renderer";
import { ISegment, normalizeLineRotation } from "../utils/geometry";
import { CanvasCTX } from "../utils/types";

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
      height: arg.height ?? 100,
      grid: arg.grid ?? {
        items: [{ value: 10, scale: 0.5 }, { value: 20, scale: 0.5 }, { value: 10 }],
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

      renderGridLabels(ctx, rect, outlineWidth, shape.stroke.color, xList, yList, () => {
        const xGroups = groupBy(xList, (v) => v.scale);
        const yGroups = groupBy(yList, (v) => v.scale);

        Object.values(xGroups).forEach((group) => {
          const lineScale = group[0].scale;
          if (lineScale <= 0) return;

          applyStrokeStyle(ctx, {
            ...shape.stroke,
            width: baseStrokeWidth * lineScale,
          });
          ctx.beginPath();
          group.forEach(({ v }) => {
            ctx.moveTo(v, 0);
            ctx.lineTo(v, shape.height);
          });
          ctx.stroke();
        });
        Object.values(yGroups).forEach((group) => {
          const lineScale = group[0].scale;
          if (lineScale <= 0) return;

          applyStrokeStyle(ctx, {
            ...shape.stroke,
            width: baseStrokeWidth * lineScale,
          });
          ctx.beginPath();
          group.forEach(({ v }) => {
            ctx.moveTo(0, v);
            ctx.lineTo(shape.width, v);
          });
          ctx.stroke();
        });
      });
    });
  },
  createSVGElementInfo(shape, shapeContext) {
    return recntagleStruct.createSVGElementInfo?.(shape, shapeContext);
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
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
type ResolvedGridValue = { v: number; scale: number };

/**
 * Returned list contains neither "0" nor "bound".
 * Each value in the returned list represents absolute distance.
 */
function resolveGridValues(grid: CompoundGrid, bound: number): ResolvedGridValue[] {
  const items = grid.items.filter((v) => v.value >= 0);
  if (items.length === 0) return [];

  const list: ReturnType<typeof resolveGridValues> = [];
  let total = 0;

  switch (grid.type) {
    case 2: {
      const totalValue = items.reduce((sum, v) => sum + v.value, 0);
      items.forEach((v) => {
        total += (bound * v.value) / totalValue;
        list.push({ v: total, scale: v.scale ?? 1 });
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

        list.push({ v: total, scale: item.scale ?? 1 });
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

function renderGridLabels(
  ctx: CanvasCTX,
  rectSize: Size,
  outlineWidth: number,
  color: Color,
  xList: ResolvedGridValue[],
  yList: ResolvedGridValue[],
  renderGrid: () => void,
) {
  let maxValue = 0;
  xList.forEach(({ v }, i) => {
    maxValue = Math.max(v - (0 < i ? xList[i - 1].v : 0), maxValue);
  });
  yList.forEach(({ v }, i) => {
    maxValue = Math.max(v - (0 < i ? yList[i - 1].v : 0), maxValue);
  });

  const labelSize = Math.min(rectSize.width * 0.3, rectSize.height * 0.3, maxValue * 0.4);
  const clipRegionForGrid = new Path2D();
  clipRegionForGrid.rect(
    -outlineWidth,
    -outlineWidth,
    rectSize.width + outlineWidth * 2,
    rectSize.height + outlineWidth * 2,
  );

  if (xList.length > 0) {
    if (yList.length > 0) {
      clipRegionForGrid.rect(labelSize / 2, labelSize, rectSize.width, labelSize);
    } else {
      clipRegionForGrid.rect(outlineWidth, labelSize, rectSize.width, labelSize);
    }
  }
  if (yList.length > 0) {
    if (xList.length > 0) {
      clipRegionForGrid.rect(labelSize, labelSize * 2, labelSize, rectSize.height);
    } else {
      clipRegionForGrid.rect(labelSize, outlineWidth, labelSize, rectSize.height);
    }
  }

  ctx.save();
  ctx.clip(clipRegionForGrid, "evenodd");
  renderGrid();
  ctx.restore();

  if (xList.length > 0) {
    xList.forEach(({ v }, i) => {
      const d = v - (0 < i ? xList[i - 1].v : 0);
      applyDefaultTextStyle(ctx, Math.min(labelSize, d * 0.5), i === 0 && yList.length > 0 ? "center" : "right", true);
      applyFillStyle(ctx, { color });
      ctx.beginPath();
      ctx.fillText(`${v}`, v, labelSize * 1.5);
    });
  }
  if (yList.length > 0) {
    yList.forEach(({ v }, i) => {
      if (i === 0 && xList.length > 0) return;

      const d = v - (0 < i ? yList[i - 1].v : 0);
      applyDefaultTextStyle(ctx, Math.min(labelSize, d * 0.5), "center");
      applyFillStyle(ctx, { color });
      ctx.beginPath();
      ctx.fillText(`${v}`, labelSize * 1.5, v);
    });
  }
}
