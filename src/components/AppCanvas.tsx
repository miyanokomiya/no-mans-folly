import { useContext, useEffect, useRef, useState } from "react";
import { AppCanvasContext } from "../composables/appCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, renderShape } from "../shapes";

export function AppCanvas() {
  const [size] = useState({ width: 400, height: 400 });
  const acctx = useContext(AppCanvasContext);

  const [shapes, setShapes] = useState<Shape[]>([]);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    shapes.forEach((shape) => {
      renderShape(getCommonStruct, ctx, shape);
    });
  }, [shapes]);

  const list = shapes.map((s) => <div key={s.id}>{s.id}</div>);

  return (
    <div className="border border-black" style={{ width: `${size.width}px`, height: `${size.height}px` }}>
      <canvas ref={canvasRef} className="w-max h-max" width={size.width} height={size.height}></canvas>
      {list}
    </div>
  );
}
