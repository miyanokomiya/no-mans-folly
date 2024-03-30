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
import { getGridSize, newGrid } from "../composables/grid";
import { FileDropArea } from "./atoms/FileDropArea";
import { newImageStore } from "../composables/imageStore";
import { isImageShape } from "../shapes/image";
import { Shape } from "../models";
import { mapReduce, patchPipe } from "../utils/commons";
import { getDeleteTargetIds } from "../composables/shapeComposite";
import { getPatchInfoByLayouts } from "../composables/shapeLayoutHandler";
import { GridBackground } from "./atoms/GridBackground";
import { LinkMenu } from "./linkMenu/LinkMenu";
import { useClickable } from "../hooks/clickable";
import { ModifierSupportPanel } from "./molecules/ModifierSupportPanel";

export const AppCanvas: React.FC = () => {
  const { sheetStore, shapeStore, documentStore, undoManager, userSettingStore } = useContext(AppCanvasContext);
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
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; point: IVec2 } | undefined>();
  const [linkInfo, setLinkInfo] = useState<LinkInfo>();
  const [userSetting, setUserSetting] = useState(userSettingStore.getState());
  const [modifierOptions, setModifierOptions] = useState<ModifierOptions>({});

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
    return shapeStore.watchTmpShapeMap((keys) => {
      sm.handleEvent({
        type: "tmp-shape-updated",
        data: { keys },
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
    return documentStore.watchTmpDocMap((keys) => {
      sm.handleEvent({
        type: "tmp-shape-updated",
        data: { keys, text: true },
      });
      setCanvasState({});
    });
  }, [documentStore, sm]);

  useEffect(() => {
    return sm.watch(() => {
      setCanvasState({});
    });
  }, [sm]);

  useEffect(() => {
    return userSettingStore.watch(() => {
      setUserSetting(userSettingStore.getState());
    });
  }, [userSettingStore]);

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

  const grid = useMemo(() => {
    return newGrid({ size: getGridSize(scale), range: viewCanvasRect, disabled: userSetting.grid === "off" });
  }, [scale, viewCanvasRect, userSetting]);

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
    if (!textEditing) {
      focus();
    }
  }, [textEditing, focus]);

  const [textEditorFocusKey, setTextEditorFocusKey] = useState({});
  const focusBackTextEditor = useCallback(() => {
    setTextEditorFocusKey({});
  }, []);

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
      setGridDisabled: (val) => userSettingStore.patchState({ grid: val ? "off" : "on" }),

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
        focusBackTextEditor();
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
    userSettingStore,
    imageStore,
    setSmctx,
    shapeStore,
    showEmojiPicker,
    undoManager,
    focusBackTextEditor,
  ]);

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
      className: "absolute top-0 left-0 display-none",
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

  const getMouseOptionsCustom = useCallback(
    (e: PointerEvent | WheelEvent | React.PointerEvent) => {
      return { ...getMouseOptions(e), ...modifierOptions };
    },
    [modifierOptions],
  );

  const { handlePointerDown, handlePointerUp, isValidPointer } = useClickable({
    onDown: useCallback(
      (e: PointerEvent) => {
        e.preventDefault();
        focus(true);

        const p = removeRootPosition({ x: e.pageX, y: e.pageY });
        setMousePoint(p);
        sm.handleEvent({
          type: "pointerdown",
          data: {
            point: viewToCanvas(p),
            options: getMouseOptionsCustom(e),
          },
        });
      },
      [viewToCanvas, sm, focus, removeRootPosition, setMousePoint, getMouseOptionsCustom],
    ),
    onUp: useCallback(
      (e: PointerEvent) => {
        sm.handleEvent({
          type: "pointerup",
          data: {
            point: viewToCanvas(getMousePoint()),
            options: getMouseOptionsCustom(e),
          },
        });
      },
      [viewToCanvas, getMousePoint, sm, getMouseOptionsCustom],
    ),
    onDoubleClick: useCallback(
      (e: PointerEvent) => {
        sm.handleEvent({
          type: "pointerdoubleclick",
          data: {
            point: viewToCanvas(getMousePoint()),
            options: getMouseOptionsCustom(e),
          },
        });
      },
      [viewToCanvas, getMousePoint, sm, getMouseOptionsCustom],
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
          ...getMouseOptionsCustom(e),
        },
      });
    },
    [editStartPoint, removeRootPosition, scale, setMousePoint, viewToCanvas, sm, getMouseOptionsCustom, isValidPointer],
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
    (e: React.PointerEvent) => {
      focus();
      sm.handleEvent({
        type: "pointerhover",
        data: {
          current: viewToCanvas(getMousePoint()),
          scale: scale,
          ...getMouseOptionsCustom(e),
        },
      });
    },
    [getMousePoint, scale, viewToCanvas, sm, focus, getMouseOptionsCustom],
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
          options: getMouseOptionsCustom(e),
        },
      });
    },
    [sm, getMouseOptionsCustom],
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
      onContextMenu={onContextMenu}
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
        className="relative w-full h-full select-none outline-none"
        style={wrapperStyle}
        onPointerDown={onMouseDown}
        onPointerMove={onMouseHover}
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
        </FileDropArea>
      </div>
      {userSetting.debug === "on" ? (
        <div className="fixed right-16 top-0 pointer-events-none">{sm.getStateSummary().label}</div>
      ) : undefined}
      <div className="fixed bottom-2 left-2 flex flex-col pointer-events-none">
        <CommandExamPanel commandExams={commandExams} />
      </div>
      {userSetting.virtualKeyboard === "modifiers" ? (
        <div className="pointer-events-auto fixed bottom-2 left-1/2 -translate-x-1/2">
          <ModifierSupportPanel value={modifierOptions} onChange={setModifierOptions} />
        </div>
      ) : undefined}
      {floatMenu}
      {textEditor}
      {linkMenu}
      {contextMenu ? (
        <ContextMenu items={contextMenu.items} point={contextMenu.point} onClickItem={onClickContextMenuItem} />
      ) : undefined}
    </>
  );
};
