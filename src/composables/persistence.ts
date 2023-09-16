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

const queryParameters = new URLSearchParams(window.location.search);
const initialSheetIdByQuery = queryParameters.get("sheet") ?? "";

function createInitialDiagram(diagramStore: ReturnType<typeof newDiagramStore>) {
  diagramStore.patchEntity({ id: "default", findex: generateKeyBetween(null, null) });
}

function createInitialSheet(sheetStore: ReturnType<typeof newSheetStore>) {
  const sheetId = "default";
  sheetStore.addEntity({ id: sheetId, findex: generateKeyBetween(null, null), name: "New Sheet" });
  sheetStore.selectSheet(sheetId);
}

export function usePersistence() {
  const fileAcess = useMemo(() => newFileAccess(), []);
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

      if (fileAcess.hasHnadle()) {
        try {
          await fileAcess.openSheet(nextSheetDoc, sheetId);
          await clearIndexeddbPersistence(sheetId);
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
    createInitialDiagram(diagramStore);
    const provider = new IndexeddbPersistence("test-project-diagram", nextDiagramDoc);
    await provider.whenSynced;

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore);
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
    if (!result) return;

    setReady(false);
    await clearIndexeddbPersistence("test-project-diagram");

    const provider = new IndexeddbPersistence("test-project-diagram", nextDiagramDoc);
    await provider.whenSynced;
    const diagramStore = newDiagramStore({ ydoc: nextDiagramDoc });

    const sheetStore = newSheetStore({ ydoc: nextDiagramDoc });
    if (sheetStore.getEntities().length === 0) {
      createInitialSheet(sheetStore);
    }

    const sheet = sheetStore.getSelectedSheet()!;
    await initSheet(sheet.id);

    setDbProviderDiagram(provider);
    setDiagramDoc(nextDiagramDoc);
    setDiagramStores({ diagramStore, sheetStore });
    setReady(true);
  }, [fileAcess]);

  const saveToLocal = useCallback(async () => {
    const sheet = diagramStores.sheetStore.getSelectedSheet();
    if (!sheet) return;

    fileAcess.save(diagramDoc, sheetDoc, sheet.id);
  }, [fileAcess, diagramDoc, sheetDoc, diagramStores]);

  const saveAllToLocal = useCallback(async () => {
    const sheets = diagramStores.sheetStore.getEntities();
    for (const sheet of sheets) {
      const sheetDoc = new Y.Doc();
      const sheetProvider = new IndexeddbPersistence(sheet.id, sheetDoc);
      await sheetProvider.whenSynced;
      await fileAcess.saveSheet(sheetDoc, sheet.id);
    }
    await fileAcess.saveDoc(diagramDoc);
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
    saveToLocal,
    saveAllToLocal,
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
