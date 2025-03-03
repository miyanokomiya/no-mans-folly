import { useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useDocumentMapWithoutTmpInfo, useSelectedSheet, useStaticShapeComposite } from "../../hooks/storeHooks";
import { getAllFrameShapes, getFrameRect } from "../../composables/frame";
import { isFrameShape } from "../../shapes/frame";
import { GetAppStateContext } from "../../contexts/AppContext";
import { getViewportForRectWithinSize } from "../../utils/geometry";
import { newShapeRenderer } from "../../composables/shapeRenderer";
import { newCanvasBank } from "../../composables/canvasBank";
import { rednerRGBA } from "../../utils/color";
import { useGlobalKeydownEffect, useGlobalResizeEffect } from "../../hooks/window";
import { getLineJoin } from "../../utils/strokeStyle";

export type SlideshowHandle = { play: () => Promise<void> };

interface Props {
  ref: React.Ref<SlideshowHandle>;
  onClose?: () => void;
}

export const Slideshow: React.FC<Props> = ({ ref, onClose }) => {
  const rootRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useImperativeHandle(ref, () => {
    return {
      play: async () => {
        if (!rootRef.current || !bodyRef.current) return;

        try {
          rootRef.current.showModal();
          setShow(true);
          await bodyRef.current.requestFullscreen();
        } catch {
          rootRef.current?.close();
          setShow(false);
        }
      },
    };
  }, []);

  useEffect(() => {
    const bodyElm = bodyRef.current;
    if (!bodyElm) return;

    const handleFullscreenchange = () => {
      if (!document.fullscreenElement) {
        rootRef.current?.close();
        setShow(false);
        onClose?.();
      }
    };
    bodyElm.addEventListener("fullscreenchange", handleFullscreenchange);

    return () => {
      bodyElm.removeEventListener("fullscreenchange", handleFullscreenchange);
    };
  }, [onClose]);

  return (
    <dialog ref={rootRef}>
      <div ref={bodyRef} className="fixed inset-0 bg-white">
        {show ? <SlideshowBody /> : undefined}
      </div>
    </dialog>
  );
};

const SlideshowBody: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useStaticShapeComposite();
  const documentMap = useDocumentMapWithoutTmpInfo();
  const imageStore = getCtx().getImageStore();
  const canvasBank = useMemo(() => newCanvasBank(), []);
  const sheet = useSelectedSheet();
  const sheetColor = sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff";
  const [frameId, setFrameId] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = getCtx();
    const sc = ctx.getShapeComposite();
    const id = ctx.getLastSelectedShapeId() ?? getAllFrameShapes(sc).at(0)?.id;
    if (!id || !sc.shapeMap[id] || !isFrameShape(sc.shapeMap[id])) return;

    setFrameId(id);
  }, [getCtx]);

  const frame = useMemo(() => {
    if (!frameId) return;
    const shape = shapeComposite.shapeMap[frameId];
    return shape && isFrameShape(shape) ? shape : undefined;
  }, [shapeComposite, frameId]);

  const render = useCallback(() => {
    if (!canvasRef.current || !frame) return;

    const canvasSize = { width: window.screen.width, height: window.screen.height };
    canvasRef.current.width = canvasSize.width;
    canvasRef.current.height = canvasSize.height;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const frameRectWithBorder = getFrameRect(frame);
    const viewport = getViewportForRectWithinSize(frameRectWithBorder, canvasSize);

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
  }, [frame, canvasBank, documentMap, imageStore, shapeComposite]);

  useEffect(render, [render]);
  useGlobalResizeEffect(render);

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter": {
          const ctx = getCtx();
          const sc = ctx.getShapeComposite();
          const frames = getAllFrameShapes(sc);
          setFrameId((id) => {
            const index = frames.findIndex((f) => f.id === id);
            const next = frames.at(index + 1);
            return next?.id ?? id;
          });
          break;
        }
        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace": {
          const ctx = getCtx();
          const sc = ctx.getShapeComposite();
          const frames = getAllFrameShapes(sc);
          setFrameId((id) => {
            const index = frames.findIndex((f) => f.id === id);
            const prev = frames.at(Math.max(0, index - 1));
            return prev?.id ?? id;
          });
          break;
        }
      }
    },
    [getCtx],
  );
  useGlobalKeydownEffect(handleKeydown);

  return frame ? <canvas ref={canvasRef} style={{ backgroundColor: sheetColor }} /> : undefined;
};
