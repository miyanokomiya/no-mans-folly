import * as Y from "yjs";
import { DIAGRAM_FILE_NAME, FileAccess, getSheetFileName } from "../utils/fileAccess";
import { encodeStateAsUpdateWithGC } from "../utils/yjs";

export function newFileInMemoryAccess(): FileAccess & {
  assetMap: Map<string, Blob | File>;
} {
  const docMap = new Map<string, Uint8Array>();
  const assetMap = new Map<string, Blob | File>();

  function overwriteDoc(name: string, doc: Y.Doc): Promise<true | undefined> {
    const update = encodeStateAsUpdateWithGC(doc);
    docMap.set(name, update);
    return Promise.resolve(true);
  }

  return {
    name: "file-in-memory",
    hasHandle: () => true,
    openDirectory() {
      docMap.clear();
      assetMap.clear();
      return Promise.resolve(true);
    },
    openDiagram(diagramDoc) {
      return this.openDoc(DIAGRAM_FILE_NAME, diagramDoc);
    },
    reopenDiagram(diagramDoc) {
      return this.openDoc(DIAGRAM_FILE_NAME, diagramDoc);
    },
    openSheet(sheetId: string, sheetDoc: Y.Doc) {
      return this.openDoc(getSheetFileName(sheetId), sheetDoc);
    },

    overwriteDiagramDoc(doc) {
      return overwriteDoc(DIAGRAM_FILE_NAME, doc);
    },
    overwriteSheetDoc(sheetId, doc) {
      return overwriteDoc(getSheetFileName(sheetId), doc);
    },

    saveAsset(assetId, blob) {
      assetMap.set(assetId, blob);
      return Promise.resolve();
    },
    loadAsset(assetId) {
      const data = assetMap.get(assetId);
      if (!data || data instanceof File) return Promise.resolve(data);

      const file = new File([data], assetId, { type: data.type });
      return Promise.resolve(file);
    },

    openDoc(name, doc) {
      const data = docMap.get(name);
      if (data) {
        Y.applyUpdate(doc, data);
      }
      return Promise.resolve(true);
    },
    getAssetFileNameList() {
      return Promise.resolve(Array.from(assetMap.keys()));
    },
    async mergeDoc(name: string, doc: Y.Doc) {
      const res0 = await this.openDoc(name, doc);
      if (!res0) return;

      overwriteDoc(name, doc);
    },

    // This object is reusable
    disconnect() {
      docMap.clear();
      assetMap.clear();
      return Promise.resolve();
    },

    assetMap,
  };
}
