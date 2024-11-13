import type { AppCanvasState } from "../core";
import { LineShape, getEdges, getLinePath, patchBodyVertex } from "../../../../shapes/line";
import { MINVALUE, add, getDistance, getInner, getOuterRectangle, getPedal, getRadian, moveRect, sub } from "okageo";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getSnappableCandidates } from "../commons";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingElbowSegmentState(option: Option): AppCanvasState {
  const targetSegment = getEdges(option.lineShape)[option.index];
  const srcBodyItem = option.lineShape.body?.[option.index - 1];
  let elbowHandler: ElbowLineHandler;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;

  return {
    getLabel: () => "MovingElbowSegment",
    onStart: (ctx) => {
      if (option.lineShape.lineType !== "elbow") return ctx.states.newSelectionHubState;

      ctx.startDragging();
      elbowHandler = newElbowLineHandler(ctx);

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(ctx, []);

      // Target elbow segment is always cardinal, so either horizontal or vertical snapping is available at once.
      const isHorizontalSegment = Math.abs(Math.sin(getRadian(targetSegment[1], targetSegment[0]))) < MINVALUE;
      const gridLines = ctx.getGrid().getSnappingLines();
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => {
          const lines = shapeComposite.getSnappingLines(s);
          return [s.id, isHorizontalSegment ? { v: [], h: lines.h } : { v: lines.v, h: [] }];
        }),
        scale: ctx.getScale(),
        gridSnapping: isHorizontalSegment ? { v: [], h: gridLines.h } : { v: gridLines.v, h: [] },
        settings: ctx.getUserSetting(),
      });

      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT, COMMAND_EXAM_SRC.DISABLE_SNAP]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      }
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      if (!srcBodyItem) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const v = sub(event.data.current, event.data.start);
          snappingResult = event.data.ctrl
            ? undefined
            : shapeSnapping.test(moveRect(getOuterRectangle([targetSegment]), v));
          const p = snappingResult ? add(v, add(targetSegment[0], snappingResult.diff)) : event.data.current;

          const elbow = srcBodyItem.elbow;
          const pedal = getPedal(p, targetSegment);

          const vertices = getLinePath(option.lineShape);
          // Regard rounded elbow that has an extra vertex for each corner.
          const prevIndex = option.lineShape.curveType === "auto" ? option.index - 2 : option.index - 1;
          const prev = vertices[prevIndex];
          const origin = elbow?.p ?? targetSegment[0];
          const sign = Math.sign(getInner(sub(origin, prev), sub(p, pedal)));
          const d = sign * getDistance(pedal, p) + (elbow?.d ?? 0);

          const nextElbow = { ...elbow, d, p: origin };
          let patch = patchBodyVertex(option.lineShape, option.index - 1, { ...srcBodyItem, elbow: nextElbow });
          patch = { ...patch, body: elbowHandler.optimizeElbow({ ...option.lineShape, ...patch }) };

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
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        const shapeMap = shapeComposite.shapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeMap[id]),
        });
      }

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
