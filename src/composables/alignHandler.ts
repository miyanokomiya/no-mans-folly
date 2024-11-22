import {
  AffineMatrix,
  IRectangle,
  IVec2,
  add,
  applyAffine,
  getCenter,
  getRectCenter,
  isZero,
  multiAffines,
  sub,
} from "okageo";
import { BoxValues4, Direction2, Direction4, EntityPatchInfo, Shape, StyleScheme } from "../models";
import { AlignBoxShape, isAlignBoxShape } from "../shapes/align/alignBox";
import { AlignLayoutNode, alignLayout } from "../utils/layouts/align";
import { getBranchPath } from "../utils/tree";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { DocOutput } from "../models/document";
import { createShape } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import {
  ISegment,
  TAU,
  getD2,
  getDistanceBetweenPointAndRect,
  getRotateFn,
  getRotatedAtAffine,
  getRotationAffines,
  isPointCloseToSegment,
  isPointOnRectangle,
  translateRect,
} from "../utils/geometry";
import { applyDefaultStrokeStyle, applyStrokeStyle } from "../utils/strokeStyle";
import { applyFillStyle } from "../utils/fillStyle";
import { renderArrowUnit, renderOutlinedCircle, renderRoundedSegment, renderValueLabel } from "../utils/renderer";
import { COLORS } from "../utils/color";
import { getPaddingRect } from "../utils/boxPadding";
import { isLineShape } from "../shapes/line";
import { isObjectEmpty, toMap } from "../utils/commons";
import { ANCHOR_SIZE, DIRECTION_ANCHOR_SIZE } from "./shapeHandlers/simplePolygonHandler";
import { generateKeyBetween } from "../utils/findex";

export type AlignHitResult = {
  seg: ISegment;
  findexBetween: [string | null, string | null];
};

interface AlignHandlerOption {
  getShapeComposite: () => ShapeComposite;
  alignBoxId: string;
}

export function newAlignHandler(option: AlignHandlerOption) {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const alignBox = shapeMap[option.alignBoxId] as AlignBoxShape;

  const alignBoxRect = {
    x: alignBox.p.x,
    y: alignBox.p.y,
    width: alignBox.width,
    height: alignBox.height,
  };
  const { rotateAffine, derotateAffine } = getRotationAffines(alignBox.rotation, getRectCenter(alignBoxRect));

  const siblingIds = shapeComposite.mergedShapeTreeMap[alignBox.id].children.map((c) => c.id);

  const siblingRects = siblingIds.map<[string, IRectangle]>((id) => {
    const shape = shapeMap[id];
    const derotatedShape = { ...shape, ...shapeComposite.transformShape(shape, derotateAffine) };
    const localRect = shapeComposite.getShapeTreeLocalRect(shape);
    return [id, translateRect(localRect, derotatedShape.p)];
  });

  function hitTest(p: IVec2): AlignHitResult | undefined {
    let result: AlignHitResult | undefined;

    // When there's no sibling, test with align box itself.
    if (siblingRects.length === 0) {
      if (isPointOnRectangle(alignBoxRect, p)) {
        result = {
          seg: [
            { x: alignBoxRect.x, y: alignBoxRect.y },
            { x: alignBoxRect.x + alignBoxRect.width, y: alignBoxRect.y },
          ],
          findexBetween: [alignBox.findex, null],
        };
      }
    } else {
      const derotatedP = applyAffine(derotateAffine, p);
      const evaluated = siblingRects.map<[string, IRectangle, number]>(([id, rect]) => [
        id,
        rect,
        getDistanceBetweenPointAndRect(derotatedP, rect),
      ]);
      const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];
      const closestIndex = siblingIds.findIndex((id) => id === closestId);
      const closestShape = shapeMap[closestId];

      if (alignBox.direction === 0) {
        if (derotatedP.y < closestRect.y + closestRect.height / 2) {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y },
              { x: closestRect.x + closestRect.width, y: closestRect.y },
            ],
            findexBetween: [
              closestIndex === 0 ? null : shapeMap[siblingIds[closestIndex - 1]].findex,
              closestShape.findex,
            ],
          };
        } else {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y + closestRect.height },
              { x: closestRect.x + closestRect.width, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestShape.findex,
              closestIndex === siblingIds.length - 1 ? null : shapeMap[siblingIds[closestIndex + 1]].findex,
            ],
          };
        }
      } else {
        if (derotatedP.x < closestRect.x + closestRect.width / 2) {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y },
              { x: closestRect.x, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestIndex === 0 ? null : shapeMap[siblingIds[closestIndex - 1]].findex,
              closestShape.findex,
            ],
          };
        } else {
          result = {
            seg: [
              { x: closestRect.x + closestRect.width, y: closestRect.y },
              { x: closestRect.x + closestRect.width, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestShape.findex,
              closestIndex === siblingIds.length - 1 ? null : shapeMap[siblingIds[closestIndex + 1]].findex,
            ],
          };
        }
      }
    }

    if (result) {
      return {
        findexBetween: result.findexBetween,
        seg: [applyAffine(rotateAffine, result.seg[0]), applyAffine(rotateAffine, result.seg[1])],
      };
    }

    return;
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: AlignHitResult) {
    if (hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * 2 * scale });
      ctx.beginPath();
      ctx.moveTo(hitResult.seg[0].x, hitResult.seg[0].y);
      ctx.lineTo(hitResult.seg[1].x, hitResult.seg[1].y);
      ctx.stroke();
    }
  }

  function isAlignChanged(idSet: Set<string>): boolean {
    return idSet.has(alignBox.id) || siblingIds.some((id) => idSet.has(id));
  }

  return { hitTest, render, isAlignChanged };
}
export type AlignHandler = ReturnType<typeof newAlignHandler>;

