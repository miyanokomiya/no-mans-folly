import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { useCanvas } from "../../hooks/canvas";
import { getKeyOptions, getMouseOptions, isCtrlOrMeta, ModifierOptions } from "../../utils/devices";
import {
  useGlobalCopyEffect,
  useGlobalKeydownEffect,
  useGlobalMousemoveEffect,
  useGlobalMouseupEffect,
  useGlobalPasteEffect,
} from "../../hooks/window";
import { TextEditor, TextEditorEmojiOnly } from "../textEditor/TextEditor";
import { DocAttrInfo } from "../../models/document";
import { getDocAttributes } from "../../utils/textEditor";
import { IVec2 } from "okageo";
import { FloatMenu } from "../floatMenu/FloatMenu";
import { CommandExam, ContextMenuItem, LinkInfo } from "../../composables/states/types";
import { rednerRGBA } from "../../utils/color";
import { useDocumentMap, useSelectedTmpSheet } from "../../hooks/storeHooks";
import { newShapeRenderer } from "../../composables/shapeRenderer";
import { ContextMenu } from "../ContextMenu";
import { getGridSize, newGrid } from "../../composables/grid";
import { FileDropArea } from "../atoms/FileDropArea";
import { GridBackground } from "../atoms/GridBackground";
import { LinkMenu } from "../linkMenu/LinkMenu";
import { useClickable } from "../../hooks/clickable";
import { ModifierSupportPanel } from "../molecules/ModifierSupportPanel";
import { newCanvasBank } from "../../composables/canvasBank";
import { PreviewDialog } from "../PreviewDialog";
import { useImageStore, useLoadShapeAssets, useSetupStateContext } from "./hooks";
import { CommandExamFloatPanel } from "./CommandExamFloatPanel";
import { renderFrameNames } from "../../composables/frame";
import { FloatMenuOption } from "../../composables/states/commons";
import { newDebounce } from "../../utils/stateful/debounce";
import { saveSheetThumbnailAsSvg } from "../../composables/states/appCanvas/utils/shapeExport";
import { isImageAssetShape } from "../../shapes/image";
import { sendAwareness } from "../../composables/realtime/websocketChannel";
import { useWebsocketAwareness } from "../../hooks/realtimeHooks";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { applyDefaultTextStyle } from "../../utils/renderer";

// image files, folly sheet files (having empty type).
const DroppableFileRegs = [/image\/.+/, /^$/];

