import { IVec2, applyAffine, getOuterRectangle } from "okageo";
import { Shape } from "../../../models";
import { applyCurvePath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { findBetterShapeAt, ShapeComposite } from "../../shapeComposite";
import { AppCanvasState } from "./core";
import { LinkInfo } from "../types";
import { getShapeTextBounds } from "../../../shapes";
import { getLinkAt } from "../../../utils/textEditor";
import { getRectPoints } from "../../../utils/geometry";
import { isShapeInteratctiveWithinViewport } from "./commons";

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
    let hoveredShapeId: string | undefined;

    return {
      ...src,
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerhover": {
            const shapeComposite = ctx.getShapeComposite();
            const selectedId = ctx.getLastSelectedShapeId();
            const selectedShape = selectedId ? shapeComposite.shapeMap[selectedId] : undefined;
            const selectionScope = selectedShape ? shapeComposite.getSelectionScope(selectedShape) : undefined;

            let shape = findBetterShapeAt(
              shapeComposite,
              event.data.current,
              selectionScope,
              undefined,
              ctx.getScale(),
            );
            shape = shape && isShapeInteratctiveWithinViewport(ctx, shape) ? shape : undefined;

            if (hoveredShapeId !== shape?.id) {
              hoveredShapeId = shape?.id;
              ctx.redraw();
            }

            const linkInfo = shape ? getInlineLinkInfoAt(shapeComposite, shape, event.data.current) : undefined;
            const prev = ctx.getLinkInfo();
            if (prev?.key !== linkInfo?.key) {
              ctx.setCursor(linkInfo ? "pointer" : undefined);
              ctx.setLinkInfo(linkInfo);
            }
            break;
          }
          case "shape-highlight": {
            switch (event.data.meta.type) {
              case "outline": {
                hoveredShapeId = event.data.id;
                ctx.redraw();
                break;
              }
            }
          }
        }

        return src.handleEvent(ctx, event);
      },
      render: (ctx, renderCtx) => {
        // Avoid highlighting selected shape.
        // => It should have certain selected appearance provided by other state.
        if (hoveredShapeId && !ctx.getSelectedShapeIdMap()[hoveredShapeId]) {
          const sc = ctx.getShapeComposite();
          const shape = sc.mergedShapeMap[hoveredShapeId];
          if (shape) {
            const style = ctx.getStyleScheme();
            const scale = ctx.getScale();
            renderCtx.beginPath();
            sc.getHighlightPaths(shape).forEach((path) => applyCurvePath(renderCtx, path.path, path.curves));
            applyStrokeStyle(renderCtx, {
              color: style.selectionSecondaly,
              width: style.selectionLineWidth * scale,
              dash: "short",
            });
            renderCtx.stroke();
          }
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