const ALIGN_ITEMS_ANCHOR_SIZE = 7;
const PADDING_ANCHOR_SIZE = 8;

export type AlignBoxHitResult =
  | AlignBoxDirectionHitResult
  | AlignBoxAlignItemsHitResult
  | AlignBoxBaseSizeHitResult
  | AlignBoxPaddingHitResult
  | AlignBoxGapHitResult
  | AlignBoxResizeHitResult;

type AlignBoxDirectionHitResult = {
  type: "direction";
  direction: Direction2;
  p: IVec2;
};

type AlignBoxAlignItemsHitResult = {
  type: "align-items";
  value: AlignBoxShape["alignItems"];
  p: IVec2;
};

type AlignBoxBaseSizeHitResult = {
  type: "optimize-width" | "optimize-height";
  p: IVec2;
};

export type AlignBoxPaddingHitResult = {
  type: "padding-top" | "padding-right" | "padding-bottom" | "padding-left";
  seg: ISegment;
};

export type AlignBoxGapHitResult = {
  type: "gap-r" | "gap-c";
  seg: ISegment;
};

export type AlignBoxResizeHitResult = {
  type: "resize-by-segment";
  index: Direction4;
  p: IVec2;
};

export function newAlignBoxHandler(option: AlignHandlerOption) {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const alignBox = shapeMap[option.alignBoxId] as AlignBoxShape;
  const alignBoxRect = {
    x: alignBox.p.x,
    y: alignBox.p.y,
    width: alignBox.width,
    height: alignBox.height,
  };
  const { rotateAffine, derotateAffine } = getRotationAffines(alignBox.rotation, getRectCenter(alignBoxRect));
  const alignBoxRectWithPadding = getPaddingRect(
    alignBox.padding ? { value: alignBox.padding } : undefined,
    alignBoxRect,
  );

  const directionAnchor: AlignBoxDirectionHitResult =
    alignBox.direction === 0
      ? {
          type: "direction",
          direction: 1,
          p: { x: alignBoxRect.x + DIRECTION_ANCHOR_SIZE * 2, y: alignBoxRect.y - DIRECTION_ANCHOR_SIZE * 3 },
        }
      : {
          type: "direction",
          direction: 0,
          p: { x: alignBoxRect.x - DIRECTION_ANCHOR_SIZE * 3, y: alignBoxRect.y + DIRECTION_ANCHOR_SIZE * 2 },
        };

  const alignItemsAnchors: AlignBoxAlignItemsHitResult[] = [
    {
      type: "align-items",
      value: "start",
      p:
        alignBox.direction === 0
          ? {
              x: alignBoxRectWithPadding.x + DIRECTION_ANCHOR_SIZE,
              y: alignBoxRectWithPadding.y - DIRECTION_ANCHOR_SIZE * 2,
            }
          : {
              x: alignBoxRectWithPadding.x - DIRECTION_ANCHOR_SIZE * 2,
              y: alignBoxRectWithPadding.y + DIRECTION_ANCHOR_SIZE,
            },
    },
    {
      type: "align-items",
      value: "center",
      p:
        alignBox.direction === 0
          ? {
              x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width / 2,
              y: alignBoxRectWithPadding.y - DIRECTION_ANCHOR_SIZE * 2,
            }
          : {
              x: alignBoxRectWithPadding.x - DIRECTION_ANCHOR_SIZE * 2,
              y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height / 2,
            },
    },
    {
      type: "align-items",
      value: "end",
      p:
        alignBox.direction === 0
          ? {
              x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width - DIRECTION_ANCHOR_SIZE,
              y: alignBoxRectWithPadding.y - DIRECTION_ANCHOR_SIZE * 2,
            }
          : {
              x: alignBoxRectWithPadding.x - DIRECTION_ANCHOR_SIZE * 2,
              y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height - DIRECTION_ANCHOR_SIZE,
            },
    },
  ];

  const resizeAnchors: AlignBoxResizeHitResult[] = [
    {
      type: "resize-by-segment",
      index: 1,
      p:
        alignBox.direction === 0
          ? {
              x: alignBoxRect.x + alignBoxRect.width / 2,
              y: alignBoxRect.y + alignBoxRect.height,
            }
          : {
              x: alignBoxRect.x + alignBoxRect.width,
              y: alignBoxRect.y + alignBoxRect.height / 2,
            },
    },
    {
      type: "resize-by-segment",
      index: 2,
      p:
        alignBox.direction === 0
          ? {
              x: alignBoxRect.x + alignBoxRect.width,
              y: alignBoxRect.y + alignBoxRect.height / 2,
            }
          : {
              x: alignBoxRect.x + alignBoxRect.width / 2,
              y: alignBoxRect.y + alignBoxRect.height,
            },
    },
  ];

  const baseWidthOptimizeAnchor: AlignBoxBaseSizeHitResult | undefined =
    alignBox.baseWidth === undefined
      ? undefined
      : {
          type: "optimize-width",
          p: {
            x: alignBoxRect.x + alignBoxRect.width + DIRECTION_ANCHOR_SIZE * 2,
            y: alignBoxRect.y + alignBoxRect.height / 2,
          },
        };

  const baseHeightOptimizeAnchor: AlignBoxBaseSizeHitResult | undefined =
    alignBox.baseHeight === undefined
      ? undefined
      : {
          type: "optimize-height",
          p: {
            x: alignBoxRect.x + alignBoxRect.width / 2,
            y: alignBoxRect.y + alignBoxRect.height + DIRECTION_ANCHOR_SIZE * 2,
          },
        };

  // Keep the box order: top, right, bottom, left
  const paddingAnchors: AlignBoxPaddingHitResult[] = [
    {
      type: "padding-top",
      seg: [
        { x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width * 0.4, y: alignBoxRectWithPadding.y },
        { x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width * 0.6, y: alignBoxRectWithPadding.y },
      ],
    },
    {
      type: "padding-right",
      seg: [
        {
          x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width,
          y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height * 0.4,
        },
        {
          x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width,
          y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height * 0.6,
        },
      ],
    },
    {
      type: "padding-bottom",
      seg: [
        {
          x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width * 0.4,
          y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height,
        },
        {
          x: alignBoxRectWithPadding.x + alignBoxRectWithPadding.width * 0.6,
          y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height,
        },
      ],
    },
    {
      type: "padding-left",
      seg: [
        { x: alignBoxRectWithPadding.x, y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height * 0.4 },
        { x: alignBoxRectWithPadding.x, y: alignBoxRectWithPadding.y + alignBoxRectWithPadding.height * 0.6 },
      ],
    },
  ];

  // Keep the order: row, column
  const gapAnchors: AlignBoxGapHitResult[] = [
    {
      type: "gap-r",
      seg: [
        {
          x: alignBoxRect.x + alignBoxRect.width * 0.8,
          y: alignBoxRect.y + alignBoxRect.height + DIRECTION_ANCHOR_SIZE * 2,
        },
        {
          x: alignBoxRect.x + alignBoxRect.width * 0.9,
          y: alignBoxRect.y + alignBoxRect.height + DIRECTION_ANCHOR_SIZE * 2,
        },
      ],
    },
    {
      type: "gap-c",
      seg: [
        {
          x: alignBoxRect.x + alignBoxRect.width + DIRECTION_ANCHOR_SIZE * 2,
          y: alignBoxRect.y + alignBoxRect.height * 0.8,
        },
        {
          x: alignBoxRect.x + alignBoxRect.width + DIRECTION_ANCHOR_SIZE * 2,
          y: alignBoxRect.y + alignBoxRect.height * 0.9,
        },
      ],
    },
  ];

  function hitTest(p: IVec2, scale: number): AlignBoxHitResult | undefined {
    const derotatedP = applyAffine(derotateAffine, p);
    const threshold = DIRECTION_ANCHOR_SIZE * scale;
    const thresholdD2 = threshold * threshold;

    if (getD2(sub(directionAnchor.p, derotatedP)) <= thresholdD2) {
      return directionAnchor;
    }

    {
      const resizeThresholdD2 = Math.pow(ANCHOR_SIZE * scale, 2);
      const hit = resizeAnchors.find((a) => getD2(sub(a.p, derotatedP)) <= resizeThresholdD2);
      if (hit) {
        return hit;
      }
    }

    const alignItemsThreshold = ALIGN_ITEMS_ANCHOR_SIZE * scale;
    const alignItemsThresholdD2 = alignItemsThreshold * alignItemsThreshold;
    const alignItemsAnchor = alignItemsAnchors.find(({ p }) => getD2(sub(p, derotatedP)) <= alignItemsThresholdD2);
    if (alignItemsAnchor && alignItemsAnchor.value !== (alignBox.alignItems ?? "start")) {
      return alignItemsAnchor;
    }

    if (baseWidthOptimizeAnchor && getD2(sub(baseWidthOptimizeAnchor.p, derotatedP)) <= thresholdD2) {
      return baseWidthOptimizeAnchor;
    }

    if (baseHeightOptimizeAnchor && getD2(sub(baseHeightOptimizeAnchor.p, derotatedP)) <= thresholdD2) {
      return baseHeightOptimizeAnchor;
    }

    const segThreshold = PADDING_ANCHOR_SIZE * scale;
    const paddingAnchor = paddingAnchors.find(({ seg }) => isPointCloseToSegment(seg, derotatedP, segThreshold));
    if (paddingAnchor) {
      return paddingAnchor;
    }

    const gapAnchor = gapAnchors.find(({ seg }) => isPointCloseToSegment(seg, derotatedP, segThreshold));
    if (gapAnchor) {
      return gapAnchor;
    }

    return;
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: AlignBoxHitResult) {
    const threshold = DIRECTION_ANCHOR_SIZE * scale;
    const alignItemsThreshold = ALIGN_ITEMS_ANCHOR_SIZE * scale;
    const segThreshold = PADDING_ANCHOR_SIZE * scale;
    const resizeThreshold = ANCHOR_SIZE * scale;

    ctx.save();
    ctx.transform(...rotateAffine);

    {
      applyDefaultStrokeStyle(ctx);
      applyFillStyle(ctx, { color: style.selectionPrimary });

      ctx.beginPath();
      ctx.arc(directionAnchor.p.x, directionAnchor.p.y, threshold, 0, TAU);
      ctx.fill();

      [baseWidthOptimizeAnchor, baseHeightOptimizeAnchor].forEach((a) => {
        if (!a) return;
        ctx.beginPath();
        ctx.arc(a.p.x, a.p.y, threshold, 0, TAU);
        ctx.fill();
      });

      alignItemsAnchors.forEach((a) => {
        ctx.beginPath();
        ctx.arc(a.p.x, a.p.y, alignItemsThreshold, 0, TAU);
        ctx.fill();
      });

      const selectedAlignItemsIndex = alignBox.alignItems === "center" ? 1 : alignBox.alignItems === "end" ? 2 : 0;
      applyFillStyle(ctx, { color: COLORS.WHITE });
      ctx.beginPath();
      ctx.arc(
        alignItemsAnchors[selectedAlignItemsIndex].p.x,
        alignItemsAnchors[selectedAlignItemsIndex].p.y,
        alignItemsThreshold * 0.5,
        0,
        TAU,
      );
      ctx.fill();

      if (hitResult) {
        switch (hitResult.type) {
          case "align-items": {
            applyFillStyle(ctx, { color: style.selectionSecondaly });
            ctx.beginPath();
            ctx.arc(hitResult.p.x, hitResult.p.y, alignItemsThreshold, 0, TAU);
            ctx.fill();
            break;
          }
          case "direction":
          case "optimize-width":
          case "optimize-height": {
            applyFillStyle(ctx, { color: style.selectionSecondaly });
            ctx.beginPath();
            ctx.arc(hitResult.p.x, hitResult.p.y, threshold, 0, TAU);
            ctx.fill();
          }
        }
      }

      applyFillStyle(ctx, { color: COLORS.WHITE });
      renderArrowUnit(ctx, directionAnchor.p, directionAnchor.direction === 0 ? Math.PI / 2 : 0, threshold * 0.7);
      [baseWidthOptimizeAnchor, baseHeightOptimizeAnchor].forEach((a) => {
        if (!a) return;
        renderArrowUnit(ctx, a.p, a.type === "optimize-width" ? Math.PI : -Math.PI / 2, threshold * 0.7);
      });
    }

    {
      renderRoundedSegment(
        ctx,
        gapAnchors.map(({ seg }) => seg).concat(paddingAnchors.map(({ seg }) => seg)),
        segThreshold,
        style.selectionPrimary,
        COLORS.WHITE,
      );

      if (hitResult && "seg" in hitResult) {
        renderRoundedSegment(ctx, [hitResult.seg], segThreshold, style.selectionSecondaly, COLORS.WHITE);
      }
    }

    resizeAnchors.forEach((a) => {
      renderOutlinedCircle(
        ctx,
        a.p,
        resizeThreshold,
        hitResult === a ? style.selectionSecondaly : style.transformAnchor,
      );
    });

    ctx.restore();
  }

  function getModifiedPadding(
    type: AlignBoxPaddingHitResult["type"],
    from: IVec2,
    to: IVec2,
    modiifer?: { bothSides?: boolean; allSides?: boolean },
  ): BoxValues4 | undefined {
    const derotatedFrom = applyAffine(derotateAffine, from);
    const derotatedTo = applyAffine(derotateAffine, to);
    const vec = sub(derotatedTo, derotatedFrom);
    const src = alignBox.padding ?? [0, 0, 0, 0];

    switch (type) {
      case "padding-top": {
        const d = Math.round(vec.y);
        if (modiifer?.allSides) return src.map(() => src[0] + d) as BoxValues4;
        if (modiifer?.bothSides) return [src[0] + d, src[1], src[0] + d, src[3]];
        if (d === 0) return undefined;
        return [src[0] + d, src[1], src[2], src[3]];
      }
      case "padding-right": {
        const d = -Math.round(vec.x);
        if (modiifer?.allSides) return src.map(() => src[1] + d) as BoxValues4;
        if (modiifer?.bothSides) return [src[0], src[1] + d, src[2], src[1] + d];
        if (d === 0) return undefined;
        return [src[0], src[1] + d, src[2], src[3]];
      }
      case "padding-bottom": {
        const d = -Math.round(vec.y);
        if (modiifer?.allSides) return src.map(() => src[2] + d) as BoxValues4;
        if (modiifer?.bothSides) return [src[2] + d, src[1], src[2] + d, src[3]];
        if (d === 0) return undefined;
        return [src[0], src[1], src[2] + d, src[3]];
      }
      case "padding-left": {
        const d = Math.round(vec.x);
        if (modiifer?.allSides) return src.map(() => src[3] + d) as BoxValues4;
        if (modiifer?.bothSides) return [src[0], src[3] + d, src[2], src[3] + d];
        if (d === 0) return undefined;
        return [src[0], src[1], src[2], src[3] + d];
      }
    }
  }

  function renderModifiedPadding(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    nextPadding?: BoxValues4,
  ) {
    const segThreshold = PADDING_ANCHOR_SIZE * scale;

    ctx.save();
    ctx.transform(...rotateAffine);

    const srcPadding = alignBox.padding ?? [0, 0, 0, 0];
    const nextPaddingDefined = nextPadding ?? srcPadding;
    const diff = { x: nextPaddingDefined?.[3] - srcPadding[3], y: nextPaddingDefined?.[0] - srcPadding[0] };
    paddingAnchors.forEach(({ seg }, i) => {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: segThreshold });
      ctx.beginPath();
      ctx.moveTo(seg[0].x + diff.x, seg[0].y + diff.y);
      ctx.lineTo(seg[1].x + diff.x, seg[1].y + diff.y);
      ctx.stroke();
      const p = add(getCenter(seg[0], seg[1]), diff);
      renderValueLabel(ctx, nextPaddingDefined[i], p, -alignBox.rotation, scale);
    });

    ctx.restore();
  }

  function getModifiedGap(
    type: AlignBoxGapHitResult["type"],
    from: IVec2,
    to: IVec2,
    modiifer?: { both?: boolean },
  ): IVec2 | undefined {
    const derotatedFrom = applyAffine(derotateAffine, from);
    const derotatedTo = applyAffine(derotateAffine, to);
    const vec = sub(derotatedTo, derotatedFrom);
    const src = { x: alignBox.gapC ?? 0, y: alignBox.gapR ?? 0 };

    switch (type) {
      case "gap-r": {
        const d = Math.round(vec.y);
        const v = Math.max(0, src.y + d);
        if (modiifer?.both) return { x: v, y: v };
        if (d === 0) return undefined;
        return { x: src.x, y: v };
      }
      case "gap-c": {
        const d = Math.round(vec.x);
        const v = Math.max(0, src.x + d);
        if (modiifer?.both) return { x: v, y: v };
        if (d === 0) return undefined;
        return { x: v, y: src.y };
      }
    }
  }

  function renderModifiedGap(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, nextGap?: IVec2) {
    const segThreshold = PADDING_ANCHOR_SIZE * scale;

    ctx.save();
    ctx.transform(...rotateAffine);

    const srcGap = { x: alignBox.gapC ?? 0, y: alignBox.gapR ?? 0 };
    const nextGapDefined = nextGap ?? srcGap;
    const diff = sub(nextGapDefined, srcGap);
    gapAnchors.forEach(({ seg }, i) => {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: segThreshold });
      ctx.beginPath();
      ctx.moveTo(seg[0].x + diff.x, seg[0].y + diff.y);
      ctx.lineTo(seg[1].x + diff.x, seg[1].y + diff.y);
      ctx.stroke();
      const p = add(getCenter(seg[0], seg[1]), diff);
      renderValueLabel(ctx, i === 0 ? nextGapDefined.y : nextGapDefined.x, p, -alignBox.rotation, scale);
    });

    ctx.restore();
  }

  return { hitTest, render, getModifiedPadding, renderModifiedPadding, getModifiedGap, renderModifiedGap };
}
export type AlignBoxHandler = ReturnType<typeof newAlignBoxHandler>;

