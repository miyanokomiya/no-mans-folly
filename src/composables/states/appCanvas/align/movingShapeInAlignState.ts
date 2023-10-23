import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { getNextShapeComposite, newShapeComposite } from "../../../shapeComposite";
import { findexSortFn } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { Shape } from "../../../../models";
import { BoundingBox } from "../../../boundingBox";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { AlignBoxHitResult, AlignHandler, newAlignHandler } from "../../../alignHandler";

interface Option {
  boundingBox?: BoundingBox;
  alignBoxId: string;
}

/**
 * This state is supposed to be stacked on "MovingShape".
 * => "startDragging" and other methods aren't called by this state because of that.
 */
export function newMovingShapeInAlignState(option: Option): AppCanvasState {
  let shapes: Shape[];
  const alignBoxId = option.alignBoxId;
  let alignHandler: AlignHandler;
  let hitResult: AlignBoxHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    alignHandler = newAlignHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "MovingShapeInAlign",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      shapes = ids.map((id) => shapeMap[id]).sort(findexSortFn);

      initHandler(ctx);
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          const alignBox = shapeComposite.mergedShapeMap[alignBoxId];
          if (!shapeComposite.isPointOn(alignBox, event.data.current)) {
            return { type: "break" };
          }

          diff = sub(event.data.current, event.data.start);
          const result = alignHandler.hitTest(event.data.current);
          hitResult = result;
          ctx.redraw();
          return;
        }
        case "pointerup": {
          const shapeComposite = ctx.getShapeComposite();
          if (!hitResult) {
            const patch = shapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
              p[s.id] = { parentId: alignBoxId };
              return p;
            }, {});
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            const layoutPatch = getPatchByLayouts(nextComposite, { update: patch });
            ctx.patchShapes(layoutPatch);
          } else {
            const findexTo = hitResult.findexBetween[1];
            let findex = generateKeyBetweenAllowSame(hitResult.findexBetween[0], findexTo);
            const patch = shapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
              p[s.id] = { parentId: alignBoxId, findex };
              findex = generateKeyBetweenAllowSame(findex, findexTo);
              return p;
            }, {});
            const layoutPatch = getPatchByLayouts(shapeComposite, { update: patch });
            ctx.patchShapes(layoutPatch);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (alignHandler.isAlignChanged(event.data.keys)) {
            initHandler(ctx);
          }
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      shapes.forEach((s) => {
        const path = shapeComposite.getLocalRectPolygon(s);
        renderCtx.beginPath();
        applyPath(renderCtx, path);
        scaleGlobalAlpha(renderCtx, 0.3, () => {
          renderCtx.fill();
        });
      });

      alignHandler.render(renderCtx, style, ctx.getScale(), hitResult);

      if (diff) {
        const shapeRenderer = newShapeRenderer({
          shapeComposite: newShapeComposite({
            shapes: shapes.map((s) => ({ ...s, p: add(s.p, diff) })),
            getStruct: shapeComposite.getShapeStruct,
          }),
          getDocumentMap: ctx.getDocumentMap,
        });
        scaleGlobalAlpha(renderCtx, 0.5, () => {
          shapeRenderer.render(renderCtx);
        });
      }
    },
  };
}
