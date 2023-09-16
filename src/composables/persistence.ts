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

const queryParameters = new URLSearchParams(window.location.search);
const initialSheetIdByQuery = queryParameters.get("sheet") ?? "";

interface PersistenceOption {
  generateUuid: () => string;
}

export function usePersistence(option: PersistenceOption) {
  const fileAcess = useMemo(() => newFileAccess(), []);
  const [canSyncoLocal, setCanSyncToLocal] = useState(false);

  const [diagramDoc, setDiagramDoc] = useState(new Y.Doc());
  const [dbProviderDiagram, setDbProviderDiagram] = useState<IndexeddbPersistence | undefined>();
  const [sheetDoc, setSheetDoc] = useState(new Y.Doc());
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();
  const [ready, setReady] = useState(false);

  const [diagramStores, setDiagramStores] = useState<{
    diagramStore: DiagramStore;
    sheetStore: SheetStore;
  }>({
    diagramStore: newDiagramStore({ ydoc: diagramDoc }),
    sheetStore: newSheetStore({ ydoc: diagramDoc }),
  });

  const [sheetStores, setSheetStores] = useState<{
    layerStore: LayerStore;
    shapeStore: ShapeStore;
    documentStore: DocumentStore;
  }>({
    layerStore: newLayerStore({ ydoc: sheetDoc }),
    shapeStore: newShapeStore({ ydoc: sheetDoc }),
    documentStore: newDocumentStore({ ydoc: sheetDoc }),
  });

  const initSheet = useCallback(
    async (sheetId: string) => {
      const nextSheetDoc = new Y.Doc();
      // Attach sheet id
      // => the doc doens't always refer to selected sheet in the store during swiching sheets.
      nextSheetDoc.meta = { sheetId };

      if (fileAcess.hasHnadle()) {
        try {
          await fileAcess.openSheet(nextSheetDoc, sheetId);
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
    const provider = new IndexeddbPersistence("test-project-diagram", nextDiagramDoc);
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
  }, [fileAcess, initSheet]);

  const openDiagramFromLocal = useCallback(async () => {
    const nextDiagramDoc = new Y.Doc();
    const result = await fileAcess.openDiagram(nextDiagramDoc);
    setCanSyncToLocal(fileAcess.hasHnadle());
    if (!result) return;

    setReady(false);
    await clearIndexeddbPersistence("test-project-diagram");

    const provider = new IndexeddbPersistence("test-project-diagram", nextDiagramDoc);
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
  }, [fileAcess]);

  const saveDiagramToLocal = useCallback(async () => {
    const result = await fileAcess.saveDoc(diagramDoc);
    setCanSyncToLocal(fileAcess.hasHnadle());
    if (result) {
      console.log("Saved: Diagram");
    }
  }, [fileAcess, diagramDoc, sheetDoc, diagramStores]);

  const saveSheetToLocal = useCallback(async () => {
    const sheetId = sheetDoc.meta.sheetId as string;
    const result = await fileAcess.saveSheet(sheetDoc, sheetId);
    setCanSyncToLocal(fileAcess.hasHnadle());
    if (result) {
      console.log("Saved: ", sheetId);
    }
  }, [fileAcess, diagramDoc, sheetDoc, diagramStores]);

  const saveAllToLocal = useCallback(async () => {
    const result = await fileAcess.openDirectory();
    if (!result) return;

    const sheets = diagramStores.sheetStore.getEntities();
    for (const sheet of sheets) {
      const sheetDoc = new Y.Doc();
      const sheetProvider = new IndexeddbPersistence(sheet.id, sheetDoc);
      await sheetProvider.whenSynced;
      await fileAcess.saveSheet(sheetDoc, sheet.id);
    }
    await fileAcess.saveDoc(diagramDoc);
    setCanSyncToLocal(fileAcess.hasHnadle());
  }, [fileAcess, diagramDoc, diagramStores]);

  const undoManager = useMemo(() => {
    return new Y.UndoManager(
      // Must be ones in the same Y.Doc
      Object.values(sheetStores ?? []).map((s) => s.getScope()),
      {
        captureTimeout: 0,
      }
    );
  }, [sheetStores]);

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

  return {
    initSheet,
    initDiagram,
    openDiagramFromLocal,
    undoManager,
    ready,
    saveDiagramToLocal,
    saveSheetToLocal,
    saveAllToLocal,
    canSyncoLocal,
    ...diagramStores,
    ...sheetStores,
  };
}

async function clearIndexeddbPersistence(name: string) {
  const tmpDoc = new Y.Doc();
  const tmpProvider = new IndexeddbPersistence(name, tmpDoc);
  await tmpProvider.clearData();
  await tmpProvider.destroy();
  tmpDoc.destroy();
}

interface AutoSaveOption {
  diagramStore: DiagramStore;
  sheetStore: SheetStore;
  layerStore: LayerStore;
  shapeStore: ShapeStore;
  documentStore: DocumentStore;
  enable: boolean;
  saveSheetToLocal: () => Promise<void>;
  saveDiagramToLocal: () => Promise<void>;
  onSave?: () => void;
}

export function useAutoSave({
  diagramStore,
  sheetStore,
  layerStore,
  shapeStore,
  documentStore,
  enable,
  saveSheetToLocal,
  saveDiagramToLocal,
  onSave,
}: AutoSaveOption) {
  const [wait, setWait] = useState(false);

  const saveDiagram = useCallback(async () => {
    if (!enable) return;
    await saveDiagramToLocal();
    setWait(false);
    onSave?.();
  }, [enable, saveDiagramToLocal, onSave]);

  const saveDiagramThrottled = useMemo(() => {
    setWait(true);
    return newThrottle(saveDiagram, 5000);
  }, [saveDiagram]);

  useEffect(() => {
    return diagramStore.watch(() => {
      saveDiagramThrottled();
    });
  }, [diagramStore, saveDiagramThrottled]);

  useEffect(() => {
    return sheetStore.watch(() => {
      saveDiagramThrottled();
    });
  }, [sheetStore, saveDiagramThrottled]);

  const saveSheet = useCallback(async () => {
    if (!enable) return;
    await saveSheetToLocal();
    setWait(false);
    onSave?.();
  }, [enable, saveSheetToLocal, onSave]);

  const saveSheetThrottled = useMemo(() => {
    setWait(true);
    return newThrottle(saveSheet, 5000);
  }, [saveSheet]);

  useEffect(() => {
    return layerStore.watch(() => {
      saveSheetThrottled();
    });
  }, [layerStore, saveSheetThrottled]);

  useEffect(() => {
    return shapeStore.watch(() => {
      saveSheetThrottled();
    });
  }, [shapeStore, saveSheetThrottled]);

  useEffect(() => {
    return documentStore.watch(() => {
      saveSheetThrottled();
    });
  }, [documentStore, saveSheetThrottled]);

  const flush = useCallback(async () => {
    const shouldSaveDiagram = saveDiagramThrottled.clear();
    const shouldSaveSheet = saveSheetThrottled.clear();
    if (shouldSaveDiagram) {
      await saveDiagram();
    }
    if (shouldSaveSheet) {
      await saveSheet();
    }
  }, [saveDiagramThrottled, saveSheetThrottled, saveDiagram, saveSheet]);

  return { wait, flush };
}

function createInitialDiagram(diagramStore: DiagramStore, generateUuid: () => string) {
  diagramStore.patchEntity({ id: generateUuid(), findex: generateKeyBetween(null, null) });
}

function createInitialSheet(sheetStore: SheetStore, generateUuid: () => string) {
  const sheetId = generateUuid();
  sheetStore.addEntity({ id: sheetId, findex: generateKeyBetween(null, null), name: "New Sheet" });
  sheetStore.selectSheet(sheetId);
}
