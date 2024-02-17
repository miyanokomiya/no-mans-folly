import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext, SetAppStateContext } from "../contexts/AppContext";
import { duplicateShapes, getCommonStruct } from "../shapes";
import { useCanvas } from "../hooks/canvas";
import { getKeyOptions, getMouseOptions, ModifierOptions } from "../utils/devices";
import {
  useGlobalCopyEffect,
  useGlobalMousemoveEffect,
  useGlobalMouseupEffect,
  useGlobalPasteEffect,
} from "../hooks/window";
import { TextEditor, TextEditorEmojiOnly } from "./textEditor/TextEditor";
import { DocAttrInfo } from "../models/document";
import { getDocAttributes } from "../utils/textEditor";
import { IVec2 } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";
import { generateUuid } from "../utils/random";
import { CommandExam, ContextMenuItem, LinkInfo } from "../composables/states/types";
import { CommandExamPanel } from "./molecules/CommandExamPanel";
import { rednerRGBA } from "../utils/color";
import { useSelectedTmpSheet } from "../hooks/storeHooks";
import { newShapeRenderer } from "../composables/shapeRenderer";
import { getAllBranchIds, getTree } from "../utils/tree";
import { ContextMenu } from "./ContextMenu";
import { ToastMessages } from "./ToastMessages";
import { useToastMessages } from "../hooks/toastMessage";
import { getGridSize, newGrid } from "../composables/grid";
import { FileDropArea } from "./atoms/FileDropArea";
import { newImageStore } from "../composables/imageStore";
import { isImageShape } from "../shapes/image";
import { Shape } from "../models";
import { useLocalStorageAdopter } from "../hooks/localStorage";
import { mapReduce, patchPipe } from "../utils/commons";
import { getDeleteTargetIds } from "../composables/shapeComposite";
import { getPatchInfoByLayouts } from "../composables/shapeLayoutHandler";
import { GridBackground } from "./atoms/GridBackground";
import { LinkMenu } from "./linkMenu/LinkMenu";

