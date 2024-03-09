import { IVec2, applyAffine, getOuterRectangle } from "okageo";
import { Shape } from "../../../models";
import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { ShapeComposite } from "../../shapeComposite";
import { AppCanvasState } from "./core";
import { LinkInfo } from "../types";
import { getShapeTextBounds } from "../../../shapes";
import { getLinkAt } from "../../../utils/textEditor";
import { getRectPoints } from "../../../utils/geometry";

/**
 * Event flow specifications.
 * - "handleEvent" of this factory function is always called first.
 *   - No state transition can take place here.
 * - "handleEvent" of the target state is always called afterwards.
 *   - Its state transition takes place here.
 */
export function defineIntransientState<A extends any[]>(
  createFn: (...o: A) => AppCanvasState,
): (...o: A) => AppCanvasState {
  return (...o: A) => {
    const src = createFn(...o);
    let hoveredShape: Shape | undefined;

    return {
      ...src,
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerhover": {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(
              event.data.current,
              undefined,
              undefined,
              undefined,
              ctx.getScale(),
            );
            const linkInfo = shape ? getInlineLinkInfoAt(shapeComposite, shape, event.data.current) : undefined;

            if (hoveredShape?.id !== shape?.id) {
              hoveredShape = shape;
              ctx.redraw();
            }

            const prev = ctx.getLinkInfo();
            if (prev?.key !== linkInfo?.key) {
              ctx.setCursor(linkInfo ? "pointer" : undefined);
              ctx.setLinkInfo(linkInfo);
            }
            break;
          }
        }

        return src.handleEvent(ctx, event);
      },
      render: (ctx, renderCtx) => {
        if (hoveredShape) {
          const shapeComposite = ctx.getShapeComposite();
          const path = shapeComposite.getLocalRectPolygon(hoveredShape);
          applyStrokeStyle(renderCtx, {
            color: ctx.getStyleScheme().selectionSecondaly,
            width: 2 * ctx.getScale(),
            dash: "short",
          });
          renderCtx.beginPath();
          applyPath(renderCtx, path, true);
          renderCtx.stroke();
        }

        src.render?.(ctx, renderCtx);
      },
    };
  };
}

function getInlineLinkInfoAt(shapeComposite: ShapeComposite, shape: Shape, p: IVec2): LinkInfo | undefined {
  const docInfo = shapeComposite.getDocCompositeCache(shape.id);
  if (!docInfo) return;

  const bounds = getShapeTextBounds(shapeComposite.getShapeStruct, shape);
  const adjustedP = applyAffine(bounds.affineReverse, p);
  const info = getLinkAt(docInfo, adjustedP);
  if (!info) return;

  const actualBounds = getOuterRectangle([getRectPoints(info.bounds).map((p) => applyAffine(bounds.affine, p))]);
  return {
    shapeId: shape.id,
    link: info.link,
    docRange: info.docRange,
    bounds: actualBounds,
    key: `${shape.id}_${info.docRange[0]}`,
  };
}
