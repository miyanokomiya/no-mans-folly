import { IVec2, applyAffine, clamp, getCenter, getDistance, getRectCenter, sub } from "okageo";
import { Direction4, Shape, StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRadianForDirection4, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import {
  applyLocalSpace,
  applyPath,
  renderOutlinedCircle,
  renderSwitchDirection,
  renderValueLabel,
} from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { getShapeDetransform, getShapeTransform } from "../../shapes/rectPolygon";
import {
  SimplePolygonShape,
  getExpansionFn,
  getMigrateRelativePointFn,
  getNextDirection2,
  getNextDirection4,
  getNormalizedSimplePolygonShape,
  getShapeDirection,
} from "../../shapes/simplePolygon";
import { COLORS } from "../../utils/color";
import { MouseOptions } from "../states/types";
import { movingShapeControlState } from "../states/appCanvas/movingShapeControlState";
import { COMMAND_EXAM_SRC } from "../states/appCanvas/commandExams";
import { AppCanvasStateContext } from "../states/appCanvas/core";
import { getPatchByLayouts } from "../shapeLayoutHandler";
import { patchPipe } from "../../utils/commons";
import { patchLinesConnectedToShapeOutline } from "../lineSnapping";
import { CanvasCTX } from "../../utils/types";

export const ANCHOR_SIZE = 6;
export const DIRECTION_ANCHOR_SIZE = 10;
export const EDGE_ANCHOR_MARGIN = 20;

type InteractionType = "button";
type HitAnchor = [type: string, IVec2, InteractionType?];

interface SimplePolygonHitResult {
  type: string;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  getAnchors: (scale: number) => HitAnchor[];
  direction4?: boolean;
}

export const newSimplePolygonHandler = defineShapeHandler<SimplePolygonHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as SimplePolygonShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  const getAnchors = option.getAnchors;

  function getDirection4Anchor(scale: number): HitAnchor | undefined {
    const d = DIRECTION_ANCHOR_SIZE * 2 * scale;
    return option.direction4 ? ["direction4", { x: shapeRect.width + d, y: shapeRect.height + d }] : undefined;
  }

  function hitTest(p: IVec2, scale = 1): SimplePolygonHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const hit = anchors.find((a) => getDistance(a[1], adjustedP) <= threshold);
    if (hit) {
      return { type: hit[0] };
    }

    const direction4Anchor = getDirection4Anchor(scale);
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    if (direction4Anchor && getDistance(direction4Anchor[1], adjustedP) <= directionThreshold) {
      return { type: direction4Anchor[0] };
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: SimplePolygonHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
    const direction4Anchor = getDirection4Anchor(scale);

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      anchors
        .map<[IVec2, boolean, InteractionType?]>((a) => [a[1], a[0] === hitResult?.type, a[2]])
        .forEach(([p, highlight, interactionType]) => {
          if (highlight) {
            renderOutlinedCircle(ctx, p, threshold, style.selectionSecondaly);
          } else {
            renderOutlinedCircle(
              ctx,
              p,
              threshold,
              interactionType === "button" ? style.selectionPrimary : style.transformAnchor,
            );
          }
        });

      if (direction4Anchor) {
        if (hitResult?.type === direction4Anchor[0]) {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
        } else {
          applyFillStyle(ctx, { color: style.selectionPrimary });
        }
        ctx.beginPath();
        ctx.arc(direction4Anchor[1].x, direction4Anchor[1].y, directionThreshold, 0, TAU);
        ctx.fill();
        applyFillStyle(ctx, { color: COLORS.WHITE });
        renderSwitchDirection(
          ctx,
          direction4Anchor[1],
          getRadianForDirection4(getShapeDirection(shape)),
          directionThreshold,
        );
      }
    });
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type;
    },
  };
});
export type SimplePolygonHandler = ReturnType<typeof newSimplePolygonHandler>;

export function renderShapeBounds(ctx: CanvasCTX, style: StyleScheme, path: IVec2[]) {
  applyStrokeStyle(ctx, { color: style.selectionPrimary });
  ctx.beginPath();
  applyPath(ctx, path, true);
  ctx.stroke();
}

type CornerRadiusMovingStateOption = {
  disableProportional?: boolean;
};

