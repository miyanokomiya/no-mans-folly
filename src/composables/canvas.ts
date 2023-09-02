import { IVec2, multi, sub, add, getRectCenter, IRectangle, clamp } from "okageo";
import { useCallback, useMemo, useState } from "react";
import { EditMovement } from "./states/types";
import { expandRect } from "../utils/geometry";
import { useGlobalResizeEffect } from "./window";
import { Size } from "../models";

const scaleRate = 1.1;

export interface MoveInfo {
  origin: IVec2;
  downAt: IVec2;
}

function centerizeView(
  targetRect: IRectangle,
  viewSize: {
    width: number;
    height: number;
  },
  reduceScale: (val: number) => number = (v) => v
): {
  viewOrigin: IVec2;
  scale: number;
} {
  const rateW = viewSize.width / targetRect.width;
  const rateH = viewSize.height / targetRect.height;
  const scale = rateW < rateH ? reduceScale(1 / rateW) : reduceScale(1 / rateH);

  return {
    viewOrigin: {
      x: targetRect.x + ((targetRect.width / scale - viewSize.width) / 2) * scale,
      y: targetRect.y + ((targetRect.height / scale - viewSize.height) / 2) * scale,
    },
    scale,
  };
}

export function useCanvas(
  getWrapper: () => {
    getBoundingClientRect: () => IRectangle;
  } | null,
  options: {
    scaleMin?: number;
    scaleMax?: number;
  } = {}
) {
  const scaleMin = options.scaleMin ?? 0.1;
  const scaleMax = options.scaleMax ?? 10;

  const [scale, setScale] = useState(1);
  const [viewOrigin, setViewOrigin] = useState<IVec2>({ x: 0, y: 0 });
  const [viewSize, setViewSize] = useState<Size>({ width: 600, height: 100 });
  const [moveType, setMoveType] = useState<"move" | "drag" | undefined>();
  const [editStartPoint, setEditStartPoint] = useState<IVec2>();
  const [editStartViewOrigin, setEditStartViewOrigin] = useState<IVec2>();
  const [mousePoint, setMousePoint] = useState<IVec2>({ x: 0, y: 0 });

  function endMoving() {
    setMoveType(undefined);
    setEditStartPoint(undefined);
    setEditStartViewOrigin(undefined);
  }
  function startMoving() {
    setMoveType("move");
    setEditStartPoint(mousePoint);
    setEditStartViewOrigin(viewOrigin);
  }
  function startDragging() {
    setMoveType("drag");
    setEditStartPoint(mousePoint);
    setEditStartViewOrigin(viewOrigin);
  }

  const viewCanvasRect = useMemo<IRectangle>(
    () => ({
      x: viewOrigin.x,
      y: viewOrigin.y,
      width: viewSize.width * scale,
      height: viewSize.height * scale,
    }),
    [viewOrigin, viewSize, scale]
  );

  const viewCenter = useMemo(() => getRectCenter({ x: 0, y: 0, ...viewSize }), [viewSize]);

  function viewToCanvas(v: IVec2): IVec2 {
    return _viewToCanvas(scale, viewOrigin, v);
  }

  function panView(editMovement: EditMovement) {
    if (!editStartViewOrigin) return;
    setViewOrigin(add(editStartViewOrigin, sub(editMovement.start, editMovement.current)));
  }

  function canvasToView(v: IVec2): IVec2 {
    return multi(sub(v, viewOrigin), 1 / scale);
  }

  function adjustToCenter() {
    const ret = centerizeView({ x: -viewSize.width / 2, y: -viewSize.height / 2, ...viewSize }, viewSize);
    setViewOrigin(ret.viewOrigin);
    setScale(ret.scale);
  }

  function removeRootPosition(p: IVec2): IVec2 {
    const wrapperElm = getWrapper();
    if (!wrapperElm) return p;
    const rect = wrapperElm.getBoundingClientRect();
    return sub(p, { x: rect.x, y: rect.y });
  }

  function addRootPosition(p: IVec2): IVec2 {
    const wrapperElm = getWrapper();
    if (!wrapperElm) return p;
    const rect = wrapperElm.getBoundingClientRect();
    return add(p, { x: rect.x, y: rect.y });
  }

  function setViewport(rect?: IRectangle, margin = 0) {
    if (!rect) {
      adjustToCenter();
      return;
    }

    const ret = centerizeView(expandRect(rect, margin / scale), viewSize, (v) => clamp(1, scaleMax, v));
    setScale(ret.scale);
    setViewOrigin(ret.viewOrigin);
  }

  function zoomView(step: number, center = false): number {
    const origin = !center && mousePoint ? mousePoint : viewCenter;
    const beforeOrigin = viewToCanvas(origin);
    const nextScale = Math.min(Math.max(scale * Math.pow(scaleRate, step > 0 ? 1 : -1), scaleMin), scaleMax);
    const nextViewOrigin = add(viewOrigin, sub(beforeOrigin, _viewToCanvas(nextScale, viewOrigin, origin)));
    setScale(nextScale);
    setViewOrigin(nextViewOrigin);
    return nextScale;
  }

  const onResize = useCallback(() => {
    const wrapperElm = getWrapper();
    if (!wrapperElm) return;
    const rect = wrapperElm.getBoundingClientRect();
    setViewSize({ width: rect.width, height: rect.height });
  }, [getWrapper]);
  useGlobalResizeEffect(onResize);

  return {
    viewSize,
    setViewSize,
    editStartPoint,
    mousePoint,
    setMousePoint,
    scale,
    viewOrigin,

    moveType,
    endMoving,
    startMoving,
    startDragging,

    viewCenter,
    viewCanvasRect,
    viewToCanvas,
    canvasToView,
    zoomView,
    panView,
    adjustToCenter,
    setViewport,

    removeRootPosition,
    addRootPosition,
  };
}
export type CanvasComposable = ReturnType<typeof useCanvas>;

function _viewToCanvas(scale: number, viewOrigin: IVec2, v: IVec2): IVec2 {
  return add(viewOrigin, multi(v, scale));
}

export function canvasToView(scale: number, origin: IVec2, v: IVec2): IVec2 {
  return multi(sub(v, origin), 1 / scale);
}
