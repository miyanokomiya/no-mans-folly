import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { LineShape, addNewVertex } from "../../../../shapes/line";
import { IVec2 } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import {
  ConnectionResult,
  getConnectionResultByHook,
  isLineSnappableShape,
  newLineSnapping,
  optimizeLinePath,
  renderConnectionResult,
} from "../../../lineSnapping";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { renderBezierControls } from "../../../lineBounding";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getSnappableCandidates } from "../commons";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { handleCommonWheel } from "../../commons";
import { handleLineVertexExistence } from "../utils/shapeUpdatedEventHandlers";
import { getMovingLineVertex } from "../../../../shapes/utils/line";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingNewVertexState(option: Option): AppCanvasState {
  let connectionResult: ConnectionResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  const coordinateRenderer = newCoordinateRenderer({ coord: option.p });

  const lineSnappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, [option.lineShape.id]).concat([option.lineShape]);
    const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
    const mockMovingLine = { ...option.lineShape, ...addNewVertex(option.lineShape, option.index, { x: 0, y: 0 }) };
    const shapeSnapping = newShapeSnapping({
      shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping: ctx.getGrid().getSnappingLines(),
      settings: ctx.getUserSetting(),
    });
    return newLineSnapping({
      snappableShapes,
      shapeSnapping,
      getShapeStruct: ctx.getShapeStruct,
      movingLine: mockMovingLine,
      movingIndex: option.index,
    });
  });

  return {
    getLabel: () => "MovingNewVertex",
    onStart: (ctx) => {
      ctx.startDragging();
      const shapeComposite = ctx.getShapeComposite();
      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([
          COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT,
          COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP,
          COMMAND_EXAM_SRC.HOOK_TO_SHAPE,
        ]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP, COMMAND_EXAM_SRC.HOOK_TO_SHAPE]);
      }
    },
    onResume: () => {
      lineSnappingCache.update();
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          const point = event.data.current;

          connectionResult = undefined;
          if (event.data.shift) {
            connectionResult = getConnectionResultByHook(
              shapeComposite,
              lineSnappingCache.getValue(ctx).snappableShapes,
              point,
              option.lineShape,
              option.index,
            );
          }

          if (!connectionResult) {
            connectionResult =
              event.data.ctrl || event.data.shift
                ? undefined
                : lineSnappingCache.getValue(ctx).testConnection(point, ctx.getScale());
          }

          let patch = addNewVertex(
            option.lineShape,
            option.index,
            connectionResult?.p ?? point,
            connectionResult?.connection,
          );

          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          return handleLineVertexExistence(ctx, event, option.lineShape.id, option.index);
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "g":
              if (event.data.shift) return;
              ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
              lineSnappingCache.update();
              return;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          lineSnappingCache.update();
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;

      const shapeComposite = ctx.getShapeComposite();
      const line = shapeComposite.mergedShapeMap[option.lineShape.id] as LineShape;
      if (!line) return;

      const vertex = getMovingLineVertex(line, option.index);
      if (!vertex) {
        return;
      }
      coordinateRenderer.saveCoord(vertex);
      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

      renderBezierControls(renderCtx, style, scale, line);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.arc(vertex.x, vertex.y, vertexSize, 0, TAU);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: { ...connectionResult, p: vertex },
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
          shapeComposite,
        });
      }

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
