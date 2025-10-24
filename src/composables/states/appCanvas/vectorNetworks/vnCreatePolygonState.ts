import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, handleStateEvent } from "../commons";
import { handleCommonWheel } from "../../commons";
import { newVectorNetwork } from "../../../vectorNetwork";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { isLineShape, LineShape } from "../../../../shapes/line";
import { isVNNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import {
  findLargestLoopCoveringPoints,
  findSmallestLoopCoveringPoints,
  findVnClosedLoops,
  MAX_VN_EDGE_COUNT_FOR_CLOSED_AREA,
  RawVnLoop,
} from "../../../../utils/vectorNetwork";
import { createShape } from "../../../../shapes";
import { patchLinePolygonFromLine } from "../../../../shapes/utils/linePolygon";
import { applyFillStyle, createFillStyle } from "../../../../utils/fillStyle";
import { applyCurvePath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { createStrokeStyle } from "../../../../utils/strokeStyle";
import { IVec2 } from "okageo";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newCanvasBank } from "../../../canvasBank";
import { i18n } from "../../../../i18n";

export function newVnCreatePolygonState(): AppCanvasState {
  let rawVnLoop: RawVnLoop | undefined;
  let rawVnLoopPreview: RawVnLoop | undefined;
  let rawVnLoopLargestCandidate: RawVnLoop | undefined;
  let targetPoints: IVec2[] = [];
  let errorMessage: string | undefined;
  const canvasBank = newCanvasBank();

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

    try {
      const ret = findVnClosedLoops(vn);
      errorMessage = ret.length === 0 ? i18n.t("states.vn_create_polygon.no_available_area") : undefined;
      return ret;
    } catch (e) {
      errorMessage = i18n.t((e as Error).message, {
        edgeCount: vn.edges.size,
        maxCount: MAX_VN_EDGE_COUNT_FOR_CLOSED_AREA,
      });
      return [];
    }
  });

  function handleErrorMessage(ctx: AppCanvasStateContext) {
    rawVnLoopsCache.getValue(ctx);
    if (errorMessage) {
      ctx.showToastMessage({
        text: errorMessage,
        type: "warn",
        timeout: 5000,
        key: "vn_create_polygon_failed",
      });
    } else {
      ctx.showToastMessage({
        text: "",
        type: "warn",
        key: "vn_create_polygon_failed",
      });
    }
  }

  // Multiple area mode: Keep current candidate and continue.
  function procMultipleArea(ctx: AppCanvasStateContext, point: IVec2, selectOnly = false) {
    const points = targetPoints.concat(point);
    const result = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), points);
    const loop = result && result.nodes.length >= 3 ? result : undefined;
    if (!loop) return;

    // When stored points are in the smallest loop for the new point, remove them.
    const smallest = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), [point]);
    if (!smallest) return;

    const pointInSameLoop = targetPoints.find(
      (p) => findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), [p]) === smallest,
    );
    if (pointInSameLoop) {
      if (!selectOnly) {
        targetPoints = targetPoints.filter((p) => p !== pointInSameLoop);
        rawVnLoop = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), targetPoints);
      }
    } else {
      targetPoints = points;
      rawVnLoop = loop;
    }

    rawVnLoopLargestCandidate = findLargestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), targetPoints);
    ctx.redraw();
    return;
  }

  return {
    getLabel: () => "VnCreatePolygon",
    onStart: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.VN_POLYGON_COMPLETE,
        COMMAND_EXAM_SRC.VN_POLYGON_MULTIPLE_AREAS,
        COMMAND_EXAM_SRC.VN_POLYGON_SELECT_AREAS,
        COMMAND_EXAM_SRC.CANCEL,
      ]);
      handleErrorMessage(ctx);
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
              handleErrorMessage(ctx);

              if (event.data.options.shift) {
                procMultipleArea(ctx, event.data.point);
                return;
              }

              const shapeComposite = ctx.getShapeComposite();
              const points = targetPoints.concat(event.data.point);
              const result = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), points);
              const loop = result && result.nodes.length >= 3 ? result : undefined;

              // Create a new polygon when the loop has been stored.
              const targetLoop = loop ?? rawVnLoop;
              if (!targetLoop) return ctx.states.newSelectionHubState;

              const line = createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
                id: ctx.generateUuid(),
                findex: ctx.createLastIndex(),
                p: targetLoop.nodes[0].position,
                body: targetLoop.nodes.slice(1, -1).map((node) => ({ p: node.position })),
                q: targetLoop.nodes.at(-1)!.position,
                curves: targetLoop.edges.map((edge) => edge.curve),
                fill: createFillStyle({ color: { r: 255, g: 255, b: 255, a: 1 } }),
                stroke: createStrokeStyle({ disabled: true }),
              });
              const patch = patchLinePolygonFromLine(shapeComposite.getShapeStruct, line);
              const linePolygon = { ...line, ...patch };
              ctx.addShapes([linePolygon]);
              ctx.selectShape(linePolygon.id);
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          handleErrorMessage(ctx);

          if (event.data.ctrl) {
            procMultipleArea(ctx, event.data.current, true);
          }

          const loop = findSmallestLoopCoveringPoints(rawVnLoopsCache.getValue(ctx), [event.data.current]);
          if (rawVnLoopPreview?.id !== loop?.id) {
            ctx.redraw();
          }
          rawVnLoopPreview = loop;
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

      canvasBank.beginCanvas((subCanvas) => {
        subCanvas.width = renderCtx.canvas.width;
        subCanvas.height = renderCtx.canvas.height;
        const subCtx = subCanvas.getContext("2d")!;
        if (!subCtx) return;

        subCtx.clearRect(0, 0, subCtx.canvas.width, subCtx.canvas.height);
        subCtx.reset();
        subCtx.setTransform(renderCtx.getTransform());
        applyFillStyle(subCtx, { color: style.selectionPrimary });
        (rawVnLoopLargestCandidate ? [rawVnLoopLargestCandidate] : rawVnLoopsCache.getValue(ctx)).forEach((loop) => {
          subCtx.beginPath();
          applyCurvePath(
            subCtx,
            loop.nodes.map((n) => n.position),
            loop.edges.map((e) => e.curve),
          );
          subCtx.fill();
        });

        if (rawVnLoop) {
          subCtx.beginPath();
          applyFillStyle(subCtx, { color: style.transformAnchor });
          applyCurvePath(
            subCtx,
            rawVnLoop.nodes.map((n) => n.position),
            rawVnLoop.edges.map((e) => e.curve),
          );
          subCtx.fill();
        }

        if (rawVnLoopPreview) {
          subCtx.beginPath();
          applyFillStyle(subCtx, { color: style.selectionSecondaly });
          applyCurvePath(
            subCtx,
            rawVnLoopPreview.nodes.map((n) => n.position),
            rawVnLoopPreview.edges.map((e) => e.curve),
          );
          subCtx.fill();
        }

        const viewRect = ctx.getViewRect();
        scaleGlobalAlpha(renderCtx, 0.5, () => {
          renderCtx.drawImage(
            subCanvas,
            0,
            0,
            subCanvas.width,
            subCanvas.height,
            viewRect.x,
            viewRect.y,
            viewRect.width,
            viewRect.height,
          );
        });
      });
    },
  };
}
