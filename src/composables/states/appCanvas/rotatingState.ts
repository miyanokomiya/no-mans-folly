import type { AppCanvasState } from "./core";
import { BoundingBox, newBoundingBoxRotating } from "../../boundingBox";
import { IDENTITY_AFFINE } from "okageo";
import { Shape } from "../../../models";
import {
  ConnectedLineDetouchHandler,
  getConnectedLineInfoMap,
  newConnectedLineDetouchHandler,
  renderPatchedVertices,
} from "../../connectedLineHandler";
import { mergeMap } from "../../../utils/commons";
import { LineShape } from "../../../shapes/line";
import { newSelectionHubState } from "./selectionHubState";
import { handleCommonWheel } from "./commons";
import { getPatchAfterLayouts } from "../../shapeLayoutHandler";

interface Option {
  boundingBox: BoundingBox;
}

export function newRotatingState(option: Option): AppCanvasState {
  let targets: Shape[];
  let resizingAffine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineDetouchHandler;
  let linePatchedMap: { [id: string]: Partial<LineShape> };

  const boundingBoxRotatingRotating = newBoundingBoxRotating({
    rotation: option.boundingBox.getRotation(),
    origin: option.boundingBox.getCenter(),
  });
  return {
    getLabel: () => "Rotating",
    onStart: (ctx) => {
      targets = ctx.getShapeComposite().getAllTransformTargets(Object.keys(ctx.getSelectedShapeIdMap()));
      ctx.startDragging();

      lineHandler = newConnectedLineDetouchHandler({
        connectedLinesMap: getConnectedLineInfoMap(
          ctx,
          targets.map((s) => s.id),
        ),
        ctx,
      });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          resizingAffine = boundingBoxRotatingRotating.getAffine(event.data.start, event.data.current, event.data.ctrl);

          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = ctx.getShapeComposite().shapeMap;
          let patchMap = targets.reduce<{ [id: string]: Partial<Shape> }>((m, s) => {
            const shape = shapeMap[s.id];
            if (shape) {
              m[s.id] = shapeComposite.transformShape(shape, resizingAffine);
            }
            return m;
          }, {});

          linePatchedMap = lineHandler.onModified(patchMap);
          patchMap = getPatchAfterLayouts(shapeComposite, { update: mergeMap(patchMap, linePatchedMap) });
          ctx.setTmpShapeMap(patchMap);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return () =>
            newSelectionHubState({ boundingBox: option.boundingBox.getTransformedBoundingBox(resizingAffine) });
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      option.boundingBox.renderResizedBounding(renderCtx, ctx.getStyleScheme(), ctx.getScale(), resizingAffine);

      if (linePatchedMap) {
        renderPatchedVertices(renderCtx, {
          lines: Object.values(linePatchedMap),
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }
    },
  };
}
