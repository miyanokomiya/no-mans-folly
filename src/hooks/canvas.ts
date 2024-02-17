import { IVec2, multi, sub, add, getRectCenter, IRectangle, clamp } from "okageo";
import { useCallback, useMemo, useRef, useState } from "react";
import { EditMovement } from "../composables/states/types";
import { expandRect } from "../utils/geometry";
import { useGlobalResizeEffect } from "./window";
import { Size } from "../models";
import { useLocalStorageAdopter } from "./localStorage";

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
  reduceScale: (val: number) => number = (v) => v,
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
  } = {},
) {
  const scaleMin = options.scaleMin ?? 0.1;
  const scaleMax = options.scaleMax ?? 10;

  const [viewSize, setViewSize] = useState<Size>({ width: 600, height: 100 });
  const [moveType, setMoveType] = useState<"move" | "drag" | undefined>();
  const [editStartPoint, setEditStartPoint] = useState<IVec2>();
  const [editStartViewOrigin, setEditStartViewOrigin] = useState<IVec2>();

  // Prepare ref for mouse point to reduce recalculation.
  const mousePoint = useRef<IVec2>({ x: 0, y: 0 });

  const { state: viewState, setState: setViewState } = useLocalStorageAdopter({
    key: "view_state",
    version: "1",
    initialValue: { scale: 1, viewOrigin: { x: 0, y: 0 } },
  });
  const { scale, viewOrigin } = viewState;
  const setScale = useCallback(
    (val: number) => {
      // For safety
      if (isNaN(val)) return;
      setViewState((state) => ({ scale: val, viewOrigin: state.viewOrigin }));
    },
    [setViewState],
  );
  const setViewOrigin = useCallback(
    (val: IVec2) => {
      setViewState((state) => ({ scale: state.scale, viewOrigin: val }));
    },
    [setViewState],
  );

  function setMousePoint(value: IVec2) {
    mousePoint.current = value;
  }

  const getMousePoint = useCallback((): IVec2 => {
    return mousePoint.current;
  }, []);

  const endMoving = useCallback(() => {
    setMoveType(undefined);
    setEditStartPoint(undefined);
    setEditStartViewOrigin(undefined);
  }, []);

  const startMoving = useCallback(() => {
    setMoveType("move");
    setEditStartPoint(getMousePoint());
    setEditStartViewOrigin(viewOrigin);
  }, [viewOrigin, getMousePoint]);

  const startDragging = useCallback(() => {
    setMoveType("drag");
    setEditStartPoint(getMousePoint());
    setEditStartViewOrigin(viewOrigin);
  }, [viewOrigin, getMousePoint]);

  const viewCanvasRect = useMemo<IRectangle>(
    () => ({
      x: viewOrigin.x,
      y: viewOrigin.y,
      width: viewSize.width * scale,
      height: viewSize.height * scale,
    }),
    [viewOrigin, viewSize, scale],
  );

  const viewCenter = useMemo(() => getRectCenter({ x: 0, y: 0, ...viewSize }), [viewSize]);

  const viewToCanvas = useCallback(
    (v: IVec2): IVec2 => {
      return _viewToCanvas(scale, viewOrigin, v);
    },
    [scale, viewOrigin],
  );

  const panView = useCallback(
    (editMovement: EditMovement) => {
      if (!editStartViewOrigin) return;
      setViewOrigin(add(editStartViewOrigin, sub(editMovement.start, editMovement.current)));
    },
    [editStartViewOrigin, setViewOrigin],
  );

  const scrollView = useCallback(
    (delta: IVec2) => {
      setViewOrigin(add(viewOrigin, multi(delta, scale)));
    },
    [viewOrigin, scale, setViewOrigin],
  );

  const canvasToView = useCallback(
    (v: IVec2): IVec2 => {
      return multi(sub(v, viewOrigin), 1 / scale);
    },
    [viewOrigin, scale],
  );

  const adjustToCenter = useCallback(() => {
    const ret = centerizeView({ x: -viewSize.width / 2, y: -viewSize.height / 2, ...viewSize }, viewSize);
    setViewOrigin(ret.viewOrigin);
    setScale(ret.scale);
  }, [viewSize, setViewOrigin, setScale]);

  const removeRootPosition = useCallback(
    (p: IVec2): IVec2 => {
      const wrapperElm = getWrapper();
      if (!wrapperElm) return p;
      const rect = wrapperElm.getBoundingClientRect();
      return sub(p, { x: rect.x, y: rect.y });
    },
    [getWrapper],
  );

  const addRootPosition = useCallback(
    (p: IVec2): IVec2 => {
      const wrapperElm = getWrapper();
      if (!wrapperElm) return p;
      const rect = wrapperElm.getBoundingClientRect();
      return add(p, { x: rect.x, y: rect.y });
    },
    [getWrapper],
  );

  const setViewport = useCallback(
    (rect?: IRectangle, margin = 0) => {
      if (!rect) {
        adjustToCenter();
        return;
      }

      const ret = centerizeView(expandRect(rect, margin / scale), viewSize, (v) => clamp(1, scaleMax, v));
      setScale(ret.scale);
      setViewOrigin(ret.viewOrigin);
    },
    [scale, scaleMax, adjustToCenter, viewSize, setViewOrigin, setScale],
  );

  const zoomView = useCallback(
    (step: number, center = false): number => {
      const origin = !center ? getMousePoint() : viewCenter;
      const beforeOrigin = viewToCanvas(origin);
      const nextScale = Math.min(Math.max(scale * Math.pow(scaleRate, step > 0 ? 1 : -1), scaleMin), scaleMax);
      const nextViewOrigin = add(viewOrigin, sub(beforeOrigin, _viewToCanvas(nextScale, viewOrigin, origin)));
      setScale(nextScale);
      setViewOrigin(nextViewOrigin);
      return nextScale;
    },
    [viewCenter, scale, scaleMax, scaleMin, viewOrigin, viewToCanvas, getMousePoint, setScale, setViewOrigin],
  );

  const setZoom = useCallback(
    (value: number, center = false): number => {
      const origin = !center ? getMousePoint() : viewCenter;
      const beforeOrigin = viewToCanvas(origin);
      const nextScale = Math.min(Math.max(value, scaleMin), scaleMax);
      const nextViewOrigin = add(viewOrigin, sub(beforeOrigin, _viewToCanvas(nextScale, viewOrigin, origin)));
      setScale(nextScale);
      setViewOrigin(nextViewOrigin);
      return nextScale;
    },
    [viewCenter, scaleMax, scaleMin, viewOrigin, viewToCanvas, getMousePoint, setScale, setViewOrigin],
  );

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
    getMousePoint,
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
    setZoom,
    panView,
    scrollView,
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
