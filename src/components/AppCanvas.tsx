import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, isPointOn, renderShape } from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getMouseOptions } from "../utils/devices";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../composables/window";
import { findBackward } from "../utils/commons";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState({});
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tmpShapeMap, setTmpShapeMap] = useState<{ [id: string]: Partial<Shape> }>({});

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      smctx.stateMachine.handleEvent({
        type: "shape-updated",
      });
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return smctx.stateMachine.watch(() => {
      setCanvasState({});
    });
  }, [smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      smctx.stateMachine.handleEvent({
        type: "selection",
      });
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const canvas = useCanvas(getWrapper);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctlCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasAttrs = useMemo(
    () => ({
      className: "w-max h-max absolute top-0 left-0",
      width: canvas.viewSize.width,
      height: canvas.viewSize.height,
    }),
    [canvas.viewSize.width, canvas.viewSize.height]
  );

  useEffect(() => {
    console.log("Rendered: Shape");
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / canvas.scale, 1 / canvas.scale);
    ctx.translate(-canvas.viewOrigin.x, -canvas.viewOrigin.y);

    shapes.forEach((shape) => {
      const tmpShape = tmpShapeMap[shape.id];
      if (tmpShape) {
        renderShape(getCommonStruct, ctx, { ...shape, ...tmpShape });
      } else {
        renderShape(getCommonStruct, ctx, shape);
      }
    });

    smctx.stateMachine.render(ctx);
  }, [
    shapes,
    tmpShapeMap,
    canvas.viewSize.width,
    canvas.viewSize.height,
    canvas.scale,
    canvas.viewOrigin.x,
    canvas.viewOrigin.y,
    canvasState,
    smctx.stateMachine,
  ]);

  useEffect(() => {
    const ctx = ctlCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(canvas.mousePoint.x, canvas.mousePoint.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [canvas.mousePoint.x, canvas.mousePoint.y]);

  useEffect(() => {
    smctx.setCtx({
      setViewport: canvas.setViewport,
      zoomView: canvas.zoomView,
      panView: canvas.panView,
      startDragging: canvas.startDragging,
      stopDragging: canvas.endMoving,
      setContextMenuList() {},
      setCommandExams() {},

      getShapeMap: acctx.shapeStore.getEntityMap,
      getSelectedShapeIdMap: acctx.shapeStore.getSelected,
      getLastSelectedShapeId: acctx.shapeStore.getLastSelected,
      getShapeAt(p) {
        return findBackward(shapes, (s) => isPointOn(getCommonStruct, s, p));
      },
      selectShape: acctx.shapeStore.select,
      clearAllSelected: acctx.shapeStore.clearAllSelected,
      deleteShapes: acctx.shapeStore.deleteEntities,
      patchShapes: acctx.shapeStore.patchEntities,
      getTmpShapeMap: () => tmpShapeMap,
      setTmpShapeMap: setTmpShapeMap,
    });
  }, [canvas, acctx, smctx, shapes, tmpShapeMap]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      smctx.stateMachine.handleEvent({
        type: "pointerdown",
        data: {
          point: canvas.viewToCanvas(canvas.mousePoint),
          options: getMouseOptions(e),
        },
      });
    },
    [canvas, smctx]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      canvas.setMousePoint(canvas.removeRootPosition({ x: e.pageX, y: e.pageY }));
      if (!canvas.editStartPoint) return;

      smctx.stateMachine.handleEvent({
        type: "pointermove",
        data: {
          start: canvas.viewToCanvas(canvas.editStartPoint),
          current: canvas.viewToCanvas(canvas.mousePoint),
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          scale: canvas.scale,
        },
      });
    },
    [canvas, smctx]
  );
  useGlobalMousemoveEffect(onMouseMove);

  const onMouseEnter = useCallback(() => {
    wrapperRef.current?.focus();
  }, []);

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      smctx.stateMachine.handleEvent({
        type: "pointerup",
        data: {
          point: canvas.viewToCanvas(canvas.mousePoint),
          options: getMouseOptions(e),
        },
      });
    },
    [canvas, smctx]
  );
  useGlobalMouseupEffect(onMouseUp);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      smctx.stateMachine.handleEvent({
        type: "keydown",
        data: { key: e.key },
      });
    },
    [smctx]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      smctx.stateMachine.handleEvent({
        type: "wheel",
        data: {
          delta: { x: e.deltaX, y: e.deltaY },
          options: getMouseOptions(e),
        },
      });
    },
    [smctx]
  );

  return (
    <div
      ref={wrapperRef}
      className="box-border border border-black relative w-full h-full"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      tabIndex={-1}
    >
      <canvas ref={canvasRef} {...canvasAttrs}></canvas>
      <canvas ref={ctlCanvasRef} {...canvasAttrs}></canvas>
      <div className="absolute left-0 bottom-0">{smctx.stateMachine.getStateSummary().label}</div>
    </div>
  );
}
