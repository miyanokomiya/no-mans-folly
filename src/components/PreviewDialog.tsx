import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FloatDialog } from "./atoms/FloatDialog";
import { useSelectedTmpSheet, useShapeComposite } from "../hooks/storeHooks";
import { newShapeRenderer } from "../composables/shapeRenderer";
import { useCanvas } from "../hooks/canvas";
import { AppStateContext } from "../contexts/AppContext";
import { newCanvasBank } from "../composables/canvasBank";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { rednerRGBA } from "../utils/color";
import { useClickable } from "../hooks/clickable";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../hooks/window";
import { ModeStateContextBase, newStateMachine } from "../composables/states/core";
import { newPreviewState } from "../composables/states/previewState";
import { getKeyOptions, getMouseOptions } from "../utils/devices";
import { CanvasStateContext } from "../composables/states/commons";
import { ZoomField } from "./molecules/ZoomField";
import iconDoubleCircle from "../assets/icons/double_circle.svg";
import { getAllShapeRangeWithinComposite } from "../composables/shapeComposite";

const INITIAL_POSITION = { x: 150, y: 50 };
const INITIAL_SIZE = { width: 400, height: 400 };

interface Props {
  open: boolean;
  onClose?: () => void;
}

export const PreviewDialog: React.FC<Props> = ({ open, onClose }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { shapeStore, documentStore } = useContext(AppCanvasContext);
  const sheet = useSelectedTmpSheet();
  const smctx = useContext(AppStateContext);
  const canvasBank = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    shapeStore; // For exhaustive-deps
    return newCanvasBank();
  }, [shapeStore]);
  const [canvasState, setCanvasState] = useState<any>({});

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
  } = useCanvas(getWrapper, { viewStateKey: "preview_view_state" });
  const shapeComposite = useShapeComposite();

  useEffect(() => {
    if (!open) return;

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
  }, [
    open,
    shapeComposite,
    documentStore,
    smctx,
    scale,
    viewOrigin.x,
    viewOrigin.y,
    canvasBank,
    canvasState,
    viewSize,
  ]);

  const focus = useCallback(() => {
    wrapperRef.current?.focus();
  }, []);

  const previewCtx = useMemo<ModeStateContextBase & CanvasStateContext>(() => {
    return {
      getTimestamp: () => Date.now(),
      generateUuid: () => "",
      getStyleScheme: smctx.getStyleScheme,
      getUserSetting: smctx.getUserSetting,
      patchUserSetting: smctx.patchUserSetting,

      redraw: () => setCanvasState({}),
      getRenderCtx: () => canvasRef.current?.getContext("2d") ?? undefined,
      setViewport,
      zoomView,
      setZoom,
      getScale: () => scale,
      getViewRect: () => viewCanvasRect,
      panView,
      scrollView,
      startDragging: startDragging,
      stopDragging: endMoving,
      getCursorPoint: () => viewToCanvas(getMousePoint()),

      toView: canvasToView,
      showFloatMenu: () => {},
      hideFloatMenu: () => {},
      setContextMenuList: () => {},
      setCommandExams: () => {},
      showToastMessage: () => {},
      setCursor: () => {},

      undo: () => {},
      redo: () => {},
      setCaptureTimeout: () => {},
    };
  }, [
    smctx.getStyleScheme,
    smctx.getUserSetting,
    smctx.patchUserSetting,
    setViewport,
    zoomView,
    setZoom,
    panView,
    scrollView,
    startDragging,
    endMoving,
    canvasToView,
    viewToCanvas,
    scale,
    viewCanvasRect,
    getMousePoint,
  ]);

  const previewCtxRef = useRef(previewCtx);
  previewCtxRef.current = previewCtx;
  const sm = useMemo(() => {
    return newStateMachine(() => {
      return previewCtxRef.current;
    }, newPreviewState);
  }, []);

  const { handlePointerDown, handlePointerUp, isValidPointer } = useClickable({
    onDown: useCallback(
      (e: PointerEvent) => {
        e.preventDefault();
        focus();

        const p = removeRootPosition({ x: e.pageX, y: e.pageY });
        setMousePoint(p);
        sm.handleEvent({
          type: "pointerdown",
          data: {
            point: viewToCanvas(p),
            options: getMouseOptions(e),
          },
        });
      },
      [viewToCanvas, sm, focus, removeRootPosition, setMousePoint],
    ),
    onUp: useCallback(
      (e: PointerEvent) => {
        sm.handleEvent({
          type: "pointerup",
          data: {
            point: viewToCanvas(getMousePoint()),
            options: getMouseOptions(e),
          },
        });
      },
      [viewToCanvas, getMousePoint, sm],
    ),
  });

  const onMouseDown = useCallback((e: React.PointerEvent) => handlePointerDown(e.nativeEvent), [handlePointerDown]);
  useGlobalMouseupEffect(handlePointerUp);

  const onMouseMove = useCallback(
    (e: PointerEvent) => {
      if (!isValidPointer(e)) return;

      const p = removeRootPosition({ x: e.pageX, y: e.pageY });
      setMousePoint(p);
      if (!editStartPoint) return;

      sm.handleEvent({
        type: "pointermove",
        data: {
          start: viewToCanvas(editStartPoint),
          current: viewToCanvas(p),
          scale: scale,
          ...getMouseOptions(e),
        },
      });
    },
    [editStartPoint, removeRootPosition, scale, setMousePoint, viewToCanvas, sm, isValidPointer],
  );
  useGlobalMousemoveEffect(onMouseMove);

  const onMouseHover = useCallback(
    (e: React.PointerEvent) => {
      focus();
      sm.handleEvent({
        type: "pointerhover",
        data: {
          current: viewToCanvas(getMousePoint()),
          scale: scale,
          ...getMouseOptions(e),
        },
      });
    },
    [getMousePoint, scale, viewToCanvas, sm, focus],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      sm.handleEvent({
        type: "keydown",
        data: {
          ...getKeyOptions(e),
          prevent: () => e.preventDefault(),
        },
      });
    },
    [sm],
  );

  const onKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      sm.handleEvent({
        type: "keyup",
        data: {
          ...getKeyOptions(e),
          prevent: () => e.preventDefault(),
        },
      });
    },
    [sm],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      sm.handleEvent({
        type: "wheel",
        data: {
          delta: { x: e.deltaX, y: e.deltaY },
          options: getMouseOptions(e),
        },
      });
    },
    [sm],
  );
  useEffect(() => {
    if (!wrapperRef.current) return;

    const refValue = wrapperRef.current;
    // There's no way to proc "preventDefault" in React way.
    refValue.addEventListener("wheel", onWheel);
    return () => {
      refValue.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  const handleNativeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleFollowClick = useCallback(() => {
    setViewport(smctx.getViewRect());
  }, [setViewport, smctx]);

  const handleScaleFit = useCallback(() => {
    setPopupKey("");
    if (shapeComposite.shapes.length === 0) return;

    const rect = getAllShapeRangeWithinComposite(shapeComposite, true);
    setViewport(rect);
  }, [shapeComposite, setViewport]);

  const [popupKey, setPopupKey] = useState("");
  const handlePopupClick = useCallback(
    (value: string) => {
      setPopupKey((key) => (key === value ? "" : value));
    },
    [setPopupKey],
  );

  return (
    <FloatDialog
      open={open}
      onClose={onClose}
      title="Preview"
      initialPosition={INITIAL_POSITION}
      initialBodySize={INITIAL_SIZE}
      boundsKey="preview"
    >
      <div className="w-full h-full relative">
        <div
          ref={wrapperRef}
          className="w-full h-full outline-hidden"
          style={{ backgroundColor: sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff" }}
          onPointerDown={onMouseDown}
          onPointerMove={onMouseHover}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onContextMenu={handleNativeContextMenu}
          tabIndex={-1}
        >
          <canvas ref={canvasRef} width={viewSize.width} height={viewSize.height}></canvas>
        </div>
        <div className="absolute bottom-1 left-1 flex items-center gap-2">
          <ZoomField
            scale={scale}
            onScaleChange={setZoom}
            popupedKey={popupKey}
            onClickPopupButton={handlePopupClick}
            onScaleFit={handleScaleFit}
          />
          <button
            className="w-8 h-8 p-1 bg-white rounded-full flex items-center justify-center"
            onClick={handleFollowClick}
          >
            <img src={iconDoubleCircle} alt="Follow canvas" />
          </button>
        </div>
      </div>
    </FloatDialog>
  );
};
