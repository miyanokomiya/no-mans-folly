import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, handleStateEvent } from "../commons";
import { handleCommonWheel } from "../../commons";
import { newVectorNetwork } from "../../../vectorNetwork";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { isLineShape, LineShape } from "../../../../shapes/line";
import { isVNNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { findSmallestLoopCoveringPoints, findVnClosedLoops, RawVnLoop } from "../../../../utils/vectorNetwork";
import { createShape } from "../../../../shapes";
import { patchLinePolygonFromLine } from "../../../../shapes/utils/linePolygon";
import { applyFillStyle, createFillStyle } from "../../../../utils/fillStyle";
import { applyCurvePath } from "../../../../utils/renderer";
import { createStrokeStyle } from "../../../../utils/strokeStyle";

export function newVnCreatePolygonState(): AppCanvasState {
  let rawVnLoop: RawVnLoop | undefined;

  const rawVnLoopsCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const shapes = shapeComposite.getShapesOverlappingRect(
      shapeComposite.shapes.filter((s) => isLineShape(s) || isVNNodeShape(s)),
      ctx.getViewRect(),
    );
    const vn = newVectorNetwork({
      shapeComposite: ctx.getShapeComposite(),
      ids: shapes.map((s) => s.id),
    });
    return findVnClosedLoops(vn);
  });

  return {
    getLabel: () => "VnCreatePolygon",
    onStart: (ctx) => {
      ctx.setCommandExams([]);
    },
    onResume: () => {
      rawVnLoopsCache.update();
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const shapeComposite = ctx.getShapeComposite();
              const loop = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), [event.data.point]);
              if (loop && loop.nodes.length >= 3) {
                const line = createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
                  id: ctx.generateUuid(),
                  findex: ctx.createLastIndex(),
                  p: loop.nodes[0].position,
                  body: loop.nodes.slice(1, -1).map((node) => ({ p: node.position })),
                  q: loop.nodes.at(-1)!.position,
                  curves: loop.edges.map((edge) => edge.curve),
                  fill: createFillStyle({ color: { r: 255, g: 255, b: 255, a: 1 } }),
                  stroke: createStrokeStyle({ disabled: true }),
                });
                const patch = patchLinePolygonFromLine(shapeComposite.getShapeStruct, line);
                const linePolygon = { ...line, ...patch };
                ctx.addShapes([linePolygon]);
                ctx.selectShape(linePolygon.id);
              }
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const loop = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), [event.data.current]);
          if (rawVnLoop?.id !== loop?.id) {
            ctx.redraw();
          }
          rawVnLoop = loop;
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          rawVnLoopsCache.update();
          return;
        case "history":
          return ctx.states.newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, getCommonAcceptableEvents());
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const style = ctx.getStyleScheme();

      applyFillStyle(renderCtx, { color: { ...style.selectionPrimary, a: 0.5 } });
      renderCtx.beginPath();
      rawVnLoopsCache.getValue(ctx).forEach((loop) => {
        applyCurvePath(
          renderCtx,
          loop.nodes.map((n) => n.position),
          loop.edges.map((e) => e.curve),
        );
      });
      renderCtx.fill();

      if (rawVnLoop) {
        renderCtx.beginPath();
        applyFillStyle(renderCtx, { color: { ...style.selectionSecondaly, a: 0.5 } });
        applyCurvePath(
          renderCtx,
          rawVnLoop.nodes.map((n) => n.position),
          rawVnLoop.edges.map((e) => e.curve),
        );
        renderCtx.fill();
      }
    },
  };
}
