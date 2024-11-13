import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { IVec2, add } from "okageo";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { Shape } from "../../../models";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { CommandExam, EditMovement } from "../types";
import { renderOutlinedCircle } from "../../../utils/renderer";
import { patchPipe } from "../../../utils/commons";
import { patchLinesConnectedToShapeOutline } from "../../lineSnapping";
import { getSnappableCandidates } from "./commons";

export type RenderShapeControlFn<T extends Shape> = (
  ctx: AppCanvasStateContext,
  renderCtx: CanvasRenderingContext2D,
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
  renderFn?: RenderShapeControlFn<T>;
  extraCommands?: CommandExam[];
}

export function movingShapeControlState<T extends Shape>(option: Option<T>): AppCanvasState {
  let targetShape: T;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingShapeControl",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as T;
      if (!targetShape) return ctx.states.newSelectionHubState;

      ctx.startDragging();
      const commands = option.extraCommands ?? [];
      if (!option.snapType || option.snapType === "custom") commands.unshift(COMMAND_EXAM_SRC.DISABLE_SNAP);
      ctx.setCommandExams(commands);

      const shapeComposite = ctx.getShapeComposite();
      const snappableShapes =
        option.snapType === "self" ? [targetShape] : getSnappableCandidates(ctx, [targetShape.id]);
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });
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
          snappingResult =
            event.data.ctrl || option.snapType === "disabled" || option.snapType === "custom"
              ? undefined
              : shapeSnapping.testPoint(point);
          const p = snappingResult ? add(point, snappingResult.diff) : point;
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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape: T = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const control = option.getControlFn(tmpShape, ctx.getScale());
      renderOutlinedCircle(renderCtx, control, 6 * ctx.getScale(), ctx.getStyleScheme().selectionSecondaly);

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }

      option.renderFn?.(ctx, renderCtx, tmpShape);
    },
  };
}