export const AppCanvas: React.FC = () => {
  const { sheetStore, shapeStore, documentStore, undoManager } = useContext(AppCanvasContext);
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);
  const setSmctx = useContext(SetAppStateContext);

  const [canvasState, setCanvasState] = useState<any>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [commandExams, setCommandExams] = useState<CommandExam[]>([]);
  const { toastMessages, closeToastMessage, pushToastMessage } = useToastMessages();
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; point: IVec2 } | undefined>();
  const [linkInfo, setLinkInfo] = useState<LinkInfo>();

  const imageStore = useMemo(() => {
    shapeStore; // For exhaustive-deps
    return newImageStore();
  }, [shapeStore]);

  const loadShapeAssets = useCallback(
    (shapes: Shape[]) => {
      imageStore.batchLoad(
        shapes.filter(isImageShape).map((s) => s.assetId),
        smctx.assetAPI,
      );
    },
    [smctx.assetAPI, imageStore],
  );

  useEffect(() => {
    imageStore.clear();
    loadShapeAssets(shapeStore.getEntities());

    return imageStore.watch(() => {
      setCanvasState({});
    });
  }, [imageStore, loadShapeAssets, shapeStore]);

  useEffect(() => {
    return sheetStore.watchSelected(() => {
      sm.reset();
      setCanvasState({});
    });
  }, [sheetStore, sm, imageStore, loadShapeAssets]);

  useEffect(() => {
    return shapeStore.watch((keys) => {
      sm.handleEvent({
        type: "shape-updated",
        data: { keys },
      });
      setCanvasState({});
    });
  }, [shapeStore, sm]);

  useEffect(() => {
    return shapeStore.watchTmpShapeMap(() => {
      sm.handleEvent({
        type: "tmp-shape-updated",
        data: {},
      });
      setCanvasState({});
    });
  }, [shapeStore, sm]);

  useEffect(() => {
    return shapeStore.watchSelected(() => {
      setCanvasState({});
    });
  }, [shapeStore]);

  useEffect(() => {
    return documentStore.watch((keys) => {
      sm.handleEvent({
        type: "shape-updated",
        data: { keys, text: true },
      });
      setCanvasState({});
    });
  }, [documentStore, sm]);

  useEffect(() => {
    return documentStore.watchTmpDocMap(() => {
      sm.handleEvent({
        type: "tmp-shape-updated",
        data: { text: true },
      });
      setCanvasState({});
    });
  }, [documentStore, sm]);

  useEffect(() => {
    return sm.watch(() => {
      setCanvasState({});
    });
  }, [sm]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
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

  const { state: gridDisabled, setState: setGridDisabled } = useLocalStorageAdopter({
    key: "grid_disabled",
    version: "1",
    initialValue: false,
  });
  const grid = useMemo(() => {
    return newGrid({ size: getGridSize(scale), range: viewCanvasRect, disabled: gridDisabled });
  }, [scale, viewCanvasRect, gridDisabled]);

  const mergedDocMap = useMemo(() => {
    canvasState; // For exhaustive-deps

    const tmpDocMap = documentStore.getTmpDocMap();
    return mapReduce(documentStore.getDocMap(), (doc, id) => {
      if (!tmpDocMap[id]) return doc;
      return documentStore.patchDocDryRun(id, tmpDocMap[id]);
    });
  }, [documentStore, canvasState]);

  const [focused, setFocused] = useState(false);
  const focus = useCallback(
    (force = false) => {
      if (textEditing || (!force && document.activeElement?.getAttribute("data-keep-focus"))) return;
      wrapperRef.current?.focus();
    },
    [textEditing],
  );

  useEffect(() => {
    // TODO: Make each method via "useCallback" for consistency.
    setSmctx({
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
      setLinkInfo,
      getLinkInfo: () => linkInfo,

      undo: undoManager.undo,
      redo: undoManager.redo,
      setCaptureTimeout: undoManager.setCaptureTimeout,

      getShapeComposite: () => shapeStore.shapeComposite,
      getShapes: () => shapeStore.shapeComposite.shapes,

      getTmpShapeMap: () => shapeStore.shapeComposite.tmpShapeMap,
      setTmpShapeMap: shapeStore.setTmpShapeMap,

      getSelectedShapeIdMap: shapeStore.getSelected,
      getLastSelectedShapeId: shapeStore.getLastSelected,
      selectShape: shapeStore.select,
      multiSelectShapes: shapeStore.multiSelect,
      clearAllSelected: shapeStore.clearAllSelected,
      addShapes: (shapes, docMap, patch) => {
        shapeStore.transact(() => {
          shapeStore.addEntities(shapes);
          if (patch) {
            shapeStore.patchEntities(patch);
          }
          if (docMap) {
            documentStore.patchDocs(docMap);
          }
        });
        loadShapeAssets(shapes);
      },
      deleteShapes: (ids: string[], patch) => {
        // Apply patch before getting branch ids in case tree structure changes by the patch.
        // => e.g. ungrouping
        const updated = patchPipe([() => patch ?? {}], shapeStore.getEntityMap());
        const targetIds = getDeleteTargetIds(
          shapeStore.shapeComposite,
          getAllBranchIds(getTree(Object.values(updated.result)), ids),
        );

        const shapePatchInfo = getPatchInfoByLayouts(shapeStore.shapeComposite, {
          update: patch,
          delete: targetIds,
        });

        shapeStore.transact(() => {
          if (shapePatchInfo.update) {
            shapeStore.patchEntities(shapePatchInfo.update);
          }
          const adjustedTargetIds = shapePatchInfo.delete ?? targetIds;
          shapeStore.deleteEntities(adjustedTargetIds);
          documentStore.deleteDocs(adjustedTargetIds);
        });
      },
      patchShapes: shapeStore.patchEntities,
      pasteShapes: (shapes, docs, p) => {
        const targetP = p ?? viewToCanvas(getMousePoint());
        const availableIdSet = new Set(shapeStore.getEntities().map((s) => s.id));
        const result = duplicateShapes(
          getCommonStruct,
          shapes,
          docs,
          generateUuid,
          shapeStore.createLastIndex(),
          availableIdSet,
          targetP,
        );

        shapeStore.transact(() => {
          shapeStore.addEntities(result.shapes);
          documentStore.patchDocs(result.docMap);
        });
        shapeStore.multiSelect(result.shapes.map((s) => s.id));
        loadShapeAssets(shapes);
      },

      createFirstIndex: shapeStore.createFirstIndex,
      createLastIndex: shapeStore.createLastIndex,

      getGrid: () => grid,
      setGridDisabled: (val) => setGridDisabled(val),

      startTextEditing() {
        setTextEditing(true);
      },
      stopTextEditing() {
        setTextEditing(false);
      },
      getShowEmojiPicker: () => showEmojiPicker,
      setShowEmojiPicker: (val, p) => {
        if (p) {
          setTextEditorPosition(canvasToView(p));
        }
        setShowEmojiPicker(val);
        if (!val) {
          focus();
        }
      },
      setTextEditorPosition: (p) => {
        setTextEditorPosition(canvasToView(p));
      },
      getDocumentMap: documentStore.getDocMap,
      getTmpDocMap: documentStore.getTmpDocMap,
      setTmpDocMap: documentStore.setTmpDocMap,
      patchDocuments: (val, shapePatch) => {
        if (shapePatch) {
          shapeStore.transact(() => {
            shapeStore.patchEntities(shapePatch);
            documentStore.patchDocs(val);
          });
        } else {
          documentStore.patchDocs(val);
        }
      },
      patchDocDryRun: documentStore.patchDocDryRun,
      setCurrentDocAttrInfo,
      createCursorPosition: documentStore.createCursorPosition,
      retrieveCursorPosition: documentStore.retrieveCursorPosition,
      getImageStore: () => imageStore,
    });
  }, [
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
    grid,
    loadShapeAssets,
    setShowEmojiPicker,
    linkInfo,
    documentStore,
    focus,
    setGridDisabled,
    imageStore,
    pushToastMessage,
    setSmctx,
    shapeStore,
    showEmojiPicker,
    undoManager,
  ]);

  useEffect(() => {
    // Need to call reset once here.
    // The sm has initial mock context until "smctx.setCtx" is called once.
    sm.reset();
  }, [sm]);

  useEffect(() => {
    return shapeStore.watchSelected(() => {
      sm.handleEvent({
        type: "selection",
      });
    });
  }, [shapeStore, sm]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasAttrs = useMemo(
    () => ({
      className: "w-max h-max absolute top-0 left-0",
      width: viewSize.width,
      height: viewSize.height,
    }),
    [viewSize.width, viewSize.height],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / scale, 1 / scale);
    ctx.translate(-viewOrigin.x, -viewOrigin.y);

    const canvasContext = smctx;
    const selectedMap = canvasContext.getSelectedShapeIdMap();
    const renderer = newShapeRenderer({
      shapeComposite: shapeStore.shapeComposite,
      getDocumentMap: () => mergedDocMap,
      ignoreDocIds: textEditing ? Object.keys(selectedMap) : undefined,
      imageStore,
    });
    renderer.render(ctx);

    grid.renderAxisLabels(ctx, scale);

    sm.render(ctx);
  }, [
    shapeStore.shapeComposite,
    documentStore,
    sm,
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

  const [textEditorFocusKey, setTextEditorFocusKey] = useState({});
  const focusBackTextEditor = useCallback(() => {
    setTextEditorFocusKey({});
  }, []);

  const downInfo = useRef<{ timestamp: number; button: number }>();
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      focus(true);

      const data = {
        point: viewToCanvas(getMousePoint()),
        options: getMouseOptions(e),
      };

      const timestamp = Date.now();
      if (downInfo.current && timestamp - downInfo.current.timestamp < 300 && e.button === downInfo.current.button) {
        sm.handleEvent({ type: "pointerdoubledown", data });
        downInfo.current = undefined;
      } else {
        sm.handleEvent({ type: "pointerdown", data });
        downInfo.current = { timestamp, button: e.button };
      }
    },
    [getMousePoint, viewToCanvas, sm, focus],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      setMousePoint(removeRootPosition({ x: e.pageX, y: e.pageY }));
      if (!editStartPoint) return;

      sm.handleEvent({
        type: "pointermove",
        data: {
          start: viewToCanvas(editStartPoint),
          current: viewToCanvas(getMousePoint()),
          scale: scale,
          ...getMouseOptions(e),
        },
      });
    },
    [editStartPoint, getMousePoint, removeRootPosition, scale, setMousePoint, viewToCanvas, sm],
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
      sm.handleEvent({
        type: "copy",
        nativeEvent: e,
      });
    },
    [focused, textEditing, sm],
  );
  useGlobalCopyEffect(onCopy);

  const onPaste = useCallback(
    (e: ClipboardEvent, option: ModifierOptions) => {
      if (!focused && !textEditing) return;
      sm.handleEvent({
        type: "paste",
        nativeEvent: e,
        data: option,
      });
    },
    [focused, textEditing, sm],
  );
  useGlobalPasteEffect(onPaste);

  const onMouseHover = useCallback(
    (e: React.MouseEvent) => {
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

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      sm.handleEvent({
        type: "pointerup",
        data: {
          point: viewToCanvas(getMousePoint()),
          options: getMouseOptions(e),
        },
      });
    },
    [viewToCanvas, getMousePoint, sm],
  );
  useGlobalMouseupEffect(onMouseUp);

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

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      sm.handleEvent({ type: "contextmenu", data: { point: viewToCanvas(getMousePoint()) } });
    },
    [sm, getMousePoint, viewToCanvas],
  );

  const onClickContextMenuItem = useCallback(
    (key: string, meta?: any) => {
      sm.handleEvent({ type: "contextmenu-item", data: { key, meta } });
    },
    [sm],
  );

  const onTextInput = useCallback(
    (val: string, composition = false) => {
      sm.handleEvent({
        type: "text-input",
        data: {
          value: val,
          composition,
        },
      });
    },
    [sm],
  );

  const indexDocAttrInfo = useMemo<DocAttrInfo | undefined>(() => {
    canvasState; // For exhaustive-deps

    const lastSelected = shapeStore.getLastSelected();
    if (!lastSelected) return;
    if (textEditing) return currentDocAttrInfo;

    const doc = mergedDocMap[lastSelected];
    if (!doc) return;

    const attrs = getDocAttributes(doc);
    return { cursor: attrs, block: attrs, doc: attrs };
  }, [canvasState, currentDocAttrInfo, textEditing, shapeStore, mergedDocMap]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      sm.handleEvent({
        type: "file-drop",
        data: { files: e.dataTransfer.files, point: viewToCanvas({ x: e.pageX, y: e.pageY }) },
      });
    },
    [sm, viewToCanvas],
  );

  const handleSetShowEmojiPicker = useCallback(
    (val: boolean) => {
      if (val) {
        setShowEmojiPicker(val);
      } else {
        sm.handleEvent({ type: "close-emoji-picker" });
      }
    },
    [sm, setShowEmojiPicker],
  );

  const textEditor = textEditing ? (
    <TextEditor
      onInput={onTextInput}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      position={textEditorPosition}
      focusKey={textEditorFocusKey}
      showEmojiPicker={showEmojiPicker}
      setShowEmojiPicker={handleSetShowEmojiPicker}
    />
  ) : showEmojiPicker ? (
    <TextEditorEmojiOnly
      onInput={onTextInput}
      position={textEditorPosition}
      setShowEmojiPicker={handleSetShowEmojiPicker}
    />
  ) : undefined;

  const floatMenu = floatMenuAvailable ? (
    <FloatMenu
      canvasState={canvasState}
      scale={scale}
      viewOrigin={viewOrigin}
      indexDocAttrInfo={indexDocAttrInfo}
      focusBack={focusBackTextEditor}
      textEditing={textEditing}
    />
  ) : undefined;

  const linkMenu = (
    <LinkMenu
      canvasState={canvasState}
      focusBack={focusBackTextEditor}
      canvasToView={canvasToView}
      scale={scale}
      linkInfo={linkInfo}
      delay={1000}
    />
  );

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
        onKeyUp={onKeyUp}
        onFocus={onFocus}
        onBlur={onBlur}
        onContextMenu={onContextMenu}
        tabIndex={-1}
      >
        <FileDropArea typeReg={/image\/.+/} onDrop={onDrop}>
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
            {grid.disabled ? undefined : (
              <GridBackground x={grid.range.x / scale} y={grid.range.y / scale} size={grid.size / scale} />
            )}
          </div>
          <canvas ref={canvasRef} {...canvasAttrs}></canvas>
          <div className="absolute right-16 top-0">{sm.getStateSummary().label}</div>
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <CommandExamPanel commandExams={commandExams} />
          </div>
        </FileDropArea>
      </div>
      {floatMenu}
      {textEditor}
      {linkMenu}
      {contextMenu ? (
        <ContextMenu items={contextMenu.items} point={contextMenu.point} onClickItem={onClickContextMenuItem} />
      ) : undefined}
      <ToastMessages messages={toastMessages} closeToastMessage={closeToastMessage} />
    </>
  );
};
