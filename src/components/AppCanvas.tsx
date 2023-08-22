import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, renderShape } from "../shapes";
import { useCanvas } from "../composables/canvas";

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

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      canvas.setMousePoint(canvas.removeRootPosition({ x: e.pageX, y: e.pageY }));
    },
    [canvas]
  );

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
    shapes.forEach((shape) => {
      renderShape(getCommonStruct, ctx, shape);
    });
  }, [shapes]);

  useEffect(() => {
    const ctx = ctlCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(canvas.mousePoint.x, canvas.mousePoint.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [canvas.mousePoint]);

  return (
    <div
      ref={wrapperRef}
      className="border border-black relative"
      style={{ width: 400, height: 400 }}
      onMouseDown={onMouseDown}
    >
      <canvas ref={canvasRef} {...canvasAttrs}></canvas>
      <canvas ref={ctlCanvasRef} {...canvasAttrs}></canvas>
    </div>
  );
}
