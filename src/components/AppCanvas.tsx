import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { duplicateShapes } from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getKeyOptions, getMouseOptions } from "../utils/devices";
import {
  useGlobalCopyEffect,
  useGlobalMousemoveEffect,
  useGlobalMouseupEffect,
  useGlobalPasteEffect,
} from "../composables/window";
import { TextEditor } from "./textEditor/TextEditor";
import { DocAttrInfo } from "../models/document";
import { getDocAttributes } from "../utils/textEditor";
import { IVec2 } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";
import { generateUuid } from "../utils/random";
import { CommandExam, ContextMenuItem, ModifierOptions } from "../composables/states/types";
import { CommandExamPanel } from "./molecules/CommandExamPanel";
import { rednerRGBA } from "../utils/color";
import { useSelectedTmpSheet } from "../composables/storeHooks";
import { newShapeRenderer } from "../composables/shapeRenderer";
import { getAllBranchIds, getTree } from "../utils/tree";
import { ContextMenu } from "./ContextMenu";
import { ToastMessages } from "./ToastMessages";
import { useToastMessages } from "../composables/toastMessage";
import { getGridSize, newGrid } from "../composables/grid";
import { FileDropArea } from "./atoms/FileDropArea";
import { newImageStore } from "../composables/imageStore";
import { isImageShape } from "../shapes/image";
import { Shape } from "../models";
import { useLocalStorageAdopter } from "../composables/localStorage";
import { mapReduce, patchPipe } from "../utils/commons";
import { getDeleteTargetIds } from "../composables/shapeComposite";

