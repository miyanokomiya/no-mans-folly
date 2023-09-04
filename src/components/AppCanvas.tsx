import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import {
  getCommonStruct,
  getShapeTextBounds,
  getWrapperRectForShapes,
  isPointOn,
  remapShapeIds,
  renderShape,
  resizeShape,
} from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getMouseOptions, isAltOrOpt, isCtrlOrMeta } from "../utils/devices";
import {
  useGlobalCopyEffect,
  useGlobalMousemoveEffect,
  useGlobalMouseupEffect,
  useGlobalPasteEffect,
} from "../composables/window";
import { findBackward, mapDataToObj, remap } from "../utils/commons";
import { TextEditor } from "./textEditor/TextEditor";
import { DocAttrInfo } from "../models/document";
import { getDocAttributes, renderDoc } from "../utils/textEditor";
import { AffineMatrix, IVec2, sub } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";
import { generateUuid } from "../utils/random";
import { ModifierOptions } from "../composables/states/types";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState<any>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});

  useEffect(() => {
    return acctx.shapeStore.watch((keys) => {
      smctx.stateMachine.handleEvent({
        type: "shape-updated",
        data: { keys },
      });
      setCanvasState({});
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchTmpShapeMap(() => {
      setCanvasState({});
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      setCanvasState({});
    });
  }, [acctx.shapeStore]);

  useEffect(() => {
    return acctx.documentStore.watch((keys) => {
      smctx.stateMachine.handleEvent({
        type: "shape-updated",
        data: { keys },
      });
      setCanvasState({});
    });
  }, [acctx.documentStore, smctx.stateMachine]);

  useEffect(() => {
    return smctx.stateMachine.watch(() => {
      setCanvasState({});
    });
  }, [smctx.stateMachine]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const {
    setViewport,
    zoomView,
    panView,
    startDragging,
    endMoving,
    scale,
    canvasToView,
    viewSize,
    viewOrigin,
    viewToCanvas,
    getMousePoint,
    setMousePoint,
    removeRootPosition,
    editStartPoint,
  } = useCanvas(getWrapper);

  useEffect(() => {
    smctx.setCtx({
      getRenderCtx: () => canvasRef.current?.getContext("2d") ?? undefined,
      setViewport: setViewport,
      zoomView: zoomView,
      getScale: () => scale,
      panView: panView,
      startDragging: startDragging,
      stopDragging: endMoving,

      toView: canvasToView,
      showFloatMenu: () => setFloatMenuAvailable(true),
      hideFloatMenu: () => setFloatMenuAvailable(false),
      setContextMenuList() {},
      setCommandExams() {},
      setCursor,

      undo: acctx.undoManager.undo,
      redo: acctx.undoManager.redo,
      setCaptureTimeout: acctx.undoManager.setCaptureTimeout,

      getShapeMap: acctx.shapeStore.getEntityMap,
      getSelectedShapeIdMap: acctx.shapeStore.getSelected,
      getLastSelectedShapeId: acctx.shapeStore.getLastSelected,
      getShapeAt(p) {
        return findBackward(acctx.shapeStore.getEntities(), (s) => isPointOn(getCommonStruct, s, p));
      },
      selectShape: acctx.shapeStore.select,
      multiSelectShapes: acctx.shapeStore.multiSelect,
      clearAllSelected: acctx.shapeStore.clearAllSelected,
      addShapes: acctx.shapeStore.addEntities,
      deleteShapes: (ids: string[]) => {
        acctx.shapeStore.transact(() => {
          acctx.shapeStore.deleteEntities(ids);
          acctx.documentStore.deleteDocs(ids);
        });
      },
      patchShapes: acctx.shapeStore.patchEntities,
      getTmpShapeMap: acctx.shapeStore.getTmpShapeMap,
      setTmpShapeMap: acctx.shapeStore.setTmpShapeMap,
      pasteShapes: (shapes, docs, p) => {
        const remapInfo = remapShapeIds(getCommonStruct, shapes, generateUuid, true);
        const remapDocs = remap(mapDataToObj(docs), remapInfo.newToOldMap);
        const targetP = p ?? viewToCanvas(getMousePoint());
        const moved = shiftShapesAtTopLeft(remapInfo.shapes, targetP);

        acctx.shapeStore.transact(() => {
          acctx.shapeStore.addEntities(moved);
          acctx.documentStore.patchDocs(remapDocs);
        });
        acctx.shapeStore.multiSelect(moved.map((s) => s.id));
      },

      startTextEditing() {
        setTextEditing(true);
      },
      stopTextEditing() {
        setTextEditing(false);
      },
      setTextEditorPosition: (p) => {
        setTextEditorPosition(canvasToView(p));
      },
      getDocumentMap: acctx.documentStore.getDocMap,
      patchDocuments: acctx.documentStore.patchDocs,
      setCurrentDocAttrInfo,
      createCursorPosition: acctx.documentStore.createCursorPosition,
      retrieveCursorPosition: acctx.documentStore.retrieveCursorPosition,
    });
  }, [
    setViewport,
    zoomView,
    panView,
    startDragging,
    endMoving,
    canvasToView,
    viewToCanvas,
    scale,
    acctx,
    smctx,
    getMousePoint,
  ]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      smctx.stateMachine.handleEvent({
        type: "selection",
      });
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasAttrs = useMemo(
    () => ({
      className: "w-max h-max absolute top-0 left-0",
      width: viewSize.width,
      height: viewSize.height,
    }),
    [viewSize.width, viewSize.height]
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / scale, 1 / scale);
    ctx.translate(-viewOrigin.x, -viewOrigin.y);

    const selectedMap = smctx.getCtx().getSelectedShapeIdMap();
    acctx.shapeStore.getEntities().forEach((shape) => {
      const tmpShape = acctx.shapeStore.getTmpShapeMap()[shape.id];
      const latestShape = tmpShape ? { ...shape, ...tmpShape } : shape;
      renderShape(getCommonStruct, ctx, latestShape);

      const doc = acctx.documentStore.getDocMap()[latestShape.id];
      if (doc) {
        if (textEditing && selectedMap[shape.id]) return;

        ctx.save();
        const bounds = getShapeTextBounds(getCommonStruct, latestShape);
        ctx.transform(...bounds.affine);
        renderDoc(ctx, doc, bounds.range);
        ctx.restore();
      }
    });

    smctx.stateMachine.render(ctx);
  }, [
    acctx.shapeStore,
    viewSize.width,
    viewSize.height,
    scale,
    viewOrigin.x,
    viewOrigin.y,
    canvasState,
    smctx,
    acctx.documentStore,
    textEditing,
  ]);

  const [downTimestamp, setDownTimestamp] = useState(0);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const data = {
        point: viewToCanvas(getMousePoint()),
        options: getMouseOptions(e),
      };

      const timestamp = Date.now();
      if (timestamp - downTimestamp < 300) {
        smctx.stateMachine.handleEvent({ type: "pointerdoubledown", data });
      } else {
        smctx.stateMachine.handleEvent({ type: "pointerdown", data });
      }
      setDownTimestamp(timestamp);
    },
    [getMousePoint, viewToCanvas, smctx, downTimestamp]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      setMousePoint(removeRootPosition({ x: e.pageX, y: e.pageY }));
      if (!editStartPoint) return;

      smctx.stateMachine.handleEvent({
        type: "pointermove",
        data: {
          start: viewToCanvas(editStartPoint),
          current: viewToCanvas(getMousePoint()),
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          scale: scale,
        },
      });
    },
    [editStartPoint, getMousePoint, removeRootPosition, scale, setMousePoint, viewToCanvas, smctx]
  );
  useGlobalMousemoveEffect(onMouseMove);

  const [focused, setFocused] = useState(false);
  const focus = useCallback(() => {
    if (textEditing || document.activeElement?.getAttribute("data-keep-focus")) return;
    wrapperRef.current?.focus();
  }, [textEditing]);

  const onFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!focused && !textEditing) return;
      smctx.stateMachine.handleEvent({
        type: "copy",
        nativeEvent: e,
      });
    },
    [focused, textEditing, smctx]
  );
  useGlobalCopyEffect(onCopy);

  const onPaste = useCallback(
    (e: ClipboardEvent, option: ModifierOptions) => {
      if (!focused && !textEditing) return;
      smctx.stateMachine.handleEvent({
        type: "paste",
        nativeEvent: e,
        data: option,
      });
    },
    [focused, textEditing, smctx]
  );
  useGlobalPasteEffect(onPaste);

  const onMouseHover = useCallback(
    (e: React.MouseEvent) => {
      focus();
      smctx.stateMachine.handleEvent({
        type: "pointerhover",
        data: {
          current: viewToCanvas(getMousePoint()),
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          scale: scale,
        },
      });
    },
    [getMousePoint, scale, viewToCanvas, smctx, focus]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      smctx.stateMachine.handleEvent({
        type: "pointerup",
        data: {
          point: viewToCanvas(getMousePoint()),
          options: getMouseOptions(e),
        },
      });
    },
    [viewToCanvas, getMousePoint, smctx]
  );
  useGlobalMouseupEffect(onMouseUp);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      smctx.stateMachine.handleEvent({
        type: "keydown",
        data: {
          key: e.key,
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          prevent: () => e.preventDefault(),
        },
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

  const onTextInput = useCallback(
    (val: string, composition = false) => {
      smctx.stateMachine.handleEvent({
        type: "text-input",
        data: {
          value: val,
          composition,
        },
      });
    },
    [smctx.stateMachine]
  );

  const indexDocAttrInfo = useMemo<DocAttrInfo | undefined>(() => {
    const lastSelected = acctx.shapeStore.getLastSelected();
    if (!lastSelected) return;
    if (textEditing) return currentDocAttrInfo;

    const doc = acctx.documentStore.getDocMap()[lastSelected];
    if (!doc) return;

    const attrs = getDocAttributes(doc);
    return { cursor: attrs, block: attrs, doc: attrs };
  }, [canvasState, currentDocAttrInfo, textEditing, acctx.shapeStore, acctx.documentStore]);

  const [textEditorFocusKey, setTextEditorFocusKey] = useState({});
  const focusBackTextEditor = useCallback(() => {
    setTextEditorFocusKey({});
  }, []);

  const textEditor = textEditing ? (
    <TextEditor
      onInput={onTextInput}
      onKeyDown={onKeyDown}
      position={textEditorPosition}
      focusKey={textEditorFocusKey}
    />
  ) : undefined;

  const floatMenu = floatMenuAvailable ? (
    <FloatMenu
      canvasState={canvasState}
      scale={scale}
      viewOrigin={viewOrigin}
      indexDocAttrInfo={indexDocAttrInfo}
      focusBack={focusBackTextEditor}
    />
  ) : undefined;

  return (
    <>
      <div
        ref={wrapperRef}
        className="box-border border border-black relative w-full h-full"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseHover}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onFocus={onFocus}
        onBlur={onBlur}
        tabIndex={-1}
      >
        <canvas ref={canvasRef} {...canvasAttrs}></canvas>
        <div className="absolute left-0 bottom-0">{smctx.stateMachine.getStateSummary().label}</div>
      </div>
      {floatMenu}
      {textEditor}
    </>
  );
}

function shiftShapesAtTopLeft(shapes: Shape[], targetP: IVec2): Shape[] {
  const rect = getWrapperRectForShapes(getCommonStruct, shapes);
  const d = sub(targetP, rect);

  const affine: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
  const moved = shapes.map((s) => {
    const patch = resizeShape(getCommonStruct, s, affine);
    return { ...s, ...patch };
  });

  return moved;
}
