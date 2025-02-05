import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { findBetterShapeAt, getClosestShapeByType, newShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { findexSortFn } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { Shape } from "../../../../models";
import { BoundingBox } from "../../../boundingBox";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { AlignHitResult, AlignHandler, newAlignHandler } from "../../../alignHandler";
import { isFrameShape } from "../../../../shapes/frame";
import { FrameAlignGroupShape } from "../../../../shapes/frameGroups/frameAlignGroup";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { getDummyShapeCompositeForFrameAlign } from "../../../frameGroups/frameAlignGroupHandler";

interface Option {
  boundingBox?: BoundingBox;
  alignBoxId: string;
}

/**
 * This state is supposed to be stacked on "MovingShape".
 * => "startDragging" and other methods aren't called by this state because of that.
 */
export function newMovingFrameInAlignState(option: Option): AppCanvasState {
  let frameShapes: Shape[];
  let alignBoxId = option.alignBoxId;
  let alignHandler: AlignHandler;
  let dummyShapeComposite: ShapeComposite;
  let hitResult: AlignHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    hitResult = undefined;

    const shapeComposite = ctx.getShapeComposite();
    dummyShapeComposite = getDummyShapeCompositeForFrameAlign(shapeComposite);

    alignHandler = newAlignHandler({
      getShapeComposite: () => dummyShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "MovingFrameInAlign",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      frameShapes = ids
        .map((id) => shapeMap[id])
        .filter((s) => isFrameShape(s))
        .sort(findexSortFn);

      initHandler(ctx);
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) return { type: "break" };

          const shapeComposite = ctx.getShapeComposite();
          const scope = shapeComposite.getSelectionScope(frameShapes[0]);
          const shapeAtPoint = findBetterShapeAt(
            shapeComposite,
            event.data.current,
            scope,
            frameShapes.map((s) => s.id),
          );
          if (!shapeAtPoint) return { type: "break" };

          const alignBoxShape = getClosestShapeByType<FrameAlignGroupShape>(
            shapeComposite,
            shapeAtPoint.id,
            "frame_align_group",
          );
          if (!alignBoxShape) {
            return { type: "break" };
          } else if (alignBoxShape.id !== alignBoxId) {
            // Switch to the closest align box shape
            alignBoxId = alignBoxShape.id;
            initHandler(ctx);
          }

          diff = sub(event.data.current, event.data.start);
          const result = alignHandler.hitTest(event.data.current);
          hitResult = result;
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (!hitResult || event.data.options.ctrl) return ctx.states.newSelectionHubState;

          const shapeComposite = ctx.getShapeComposite();
          const findexTo = hitResult.findexBetween[1];
          let findex = generateKeyBetweenAllowSame(hitResult.findexBetween[0], findexTo);
          const patch = frameShapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
            p[s.id] = { parentId: alignBoxId, findex };
            findex = generateKeyBetweenAllowSame(findex, findexTo);
            return p;
          }, {});
          const layoutPatch = getPatchByLayouts(shapeComposite, { update: patch });
          ctx.patchShapes(layoutPatch);
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
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
      frameShapes.forEach((s) => {
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
            shapes: frameShapes.map((s) => ({ ...s, p: add(s.p, diff) })),
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
