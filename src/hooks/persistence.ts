import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagramStore, newDiagramStore } from "../stores/diagram";
import { SheetStore, newSheetStore } from "../stores/sheets";
import { LayerStore, newLayerStore } from "../stores/layers";
import { ShapeStore, newShapeStore } from "../stores/shapes";
import { DocumentStore, newDocumentStore } from "../stores/documents";
import { FileAccess } from "../utils/fileAccess";
import { newLeveledThrottle } from "../utils/stateful/throttle";
import { COLORS } from "../utils/color";
import { newFeatureFlags } from "../composables/featureFlags";
import { getSheetIdFromQuery } from "../utils/route";
import { generateKeyBetween } from "../utils/findex";
import { isMemoryAssetAPI, newFileAssetAPI, newMemoryAssetAPI } from "../composables/assetAPI";

const DIAGRAM_KEY = "test-project-diagram";
const SYNC_THROTTLE_INTERVALS = [5000, 20000, 40000, 60000];

export type AssetAPIEnabled = {
  enabled: true;
  name: string;
  saveAsset: (assetId: string, blob: Blob | File) => Promise<void>;
  loadAsset: (assetId: string) => Promise<Blob | File | undefined>;
};

export type AssetAPI = AssetAPIEnabled | { enabled: false };

const { indexedDBMode } = newFeatureFlags();

const defaultDiagramDoc = new Y.Doc();
const defaultSheetDoc = new Y.Doc();
const defaultDiagramStores = {
  diagramStore: newDiagramStore({ ydoc: defaultDiagramDoc }),
  sheetStore: newSheetStore({ ydoc: defaultDiagramDoc }),
};
const defaultSheetStores = {
  layerStore: newLayerStore({ ydoc: defaultSheetDoc }),
  shapeStore: newShapeStore({ ydoc: defaultSheetDoc }),
  documentStore: newDocumentStore({ ydoc: defaultSheetDoc }),
};

interface PersistenceOption {
  generateUuid: () => string;
  fileAccess: FileAccess;
}

