import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getFrameRect } from "../../composables/frame";
import { FrameShape } from "../../shapes/frame";
import { newShapeRenderer } from "../../composables/shapeRenderer";
import { DocOutput } from "../../models/document";
import { ImageStore } from "../../composables/imageStore";
import { newCanvasBank } from "../../composables/canvasBank";
import { getViewportForRectWithinSize } from "../../utils/geometry";
import { Size } from "../../models";
import { useResizeObserver } from "../../hooks/window";
import { getLineJoin } from "../../utils/strokeStyle";

interface Props {
  shapeComposite: ShapeComposite;
  documentMap: { [id: string]: DocOutput };
  imageStore: ImageStore;
  backgroundColor: string;
  frame: FrameShape;
}

export const FrameThumbnail: React.FC<Props> = ({
  shapeComposite,
  documentMap,
  imageStore,
  backgroundColor,
  frame,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBank = useMemo(() => newCanvasBank(), []);
  const [canvasSize, setCanvasSize] = useState<Size>();

  const frameRectWithBorder = useMemo(() => getFrameRect(frame), [frame]);

  const viewport = useMemo(() => {
    return canvasSize ? getViewportForRectWithinSize(frameRectWithBorder, canvasSize) : undefined;
  }, [frameRectWithBorder, canvasSize]);

  const updateCanvasSize = useCallback(() => {
    if (!wrapperRef.current) return;

    const bounds = wrapperRef.current.getBoundingClientRect();
    setCanvasSize({ width: bounds.width, height: bounds.height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize]);
  // eslint-disable-next-line react-hooks/refs
  useResizeObserver(wrapperRef.current, updateCanvasSize);

  useEffect(() => {
    if (!canvasRef.current || !viewport) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / viewport.scale, 1 / viewport.scale);
    ctx.translate(-viewport.p.x, -viewport.p.y);

    const renderer = newShapeRenderer({
      shapeComposite,
      getDocumentMap: () => documentMap,
      imageStore,
      canvasBank,
      targetRect: frameRectWithBorder,
      scale: viewport.scale,
    });
    renderer.render(ctx);

    // Hide outside area of the frame.
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.rect(frameRectWithBorder.x, frameRectWithBorder.y, frameRectWithBorder.width, frameRectWithBorder.height);
    ctx.lineJoin = getLineJoin(frame.stroke.lineJoin);
    ctx.fillStyle = "#000";
    ctx.fill();
  }, [shapeComposite, canvasBank, documentMap, frame, imageStore, viewport, frameRectWithBorder]);

  return (
    <div ref={wrapperRef} className="h-full">
      {canvasSize ? (
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} style={{ backgroundColor }} />
      ) : undefined}
    </div>
  );
};
