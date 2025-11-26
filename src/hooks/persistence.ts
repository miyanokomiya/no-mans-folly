import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AssetAPI, newFileAssetAPI } from "../composables/assetAPI";
import {
  closeWSClient,
  newWSChannel,
  postConnectionInfo,
  requestSheetSync,
  WS_UPDATE_ORIGIN,
} from "../composables/realtime/websocketChannel";
import { newFileInMemoryAccess } from "../composables/fileInMemoryAccess";
import { i18n } from "../i18n";

const INDEXEDDB_DIAGRAM_KEY = "test-project-diagram";
const SYNC_THROTTLE_INTERVALS = [5000, 20000, 40000, 60000];

const { indexedDBMode } = newFeatureFlags();

interface PersistenceOption {
  generateUuid: () => string;
  fileAccess: FileAccess;
}

export function usePersistence({ generateUuid, fileAccess }: PersistenceOption) {
  // Empty refers to "file-in-memory" that is the default when no workspace opens
  const [workspaceType, setWorkspaceType] = useState("");

  const [diagramDoc, setDiagramDoc] = useState(() => new Y.Doc());
  const [dbProviderDiagram, setDbProviderDiagram] = useState<IndexeddbPersistence | undefined>();
  const [sheetDoc, setSheetDoc] = useState(() => new Y.Doc());
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();
  const [ready, setReady] = useState(false);
  const [savePending, setSavePending] = useState({ diagram: false, sheet: false });
  const [syncStatus, setSyncStatus] = useState<"ok" | "autherror" | "unknownerror">("ok");
  const [saving, setSaving] = useState({ diagram: false, sheet: false });

  const [fileInMemoryAccess, setFileInMemoryAccess] = useState(() => newFileInMemoryAccess());
  const activeFileAccess = useMemo(() => {
    return workspaceType ? fileAccess : fileInMemoryAccess;
  }, [workspaceType, fileAccess, fileInMemoryAccess]);
  const assetAPI = useMemo<AssetAPI>(() => {
    return newFileAssetAPI(activeFileAccess);
  }, [activeFileAccess]);

  const [diagramStores, setDiagramStores] = useState<{
    diagramStore: DiagramStore;
    sheetStore: SheetStore;
  }>(() => ({
    diagramStore: newDiagramStore({ ydoc: diagramDoc }),
    sheetStore: newSheetStore({ ydoc: diagramDoc }),
  }));

  const [sheetStores, setSheetStores] = useState<{
    layerStore: LayerStore;
    shapeStore: ShapeStore;
    documentStore: DocumentStore;
  }>(() => ({
    layerStore: newLayerStore({ ydoc: sheetDoc }),
    shapeStore: newShapeStore({ ydoc: sheetDoc }),
    documentStore: newDocumentStore({ ydoc: sheetDoc }),
  }));

  const handleSyncError = useCallback((e: any) => {
    if ("status" in e && e.status === 401) {
      setSyncStatus("autherror");
    } else {
      setSyncStatus("unknownerror");
    }
  }, []);

  const loadIndependentSheet = useCallback(
    async (sheetId: string) => {
      const nextSheetDoc = createSheetDoc(sheetId);

      if (activeFileAccess.hasHandle()) {
        try {
          await activeFileAccess.openSheet(sheetId, nextSheetDoc);
          return nextSheetDoc;
        } catch (e) {
          console.error("Failed to load the sheet: ", sheetId, e);
        }
      }

      const sheetProvider = newIndexeddbPersistence(sheetId, nextSheetDoc);
      await sheetProvider?.whenSynced;
      await sheetProvider?.destroy();
      return nextSheetDoc;
    },
    [activeFileAccess],
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

    if (activeFileAccess.hasHandle()) {
      try {
        await activeFileAccess.overwriteSheetDoc(sheetId, nextSheetDoc);
      } catch (e) {
        handleSyncError(e);
      }
    }

    const sheetProvider = newIndexeddbPersistence(sheetId, nextSheetDoc);
    await sheetProvider?.whenSynced;

    setDbProviderSheet(sheetProvider);
    setSheetDoc(nextSheetDoc);
    setSheetStores({ layerStore, shapeStore, documentStore });
  }, [activeFileAccess, handleSyncError, sheetDoc, sheetStores]);

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
      setSaving((v) => ({ ...v, diagram: true }));
      try {
        await activeFileAccess.overwriteDiagramDoc(diagramDoc);
        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync diagram", e);
      } finally {
        setSaving((v) => ({ ...v, diagram: false }));
      }
    }, SYNC_THROTTLE_INTERVALS);
  }, [activeFileAccess, handleSyncError, diagramDoc]);

  useEffect(() => {
    const unwatch = saveDiagramUpdateThrottle.watch((pending) => {
      setSavePending((val) => ({ ...val, diagram: pending }));
    });
    return () => {
      saveDiagramUpdateThrottle.flush();
      unwatch();
    };
  }, [saveDiagramUpdateThrottle, diagramDoc]);

  useEffect(() => {
    const fn = (_: unknown, origin: string) => {
      if (isExternalSyncOrigin(origin) && activeFileAccess.name !== "file-system") return;
      saveDiagramUpdateThrottle();
    };

    diagramDoc.on("update", fn);
    return () => {
      diagramDoc.off("update", fn);
      saveDiagramUpdateThrottle.flush();
    };
  }, [saveDiagramUpdateThrottle, diagramDoc, activeFileAccess.name]);

  const saveSheetUpdateThrottle = useMemo(() => {
    return newLeveledThrottle(async (sheetId: string) => {
      setSaving((v) => ({ ...v, sheet: true }));
      try {
        await activeFileAccess.overwriteSheetDoc(sheetId, sheetDoc);
        setSyncStatus("ok");
      } catch (e) {
        handleSyncError(e);
        console.error("Failed to sync sheet: ", sheetId, e);
      } finally {
        setSaving((v) => ({ ...v, sheet: false }));
      }
    }, SYNC_THROTTLE_INTERVALS);
  }, [activeFileAccess, handleSyncError, sheetDoc]);

  const saveSheetUpdateThrottleMap = useRef(new Map<string, ReturnType<typeof newLeveledThrottle>>());

  const saveOtherSheetUpdateThrottle = useCallback(
    (sheetId: string, update: Uint8Array) => {
      let fn = saveSheetUpdateThrottleMap.current.get(sheetId);
      if (!fn) {
        fn = newLeveledThrottle(async () => {
          try {
            const sheet = await loadIndependentSheet(sheetId);
            Y.applyUpdate(sheet, update);
            await activeFileAccess.overwriteSheetDoc(sheetId, sheet);
            await saveIndexeddbPersistence(sheetId, sheet);
            sheet.destroy();
          } catch (e) {
            console.error("Failed to merge sheet: ", sheetId, e);
          }
        }, SYNC_THROTTLE_INTERVALS);
        saveSheetUpdateThrottleMap.current.set(sheetId, fn);
      }

      fn(sheetId, update);
    },
    [activeFileAccess, loadIndependentSheet],
  );

  useEffect(() => {
    const currentMap = saveSheetUpdateThrottleMap.current;
    saveSheetUpdateThrottleMap.current = new Map();
    for (const [, fn] of currentMap) {
      fn.flush();
    }
  }, [saveOtherSheetUpdateThrottle, sheetDoc]);

  useEffect(() => {
    const unwatch = saveSheetUpdateThrottle.watch((pending) => {
      setSavePending((val) => ({ ...val, sheet: pending }));
    });
    return () => {
      saveSheetUpdateThrottle.flush();
      unwatch();
    };
  }, [saveSheetUpdateThrottle, sheetDoc]);

  useEffect(() => {
    const fn = (_: unknown, origin: string) => {
      if (isExternalSyncOrigin(origin) && activeFileAccess.name !== "file-system") return;
      saveSheetUpdateThrottle(getSheetId(sheetDoc));
    };

    sheetDoc.on("update", fn);
    return () => {
      sheetDoc.off("update", fn);
      saveSheetUpdateThrottle.flush();
    };
  }, [saveSheetUpdateThrottle, sheetDoc, activeFileAccess.name]);

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

  const flushSaveThrottles = useCallback(async () => {
    await saveDiagramUpdateThrottle.flush();
    await saveSheetUpdateThrottle.flush();
    const currentMap = saveSheetUpdateThrottleMap.current;
    saveSheetUpdateThrottleMap.current = new Map();
    for (const [, fn] of currentMap) {
      await fn.flush();
    }
    setSavePending({ diagram: false, sheet: false });
    setSaving({ diagram: false, sheet: false });
  }, [saveDiagramUpdateThrottle, saveSheetUpdateThrottle]);

  const initSheet = useCallback(
    async (sheetId: string) => {
      // Flush save throttles on new sheet opens
      await flushSaveThrottles();

      const nextSheetDoc = createSheetDoc(sheetId);

      if (activeFileAccess.hasHandle()) {
        setReady(false);
        try {
          await activeFileAccess.openSheet(sheetId, nextSheetDoc);
          setSyncStatus("ok");
          if (workspaceType) {
            await clearIndexeddbPersistence(sheetId);
          }
        } catch (e) {
          handleSyncError(e);
          console.error("Failed to load local sheet: ", sheetId, e);
        }
        setReady(true);
      }

      const sheetProvider = newIndexeddbPersistence(sheetId, nextSheetDoc);
      await sheetProvider?.whenSynced;

      requestSheetSync(sheetId, Y.encodeStateAsUpdate(nextSheetDoc));
      setDbProviderSheet(sheetProvider);
      setSheetDoc(nextSheetDoc);
      setSheetStores({
        layerStore: newLayerStore({ ydoc: nextSheetDoc }),
        shapeStore: newShapeStore({ ydoc: nextSheetDoc }),
        documentStore: newDocumentStore({ ydoc: nextSheetDoc }),
      });
    },
    [activeFileAccess, handleSyncError, flushSaveThrottles, workspaceType],
  );

  const initDiagram = useCallback(
    async (diagramUpdate?: Uint8Array) => {
      setReady(false);
      const nextDiagramDoc = new Y.Doc();
      if (diagramUpdate) {
        Y.applyUpdate(nextDiagramDoc, diagramUpdate);
      }

      const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });
      const provider = newIndexeddbPersistence(INDEXEDDB_DIAGRAM_KEY, nextDiagramDoc);
      await provider?.whenSynced;

      if (!diagramStore.getEntity().id) {
        createInitialDiagram(diagramStore, generateUuid);
      }

      if (!nextDiagramDoc.meta?.diagramId) {
        nextDiagramDoc.meta ??= {};
        nextDiagramDoc.meta.diagramId = diagramStore.getEntity().id;
      }

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
    },
    [generateUuid, initSheet],
  );

  const openDiagramFromWorkspace = useCallback(async (): Promise<boolean> => {
    await flushSaveThrottles();
    setReady(false);
    const nextDiagramDoc = new Y.Doc();
    try {
      const result = await activeFileAccess.openDiagram(nextDiagramDoc);
      setSyncStatus("ok");
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

    closeWSClient();
    await clearIndexeddbPersistenceAll();

    const provider = newIndexeddbPersistence(INDEXEDDB_DIAGRAM_KEY, nextDiagramDoc);
    await provider?.whenSynced;
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, generateUuid);
      try {
        // Need to save the diagram having new sheet.
        await activeFileAccess.overwriteDiagramDoc(nextDiagramDoc);
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
  }, [generateUuid, activeFileAccess, handleSyncError, initSheet, flushSaveThrottles]);

  const clearDiagram = useCallback(async () => {
    await flushSaveThrottles();
    closeWSClient();
    disconnectFileAccessGracefully(activeFileAccess);
    setReady(false);
    await clearIndexeddbPersistenceAll();

    const nextDiagramDoc = new Y.Doc();
    const provider = newIndexeddbPersistence(INDEXEDDB_DIAGRAM_KEY, nextDiagramDoc);
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
  }, [generateUuid, activeFileAccess, initSheet, flushSaveThrottles]);

  const openRemoteDiagram = useCallback(
    async (diagramUpdate?: Uint8Array) => {
      if (diagramStores.sheetStore.getEntities().length > 1 || sheetStores.shapeStore.getEntities().length > 0) {
        try {
          const res = confirm(i18n.t("realtime.open_remote_diagram_confirm"));
          if (!res) return;
        } catch {
          // Ignore confirmation error
        }
      }

      await flushSaveThrottles();
      disconnectFileAccessGracefully(activeFileAccess);
      initDiagram(diagramUpdate);
    },
    [initDiagram, flushSaveThrottles, activeFileAccess, diagramStores, sheetStores],
  );

  /**
   * This method is intended for the case that no workspace opens yet.
   * => Not intended for duplicating current workspace to other place.
   *
   * When the target workspace is empty, save current diagram there.
   * When the target workspace has data, merge current diagram to it and save merged diagram there.
   */
  const saveToWorkspace = useCallback(async () => {
    await flushSaveThrottles();

    try {
      const result = await fileAccess.openDirectory();
      setSyncStatus("ok");
      if (!result) return;
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to open directory", e);
      return;
    }

    // Merge and save all sheets
    try {
      for (const sheet of diagramStores.sheetStore.getEntities()) {
        if (sheet.id === diagramStores.sheetStore.getSelectedSheet()?.id) {
          await fileAccess.overwriteSheetDoc(sheet.id, sheetDoc);
        } else {
          const doc = new Y.Doc();
          await fileInMemoryAccess.openSheet(sheet.id, doc);
          await fileAccess.overwriteSheetDoc(sheet.id, doc);
          doc.destroy();
        }
      }
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to sync sheet", e);
    }

    // Merge and save all assets
    try {
      for (const [name, data] of fileInMemoryAccess.assetMap) {
        await fileAccess.saveAsset(name, data);
      }
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to sync asset", e);
    }

    fileInMemoryAccess.disconnect();
    setFileInMemoryAccess(newFileInMemoryAccess());

    // Merge and save the diagram
    try {
      await fileAccess.reopenDiagram(diagramDoc);
      await fileAccess.overwriteDiagramDoc(diagramDoc);
      setSyncStatus("ok");
    } catch (e) {
      handleSyncError(e);
      console.error("Failed to sync diagram", e);
    }
  }, [flushSaveThrottles, fileInMemoryAccess, fileAccess, handleSyncError, diagramDoc, sheetDoc, diagramStores]);

  useEffect(() => {
    const bc = newWSChannel({
      roomId: "test",
      diagramDoc,
      sheetDoc,
      skipDiagramSave: () => saveDiagramUpdateThrottle.clear(true),
      skipSheetSave: () => saveSheetUpdateThrottle.clear(true),
      loadSheet: loadIndependentSheet,
      openDiagram: openRemoteDiagram,
      saveSheet: saveOtherSheetUpdateThrottle,
      assetAPI,
    });
    return () => {
      bc.close();
    };
  }, [
    diagramDoc,
    sheetDoc,
    saveDiagramUpdateThrottle,
    saveSheetUpdateThrottle,
    loadIndependentSheet,
    openRemoteDiagram,
    saveOtherSheetUpdateThrottle,
    assetAPI,
  ]);

  useEffect(() => {
    postConnectionInfo(!!workspaceType);
  }, [workspaceType]);

  return {
    workspaceType,
    setWorkspaceType,
    initSheet,
    cleanCurrentSheet,
    initDiagram,
    openDiagramFromWorkspace,
    clearDiagram,
    undoManager,
    ready,
    savePending,
    saveToWorkspace,
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

async function saveIndexeddbPersistence(sheetId: string, sheetDoc: Y.Doc) {
  const sheetProvider = newIndexeddbPersistence(sheetId, sheetDoc);
  await sheetProvider?.whenSynced;
  sheetProvider?.destroy();
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

// When doc update is originated by external sync process, it shouldn't trigger persistence.
function isExternalSyncOrigin(origin: string): boolean {
  return origin === WS_UPDATE_ORIGIN;
}

// Delay certain seconds until disconnecting.
// This would give enough time for remained file access such as sheet thumbnail creation.
// Note: Disconnecting isn't essential for current workspace platforms: File System, Google Drive.
function disconnectFileAccessGracefully(fileAccess: FileAccess) {
  setTimeout(() => {
    fileAccess.disconnect();
  }, 1000 * 60);
}