export function usePersistence({ generateUuid, fileAccess }: PersistenceOption) {
  const [canSyncWorkspace, setCanSyncWorkspace] = useState(false);

  const [diagramDoc, setDiagramDoc] = useState(defaultDiagramDoc);
  const [dbProviderDiagram, setDbProviderDiagram] = useState<IndexeddbPersistence | undefined>();
  const [sheetDoc, setSheetDoc] = useState(defaultSheetDoc);
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();
  const [ready, setReady] = useState(false);
  const [savePending, setSavePending] = useState({ diagram: false, sheet: false });
  const [syncStatus, setSyncStatus] = useState<"ok" | "autherror" | "unknownerror">("ok");
  const [saving, setSaving] = useState({ diagram: false, sheet: false });

  // "memoryAssetAPI" is used when no workspace is connected.
  // The assets in it will be saved as "saveToWorkspace" called, then be cleared.
  const memoryAssetAPI = useMemo(() => newMemoryAssetAPI(), []);
  const fileAssetAPI = useMemo<AssetAPI | undefined>(() => {
    return canSyncWorkspace ? newFileAssetAPI(fileAccess) : undefined;
  }, [fileAccess, canSyncWorkspace]);
  const assetAPI = fileAssetAPI ?? memoryAssetAPI;
  useEffect(() => {
    memoryAssetAPI.clear();
  }, [memoryAssetAPI, canSyncWorkspace]);

  const [diagramStores, setDiagramStores] = useState<{
    diagramStore: DiagramStore;
    sheetStore: SheetStore;
  }>(defaultDiagramStores);

  const [sheetStores, setSheetStores] = useState<{
    layerStore: LayerStore;
    shapeStore: ShapeStore;
    documentStore: DocumentStore;
  }>(defaultSheetStores);

  const handleSyncError = useCallback((e: any) => {
    if ("status" in e && e.status === 401) {
      setSyncStatus("autherror");
    } else {
      setSyncStatus("unknownerror");
    }
  }, []);

  const initSheet = useCallback(
    async (sheetId: string) => {
      const nextSheetDoc = createSheetDoc(sheetId);

      if (fileAccess.hasHnadle()) {
        setReady(false);
        try {
          await fileAccess.openSheet(sheetId, nextSheetDoc);
          setSyncStatus("ok");
          await clearIndexeddbPersistence(sheetId);
          setCanSyncWorkspace(fileAccess.hasHnadle());
        } catch (e) {
          handleSyncError(e);
          console.error("Failed to load local sheet: ", sheetId, e);
        }
        setReady(true);
      }

      const sheetProvider = newIndexeddbPersistence(sheetId, nextSheetDoc);
      await sheetProvider?.whenSynced;

      setDbProviderSheet(sheetProvider);
      setSheetDoc(nextSheetDoc);
      setSheetStores({
        layerStore: newLayerStore({ ydoc: nextSheetDoc }),
        shapeStore: newShapeStore({ ydoc: nextSheetDoc }),
        documentStore: newDocumentStore({ ydoc: nextSheetDoc }),
      });
    },
    [fileAccess, handleSyncError],
  );

  const cleanCurrentSheet = useCallback(async () => {
    const sheetId = getSheetId(sheetDoc);
    if (!sheetId) return;

    const nextSheetDoc = createSheetDoc(sheetId);
    const layerStore = newLayerStore({ ydoc: nextSheetDoc });
    const shapeStore = newShapeStore({ ydoc: nextSheetDoc });
    const documentStore = newDocumentStore({ ydoc: nextSheetDoc });

    layerStore.addEntities(sheetStores.layerStore.getEntities());
    shapeStore.addEntities(sheetStores.shapeStore.getEntities());
    Object.entries(sheetStores.documentStore.getDocMap()).forEach(([id, doc]) => {
      documentStore.addDoc(id, doc);
    });

    if (fileAccess.hasHnadle()) {
      try {
        await fileAccess.overwriteSheetDoc(sheetId, nextSheetDoc);
      } catch (e) {
        handleSyncError(e);
      }
    }

    const sheetProvider = newIndexeddbPersistence(sheetId, nextSheetDoc);
    await sheetProvider?.whenSynced;

    setDbProviderSheet(sheetProvider);
    setSheetDoc(nextSheetDoc);
    setSheetStores({ layerStore, shapeStore, documentStore });
  }, [fileAccess, handleSyncError, sheetDoc, sheetStores]);

  const initDiagram = useCallback(async () => {
    setReady(false);
    const nextDiagramDoc = new Y.Doc();
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });
    createInitialDiagram(diagramStore, generateUuid);
    const provider = newIndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider?.whenSynced;

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, generateUuid);
    }

    sheetStore.selectSheet(getSheetIdFromQuery());
    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [generateUuid, initSheet]);

  const openDiagramFromWorkspace = useCallback(async (): Promise<boolean> => {
    setReady(false);
    const nextDiagramDoc = new Y.Doc();
    try {
      const result = await fileAccess.openDiagram(nextDiagramDoc);
      setSyncStatus("ok");
      setCanSyncWorkspace(fileAccess.hasHnadle());
      if (!result) {
        setReady(true);
        return false;
      }
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to open diagram", e);
      setReady(true);
      return false;
    }

    await clearIndexeddbPersistenceAll();

    const provider = newIndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider?.whenSynced;
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, generateUuid);
      try {
        // Need to save the diagram having new sheet.
        await fileAccess.overwriteDiagramDoc(nextDiagramDoc);
        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync diagram", e);
      }
    }

    sheetStore.selectSheet(getSheetIdFromQuery());
    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
    return true;
  }, [generateUuid, fileAccess, handleSyncError, initSheet]);

  const clearDiagram = useCallback(async () => {
    await fileAccess.disconnect();
    setCanSyncWorkspace(fileAccess.hasHnadle());
    setReady(false);
    await clearIndexeddbPersistenceAll();

    const nextDiagramDoc = new Y.Doc();
    const provider = newIndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider?.whenSynced;
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, generateUuid);
    }

    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [generateUuid, fileAccess, initSheet]);

  /**
   * This method is intended for the case that the diagram has one sheet without workspace in the app.
   * => Not intended for duplicating the the diagram and the all sheets to other workspace.
   *
   * When the target workspace is empty, just save current diagram there.
   * When the target workspace has data, merge current diagram to it and save merged diagram there.
   */
  const saveToWorkspace = useCallback(async () => {
    if (!diagramStores) return;

    try {
      const result = await fileAccess.openDirectory();
      setSyncStatus("ok");
      if (!result) return;
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to open directory", e);
      return;
    }

    const sheet = diagramStores.sheetStore.getSelectedSheet();
    if (sheet) {
      try {
        await fileAccess.openSheet(sheet.id, sheetDoc);
        await fileAccess.overwriteSheetDoc(sheet.id, sheetDoc);

        if (isMemoryAssetAPI(assetAPI)) {
          for (const [id, blob] of assetAPI.getAssetList()) {
            await fileAccess.saveAsset(id, blob);
          }
        }

        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync sheet: ", sheet.id, e);
      }
    }
    try {
      await fileAccess.reopenDiagram(diagramDoc);
      await fileAccess.overwriteDiagramDoc(diagramDoc);
      setSyncStatus("ok");
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to sync diagram", e);
    }

    setCanSyncWorkspace(fileAccess.hasHnadle());
  }, [fileAccess, handleSyncError, diagramDoc, sheetDoc, diagramStores, assetAPI]);

  const undoManager = useMemo(() => {
    return new Y.UndoManager(
      // Must be ones in the same Y.Doc
      Object.values(sheetStores ?? []).map((s) => s.getScope()),
      {
        captureTimeout: 0,
      },
    );
  }, [sheetStores]);

  const saveDiagramUpdateThrottle = useMemo(() => {
    return newLeveledThrottle(async () => {
      if (!canSyncWorkspace) return;

      setSaving((v) => ({ ...v, diagram: true }));
      try {
        await fileAccess.overwriteDiagramDoc(diagramDoc);
        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync diagram", e);
      } finally {
        setSaving((v) => ({ ...v, diagram: false }));
      }
    }, SYNC_THROTTLE_INTERVALS);
  }, [fileAccess, handleSyncError, canSyncWorkspace, diagramDoc]);

  useEffect(() => {
    const unwatch = saveDiagramUpdateThrottle.watch((pending) => {
      setSavePending((val) => ({ ...val, diagram: pending }));
    });
    return () => {
      saveDiagramUpdateThrottle.flush();
      unwatch();
    };
  }, [saveDiagramUpdateThrottle]);

  useEffect(() => {
    if (!canSyncWorkspace) return;

    diagramDoc.on("update", saveDiagramUpdateThrottle);
    return () => {
      diagramDoc.off("update", saveDiagramUpdateThrottle);
      saveDiagramUpdateThrottle.flush();
    };
  }, [canSyncWorkspace, saveDiagramUpdateThrottle, diagramDoc]);

  const saveSheetUpdateThrottle = useMemo(() => {
    return newLeveledThrottle(async (sheetId: string) => {
      if (!canSyncWorkspace) return;

      setSaving((v) => ({ ...v, sheet: true }));
      try {
        await fileAccess.overwriteSheetDoc(sheetId, sheetDoc);
        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync sheet: ", sheetId, e);
      } finally {
        setSaving((v) => ({ ...v, sheet: false }));
      }
    }, SYNC_THROTTLE_INTERVALS);
  }, [fileAccess, handleSyncError, canSyncWorkspace, sheetDoc]);

  useEffect(() => {
    const unwatch = saveSheetUpdateThrottle.watch((pending) => {
      setSavePending((val) => ({ ...val, sheet: pending }));
    });
    return () => {
      saveSheetUpdateThrottle.flush();
      unwatch();
    };
  }, [saveSheetUpdateThrottle]);

  useEffect(() => {
    if (!canSyncWorkspace) return;

    const fn = () => {
      saveSheetUpdateThrottle(getSheetId(sheetDoc));
    };

    sheetDoc.on("update", fn);
    return () => {
      sheetDoc.off("update", fn);
      saveSheetUpdateThrottle.flush();
    };
  }, [canSyncWorkspace, saveSheetUpdateThrottle, sheetDoc]);

  useEffect(() => {
    return () => {
      diagramDoc.destroy();
    };
  }, [diagramDoc]);

  useEffect(() => {
    return () => {
      sheetDoc.destroy();
    };
  }, [sheetDoc]);

  useEffect(() => {
    return () => {
      dbProviderDiagram?.destroy();
    };
  }, [dbProviderDiagram]);

  useEffect(() => {
    return () => {
      dbProviderSheet?.destroy();
    };
  }, [dbProviderSheet]);

  useEffect(() => {
    return () => {
      undoManager?.destroy();
    };
  }, [undoManager]);

  useEffect(() => {
    return () => {
      diagramStores.diagramStore.dispose();
      diagramStores.sheetStore.dispose();
    };
  }, [diagramStores]);

  useEffect(() => {
    return () => {
      sheetStores.layerStore.dispose();
      sheetStores.shapeStore.dispose();
      sheetStores.documentStore.dispose();
    };
  }, [sheetStores]);

  const flushSaveThrottles = useCallback(() => {
    saveDiagramUpdateThrottle.flush();
    saveSheetUpdateThrottle.flush();
  }, [saveDiagramUpdateThrottle, saveSheetUpdateThrottle]);

  return {
    initSheet,
    cleanCurrentSheet,
    initDiagram,
    openDiagramFromWorkspace,
    clearDiagram,
    undoManager,
    ready,
    savePending,
    saveToWorkspace,
    canSyncWorkspace,
    flushSaveThrottles,
    ...diagramStores,
    ...sheetStores,

    assetAPI,
    syncStatus,
    saving,
  };
}

