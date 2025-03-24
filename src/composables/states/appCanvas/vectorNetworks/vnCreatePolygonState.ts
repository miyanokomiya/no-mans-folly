import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, handleStateEvent } from "../commons";
import { handleCommonWheel } from "../../commons";
import { newVectorNetwork } from "../../../vectorNetwork";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { isLineShape, LineShape } from "../../../../shapes/line";
import { isVNNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { findClosedVnAreaCoveringPoint, RawVnLoop } from "../../../../utils/vectorNetwork";
import { createShape } from "../../../../shapes";
import { patchLinePolygonFromLine } from "../../../../shapes/utils/linePolygon";
import { applyFillStyle, createFillStyle } from "../../../../utils/fillStyle";
import { applyCurvePath } from "../../../../utils/renderer";

export function newVnCreatePolygonState(): AppCanvasState {
  let rawVnLoop: RawVnLoop | undefined;

  const vnNetworkCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const shapes = shapeComposite.getShapesOverlappingRect(
      shapeComposite.shapes.filter((s) => isLineShape(s) || isVNNodeShape(s)),
      ctx.getViewRect(),
    );
    return newVectorNetwork({
      shapeComposite: ctx.getShapeComposite(),
      ids: shapes.map((s) => s.id),
    });
  });

  return {
    getLabel: () => "VnCreatePolygon",
    onStart: (ctx) => {
      ctx.setCommandExams([]);
    },
    onResume: () => {
      vnNetworkCache.update();
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
              const vnNetwork = vnNetworkCache.getValue(ctx);
              const loop = findClosedVnAreaCoveringPoint(vnNetwork, event.data.point);
              if (loop && loop.nodes.length >= 3) {
                const line = createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
                  id: ctx.generateUuid(),
                  findex: ctx.createLastIndex(),
                  p: loop.nodes[0].position,
                  body: loop.nodes.slice(1, -1).map((node) => ({ p: node.position })),
                  q: loop.nodes.at(-1)!.position,
                  curves: loop.edges.map((edge) => edge.curve),
                  fill: createFillStyle({ color: { r: 255, g: 255, b: 255, a: 1 } }),
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
          const vnNetwork = vnNetworkCache.getValue(ctx);
          const loop = findClosedVnAreaCoveringPoint(vnNetwork, event.data.current);
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
          vnNetworkCache.update();
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
