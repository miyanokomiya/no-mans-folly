import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import {
  getCommonStruct,
  getWrapperRectForShapes,
  isPointOn,
  patchShapesOrderToLast,
  refreshShapeRelations,
  remapShapeIds,
  resizeShape,
} from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getKeyOptions, getMouseOptions } from "../utils/devices";
import {
  useGlobalCopyEffect,
  useGlobalMousemoveEffect,
  useGlobalMouseupEffect,
  useGlobalPasteEffect,
} from "../composables/window";
import { findBackward, mapDataToObj, remap } from "../utils/commons";
import { TextEditor } from "./textEditor/TextEditor";
import { DocAttrInfo } from "../models/document";
import { getDocAttributes } from "../utils/textEditor";
import { AffineMatrix, IVec2, sub } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";
import { generateUuid } from "../utils/random";
import { CommandExam, ModifierOptions } from "../composables/states/types";
import { CommandExamPanel } from "./molecules/CommandExamPanel";
import { rednerRGBA } from "../utils/color";
import { useSelectedTmpSheet } from "../composables/storeHooks";
import { newShapeRenderer } from "../composables/shapeRenderer";
import { getAllBranchIds, getTree } from "../utils/tree";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState<any>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [commandExams, setCommandExams] = useState<CommandExam[]>([]);

  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      smctx.stateMachine.reset();
      setCanvasState({});
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

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
        data: { keys, text: true },
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

  useEffect(() => {
    smctx.setCtx({
      getRenderCtx: () => canvasRef.current?.getContext("2d") ?? undefined,
      setViewport: setViewport,
      zoomView: zoomView,
      getScale: () => scale,
      getViewRect: () => viewCanvasRect,
      panView: panView,
      startDragging: startDragging,
      stopDragging: endMoving,
      getCursorPoint: () => viewToCanvas(getMousePoint()),

      toView: canvasToView,
      showFloatMenu: () => setFloatMenuAvailable(true),
      hideFloatMenu: () => setFloatMenuAvailable(false),
      setContextMenuList() {},
      setCommandExams: (val) => setCommandExams(val ?? []),
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
        const targetIds = getAllBranchIds(getTree(acctx.shapeStore.getEntities()), ids);
        acctx.shapeStore.transact(() => {
          acctx.shapeStore.deleteEntities(targetIds);
          acctx.documentStore.deleteDocs(targetIds);
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
        const patch = patchShapesOrderToLast(
          moved.map((s) => s.id),
          acctx.shapeStore.createLastIndex()
        );

        let result: Shape[] = moved.map((s) => ({ ...s, ...patch[s.id] }));

        const availableIdSet = new Set(
          acctx.shapeStore
            .getEntities()
            .map((s) => s.id)
            .concat(result.map((s) => s.id))
        );
        const refreshed = refreshShapeRelations(getCommonStruct, result, availableIdSet);
        result = result.map((s) => ({ ...s, ...(refreshed[s.id] ?? {}) }));

        acctx.shapeStore.transact(() => {
          acctx.shapeStore.addEntities(result);
          acctx.documentStore.patchDocs(remapDocs);
        });
        acctx.shapeStore.multiSelect(result.map((s) => s.id));
      },

      createFirstIndex: acctx.shapeStore.createFirstIndex,
      createLastIndex: acctx.shapeStore.createLastIndex,

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
      patchDocuments: (val, shapes) => {
        if (shapes) {
          acctx.shapeStore.transact(() => {
            acctx.shapeStore.patchEntities(shapes);
            acctx.documentStore.patchDocs(val);
          });
        } else {
          acctx.documentStore.patchDocs(val);
        }
      },
      patchDocDryRun: acctx.documentStore.patchDocDryRun,
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
    viewCanvasRect,
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

    const canvasContext = smctx.getCtx();
    const selectedMap = canvasContext.getSelectedShapeIdMap();
    const renderer = newShapeRenderer({
      getShapeIds: () => acctx.shapeStore.getEntities().map((s) => s.id),
      getShapeMap: canvasContext.getShapeMap,
      getTmpShapeMap: canvasContext.getTmpShapeMap,
      getDocumentMap: canvasContext.getDocumentMap,
      getShapeStruct: canvasContext.getShapeStruct,
      ignoreDocIds: textEditing ? Object.keys(selectedMap) : undefined,
    });
    renderer.render(ctx);

    smctx.stateMachine.render(ctx);
  }, [
    acctx.shapeStore,
    acctx.documentStore,
    smctx,
    viewSize.width,
    viewSize.height,
    scale,
    viewOrigin.x,
    viewOrigin.y,
    canvasState,
    textEditing,
  ]);

  const [focused, setFocused] = useState(false);
  const focus = useCallback(
    (force = false) => {
      if (textEditing || (!force && document.activeElement?.getAttribute("data-keep-focus"))) return;
      wrapperRef.current?.focus();
    },
    [textEditing]
  );

  const [textEditorFocusKey, setTextEditorFocusKey] = useState({});
  const focusBackTextEditor = useCallback(() => {
    setTextEditorFocusKey({});
  }, []);

  const [downTimestamp, setDownTimestamp] = useState(0);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      focus(true);

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
    [getMousePoint, viewToCanvas, smctx, downTimestamp, focus]
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
          scale: scale,
          ...getMouseOptions(e),
        },
      });
    },
    [editStartPoint, getMousePoint, removeRootPosition, scale, setMousePoint, viewToCanvas, smctx]
  );
  useGlobalMousemoveEffect(onMouseMove);

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
          scale: scale,
          ...getMouseOptions(e),
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
          ...getKeyOptions(e),
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

  const sheet = useSelectedTmpSheet();
  const wrapperStyle = useMemo<React.CSSProperties>(() => {
    return { cursor, backgroundColor: sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff" };
  }, [cursor, sheet]);

  return (
    <>
      <div
        ref={wrapperRef}
        className="box-border border border-black relative w-full h-full"
        style={wrapperStyle}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseHover}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onFocus={onFocus}
        onBlur={onBlur}
        tabIndex={-1}
      >
        <canvas ref={canvasRef} {...canvasAttrs}></canvas>
        <div className="absolute right-2 top-0">{smctx.stateMachine.getStateSummary().label}</div>
        <div className="absolute bottom-2 left-2 pointer-events-none">
          {<CommandExamPanel commandExams={commandExams} />}
        </div>
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