async function clearIndexeddbPersistence(name: string) {
  const tmpDoc = new Y.Doc();
  const tmpProvider = newIndexeddbPersistence(name, tmpDoc);
  await tmpProvider?.clearData();
  await tmpProvider?.destroy();
  tmpDoc.destroy();
}

async function clearIndexeddbPersistenceAll() {
  const databases = await indexedDB.databases();
  databases.forEach((db) => {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  });
}

function createInitialDiagram(diagramStore: DiagramStore, generateUuid: () => string) {
  diagramStore.patchEntity({ id: generateUuid(), findex: generateKeyBetween(null, null) });
}

function createInitialSheet(sheetStore: SheetStore, generateUuid: () => string) {
  const sheetId = generateUuid();
  sheetStore.addEntity({
    id: sheetId,
    findex: generateKeyBetween(null, null),
    name: "New Sheet",
    bgcolor: COLORS.GRAY_1,
  });
  sheetStore.selectSheet(sheetId);
}

function newIndexeddbPersistence(key: string, doc: Y.Doc): IndexeddbPersistence | undefined {
  return !indexedDBMode ? undefined : new IndexeddbPersistence(key, doc);
}

function createSheetDoc(sheetId: string): Y.Doc {
  const nextSheetDoc = new Y.Doc();
  // Attach sheet id
  // => the doc doens't always refer to selected sheet in the store during swiching sheets.
  nextSheetDoc.meta = { sheetId };
  return nextSheetDoc;
}

function getSheetId(sheetDoc: Y.Doc): string {
  return sheetDoc.meta.sheetId;
}
