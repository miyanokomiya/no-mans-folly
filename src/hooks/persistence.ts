import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagramStore, newDiagramStore } from "../stores/diagram";
import { SheetStore, newSheetStore } from "../stores/sheets";
import { LayerStore, newLayerStore } from "../stores/layers";
import { ShapeStore, newShapeStore } from "../stores/shapes";
import { DocumentStore, newDocumentStore } from "../stores/documents";
import { generateKeyBetween } from "fractional-indexing";
import { FileAccess } from "../composables/fileAccess";
import { newThrottle } from "../composables/throttle";
import { COLORS } from "../utils/color";

const DIAGRAM_KEY = "test-project-diagram";

export type AssetAPI =
  | {
      enabled: true;
      saveAsset: (assetId: string, blob: Blob | File) => Promise<void>;
      loadAsset: (assetId: string) => Promise<File | undefined>;
    }
  | { enabled: false };

const queryParameters = new URLSearchParams(window.location.search);
const initialSheetIdByQuery = queryParameters.get("sheet") ?? "";
const noIndexedDB = !queryParameters.get("indexeddb");

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
  const [canSyncLocal, setCanSyncToLocal] = useState(false);

  const [diagramDoc, setDiagramDoc] = useState(defaultDiagramDoc);
  const [dbProviderDiagram, setDbProviderDiagram] = useState<IndexeddbPersistence | undefined>();
  const [sheetDoc, setSheetDoc] = useState(defaultSheetDoc);
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();
  const [ready, setReady] = useState(false);
  const [savePending, setSavePending] = useState({ diagram: false, sheet: false });

  const [diagramStores, setDiagramStores] = useState<{
    diagramStore: DiagramStore;
    sheetStore: SheetStore;
  }>(defaultDiagramStores);

  const [sheetStores, setSheetStores] = useState<{
    layerStore: LayerStore;
    shapeStore: ShapeStore;
    documentStore: DocumentStore;
  }>(defaultSheetStores);

  const initSheet = useCallback(
    async (sheetId: string) => {
      const nextSheetDoc = new Y.Doc();
      // Attach sheet id
      // => the doc doens't always refer to selected sheet in the store during swiching sheets.
      nextSheetDoc.meta = { sheetId };

      if (fileAccess.hasHnadle()) {
        try {
          await fileAccess.openSheet(sheetId, nextSheetDoc);
          await clearIndexeddbPersistence(sheetId);
          setCanSyncToLocal(fileAccess.hasHnadle());
        } catch (e) {
          console.log("Failed to load local sheet: ", sheetId, e);
        }
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
    [fileAccess],
  );

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

    const sheet = sheetStore.getEntityMap()[initialSheetIdByQuery] ?? sheetStore.getSelectedSheet()!;
    sheetStore.selectSheet(sheet.id);
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [generateUuid, initSheet]);

  const openDiagramFromLocal = useCallback(async (): Promise<boolean> => {
    setReady(false);
    const nextDiagramDoc = new Y.Doc();
    const result = await fileAccess.openDiagram(nextDiagramDoc);
    setCanSyncToLocal(fileAccess.hasHnadle());
    if (!result) {
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
      // Need to save the diagram having new sheet.
      await fileAccess.overwriteDiagramDoc(nextDiagramDoc);
    }

    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
    return true;
  }, [generateUuid, fileAccess, initSheet]);

  const clearDiagram = useCallback(async () => {
    await fileAccess.disconnect();
    setCanSyncToLocal(fileAccess.hasHnadle());
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

  const saveAllToLocal = useCallback(async () => {
    if (!diagramStores) return;

    const result = await fileAccess.openDirectory();
    if (!result) return;

    const sheets = diagramStores.sheetStore.getEntities();
    for (const sheet of sheets) {
      const sheetDoc = new Y.Doc();
      const sheetProvider = newIndexeddbPersistence(sheet.id, sheetDoc);
      await sheetProvider?.whenSynced;
      await fileAccess.overwriteSheetDoc(sheet.id, sheetDoc);
      await sheetProvider?.destroy();
      sheetDoc.destroy();
    }
    await fileAccess.overwriteDiagramDoc(diagramDoc);
    setCanSyncToLocal(fileAccess.hasHnadle());
  }, [fileAccess, diagramDoc, diagramStores]);

  const mergeAllWithLocal = useCallback(async () => {
    const nextDiagramDoc = new Y.Doc();
    const provider = newIndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider?.whenSynced;

    const result = await fileAccess.openDiagram(nextDiagramDoc);
    if (!result) {
      nextDiagramDoc.destroy();
      await provider?.destroy();
      return;
    }

    setReady(false);
    try {
      await fileAccess.overwriteDiagramDoc(nextDiagramDoc);
      const nextDiagramStore = newDiagramStore({ ydoc: nextDiagramDoc });
      const nextSheetStore = newSheetStore({ ydoc: nextDiagramDoc });

      const sheets = nextSheetStore.getEntities();
      for (const sheet of sheets) {
        const sheetDoc = new Y.Doc();
        const sheetProvider = newIndexeddbPersistence(sheet.id, sheetDoc);
        await sheetProvider?.whenSynced;
        await fileAccess.openSheet(sheet.id, sheetDoc);
        await fileAccess.overwriteSheetDoc(sheet.id, sheetDoc);
        await sheetProvider?.destroy();
        sheetDoc.destroy();
      }

      if (nextSheetStore.getEntities().length === 0) {
        createInitialSheet(nextSheetStore, generateUuid);
      }

      if (nextSheetStore.getEntityMap()[diagramStores.sheetStore.getSelectedSheet()?.id ?? ""]) {
        nextSheetStore.selectSheet(diagramStores.sheetStore.getSelectedSheet()!.id);
      }

      const sheet = nextSheetStore.getSelectedSheet()!;
      await initSheet(sheet.id);

      setDbProviderDiagram(provider);
      setDiagramDoc(nextDiagramDoc);
      setDiagramStores({ diagramStore: nextDiagramStore, sheetStore: nextSheetStore });
    } finally {
      setReady(true);
    }
  }, [generateUuid, fileAccess, initSheet, diagramStores]);

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
    return newThrottle(
      () => {
        if (!canSyncLocal) return;
        fileAccess.overwriteDiagramDoc(diagramDoc);
      },
      5000,
      true,
    );
  }, [fileAccess, canSyncLocal, diagramDoc]);

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
    if (!canSyncLocal) return;

    diagramDoc.on("update", saveDiagramUpdateThrottle);
    return () => {
      diagramDoc.off("update", saveDiagramUpdateThrottle);
      saveDiagramUpdateThrottle.flush();
    };
  }, [canSyncLocal, saveDiagramUpdateThrottle, diagramDoc]);

  const saveSheetUpdateThrottle = useMemo(() => {
    return newThrottle(
      (sheetId: string) => {
        if (!canSyncLocal) return;
        fileAccess.overwriteSheetDoc(sheetId, sheetDoc);
      },
      5000,
      true,
    );
  }, [fileAccess, canSyncLocal, sheetDoc]);

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
    if (!canSyncLocal) return;

    const fn = () => {
      saveSheetUpdateThrottle(sheetDoc.meta.sheetId);
    };

    sheetDoc.on("update", fn);
    return () => {
      sheetDoc.off("update", fn);
      saveSheetUpdateThrottle.flush();
    };
  }, [canSyncLocal, saveSheetUpdateThrottle, sheetDoc]);

  useEffect(() => {
    initDiagram();
  }, [initDiagram]);

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

  const assetAPI = useMemo<AssetAPI>(() => {
    return {
      enabled: canSyncLocal && fileAccess.hasHnadle(),
      saveAsset: fileAccess.saveAsset,
      loadAsset: fileAccess.loadAsset,
    };
  }, [fileAccess, canSyncLocal]);

  return {
    initSheet,
    initDiagram,
    openDiagramFromLocal,
    clearDiagram,
    undoManager,
    ready,
    savePending,
    saveAllToLocal,
    mergeAllWithLocal,
    canSyncLocal,
    ...diagramStores,
    ...sheetStores,

    assetAPI,
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
  return noIndexedDB ? undefined : new IndexeddbPersistence(key, doc);
}
