import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { IVec2 } from "okageo";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { newShapeSnapping } from "../../shapeSnapping";
import { Shape } from "../../../models";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { CommandExam, EditMovement } from "../types";
import { renderOutlinedCircle, scaleGlobalAlpha } from "../../../utils/renderer";
import { patchPipe } from "../../../utils/commons";
import {
  ConnectionResult,
  newLineSnapping,
  patchLinesConnectedToShapeOutline,
  renderConnectionResult,
} from "../../lineSnapping";
import { getSnappableCandidates } from "./commons";
import { CanvasCTX } from "../../../utils/types";
import { newCacheWithArg } from "../../../utils/stateful/cache";
import { createShape } from "../../../shapes";
import { LineShape } from "../../../shapes/line";
import { handleCommonWheel } from "../commons";

export type RenderShapeControlFn<T extends Shape> = (
  ctx: AppCanvasStateContext,
  renderCtx: CanvasCTX,
  latestShape: T,
) => void;

interface Option<T extends Shape> {
  targetId: string;
  /**
   * "p" is in the global space.
   */
  patchFn: (s: T, p: IVec2, movement: EditMovement) => Partial<T>;
  /**
   * Should return a point in the global space.
   */
  getControlFn: (s: T, scale: number) => IVec2;
  snapType?: "disabled" | "self" | "custom";
  movingOrigin?: IVec2;
  renderFn?: RenderShapeControlFn<T>;
  extraCommands?: CommandExam[];
}

export function movingShapeControlState<T extends Shape>(option: Option<T>): AppCanvasState {
  let targetShape: T;

  let connectionResult: ConnectionResult | undefined;
  const lineSnappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, [targetShape.id]);
    const shapeSnapping = newShapeSnapping({
      shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping: ctx.getGrid().getSnappingLines(),
      settings: ctx.getUserSetting(),
    });
    const dummyLine = option.movingOrigin
      ? createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
          id: "dummy",
          p: option.movingOrigin,
          q: option.getControlFn(targetShape, ctx.getScale()),
        })
      : undefined;
    return newLineSnapping({
      snappableShapes: snappableCandidates,
      shapeSnapping,
      getShapeStruct: shapeComposite.getShapeStruct,
      movingLine: dummyLine,
      movingIndex: dummyLine ? 1 : undefined,
    });
  });

  return {
    getLabel: () => "MovingShapeControl",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as T;
      if (!targetShape) return ctx.states.newSelectionHubState;

      ctx.startDragging();
      const commands = option.extraCommands ?? [];
      if (!option.snapType || option.snapType === "custom") commands.unshift(COMMAND_EXAM_SRC.DISABLE_SNAP);
      ctx.setCommandExams(commands);
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult =
            event.data.ctrl || option.snapType === "disabled" || option.snapType === "custom"
              ? undefined
              : lineSnappingCache.getValue(ctx).testConnection(point, ctx.getScale());
          const p = connectionResult?.p ?? point;
          const shapeComposite = ctx.getShapeComposite();
          const patch = patchPipe(
            [
              (src) => ({ [option.targetId]: option.patchFn(src[option.targetId] as T, p, event.data) }),
              (src) => patchLinesConnectedToShapeOutline(shapeComposite, src[option.targetId]),
              (_, patch) => getPatchByLayouts(shapeComposite, { update: patch }),
            ],
            { [targetShape.id]: targetShape as Shape },
          ).patch;
          ctx.setTmpShapeMap(patch);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) return ctx.states.newSelectionHubState;
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
    render: (ctx, renderCtx) => {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 6 * scale;

      scaleGlobalAlpha(renderCtx, 0.5, () => {
        const srcOontrol = option.getControlFn(targetShape, scale);
        renderOutlinedCircle(renderCtx, srcOontrol, vertexSize, style.transformAnchor);
      });

      const tmpShape: T = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const control = option.getControlFn(tmpShape, scale);
      renderOutlinedCircle(renderCtx, control, vertexSize, style.selectionSecondaly);

      if (connectionResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale,
          style,
          shapeComposite,
        });
      }

      option.renderFn?.(ctx, renderCtx, tmpShape);
    },
  };
}
