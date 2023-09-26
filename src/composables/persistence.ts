import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagramStore, newDiagramStore } from "../stores/diagram";
import { SheetStore, newSheetStore } from "../stores/sheets";
import { LayerStore, newLayerStore } from "../stores/layers";
import { ShapeStore, newShapeStore } from "../stores/shapes";
import { DocumentStore, newDocumentStore } from "../stores/documents";
import { generateKeyBetween } from "fractional-indexing";
import { newFileAccess } from "./fileAcess";
import { newThrottle } from "./throttle";

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
}

export function usePersistence(option: PersistenceOption) {
  const fileAcess = useMemo(() => newFileAccess(), []);
  const [canSyncoLocal, setCanSyncToLocal] = useState(false);

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

      if (fileAcess.hasHnadle()) {
        try {
          await fileAcess.openSheet(sheetId, nextSheetDoc);
          await clearIndexeddbPersistence(sheetId);
          setCanSyncToLocal(fileAcess.hasHnadle());
        } catch (e) {
          console.log("Failed to load local sheet: ", sheetId, e);
        }
      }

      const sheetProvider = new IndexeddbPersistence(sheetId, nextSheetDoc);
      await sheetProvider.whenSynced;

      setDbProviderSheet(sheetProvider);
      setSheetDoc(nextSheetDoc);
      setSheetStores({
        layerStore: newLayerStore({ ydoc: nextSheetDoc }),
        shapeStore: newShapeStore({ ydoc: nextSheetDoc }),
        documentStore: newDocumentStore({ ydoc: nextSheetDoc }),
      });
    },
    [fileAcess]
  );

  const initDiagram = useCallback(async () => {
    setReady(false);
    const nextDiagramDoc = new Y.Doc();
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });
    createInitialDiagram(diagramStore, option.generateUuid);
    const provider = new IndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider.whenSynced;

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, option.generateUuid);
    }

    const sheet = sheetStore.getEntityMap()[initialSheetIdByQuery] ?? sheetStore.getSelectedSheet()!;
    sheetStore.selectSheet(sheet.id);
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [fileAcess, diagramStores, initSheet]);

  const openDiagramFromLocal = useCallback(async () => {
    const nextDiagramDoc = new Y.Doc();
    const result = await fileAcess.openDiagram(nextDiagramDoc);
    setCanSyncToLocal(fileAcess.hasHnadle());
    if (!result) return;

    setReady(false);
    await clearIndexeddbPersistence(DIAGRAM_KEY);

    const provider = new IndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider.whenSynced;
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore, option.generateUuid);
    }

    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [fileAcess, initSheet]);

  const saveAllToLocal = useCallback(async () => {
    if (!diagramStores) return;

    const result = await fileAcess.openDirectory();
    if (!result) return;

    const sheets = diagramStores.sheetStore.getEntities();
    for (const sheet of sheets) {
      const sheetDoc = new Y.Doc();
      const sheetProvider = new IndexeddbPersistence(sheet.id, sheetDoc);
      await sheetProvider.whenSynced;
      await fileAcess.overwriteSheetDoc(sheet.id, sheetDoc);
      await sheetProvider.destroy();
      sheetDoc.destroy();
    }
    await fileAcess.overwriteDiagramDoc(diagramDoc);
    setCanSyncToLocal(fileAcess.hasHnadle());
  }, [fileAcess, diagramDoc, diagramStores]);

  const mergeAllWithLocal = useCallback(async () => {
    const nextDiagramDoc = new Y.Doc();
    const provider = new IndexeddbPersistence(DIAGRAM_KEY, nextDiagramDoc);
    await provider.whenSynced;

    const result = await fileAcess.openDiagram(nextDiagramDoc);
    if (!result) {
      nextDiagramDoc.destroy();
      await provider.destroy();
      return;
    }

    setReady(false);
    try {
      await fileAcess.overwriteDiagramDoc(nextDiagramDoc);
      const nextDiagramStore = newDiagramStore({ ydoc: nextDiagramDoc });
      const nextSheetStore = newSheetStore({ ydoc: nextDiagramDoc });

      const sheets = nextSheetStore.getEntities();
      for (const sheet of sheets) {
        const sheetDoc = new Y.Doc();
        const sheetProvider = new IndexeddbPersistence(sheet.id, sheetDoc);
        await sheetProvider.whenSynced;
        await fileAcess.openSheet(sheet.id, sheetDoc);
        await fileAcess.overwriteSheetDoc(sheet.id, sheetDoc);
        await sheetProvider.destroy();
        sheetDoc.destroy();
      }

      if (nextSheetStore.getEntities().length === 0) {
        createInitialSheet(nextSheetStore, option.generateUuid);
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
  }, [fileAcess, initSheet, diagramStores]);

  const undoManager = useMemo(() => {
    return new Y.UndoManager(
      // Must be ones in the same Y.Doc
      Object.values(sheetStores ?? []).map((s) => s.getScope()),
      {
        captureTimeout: 0,
      }
    );
  }, [sheetStores]);

  const saveDiagramUpdateThrottle = useMemo(() => {
    return newThrottle(
      () => {
        if (!canSyncoLocal) return;
        fileAcess.overwriteDiagramDoc(diagramDoc);
      },
      5000,
      true
    );
  }, [fileAcess, canSyncoLocal, diagramDoc]);

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
    if (!canSyncoLocal) return;

    diagramDoc.on("update", saveDiagramUpdateThrottle);
    return () => {
      diagramDoc.off("update", saveDiagramUpdateThrottle);
      saveDiagramUpdateThrottle.flush();
    };
  }, [canSyncoLocal, saveDiagramUpdateThrottle, diagramDoc]);

  const saveSheetUpdateThrottle = useMemo(() => {
    return newThrottle(
      (sheetId: string) => {
        if (!canSyncoLocal) return;
        fileAcess.overwriteSheetDoc(sheetId, sheetDoc);
      },
      5000,
      true
    );
  }, [fileAcess, canSyncoLocal, sheetDoc]);

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
    if (!canSyncoLocal) return;

    const fn = () => {
      saveSheetUpdateThrottle(sheetDoc.meta.sheetId);
    };

    sheetDoc.on("update", fn);
    return () => {
      sheetDoc.off("update", fn);
      saveSheetUpdateThrottle.flush();
    };
  }, [canSyncoLocal, saveSheetUpdateThrottle, sheetDoc]);

  useEffect(() => {
    initDiagram();
  }, []);

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

  const getAssetAPI = useMemo<() => AssetAPI>(() => {
    return () => ({
      enabled: fileAcess.hasHnadle(),
      saveAsset: fileAcess.saveAsset,
      loadAsset: fileAcess.loadAsset,
    });
  }, [fileAcess]);

  return {
    initSheet,
    initDiagram,
    openDiagramFromLocal,
    undoManager,
    ready,
    savePending,
    saveAllToLocal,
    mergeAllWithLocal,
    canSyncoLocal,
    ...diagramStores,
    ...sheetStores,

    getAssetAPI,
  };
}

async function clearIndexeddbPersistence(name: string) {
  const tmpDoc = new Y.Doc();
  const tmpProvider = new IndexeddbPersistence(name, tmpDoc);
  await tmpProvider.clearData();
  await tmpProvider.destroy();
  tmpDoc.destroy();
}

function createInitialDiagram(diagramStore: DiagramStore, generateUuid: () => string) {
  diagramStore.patchEntity({ id: generateUuid(), findex: generateKeyBetween(null, null) });
}

function createInitialSheet(sheetStore: SheetStore, generateUuid: () => string) {
  const sheetId = generateUuid();
  sheetStore.addEntity({ id: sheetId, findex: generateKeyBetween(null, null), name: "New Sheet" });
  sheetStore.selectSheet(sheetId);
}
