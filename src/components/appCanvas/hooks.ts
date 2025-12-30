import { useCallback, useContext, useEffect, useState } from "react";
import { ImageStore, ImageData, newImageStore } from "../../composables/imageStore";
import { isImageAssetShape } from "../../shapes/image";
import { ShapeStore } from "../../stores/shapes";
import { EntityPatchInfo, Shape, Sheet } from "../../models";
import { AppCanvasStateContext } from "../../composables/states/appCanvas/core";
import { getSheetThumbnailFileName } from "../../utils/fileAccess";
import { SetAppStateContext } from "../../contexts/AppContext";
import { IRectangle, IVec2 } from "okageo";
import { Grid } from "../../composables/grid";
import { CommandExam, ContextMenuItem, EditMovement, LinkInfo } from "../../composables/states/types";
import { DocumentStore } from "../../stores/documents";
import { UserSettingStore } from "../../stores/userSettingStore";
import { SheetStore } from "../../stores/sheets";
import { FloatMenuOption } from "../../composables/states/commons";
import { canHaveText, getCommonStruct } from "../../shapes";
import { generateUuid } from "../../utils/random";
import { duplicateShapes } from "../../shapes/utils/duplicator";
import { getInitialOutput } from "../../utils/texts/textEditor";
import { DocDelta, DocOutput } from "../../models/document";
import { getEntityPatchByDelete, getPatchInfoByLayouts } from "../../composables/shapeLayoutHandler";
import { getAllBranchIds, getTree } from "../../utils/tree";
import { getDeleteTargetIds } from "../../composables/shapeComposite";
import { patchPipe } from "../../utils/commons";
import { AppUndoManager } from "../../contexts/AppCanvasContext";
import {
  getWebsocketClient,
  requestAssetSync,
  websocketAssetCallback,
} from "../../composables/realtime/websocketChannel";
import { AssetAPI } from "../../composables/assetAPI";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

export function useImageStore(shapeStore: ShapeStore, sheets: Sheet[]) {
  // Use the same store for all sheets to handle asyncronous processes properly.
  // => If we use different stores, old image data can remain in the new one if sheet switching happens while loading new data.
  const [imageStore] = useState(() => newImageStore());

  useEffect(() => {
    const imageDataList: [string, ImageData][] = [];
    // Conserve images that are already loaded.
    shapeStore.shapeComposite.shapes.filter(isImageAssetShape).forEach((s) => {
      if (!s.assetId) return;
      const imageData = imageStore.getImageData(s.assetId);
      if (!imageData) return;
      imageDataList.push([s.assetId, imageData]);
    });
    // Conserve sheet thumbnails.
    sheets.forEach((sheet) => {
      const assetId = getSheetThumbnailFileName(sheet.id);
      const imageData = imageStore.getImageData(assetId);
      if (!imageData) return;
      imageDataList.push([assetId, imageData]);
    });
    imageStore.replaceImageData(imageDataList);
  }, [shapeStore, sheets, imageStore]);

  return imageStore;
}

export function useLoadShapeAssets(
  imageStore: ImageStore,
  assetAPI: AssetAPI,
  getSmctx: () => AppCanvasStateContext,
  sheets: Sheet[],
) {
  useEffect(() => {
    return websocketAssetCallback.bind(async (data) => {
      const ctx = getSmctx();
      await ctx.assetAPI.saveAsset(data.id, data.asset);
      await imageStore.loadFromFile(data.id, data.asset);
    });
  }, [imageStore, getSmctx]);

  return useCallback(
    async (shapes: Shape[]) => {
      const errors = await imageStore.batchLoad(
        shapes.filter(isImageAssetShape).map((s) => s.assetId),
        assetAPI,
      );
      if (errors && errors.length > 0) {
        if (getWebsocketClient()) {
          errors.forEach((assetId) => {
            requestAssetSync(assetId);
          });
        } else {
          getSmctx().showToastMessage({ text: `Failed to load ${errors.length} asset file(s).`, type: "warn" });
        }
      }
      // Load sheet thumbnails. These don't always exist, so we can ignore errors.
      const thumbnailErrors = await imageStore.batchLoad(
        sheets.map<string | undefined>((sheet) => getSheetThumbnailFileName(sheet.id)),
        assetAPI,
      );
      if (thumbnailErrors && thumbnailErrors.length > 0 && getWebsocketClient()) {
        thumbnailErrors.forEach((assetId) => {
          requestAssetSync(assetId);
        });
      }
    },
    [getSmctx, assetAPI, imageStore, sheets],
  );
}

