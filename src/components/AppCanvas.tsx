import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, renderShape } from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getMouseOptions } from "../utils/devices";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);

  const [shapes, setShapes] = useState<Shape[]>([]);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore]);

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
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.resetTransform();
    ctx.transform(canvas.scale, 0, 0, canvas.scale, -canvas.viewOrigin.x, -canvas.viewOrigin.y);

    shapes.forEach((shape) => {
      renderShape(getCommonStruct, ctx, shape);
    });
  }, [shapes, canvas.viewSize.width, canvas.viewSize.height, canvas.scale, canvas.viewOrigin.x, canvas.viewOrigin.y]);

  useEffect(() => {
    const ctx = ctlCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(canvas.mousePoint.x, canvas.mousePoint.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [canvas.mousePoint.x, canvas.mousePoint.y]);

  const smctx = useContext(AppStateMachineContext);
  useEffect(() => {
    smctx.setCtx({
      setViewport: canvas.setViewport,
      panView: canvas.panView,
      startDragging: canvas.startDragging,
      stopDragging: canvas.endMoving,
    });
  }, [canvas, smctx]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    (e: React.MouseEvent) => {
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

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
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

  return (
    <div
      ref={wrapperRef}
      className="border border-black relative"
      style={{ width: 400, height: 400 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <canvas ref={canvasRef} {...canvasAttrs}></canvas>
      <canvas ref={ctlCanvasRef} {...canvasAttrs}></canvas>
    </div>
  );
}