/**
 * "positionDiff" represents the vector from the location of the wrapper rectangle of the shape to the location of the shape.
 * When a shape has children but doesn't accommodate them (e.g. tree_root), the wrapper rectangle doesn't always represent the shape.
 * => The layout result for the wrapper rectangle needs to be adjusted to apply it to the shape.
 */
type AlignLayoutNodeWithMeta = AlignLayoutNode & { positionDiff?: IVec2 };

function treeToLayoutNode(result: AlignLayoutNodeWithMeta[], shapeComposite: ShapeComposite, shape: Shape) {
  const treeNode = shapeComposite.mergedShapeTreeMap[shape.id];
  if (isAlignBoxShape(shape)) {
    result.push({
      id: shape.id,
      findex: shape.findex,
      parentId: shape.parentId ?? "",
      type: "box",
      rect: { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      direction: shape.direction,
      gapC: shape.gapC,
      gapR: shape.gapR,
      baseWidth: shape.baseWidth,
      baseHeight: shape.baseHeight,
      padding: shape.padding,
      alignItems: shape.alignItems,
    });

    treeNode.children.forEach((c) => {
      treeToLayoutNode(result, shapeComposite, shapeComposite.mergedShapeMap[c.id]);
    });
  } else if (shape.parentId) {
    const rect = shapeComposite.getShapeTreeLocalRect(shape);
    result.push({
      id: shape.id,
      findex: shape.findex,
      type: "entity",
      rect,
      parentId: shape.parentId,
      positionDiff: { x: -rect.x, y: -rect.y },
    });
  }
}

function toLayoutNodes(
  shapeComposite: ShapeComposite,
  rootId: string,
): { layoutNodes: AlignLayoutNodeWithMeta[]; rootShape: AlignBoxShape } {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const rootShape = shapeComposite.mergedShapeMap[root.id] as AlignBoxShape;

  const c = getRectCenter({ x: rootShape.p.x, y: rootShape.p.y, width: rootShape.width, height: rootShape.height });
  const rotateFn = getRotateFn(rootShape.rotation, c);

  const layoutNodes: AlignLayoutNodeWithMeta[] = [];
  treeToLayoutNode(layoutNodes, shapeComposite, rootShape);
  const adjustedLayoutNodes = layoutNodes.map((node) => {
    if (rootShape.id === node.id) return node;

    return {
      ...node,
      rect: { ...node.rect, ...rotateFn(node.rect, true) },
    };
  });

  return { layoutNodes: adjustedLayoutNodes, rootShape };
}

export function getNextAlignLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const { layoutNodes, rootShape } = toLayoutNodes(shapeComposite, rootId);
  const layoutNodeMap = toMap(layoutNodes);
  const result = alignLayout(layoutNodes);

  const rootRotateAffine =
    rootShape.rotation !== 0
      ? getRotatedAtAffine(getRectCenter(layoutNodeMap[rootId].rect), rootShape.rotation)
      : undefined;
  const ret: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id];
    const srcNode = layoutNodeMap[r.id];
    const srcPosition = shapeComposite.getShapeActualPosition(s);

    const p = add(r.rect, layoutNodeMap[r.id].positionDiff ?? { x: 0, y: 0 });
    const v = sub(p, srcPosition);
    const affines: AffineMatrix[] = [];
    if (rootRotateAffine) {
      affines.push(rootRotateAffine);
    }
    if (!isZero(v)) {
      affines.push([1, 0, 0, 1, v.x, v.y]);
    }
    if (r.rect.width !== srcNode.rect.width || r.rect.height !== srcNode.rect.height) {
      affines.push(
        [1, 0, 0, 1, r.rect.x, r.rect.y],
        [r.rect.width / srcNode.rect.width, 0, 0, r.rect.height / srcNode.rect.height, 0, 0],
        [1, 0, 0, 1, -r.rect.x, -r.rect.y],
      );
    }
    if (s.rotation !== 0) {
      affines.push(getRotatedAtAffine(getRectCenter(shapeComposite.getWrapperRect(s)), -s.rotation));
    }
    if (affines.length === 0) return;

    const affine = multiAffines(affines);
    if (isAlignBoxShape(s)) {
      const val = shapeComposite.transformShape(s, affine);
      if (!isObjectEmpty(val)) {
        ret[s.id] = val;
      }
    } else {
      // Need to deal with all children as well when the shape isn't align box.
      shapeComposite.getAllTransformTargets([s.id]).forEach((target) => {
        const val = shapeComposite.transformShape(target, affine);
        if (!isObjectEmpty(val)) {
          ret[target.id] = val;
        }
      });
    }
  });

  return ret;
}

