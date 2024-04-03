import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { newSelectionHubState } from "./selectionHubState";
import { applyFillStyle } from "../../../utils/fillStyle";
import { TAU } from "../../../utils/geometry";
import { IVec2, add } from "okageo";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { Shape } from "../../../models";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { EditMovement } from "../types";

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
  snapType?: "disabled" | "self";
  renderFn?: RenderShapeControlFn<T>;
}

export function movingShapeControlState<T extends Shape>(option: Option<T>): AppCanvasState {
  let targetShape: T;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingShapeControl",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as T;
      if (!targetShape) return newSelectionHubState;

      ctx.startDragging();
      if (!option.snapType) ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableShapes =
        option.snapType === "self"
          ? [targetShape]
          : shapeComposite.getShapesOverlappingRect(Object.values(shapeMap), ctx.getViewRect());
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
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
            event.data.ctrl || option.snapType === "disabled" ? undefined : shapeSnapping.testPoint(point);
          const p = snappingResult ? add(point, snappingResult.diff) : point;
          const patch = option.patchFn(targetShape, p, event.data);
          const shapeComposite = ctx.getShapeComposite();
          const layoutPatch = getPatchByLayouts(shapeComposite, {
            update: { [targetShape.id]: patch },
          });
          ctx.setTmpShapeMap(layoutPatch);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) return newSelectionHubState;
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape: T = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const control = option.getControlFn(tmpShape, ctx.getScale());
      applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly });
      renderCtx.beginPath();
      renderCtx.arc(control.x, control.y, 6 * ctx.getScale(), 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }

      option.renderFn?.(ctx, renderCtx, tmpShape);
    },
  };
}
