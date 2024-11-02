import type { AppCanvasState } from "./core";
import { BoundingBox, newBoundingBoxRotating } from "../../boundingBox";
import { IDENTITY_AFFINE } from "okageo";
import { Shape } from "../../../models";
import {
  ConnectedLineDetouchHandler,
  ConnectionRenderer,
  getConnectedLineInfoMap,
  newConnectedLineDetouchHandler,
  newConnectionRenderer,
} from "../../connectedLineHandler";
import { mergeMap } from "../../../utils/commons";
import { getPatchAfterLayouts } from "../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { handleCommonWheel } from "../commons";
import { normalizeRadian } from "../../../utils/geometry";

interface Option {
  boundingBox: BoundingBox;
}

export function newRotatingState(option: Option): AppCanvasState {
  let targets: Shape[];
  let resizingAffine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineDetouchHandler;
  let freeAngle = true;
  let connectionRenderer: ConnectionRenderer;

  const boundingBoxRotatingRotating = newBoundingBoxRotating({
    rotation: option.boundingBox.getRotation(),
    origin: option.boundingBox.getCenter(),
  });
  return {
    getLabel: () => "Rotating",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);

      targets = ctx.getShapeComposite().getAllTransformTargets(Object.keys(ctx.getSelectedShapeIdMap()));
      const targetIds = targets.map((s) => s.id);
      const connectedLinesMap = getConnectedLineInfoMap(ctx, targetIds);
      lineHandler = newConnectedLineDetouchHandler({
        connectedLinesMap,
        ctx,
      });
      connectionRenderer = newConnectionRenderer({
        connectedLinesMap,
        excludeIdSet: new Set(targetIds),
      });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          freeAngle = !!event.data.ctrl;
          resizingAffine = boundingBoxRotatingRotating.getAffine(event.data.start, event.data.current, freeAngle);

          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = ctx.getShapeComposite().shapeMap;
          let patchMap = targets.reduce<{ [id: string]: Partial<Shape> }>((m, s) => {
            const shape = shapeMap[s.id];
            if (shape) {
              const patch = shapeComposite.transformShape(shape, resizingAffine);
              m[s.id] = patch;
              if (patch.rotation !== undefined && shape.attachment) {
                const v = patch.rotation - shape.rotation;
                m[s.id].attachment = { ...shape.attachment, rotation: normalizeRadian(shape.attachment.rotation + v) };
              }
            }
            return m;
          }, {});

          const linePatchedMap = lineHandler.onModified(patchMap);
          patchMap = getPatchAfterLayouts(shapeComposite, { update: mergeMap(patchMap, linePatchedMap) });
          ctx.setTmpShapeMap(patchMap);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return () =>
            ctx.states.newSelectionHubState({
              boundingBox: option.boundingBox.getTransformedBoundingBox(resizingAffine),
            });
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      option.boundingBox.renderResizedBounding(renderCtx, style, scale, resizingAffine, !freeAngle);
      connectionRenderer.render(renderCtx, ctx.getTmpShapeMap(), style, scale);
    },
  };
}
