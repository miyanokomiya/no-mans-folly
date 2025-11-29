import { multiAffines } from "okageo";
import { Shape } from "../models";
import { mapReduce } from "../utils/commons";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { getRotatedRectAffine, getViewportForRectWithinSize, getWrapperRect, isZeroSize } from "../utils/geometry";
import { applyPath } from "../utils/renderer";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { renderTransform, SVGElementInfo } from "../utils/svgElements";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as rectangleStruct } from "./rectangle";
import { getAllBranchIdsByMap } from "../utils/tree";
import { COLORS } from "../utils/color";

/**
 * Displays the appearance of src shapes.
 * Keeps the original aspect ratio by centering the content.
 */
export type SymbolShape = RectangleShape & { src: string[] };

export const struct: ShapeStruct<SymbolShape> = {
  ...rectangleStruct,
  label: "Symbol",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "symbol",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      src: arg.src ?? [],
    };
  },
  render(ctx, shape, shapeContext, imageStore) {
    if (!shapeContext || isZeroSize(shape)) return rectangleStruct.render(ctx, shape, shapeContext, imageStore);

    const srcIds = shape.src.filter((id) => shapeContext.shapeMap[id]);
    if (srcIds.length === 0) return rectangleStruct.render(ctx, shape, shapeContext, imageStore);

    const srcShapes = srcIds.map((id) => shapeContext.shapeMap[id]);
    const srcRect = getWrapperRect(
      srcShapes.map((s) => shapeContext.getStruct(s.type).getWrapperRect(s, shapeContext, true)),
    );
    if (isZeroSize(srcRect)) return rectangleStruct.render(ctx, shape, shapeContext, imageStore);

    const rectPolygon = this.getLocalRectPolygon(shape);
    if (!shape.fill.disabled) {
      ctx.beginPath();
      applyPath(ctx, rectPolygon, true);
      applyFillStyle(ctx, shape.fill);
      ctx.fill();
    }

    ctx.save();
    if (shape.rotation) {
      ctx.translate(shape.p.x + shape.width / 2, shape.p.y + shape.height / 2);
      ctx.rotate(shape.rotation);
      ctx.translate(-shape.width / 2, -shape.height / 2);
    } else {
      ctx.translate(shape.p.x, shape.p.y);
    }
    const viewAdjust = getViewportForRectWithinSize(srcRect, { width: shape.width, height: shape.height });
    ctx.scale(1 / viewAdjust.scale, 1 / viewAdjust.scale);
    ctx.translate(-viewAdjust.p.x, -viewAdjust.p.y);

    // Symbol shape may create circular reference.
    if (shapeContext.renderingPaths.has(shape.id)) {
      const mw = srcRect.width / 4;
      const mh = srcRect.height / 4;
      applyStrokeStyle(ctx, { color: COLORS.BLACK, width: Math.min(mw, mh) / 4 });
      ctx.beginPath();
      ctx.moveTo(srcRect.x + mw, srcRect.y + mh);
      ctx.lineTo(srcRect.x + srcRect.width - mw, srcRect.y + srcRect.height - mh);
      ctx.moveTo(srcRect.x + mw, srcRect.y + srcRect.height - mh);
      ctx.lineTo(srcRect.x + srcRect.width - mw, srcRect.y + mh);
      ctx.stroke();
    } else {
      shapeContext.renderingPaths.add(shape.id);
      const branchIds = getAllBranchIdsByMap(shapeContext.treeNodeMap, srcIds);
      branchIds.forEach((id) => {
        const s = shapeContext.shapeMap[id];
        shapeContext.getStruct(s.type).render(ctx, s, shapeContext, imageStore);
      });
      shapeContext.renderingPaths.delete(shape.id);
    }

    ctx.restore();

    if (!shape.stroke.disabled) {
      ctx.beginPath();
      applyPath(ctx, rectPolygon, true);
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }
  },
  createSVGElementInfo(shape, shapeContext, imageStore) {
    if (!shapeContext || isZeroSize(shape))
      return rectangleStruct.createSVGElementInfo?.(shape, shapeContext, imageStore);

    const srcIds = shape.src.filter((id) => shapeContext.shapeMap[id]);
    if (srcIds.length === 0) return rectangleStruct.createSVGElementInfo?.(shape, shapeContext, imageStore);

    const srcShapes = srcIds.map((id) => shapeContext.shapeMap[id]);
    const srcRect = getWrapperRect(
      srcShapes.map((s) => shapeContext.getStruct(s.type).getWrapperRect(s, shapeContext, true)),
    );
    if (isZeroSize(srcRect)) return rectangleStruct.createSVGElementInfo?.(shape, shapeContext, imageStore);

    const viewAdjust = getViewportForRectWithinSize(srcRect, { width: shape.width, height: shape.height });
    const srcAffine = multiAffines([
      [1 / viewAdjust.scale, 0, 0, 1 / viewAdjust.scale, 0, 0],
      [1, 0, 0, 1, -viewAdjust.p.x, -viewAdjust.p.y],
    ]);

    let contents: SVGElementInfo[];
    // Symbol shape may create circular reference.
    if (shapeContext.renderingPaths.has(shape.id)) {
      const mw = srcRect.width / 4;
      const mh = srcRect.height / 4;
      contents = [
        {
          tag: "line",
          attributes: {
            x1: srcRect.x + mw,
            y1: srcRect.y + mh,
            x2: srcRect.x + srcRect.width - mw,
            y2: srcRect.y + srcRect.height - mh,
            fill: "none",
            ...renderStrokeSVGAttributes({ color: COLORS.BLACK, width: Math.min(mw, mh) / 4 }),
          },
        },
        {
          tag: "line",
          attributes: {
            x1: srcRect.x + mw,
            y1: srcRect.y + srcRect.height - mh,
            x2: srcRect.x + srcRect.width - mw,
            y2: srcRect.y + mh,
            fill: "none",
            ...renderStrokeSVGAttributes({ color: COLORS.BLACK, width: Math.min(mw, mh) / 4 }),
          },
        },
      ];
    } else {
      shapeContext.renderingPaths.add(shape.id);
      const branchIds = getAllBranchIdsByMap(shapeContext.treeNodeMap, srcIds);
      contents = branchIds
        .map((id) => {
          const s = shapeContext.shapeMap[id];
          return shapeContext.getStruct(s.type).createSVGElementInfo?.(s, shapeContext, imageStore);
        })
        .filter((v) => !!v);
      shapeContext.renderingPaths.delete(shape.id);
    }

    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    return {
      tag: "g",
      attributes: { transform: renderTransform(affine) },
      children: [
        ...(shape.fill.disabled
          ? []
          : [
              {
                tag: "rect",
                attributes: {
                  width: shape.width,
                  height: shape.height,
                  stroke: "none",
                  ...renderFillSVGAttributes(shape.fill),
                },
              },
            ]),
        {
          tag: "g",
          attributes: { transform: renderTransform(srcAffine) },
          children: contents,
        },
        ...(shape.stroke.disabled
          ? []
          : [
              {
                tag: "rect",
                attributes: {
                  width: shape.width,
                  height: shape.height,
                  fill: "none",
                  ...renderStrokeSVGAttributes(shape.stroke),
                },
              },
            ]),
      ],
    };
  },
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    const ret: string[] = [];
    shape.src.forEach((id) => {
      if (oldToNewIdMap[id]) {
        ret.push(oldToNewIdMap[id]);
      } else if (!removeNotFound) {
        ret.push(id);
      }
    });
    return { src: ret };
  },
  refreshRelation(shape, availableIdSet) {
    return { src: shape.src.filter((id) => availableIdSet.has(id)) };
  },
  shouldDelete(shape, shapeContext) {
    return !shape.src.some((id) => shapeContext.shapeMap[id]);
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
};

export function isSymbolShape(shape: Shape): shape is SymbolShape {
  return shape.type === "symbol";
}