export function getCornerRadiusLXMovingState<S extends SimplePolygonShape>(
  shape: S,
  key: keyof S,
  mouseOptions: MouseOptions,
  option?: CornerRadiusMovingStateOption,
) {
  const getC = (s: S) => s[key] as IVec2;

  let showLabel = !mouseOptions.ctrl;
  return movingShapeControlState<S>({
    targetId: shape.id,
    snapType: "custom",
    extraCommands: option?.disableProportional ? [] : [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
    patchFn: (shape, p, movement) => {
      if (shape.width === 0 || shape.height === 0) return {};

      const s = getNormalizedSimplePolygonShape(shape);
      const localP = applyAffine(getShapeDetransform(s), p);
      let nextCX = clamp(0, 0.5, localP.x / s.width);
      if (movement.ctrl) {
        showLabel = false;
      } else {
        nextCX = Math.round(nextCX * s.width) / s.width;
        showLabel = true;
      }
      return {
        [key]: {
          x: nextCX,
          y: movement.shift && !option?.disableProportional ? (nextCX * s.width) / s.height : getC(s).y,
        },
      } as Partial<S>;
    },
    getControlFn: (shape, scale) => {
      const s = getNormalizedSimplePolygonShape(shape);
      return applyAffine(getShapeTransform(s), {
        x: s.width * getC(s).x,
        y: -EDGE_ANCHOR_MARGIN * scale,
      });
    },
    renderFn: (ctx, renderCtx, shape) => {
      if (!showLabel) return;

      const s = getNormalizedSimplePolygonShape(shape);
      renderValueLabel(
        renderCtx,
        Math.round(getC(s).x * s.width),
        applyAffine(getShapeTransform(s), { x: getC(s).x * s.width, y: -EDGE_ANCHOR_MARGIN * ctx.getScale() }),
        0,
        ctx.getScale(),
      );
    },
  });
}

export function getCornerRadiusRXMovingState<S extends SimplePolygonShape>(
  shape: S,
  key: keyof S,
  mouseOptions: MouseOptions,
  option?: CornerRadiusMovingStateOption,
) {
  const getC = (s: S) => s[key] as IVec2;

  let showLabel = !mouseOptions.ctrl;
  return movingShapeControlState<S>({
    targetId: shape.id,
    snapType: "custom",
    extraCommands: option?.disableProportional ? [] : [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
    patchFn: (shape, p, movement) => {
      if (shape.width === 0 || shape.height === 0) return {};

      const s = getNormalizedSimplePolygonShape(shape);
      const localP = applyAffine(getShapeDetransform(s), p);
      let nextCX = clamp(0.5, 1, localP.x / s.width);
      if (movement.ctrl) {
        showLabel = false;
      } else {
        nextCX = Math.round(nextCX * s.width) / s.width;
        showLabel = true;
      }
      return {
        [key]: {
          x: nextCX,
          y: movement.shift && !option?.disableProportional ? (s.width - nextCX * s.width) / s.height : getC(s).y,
        },
      } as Partial<S>;
    },
    getControlFn: (shape, scale) => {
      const s = getNormalizedSimplePolygonShape(shape);
      return applyAffine(getShapeTransform(s), {
        x: s.width * getC(s).x,
        y: -EDGE_ANCHOR_MARGIN * scale,
      });
    },
    renderFn: (ctx, renderCtx, shape) => {
      if (!showLabel) return;

      const s = getNormalizedSimplePolygonShape(shape);
      renderValueLabel(
        renderCtx,
        Math.round((1 - getC(s).x) * s.width),
        applyAffine(getShapeTransform(s), { x: getC(s).x * s.width, y: -EDGE_ANCHOR_MARGIN * ctx.getScale() }),
        0,
        ctx.getScale(),
      );
    },
  });
}

export function getCornerRadiusLYMovingState<S extends SimplePolygonShape>(
  shape: S,
  key: keyof S,
  mouseOptions: MouseOptions,
  option?: CornerRadiusMovingStateOption,
) {
  const getC = (s: S) => s[key] as IVec2;

  let showLabel = !mouseOptions.ctrl;
  return movingShapeControlState<S>({
    targetId: shape.id,
    snapType: "custom",
    extraCommands: option?.disableProportional ? [] : [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
    patchFn: (shape, p, movement) => {
      if (shape.width === 0 || shape.height === 0) return {};

      const s = getNormalizedSimplePolygonShape(shape);
      const localP = applyAffine(getShapeDetransform(s), p);
      let nextCY = clamp(0, 0.5, localP.y / s.height);
      if (movement.ctrl) {
        showLabel = false;
      } else {
        nextCY = Math.round(nextCY * s.height) / s.height;
        showLabel = true;
      }
      return {
        [key]: {
          x: movement.shift && !option?.disableProportional ? (nextCY * s.height) / s.width : getC(s).x,
          y: nextCY,
        },
      } as Partial<S>;
    },
    getControlFn: (shape, scale) => {
      const s = getNormalizedSimplePolygonShape(shape);
      return applyAffine(getShapeTransform(s), {
        x: -EDGE_ANCHOR_MARGIN * scale,
        y: s.height * getC(s).y,
      });
    },
    renderFn: (ctx, renderCtx, shape) => {
      if (!showLabel) return;

      const s = getNormalizedSimplePolygonShape(shape);
      renderValueLabel(
        renderCtx,
        Math.round(getC(s).y * s.height),
        applyAffine(getShapeTransform(s), { x: 0, y: getC(s).y * s.height }),
        0,
        ctx.getScale(),
      );
    },
  });
}

export function getCornerRadiusRYMovingState<S extends SimplePolygonShape>(
  shape: S,
  key: keyof S,
  mouseOptions: MouseOptions,
  option?: CornerRadiusMovingStateOption,
) {
  const getC = (s: S) => s[key] as IVec2;

  let showLabel = !mouseOptions.ctrl;
  return movingShapeControlState<S>({
    targetId: shape.id,
    snapType: "custom",
    extraCommands: option?.disableProportional ? [] : [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
    patchFn: (shape, p, movement) => {
      if (shape.width === 0 || shape.height === 0) return {};

      const s = getNormalizedSimplePolygonShape(shape);
      const localP = applyAffine(getShapeDetransform(s), p);
      let nextCY = clamp(0, 0.5, localP.y / s.height);
      if (movement.ctrl) {
        showLabel = false;
      } else {
        nextCY = Math.round(nextCY * s.height) / s.height;
        showLabel = true;
      }
      return {
        [key]: {
          x: movement.shift && !option?.disableProportional ? (nextCY * s.height) / s.width : getC(s).x,
          y: nextCY,
        },
      } as Partial<S>;
    },
    getControlFn: (shape, scale) => {
      const s = getNormalizedSimplePolygonShape(shape);
      return applyAffine(getShapeTransform(s), {
        x: s.width + EDGE_ANCHOR_MARGIN * scale,
        y: s.height * getC(s).y,
      });
    },
    renderFn: (ctx, renderCtx, shape) => {
      if (!showLabel) return;

      const s = getNormalizedSimplePolygonShape(shape);
      renderValueLabel(
        renderCtx,
        Math.round(getC(s).y * s.height),
        applyAffine(getShapeTransform(s), { x: s.width, y: getC(s).y * s.height }),
        0,
        ctx.getScale(),
      );
    },
  });
}

export function getResizeByState<S extends SimplePolygonShape, K = keyof S>(
  by: Direction4,
  shapeComposite: ShapeComposite,
  shape: S,
  migrationPoints: [key: K, origin: IVec2][],
) {
  const getC = (s: S, key: K) => (s as any)[key] as IVec2;

  return movingShapeControlState<S>({
    targetId: shape.id,
    patchFn: (shape, p) => {
      const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, by)(shape, p));
      const migrateFn = getMigrateRelativePointFn(shape, resized);
      return {
        ...resized,
        ...migrationPoints.reduce<any>((map, [key, origin]) => {
          map[key] = migrateFn(getC(shape, key), origin);
          return map;
        }, {}),
      };
    },
    getControlFn: (shape) => {
      const s = getNormalizedSimplePolygonShape(shape);
      let p: IVec2;
      switch (by) {
        case 0:
          p = { x: s.width / 2, y: 0 };
          break;
        case 2:
          p = { x: s.width / 2, y: s.height };
          break;
        case 3:
          p = { x: 0, y: s.height / 2 };
          break;
        default:
          p = { x: s.width, y: s.height / 2 };
          break;
      }
      return applyAffine(getShapeTransform(s), p);
    },
    renderFn: (ctx, renderCtx, shape) => {
      renderShapeBounds(renderCtx, ctx.getStyleScheme(), shapeComposite.getLocalRectPolygon(shape));
    },
    movingOrigin: getResizeByOrigin(shapeComposite, shape, by),
  });
}

function getResizeByOrigin(shapeComposite: ShapeComposite, shape: Shape, by: Direction4): IVec2 {
  const rectPolygon = shapeComposite.getLocalRectPolygon(shape);
  switch (by) {
    case 0:
      return getCenter(rectPolygon[2], rectPolygon[3]);
    case 1:
      return getCenter(rectPolygon[3], rectPolygon[0]);
    case 2:
      return getCenter(rectPolygon[0], rectPolygon[1]);
    default:
      return getCenter(rectPolygon[1], rectPolygon[2]);
  }
}

export function handleSwitchDirection2(
  ctx: Pick<AppCanvasStateContext, "patchShapes" | "getShapeComposite" | "states">,
  shape: SimplePolygonShape,
) {
  const shapeComposite = ctx.getShapeComposite();
  const patch = patchPipe(
    [
      () => ({ [shape.id]: { direction: getNextDirection2(getShapeDirection(shape)) } }),
      (src) => patchLinesConnectedToShapeOutline(shapeComposite, src[shape.id]),
      (_, patch) => getPatchByLayouts(shapeComposite, { update: patch }),
    ],
    { [shape.id]: shape },
  ).patch;
  ctx.patchShapes(patch);
  return ctx.states.newSelectionHubState;
}

export function handleSwitchDirection4(
  ctx: Pick<AppCanvasStateContext, "patchShapes" | "getShapeComposite" | "states">,
  shape: SimplePolygonShape,
) {
  const shapeComposite = ctx.getShapeComposite();
  const patch = patchPipe(
    [
      () => ({ [shape.id]: { direction: getNextDirection4(getShapeDirection(shape)) } }),
      (src) => patchLinesConnectedToShapeOutline(shapeComposite, src[shape.id]),
      (_, patch) => getPatchByLayouts(shapeComposite, { update: patch }),
    ],
    { [shape.id]: shape },
  ).patch;
  ctx.patchShapes(patch);
  return ctx.states.newSelectionHubState;
}
