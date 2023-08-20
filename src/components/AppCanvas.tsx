import { useContext, useEffect, useRef, useState } from "react";
import { AppCanvasContext } from "../composables/appCanvasContext";
import { Shape } from "../models";

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

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = "#000000";
    shapes.forEach((s, i) => {
      context.fillRect(10 * i, 10 * i, 5, 5);
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