export function useSetupStateContext({
  redraw,
  getRenderCtx,
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
}: {
  redraw: () => void;
  getRenderCtx: () => CanvasRenderingContext2D | undefined;
  setViewport: (rect?: IRectangle) => void;
  zoomView: (step: number, center?: boolean) => number;
  setZoom: (value: number, center?: boolean) => number;
  panView: (editMovement: Omit<EditMovement, "startAbs">) => void;
  scrollView: (delta: IVec2) => void;
  startDragging: () => void;
  endMoving: () => void;
  canvasToView: (point: IVec2) => IVec2;
  viewToCanvas: (point: IVec2) => IVec2;
  scale: number;
  viewCanvasRect: IRectangle;
  getMousePoint: () => IVec2;
  grid: Grid;
  loadShapeAssets: (shapes: Shape[]) => Promise<void>;
  setShowEmojiPicker: (val: boolean, p?: IVec2) => void;
  linkInfo?: LinkInfo;
  focus: () => void;
  userSettingStore: UserSettingStore;
  imageStore: ImageStore;
  sheetStore: SheetStore;
  shapeStore: ShapeStore;
  documentStore: DocumentStore;
  showEmojiPicker: boolean;
  undoManager: AppUndoManager;
  focusBackTextEditor: () => void;
  setTextEditing: (val: boolean) => void;
  setTextEditorPosition: (p: IVec2) => void;
  setFloatMenuOption: (option: FloatMenuOption | undefined) => void;
  setContextMenu: (val: { items: ContextMenuItem[]; point: IVec2 } | undefined | undefined) => void;
  setCommandExams: (val: CommandExam[]) => void;
  setCursor: (cursor?: string) => void;
  setCurrentDocAttrInfo: (val: { [key: string]: any }) => void;
  setLinkInfo: (val?: LinkInfo) => void;
}) {
  const setSmctx = useContext(SetAppStateContext);
  const [viewportHistory, setViewportHistory] = useLocalStorageAdopter<(IRectangle | undefined)[]>({
    key: "viewport-history",
    version: "1",
    initialValue: [undefined],
    duration: 0,
  });

  useEffect(() => {
    // TODO: Make each method via "useCallback" for consistency.
    setSmctx({
      redraw,
      getRenderCtx,
      zoomView,
      setZoom,
      getScale: () => scale,
      getViewRect: () => viewCanvasRect,
      setViewport,
      addViewportHistory(val, latest = false) {
        setViewportHistory((v) => {
          const ret = v.concat();
          if (latest) {
            ret[0] = val;
          } else {
            ret.push(val);
          }
          return ret;
        });
      },
      deleteViewportHistory(index) {
        setViewportHistory((v) => {
          const ret = v.concat();
          ret.splice(index, 1);
          return ret;
        });
      },
      getViewportHistory: () => viewportHistory,
      panView,
      scrollView,
      startDragging,
      stopDragging: endMoving,
      getCursorPoint: () => viewToCanvas(getMousePoint()),

      toView: canvasToView,
      showFloatMenu: (option) => setFloatMenuOption(option ?? {}),
      hideFloatMenu: () => setFloatMenuOption(undefined),
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

      getSheets: sheetStore.getEntities,
      getSelectedSheet: sheetStore.getSelectedSheet,
      selectSheet: sheetStore.selectSheet,

      getShapeComposite: () => shapeStore.shapeComposite,
      getShapes: () => shapeStore.shapeComposite.shapes,

      getTmpShapeMap: () => shapeStore.shapeComposite.tmpShapeMap,
      setTmpShapeMap: shapeStore.setTmpShapeMap,

      getSelectedShapeIdMap: shapeStore.getSelected,
      getLastSelectedShapeId: shapeStore.getLastSelected,
      selectShape: shapeStore.select,
      multiSelectShapes: shapeStore.multiSelect,
      clearAllSelected: shapeStore.clearAllSelected,
      addShapes: getAddShapesFn(shapeStore, documentStore, loadShapeAssets),
      deleteShapes: getDeleteShapesFn(shapeStore, documentStore),
      patchShapes: shapeStore.patchEntities,
      updateShapes: getUpdateShapesFn(shapeStore, documentStore, loadShapeAssets),
      pasteShapes: getPasteShapesFn(shapeStore, documentStore, loadShapeAssets, viewToCanvas, getMousePoint),

      createFirstIndex: shapeStore.createFirstIndex,
      createLastIndex: shapeStore.createLastIndex,

      getGrid: () => grid,

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
      patchDocuments: getPatchDocumentsFn(shapeStore, documentStore),
      patchDocDryRun: documentStore.patchDocDryRun,
      setCurrentDocAttrInfo,
      createCursorPosition: documentStore.createCursorPosition,
      retrieveCursorPosition: documentStore.retrieveCursorPosition,
      getImageStore: () => imageStore,
    });
  }, [
    redraw,
    getRenderCtx,
    setViewport,
    viewportHistory,
    setViewportHistory,
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
    sheetStore,
    shapeStore,
    showEmojiPicker,
    undoManager,
    focusBackTextEditor,
    setCurrentDocAttrInfo,
    setCursor,
    setFloatMenuOption,
    setContextMenu,
    setCommandExams,
    setTextEditing,
    setTextEditorPosition,
    setLinkInfo,
  ]);
}