export function getAlignLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  return getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo).map((id) => {
    return () => getNextAlignLayout(updatedComposite, id);
  });
}

export function getModifiedAlignRootIds(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  const targetRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  const updatedShapeMap = updatedComposite.shapeMap;

  srcComposite.mergedShapeTreeMap;

  const saveParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(srcComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(shapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  const saveUpdatedParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(updatedComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(updatedShapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      saveUpdatedParentBoxes(shape);
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const currentAlignId = getBranchPath(srcComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(shapeMap[id])) {
          return true;
        }
      });

      const nextAlignId = getBranchPath(updatedComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(updatedShapeMap[id])) {
          return true;
        }
      });

      if (currentAlignId && nextAlignId && id === currentAlignId && currentAlignId !== nextAlignId) {
        // Root board becomes a child of other board.
        // => Should pick eventual root board only.
        targetRootIdSet.add(nextAlignId);
      } else {
        if (currentAlignId) targetRootIdSet.add(currentAlignId);
        if (nextAlignId) targetRootIdSet.add(nextAlignId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = shapeMap[id];
      if (!shape) return;

      if (isAlignBoxShape(shape)) {
        deletedRootIdSet.add(id);
      }
      saveParentBoxes(shape);
    });
  }

  return Array.from(targetRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

export function canAttendToAlignBox(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (isLineShape(shape)) return false;
  if (!shape.parentId) return true;

  const parent = shapeComposite.shapeMap[shape.parentId];
  if (!parent) return true;

  return isAlignBoxShape(parent);
}

export function generateAlignTemplate(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "generateUuid" | "createLastIndex">,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const root = createShape<AlignBoxShape>(ctx.getShapeStruct, "align_box", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(ctx.createLastIndex(), null),
    baseWidth: undefined,
    baseHeight: undefined,
    direction: 1,
    padding: [10, 10, 10, 10],
    gapC: 10,
    gapR: 10,
  });
  const column0 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(root.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const column1 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextAlignLayout(composite, root.id);
  const shapes = composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));

  return { shapes, docMap: {} };
}
