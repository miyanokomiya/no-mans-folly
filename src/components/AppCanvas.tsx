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
import { DocAttrInfo, DocOutput } from "../models/document";
import { getDocAttributes, renderDoc } from "../utils/textEditor";
import { AffineMatrix, IVec2, sub } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";
import { generateUuid } from "../utils/random";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState({});
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [docMap, setDocMap] = useState<{ [id: string]: DocOutput }>({});
  const [tmpShapeMap, setTmpShapeMap] = useState<{ [id: string]: Partial<Shape> }>({});
  const [selectedInfo, setSelectedInfo] = useState<[last: string, map: { [id: string]: true }] | undefined>();
  const [cursor, setCursor] = useState<string | undefined>();
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchTmpShapeMap(() => {
      setTmpShapeMap(acctx.shapeStore.getTmpShapeMap());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      const last = acctx.shapeStore.getLastSelected();
      if (last) {
        setSelectedInfo([last, acctx.shapeStore.getSelected()]);
      } else {
        setSelectedInfo(undefined);
      }
    });
  }, [acctx.shapeStore]);

  useEffect(() => {
    return acctx.documentStore.watch(() => {
      setDocMap(acctx.documentStore.getDocMap());
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
        return findBackward(shapes, (s) => isPointOn(getCommonStruct, s, p));
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
      getTmpShapeMap: () => tmpShapeMap,
      setTmpShapeMap: acctx.shapeStore.setTmpShapeMap,
      pasteShapes: (shapes, docs, p) => {
        const remapInfo = remapShapeIds(shapes, generateUuid);
        const remapDocs = remap(mapDataToObj(docs), remapInfo.idMap);
        const targetP = p ?? getMousePoint();
        const moved = shiftShapesAtTopLeft(remapInfo.shapes, targetP);

        acctx.shapeStore.transact(() => {
          acctx.shapeStore.addEntities(moved);
          acctx.documentStore.patchDocs(remapDocs);
        });
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
      getDocumentMap: () => docMap,
      patchDocuments: acctx.documentStore.patchDocs,
      setCurrentDocAttrInfo,
    });
  }, [
    setViewport,
    zoomView,
    panView,
    startDragging,
    endMoving,
    canvasToView,
    scale,
    acctx,
    smctx,
    shapes,
    tmpShapeMap,
    docMap,
    getMousePoint,
  ]);

  useEffect(() => {
    smctx.stateMachine.handleEvent({
      type: "shape-updated",
    });
  }, [acctx.documentStore, smctx.stateMachine, shapes, docMap]);

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
    shapes.forEach((shape) => {
      const tmpShape = tmpShapeMap[shape.id];
      const latestShape = tmpShape ? { ...shape, ...tmpShape } : shape;
      renderShape(getCommonStruct, ctx, latestShape);

      const doc = docMap[latestShape.id];
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
    shapes,
    tmpShapeMap,
    viewSize.width,
    viewSize.height,
    scale,
    viewOrigin.x,
    viewOrigin.y,
    canvasState,
    smctx,
    docMap,
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
      if (!focused) return;
      smctx.stateMachine.handleEvent({
        type: "copy",
        nativeEvent: e,
      });
    },
    [focused, smctx]
  );
  useGlobalCopyEffect(onCopy);

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      if (!focused) return;
      smctx.stateMachine.handleEvent({
        type: "paste",
        nativeEvent: e,
      });
    },
    [focused, smctx]
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
    if (!selectedInfo) return;
    if (textEditing) return currentDocAttrInfo;

    const id = selectedInfo[0];
    if (!id) return;

    const doc = docMap[id];
    if (!doc) return;

    const attrs = getDocAttributes(doc);
    return { cursor: attrs, block: attrs, doc: attrs };
  }, [currentDocAttrInfo, textEditing, selectedInfo, docMap]);

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
