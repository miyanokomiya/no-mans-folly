import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FloatDialog } from "./atoms/FloatDialog";
import { useSelectedTmpSheet, useShapeComposite } from "../hooks/storeHooks";
import { newShapeRenderer } from "../composables/shapeRenderer";
import { useCanvas } from "../hooks/canvas";
import { AppStateContext } from "../contexts/AppContext";
import { newCanvasBank } from "../composables/canvasBank";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { rednerRGBA } from "../utils/color";

interface Props {
  open: boolean;
  onClose?: () => void;
}

export const PreviewDialog: React.FC<Props> = () => {
  const [size] = useState({ width: 400, height: 400 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { shapeStore, documentStore } = useContext(AppCanvasContext);
  const sheet = useSelectedTmpSheet();
  const smctx = useContext(AppStateContext);
  const canvasBank = useMemo(() => {
    shapeStore; // For exhaustive-deps
    return newCanvasBank();
  }, [shapeStore]);

  const {
    setViewport,
    zoomView,
    setZoom,
    panView,
    scrollView,
    startDragging,
    endMoving,
    scale,
    viewCanvasRect,
    canvasToView,
    viewSize,
    viewOrigin,
    viewToCanvas,
    getMousePoint,
    setMousePoint,
    removeRootPosition,
    editStartPoint,
  } = useCanvas(getWrapper);
  const shapeComposite = useShapeComposite();

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / scale, 1 / scale);
    ctx.translate(-viewOrigin.x, -viewOrigin.y);

    const renderer = newShapeRenderer({
      shapeComposite: shapeComposite,
      getDocumentMap: smctx.getDocumentMap,
      imageStore: smctx.getImageStore(),
      scale,
      canvasBank,
    });
    renderer.render(ctx);
  }, [shapeComposite, documentStore, smctx, scale, viewOrigin.x, viewOrigin.y, canvasBank]);

  return (
    <FloatDialog open={true} title="Preview" initialSize={size}>
      <div ref={wrapperRef} style={{ backgroundColor: sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff" }}>
        <canvas ref={canvasRef} width={size.width} height={size.height}></canvas>
      </div>
    </FloatDialog>
  );
};
