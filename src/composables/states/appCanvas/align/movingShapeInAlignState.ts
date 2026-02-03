import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { findBetterShapeAt, getNextShapeComposite } from "../../../shapeComposite";
import { findexSortFn } from "../../../../utils/commons";
import { AffineMatrix, sub } from "okageo";
import { Shape } from "../../../../models";
import { BoundingBox } from "../../../boundingBox";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { AlignHitResult, AlignHandler, newAlignHandler } from "../../../alignHandler";
import { canJoinGeneralLayout, getClosestLayoutShapeAt } from "../../../shapeHandlers/layoutHandler";
import { handleNextLayoutShape } from "../utils/layoutShapes";

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
  let alignBoxId = option.alignBoxId;
  let alignHandler: AlignHandler;
  let hitResult: AlignHitResult | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    hitResult = undefined;
    alignHandler = newAlignHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "MovingShapeInAlign",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      shapes = ids
        .map((id) => shapeMap[id])
        .filter((s) => canJoinGeneralLayout(shapeComposite, s))
        .sort(findexSortFn);

      initHandler(ctx);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) return { type: "break" };

          const shapeComposite = ctx.getShapeComposite();
          const scope = shapeComposite.getSelectionScope(shapes[0]);
          const shapeAtPoint = findBetterShapeAt(
            shapeComposite,
            event.data.current,
            scope,
            shapes.map((s) => s.id),
          );
          if (!shapeAtPoint) return { type: "break" };

          const diff = sub(event.data.current, event.data.startAbs);
          const affine: AffineMatrix = [1, 0, 0, 1, diff.x, diff.y];
          const shapeIdSet = new Set(shapes.map((s) => s.id));
          ctx.setTmpShapeMap(
            shapeComposite
              .getAllTransformTargets(shapes.map((s) => s.id))
              .reduce<Record<string, Partial<Shape>>>((p, { id }) => {
                const s = shapeComposite.shapeMap[id];
                p[s.id] = { ...shapeComposite.transformShape(s, affine) };
                if (shapeIdSet.has(id)) {
                  // Make the target shapes translucent
                  p[s.id].alpha = (s.alpha ?? 1) * 0.5;
                }
                return p;
              }, {}),
          );

          const layoutShape = getClosestLayoutShapeAt(shapeComposite, shapeAtPoint.id);
          const layoutHandling = handleNextLayoutShape(ctx, layoutShape, alignBoxId, {
            boundingBox: option.boundingBox,
            diff,
          });
          if (layoutHandling) return layoutHandling;

          const result = alignHandler.hitTest(event.data.current);
          hitResult = result;
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (event.data.options.ctrl) return ctx.states.newSelectionHubState;

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
      alignHandler.render(renderCtx, style, ctx.getScale(), hitResult);
    },
  };
}