function getAddShapesFn(
  shapeStore: ShapeStore,
  documentStore: DocumentStore,
  loadShapeAssets: (shapes: Shape[]) => Promise<void>,
): (shapes: Shape[], docMap?: { [id: string]: DocDelta }, patch?: { [id: string]: Partial<Shape> }) => void {
  return (shapes, docMap, patch) => {
    shapeStore.transact(() => {
      shapeStore.addEntities(shapes);
      if (patch) {
        shapeStore.patchEntities(patch);
      }
      if (docMap) {
        documentStore.patchDocs(docMap);
      }

      // Newly created shapes should have doc by default.
      // => It useful to apply text style and to avoid conflict even it has no content.
      const docSupplement = shapes
        .filter((s) => canHaveText(getCommonStruct, s) && !docMap?.[s.id])
        .reduce<{ [id: string]: DocOutput }>((p, s) => {
          p[s.id] = getInitialOutput();
          return p;
        }, {});
      documentStore.patchDocs(docSupplement);
    });
    loadShapeAssets(shapes);
  };
}

function getDeleteShapesFn(
  shapeStore: ShapeStore,
  documentStore: DocumentStore,
): (ids: string[], patch?: { [id: string]: Partial<Shape> }) => void {
  return (ids, patch) => {
    const shapeComposite = shapeStore.shapeComposite;
    const shapePatchInfo = getPatchInfoByLayouts(shapeComposite, getEntityPatchByDelete(shapeComposite, ids, patch));

    shapeStore.transact(() => {
      if (shapePatchInfo.update) {
        shapeStore.patchEntities(shapePatchInfo.update);
      }
      if (shapePatchInfo.delete) {
        shapeStore.deleteEntities(shapePatchInfo.delete);
        documentStore.deleteDocs(shapePatchInfo.delete);
      }
    });
  };
}

function getUpdateShapesFn(
  shapeStore: ShapeStore,
  documentStore: DocumentStore,
  loadShapeAssets: (shapes: Shape[]) => Promise<void>,
): (update: EntityPatchInfo<Shape>, docMap?: { [id: string]: DocOutput }) => void {
  return (update, docMap) => {
    // Apply patch before getting branch ids in case tree structure changes by the patch.
    // => e.g. ungrouping
    const updated = patchPipe([() => update.update ?? {}], shapeStore.shapeComposite.shapeMap);
    const targetIds = update.delete
      ? getDeleteTargetIds(
          shapeStore.shapeComposite,
          getAllBranchIds(getTree(Object.values(updated.result)), update.delete),
        )
      : [];

    const shapePatchInfo = getPatchInfoByLayouts(shapeStore.shapeComposite, {
      add: update.add,
      update: update.update,
      delete: targetIds,
    });

    shapeStore.transact(() => {
      if (shapePatchInfo.add) {
        shapeStore.addEntities(shapePatchInfo.add);
      }
      if (shapePatchInfo.update) {
        shapeStore.patchEntities(shapePatchInfo.update);
      }
      if (docMap) {
        documentStore.patchDocs(docMap);
      }

      if (shapePatchInfo.add) {
        // Newly created shapes should have doc by default.
        // => It useful to apply text style and to avoid conflict even it has no content.
        const docSupplement = shapePatchInfo.add
          .filter((s) => canHaveText(getCommonStruct, s) && !docMap?.[s.id])
          .reduce<{ [id: string]: DocOutput }>((p, s) => {
            p[s.id] = getInitialOutput();
            return p;
          }, {});
        documentStore.patchDocs(docSupplement);
      }

      if (shapePatchInfo.delete) {
        shapeStore.deleteEntities(shapePatchInfo.delete);
        documentStore.deleteDocs(shapePatchInfo.delete);
      }
    });

    if (update.add) {
      loadShapeAssets(update.add);
    }
  };
}

function getPasteShapesFn(
  shapeStore: ShapeStore,
  documentStore: DocumentStore,
  loadShapeAssets: (shapes: Shape[]) => Promise<void>,
  viewToCanvas: (point: IVec2) => IVec2,
  getMousePoint: () => IVec2,
): (shapes: Shape[], docs: [id: string, doc: DocOutput][], p?: IVec2) => void {
  return (shapes, docs, p) => {
    const targetP = p ?? viewToCanvas(getMousePoint());
    const availableIdSet = new Set(shapeStore.shapeComposite.shapes.map((s) => s.id));
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
  };
}

function getPatchDocumentsFn(
  shapeStore: ShapeStore,
  documentStore: DocumentStore,
): (val: { [id: string]: DocDelta }, shapePatch?: { [id: string]: Partial<Shape> }) => void {
  return (val, shapePatch) => {
    if (shapePatch) {
      shapeStore.transact(() => {
        shapeStore.patchEntities(shapePatch);
        documentStore.patchDocs(val);
      });
    } else {
      documentStore.patchDocs(val);
    }
  };
}
