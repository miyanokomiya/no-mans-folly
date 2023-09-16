import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useMemo, useState } from "react";
import { newDiagramStore } from "../stores/diagram";
import { newSheetStore } from "../stores/sheets";
import { newLayerStore } from "../stores/layers";
import { newShapeStore } from "../stores/shapes";
import { newDocumentStore } from "../stores/documents";
import { getSheetURL } from "../utils/route";
import { generateKeyBetween } from "fractional-indexing";

const queryParameters = new URLSearchParams(window.location.search);
const initialSheetIdByQuery = queryParameters.get("sheet");

export function usePersistence() {
  const diagramDoc = useMemo(() => {
    return new Y.Doc();
  }, []);

  const dbProviderDiagram = useMemo(() => {
    const provider = new IndexeddbPersistence("test-project-diagram", diagramDoc);
    return provider;
  }, [diagramDoc]);

  const [sheetDoc, setSheetDoc] = useState(new Y.Doc());
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();

  const { diagramStore, sheetStore } = useMemo(() => {
    const diagramStore = newDiagramStore({ ydoc: diagramDoc });
    createInitialDiagram(diagramStore);
    const sheetStore = newSheetStore({ ydoc: diagramDoc });
    return { diagramStore, sheetStore };
  }, [diagramDoc]);

  const { layerStore, shapeStore, documentStore } = useMemo(() => {
    const layerStore = newLayerStore({ ydoc: sheetDoc });
    const shapeStore = newShapeStore({ ydoc: sheetDoc });
    const documentStore = newDocumentStore({ ydoc: sheetDoc });
    return { layerStore, shapeStore, documentStore };
  }, [sheetDoc]);

  const undoManager = useMemo(() => {
    return new Y.UndoManager(
      // Must be ones in the same Y.Doc
      [layerStore.getScope(), shapeStore.getScope(), documentStore.getScope()],
      {
        captureTimeout: 0,
      }
    );
  }, [layerStore, shapeStore, documentStore]);

  useEffect(() => {
    const sheet = sheetStore.getSelectedSheet();
    if (!sheet) return;

    setDbProviderSheet(new IndexeddbPersistence(sheet.id, sheetDoc));

    return () => {
      undoManager.destroy();
      sheetDoc.destroy();
    };
  }, [sheetDoc, undoManager, sheetStore]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    return sheetStore.watchSelected(() => {
      setReady(false);
      setSheetDoc(new Y.Doc());
    });
  }, [sheetStore]);

  useEffect(() => {
    if (!dbProviderSheet) return;

    const onSheetLoaded = () => {
      const sheet = sheetStore.getSelectedSheet();
      if (!sheet) return;

      console.log("content from the database is loaded: sheet ", sheet.id);
      history.replaceState(null, "", getSheetURL(sheet.id));
      setReady(true);
    };
    dbProviderSheet.on("synced", onSheetLoaded);
    return () => dbProviderSheet.off("synced", onSheetLoaded);
  }, [sheetStore, dbProviderSheet]);

  useEffect(() => {
    const onLoadDiagram = () => {
      console.log("content from the database is loaded: diagram");
      const sheetId = initialSheetIdByQuery;
      if (sheetId) {
        sheetStore.selectSheet(sheetId);
      } else if (sheetStore.getEntities().length === 0) {
        createInitialSheet(sheetStore);
      } else {
        sheetStore.selectSheet(sheetStore.getEntities()[0].id);
      }
    };
    dbProviderDiagram.on("synced", onLoadDiagram);
    return () => dbProviderDiagram.off("synced", onLoadDiagram);
  }, [dbProviderDiagram, sheetStore]);

  return {
    diagramStore,
    sheetStore,
    layerStore,
    shapeStore,
    documentStore,
    undoManager,
    ready,
  };
}

function createInitialDiagram(diagramStore: ReturnType<typeof newDiagramStore>) {
  diagramStore.patchEntity({ id: "default", findex: generateKeyBetween(null, null) });
}

function createInitialSheet(sheetStore: ReturnType<typeof newSheetStore>) {
  const sheetId = "default";
  sheetStore.addEntity({ id: sheetId, findex: generateKeyBetween(null, null), name: "New Sheet" });
  sheetStore.selectSheet(sheetId);
}