export const AppCanvas: React.FC = () => {
  const { sheetStore, shapeStore, documentStore, undoManager, userSettingStore } = useContext(AppCanvasContext);
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);
  const getSmctx = useContext(GetAppStateContext);

  const [canvasState, setCanvasState] = useState<any>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [floatMenuOption, setFloatMenuOption] = useState<FloatMenuOption>();
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [commandExams, setCommandExams] = useState<CommandExam[]>([]);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; point: IVec2 } | undefined>();
  const [linkInfo, setLinkInfo] = useState<LinkInfo>();
  const [userSetting, setUserSetting] = useState(userSettingStore.getState());
  const [modifierOptions, setModifierOptions] = useState<ModifierOptions>({});

  const canvasBank = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    shapeStore; // For exhaustive-deps
    return newCanvasBank();
  }, [shapeStore]);

  const sheets = useSyncExternalStore(sheetStore.watch, () => sheetStore.getEntities());
  const imageStore = useImageStore(shapeStore, sheets);
  const loadShapeAssets = useLoadShapeAssets(imageStore, smctx.assetAPI, getSmctx, sheets);

  const saveSheetThumbnailDebounce = useMemo(() => {
    return newDebounce(saveSheetThumbnailAsSvg, 3000);
  }, []);

  const processSheetThumbnail = useCallback(() => {
    const sheetId = sheetStore.getSelectedSheet()?.id;
    if (sheetId) {
      // Prepare cached image store in case selected sheet is changed.
      // => When it changes, the image store no longer have iamges for the target sheet.
      const imageStoreCache = imageStore.getImageStoreCache();
      saveSheetThumbnailDebounce(
        sheetId,
        {
          ...getSmctx(),
          getImageStore: () => {
            // Use merged image store having both cached and the latest images.
            // => This resolves invalid thumbnail issue after loading the sheet that comes from other clients.
            return getSmctx().getImageStore().getMergedImageStores(imageStoreCache);
          },
        },
        (assetId, blob) => {
          // Load the thumbnail image to the latest image store.
          imageStore.loadFromFile(assetId, blob);
        },
      );
    }
  }, [sheetStore, getSmctx, saveSheetThumbnailDebounce, imageStore]);

  useEffect(() => {
    loadShapeAssets(shapeStore.shapeComposite.shapes);
  }, [loadShapeAssets, shapeStore]);

  useEffect(() => {
    return imageStore.watch(() => {
      setCanvasState({});
    });
  }, [imageStore]);

  useEffect(() => {
    return sheetStore.watchSelected((id) => {
      sm.reset();
      setCanvasState({});
      sendAwareness({ sheetId: id, shapeIds: Object.keys(shapeStore.getSelected()) });
    });
  }, [sheetStore, shapeStore, sm]);

  useEffect(() => {
    // Flush the thumbnail save when the shape store changes.
    return saveSheetThumbnailDebounce.flush;
  }, [shapeStore, saveSheetThumbnailDebounce]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "s" && isCtrlOrMeta(e)) {
        e.preventDefault();
        processSheetThumbnail();
        saveSheetThumbnailDebounce.flush();
      }
    },
    [processSheetThumbnail, saveSheetThumbnailDebounce],
  );
  useGlobalKeydownEffect(handleKeyDown);

  useEffect(() => {
    return shapeStore.watch((keys) => {
      sm.handleEvent({
        type: "shape-updated",
        data: { keys },
      });
      setCanvasState({});
      processSheetThumbnail();

      // Proc image loading in case image shapes come from other clients
      const ids = Array.from(keys);
      const images = ids.map((id) => shapeStore.getEntity(id)).filter((s) => !!s && isImageAssetShape(s));
      if (images.length > 0) {
        loadShapeAssets(images);
      }
    });
  }, [shapeStore, sm, processSheetThumbnail, loadShapeAssets]);

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
    return documentStore.watch((keys) => {
      sm.handleEvent({
        type: "shape-updated",
        data: { keys, text: true },
      });
      setCanvasState({});
      processSheetThumbnail();
    });
  }, [documentStore, sm, processSheetThumbnail]);

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
      sm.handleEvent({
        type: "user-setting-change",
      });
    });
  }, [userSettingStore, sm]);

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
    editStartCanvasPoint,
  } = useCanvas(getWrapper, { viewStateKey: "view_state" });

  const grid = useMemo(() => {
    return newGrid({
      size: getGridSize(userSetting.gridSize ?? 50, scale),
      range: viewCanvasRect,
      disabled: userSetting.grid === "off",
    });
  }, [scale, viewCanvasRect, userSetting]);

  const mergedDocMap = useDocumentMap();

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

  useSetupStateContext({
    redraw: useCallback(() => setCanvasState({}), []),
    getRenderCtx: useCallback(() => canvasRef.current?.getContext("2d") ?? undefined, []),
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
    focus,
    userSettingStore,
    imageStore,
    sheetStore,
    shapeStore,
    documentStore,
    showEmojiPicker,
    undoManager,
    focusBackTextEditor,
    setTextEditing,
    setTextEditorPosition,
    setFloatMenuOption,
    setContextMenu,
    setCommandExams,
    setCursor,
    setCurrentDocAttrInfo,
    setLinkInfo,
  });

  useEffect(() => {
    const sheet = sheetStore.getSelectedSheet();
    if (!sheet) return;

    return shapeStore.watchSelected(([, selected]) => {
      setCanvasState({});
      sendAwareness({ sheetId: sheet.id, shapeIds: Object.keys(selected) });
      sm.handleEvent({
        type: "selection",
      });
    });
  }, [sheetStore, shapeStore, sm]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasAttrs = useMemo(
    () => ({
      className: "absolute top-0 left-0 display-none",
      width: viewSize.width,
      height: viewSize.height,
    }),
    [viewSize.width, viewSize.height],
  );

  const awareness = useWebsocketAwareness();
  const renderAwareness = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "#333";
      for (const [, { value }] of awareness) {
        if (value.sheetId === sheetStore.getSelectedSheet()?.id && value.shapeIds) {
          const shapes = value.shapeIds.map((id) => shapeStore.shapeComposite.mergedShapeMap[id]).filter((s) => !!s);

          if (shapes.length > 0) {
            applyStrokeStyle(ctx, { color: value.color, width: 3 * scale, dash: "short" });
            const rect = shapeStore.shapeComposite.getWrapperRectForShapes(shapes);
            ctx.beginPath();
            ctx.rect(rect.x, rect.y, rect.width, rect.height);
            ctx.stroke();
            ctx.beginPath();
            applyDefaultTextStyle(ctx, 16 * scale, "left", true);
            ctx.strokeText(value.id, rect.x, rect.y + rect.height);
            ctx.fillText(value.id, rect.x, rect.y + rect.height);
          }
        }
      }
    },
    [awareness, sheetStore, shapeStore, scale],
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
      scale,
      canvasBank,
      targetRect: viewCanvasRect,
    });
    renderer.render(ctx);
    renderAwareness(ctx);
    renderFrameNames(ctx, shapeStore.shapeComposite, userSetting.frameLabelSize, scale);
    grid.renderAxisLabels(ctx, scale);
    sm.render(ctx);
  }, [
    renderAwareness,
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
    canvasBank,
    viewCanvasRect,
    userSetting,
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

      saveSheetThumbnailDebounce.delay();
      const p = removeRootPosition({ x: e.pageX, y: e.pageY });
      setMousePoint(p);
      if (!editStartPoint || !editStartCanvasPoint) return;

      sm.handleEvent({
        type: "pointermove",
        data: {
          start: viewToCanvas(editStartPoint),
          startAbs: editStartCanvasPoint,
          current: viewToCanvas(p),
          scale: scale,
          ...getMouseOptionsCustom(e),
        },
      });
    },
    [
      saveSheetThumbnailDebounce,
      editStartPoint,
      editStartCanvasPoint,
      removeRootPosition,
      scale,
      setMousePoint,
      viewToCanvas,
      sm,
      getMouseOptionsCustom,
      isValidPointer,
    ],
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

  const handleContextMenu = useCallback(
    (p: IVec2, toggle = false) => {
      if (toggle && contextMenu) {
        setContextMenu(undefined);
      } else {
        sm.handleEvent({ type: "contextmenu", data: { point: viewToCanvas(p) } });
      }
    },
    [sm, viewToCanvas, contextMenu],
  );

  const handleNativeContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleContextMenu(getMousePoint());
    },
    [handleContextMenu, getMousePoint],
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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

  const floatMenu = floatMenuOption ? (
    <FloatMenu
      {...floatMenuOption}
      canvasState={canvasState}
      scale={scale}
      viewOrigin={viewOrigin}
      viewSize={viewSize}
      indexDocAttrInfo={indexDocAttrInfo}
      focusBack={focusBackTextEditor}
      textEditing={textEditing}
      onContextMenu={handleContextMenu}
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

  const handlePreviewClose = useCallback(() => userSettingStore.patchState({ preview: "off" }), [userSettingStore]);

  const gridElement = grid.disabled ? undefined : (
    <div key="grid" className="absolute left-0 top-0 w-full h-full pointer-events-none">
      <GridBackground
        x={grid.range.x / scale}
        y={grid.range.y / scale}
        size={grid.size / scale}
        type={userSetting.gridType}
        color={userSetting.gridColor}
      />
    </div>
  );
  const canvasElement = <canvas key="canvas" ref={canvasRef} {...canvasAttrs}></canvas>;
  const canvasContents =
    userSetting.gridOrder === "front" ? [canvasElement, gridElement] : [gridElement, canvasElement];

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative w-full h-full select-none outline-hidden"
        style={wrapperStyle}
        onPointerDown={onMouseDown}
        onPointerMove={onMouseHover}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={onFocus}
        onBlur={onBlur}
        onContextMenu={handleNativeContextMenu}
        tabIndex={-1}
      >
        <FileDropArea typeRegs={DroppableFileRegs} onDrop={onDrop}>
          {canvasContents}
        </FileDropArea>
      </div>
      {userSetting.debug === "on" ? (
        <div className="fixed right-16 top-0 pointer-events-none">{sm.getStateSummary().label}</div>
      ) : undefined}
      <div className="fixed bottom-0 left-0 flex pointer-events-none">
        <CommandExamFloatPanel commandExams={commandExams} displayMode={userSetting.displayMode} />
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
        <ContextMenu
          items={contextMenu.items}
          point={contextMenu.point}
          onClickItem={onClickContextMenuItem}
          viewSize={viewSize}
        />
      ) : undefined}
      {userSetting.preview === "on" ? <PreviewDialog open={true} onClose={handlePreviewClose} /> : undefined}
    </>
  );
};