export const AppCanvas: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);
  const assetAPI = smctx.getCtx().getAssetAPI();

  const [canvasState, setCanvasState] = useState<any>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [commandExams, setCommandExams] = useState<CommandExam[]>([]);
  const { toastMessages, closeToastMessage, pushToastMessage } = useToastMessages();
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; point: IVec2 } | undefined>();

  const imageStore = useMemo(() => {
    return newImageStore();
  }, [acctx.shapeStore]);

  const loadShapeAssets = useCallback(
    (shapes: Shape[]) => {
      imageStore.batchLoad(
        shapes.filter(isImageShape).map((s) => s.assetId),
        assetAPI
      );
    },
    [assetAPI.enabled, imageStore]
  );

  useEffect(() => {
    imageStore.clear();
    loadShapeAssets(acctx.shapeStore.getEntities());

    return imageStore.watch(() => {
      setCanvasState({});
    });
  }, [imageStore, loadShapeAssets, acctx.shapeStore]);

  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      smctx.stateMachine.reset();
      setCanvasState({});
    });
  }, [acctx.shapeStore, smctx.stateMachine, imageStore, loadShapeAssets]);

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
      smctx.stateMachine.handleEvent({
        type: "tmp-shape-updated",
        data: {},
      });
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
    return acctx.documentStore.watchTmpDocMap(() => {
      smctx.stateMachine.handleEvent({
        type: "tmp-shape-updated",
        data: { text: true },
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

  const gridDisabled = useLocalStorageAdopter({
    key: "grid_disabled",
    version: "1",
    initialValue: false,
  });
  const grid = useMemo(() => {
    return newGrid({ size: getGridSize(scale), range: viewCanvasRect, disabled: gridDisabled.state });
  }, [scale, viewCanvasRect, gridDisabled.state]);

  const mergedDocMap = useMemo(() => {
    const tmpDocMap = acctx.documentStore.getTmpDocMap();
    return mapReduce(acctx.documentStore.getDocMap(), (doc, id) => {
      if (!tmpDocMap[id]) return doc;
      return acctx.documentStore.patchDocDryRun(id, tmpDocMap[id]);
    });
  }, [acctx.documentStore, canvasState]);

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
      setContextMenuList(val) {
        if (val) {
          setContextMenu({ items: val.items, point: canvasToView(val.point) });
        } else {
          setContextMenu(undefined);
        }
      },
      setCommandExams: (val) => setCommandExams(val ?? []),
      showToastMessage: pushToastMessage,
      setCursor,

      undo: acctx.undoManager.undo,
      redo: acctx.undoManager.redo,
      setCaptureTimeout: acctx.undoManager.setCaptureTimeout,

      getShapeComposite: () => acctx.shapeStore.shapeComposite,
      getShapes: () => acctx.shapeStore.shapeComposite.shapes,

      getTmpShapeMap: () => acctx.shapeStore.shapeComposite.tmpShapeMap,
      setTmpShapeMap: acctx.shapeStore.setTmpShapeMap,

      getSelectedShapeIdMap: acctx.shapeStore.getSelected,
      getLastSelectedShapeId: acctx.shapeStore.getLastSelected,
      selectShape: acctx.shapeStore.select,
      multiSelectShapes: acctx.shapeStore.multiSelect,
      clearAllSelected: acctx.shapeStore.clearAllSelected,
      addShapes: (shapes, docMap, patch) => {
        acctx.shapeStore.transact(() => {
          acctx.shapeStore.addEntities(shapes);
          if (patch) {
            acctx.shapeStore.patchEntities(patch);
          }
          if (docMap) {
            acctx.documentStore.patchDocs(docMap);
          }
        });
        loadShapeAssets(shapes);
      },
      deleteShapes: (ids: string[], patch) => {
        // Apply patch before getting branch ids in case tree structure changes by the patch.
        // => e.g. ungrouping
        const updated = patchPipe([() => patch ?? {}], acctx.shapeStore.getEntityMap());
        const targetIds = getDeleteTargetIds(
          acctx.shapeStore.shapeComposite,
          getAllBranchIds(getTree(Object.values(updated.result)), ids)
        );
        acctx.shapeStore.transact(() => {
          if (patch) {
            acctx.shapeStore.patchEntities(patch);
          }
          acctx.shapeStore.deleteEntities(getDeleteTargetIds(acctx.shapeStore.shapeComposite, targetIds));
          acctx.documentStore.deleteDocs(targetIds);
        });
      },
      patchShapes: acctx.shapeStore.patchEntities,
      pasteShapes: (shapes, docs, p) => {
        const targetP = p ?? viewToCanvas(getMousePoint());
        const availableIdSet = new Set(acctx.shapeStore.getEntities().map((s) => s.id));
        const result = duplicateShapes(
          smctx.getCtx().getShapeStruct,
          shapes,
          docs,
          generateUuid,
          acctx.shapeStore.createLastIndex(),
          availableIdSet,
          targetP
        );

        acctx.shapeStore.transact(() => {
          acctx.shapeStore.addEntities(result.shapes);
          acctx.documentStore.patchDocs(result.docMap);
        });
        acctx.shapeStore.multiSelect(result.shapes.map((s) => s.id));
        loadShapeAssets(shapes);
      },

      createFirstIndex: acctx.shapeStore.createFirstIndex,
      createLastIndex: acctx.shapeStore.createLastIndex,

      getGrid: () => grid,
      setGridDisabled: (val) => gridDisabled.setState(val),

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
      getTmpDocMap: acctx.documentStore.getTmpDocMap,
      setTmpDocMap: acctx.documentStore.setTmpDocMap,
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
      getImageStore: () => imageStore,
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
    grid,
    loadShapeAssets,
  ]);

  useEffect(() => {
    // Need to call reset once here.
    // The sm has initial mock context until "smctx.setCtx" is called once.
    smctx.stateMachine.reset();
  }, [smctx]);

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
    grid.render(ctx, scale);

    const canvasContext = smctx.getCtx();
    const selectedMap = canvasContext.getSelectedShapeIdMap();
    const renderer = newShapeRenderer({
      shapeComposite: acctx.shapeStore.shapeComposite,
      getDocumentMap: () => mergedDocMap,
      getShapeStruct: canvasContext.getShapeStruct,
      ignoreDocIds: textEditing ? Object.keys(selectedMap) : undefined,
      imageStore,
    });
    renderer.render(ctx);

    grid.renderAxisLabels(ctx, scale);

    smctx.stateMachine.render(ctx);
  }, [
    acctx.shapeStore.shapeComposite,
    acctx.documentStore,
    smctx,
    viewSize.width,
    viewSize.height,
    scale,
    viewOrigin.x,
    viewOrigin.y,
    canvasState,
    textEditing,
    grid,
    mergedDocMap,
    imageStore,
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

  const [downInfo, setDownInfo] = useState({ timestamp: 0, button: 0 });
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      focus(true);

      const data = {
        point: viewToCanvas(getMousePoint()),
        options: getMouseOptions(e),
      };

      const timestamp = Date.now();
      if (timestamp - downInfo.timestamp < 300 && e.button === downInfo.button) {
        smctx.stateMachine.handleEvent({ type: "pointerdoubledown", data });
      } else {
        smctx.stateMachine.handleEvent({ type: "pointerdown", data });
      }
      setDownInfo({ timestamp, button: e.button });
    },
    [getMousePoint, viewToCanvas, smctx, downInfo, focus]
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

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      smctx.stateMachine.handleEvent({ type: "contextmenu", data: { point: viewToCanvas(getMousePoint()) } });
    },
    [smctx, getMousePoint, viewToCanvas]
  );

  const onClickContextMenuItem = useCallback(
    (key: string) => {
      smctx.stateMachine.handleEvent({ type: "contextmenu-item", data: { key } });
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

    const doc = mergedDocMap[lastSelected];
    if (!doc) return;

    const attrs = getDocAttributes(doc);
    return { cursor: attrs, block: attrs, doc: attrs };
  }, [canvasState, currentDocAttrInfo, textEditing, acctx.shapeStore, mergedDocMap]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      smctx.stateMachine.handleEvent({
        type: "file-drop",
        data: { files: e.dataTransfer.files, point: viewToCanvas({ x: e.pageX, y: e.pageY }) },
      });
    },
    [smctx.stateMachine, viewToCanvas, getMousePoint]
  );

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
        onContextMenu={onContextMenu}
        tabIndex={-1}
      >
        <FileDropArea typeReg={/image\/.+/} onDrop={onDrop}>
          <canvas ref={canvasRef} {...canvasAttrs}></canvas>
          <div className="absolute right-2 top-0">{smctx.stateMachine.getStateSummary().label}</div>
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <CommandExamPanel commandExams={commandExams} />
          </div>
        </FileDropArea>
      </div>
      {floatMenu}
      {textEditor}
      {contextMenu ? (
        <ContextMenu items={contextMenu.items} point={contextMenu.point} onClickItem={onClickContextMenuItem} />
      ) : undefined}
      <ToastMessages messages={toastMessages} closeToastMessage={closeToastMessage} />
    </>
  );
};
