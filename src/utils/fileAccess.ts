import * as Y from "yjs";
import { newSheetStore } from "../stores/sheets";

/**
 * Never change these values otherwise workspace structure becomes invalid.
 */
const DOC_FILE_NAME_SUFFIX = ".folly";
export const DIAGRAM_FILE_NAME = `diagram${DOC_FILE_NAME_SUFFIX}`;
export const ASSET_DIRECTORY_NAME = "assets";
export function getSheetFileName(sheetId: string): string {
  return `${sheetId}${DOC_FILE_NAME_SUFFIX}`;
}

export interface FileAccess {
  hasHnadle: () => boolean;
  openDirectory: () => Promise<true | undefined>;
  openDiagram: (diagramDoc: Y.Doc) => Promise<true | undefined>;
  reopenDiagram: (diagramDoc: Y.Doc) => Promise<true | undefined>;
  openSheet: (sheetId: string, sheetDoc: Y.Doc) => Promise<true | undefined>;

  overwriteDiagramDoc: (doc: Y.Doc) => Promise<true | undefined>;
  overwriteSheetDoc: (sheetId: string, doc: Y.Doc) => Promise<true | undefined>;

  saveAsset: (assetId: string, blob: Blob | File) => Promise<void>;
  loadAsset: (assetId: string) => Promise<File | undefined>;

  openDoc: (name: string, doc: Y.Doc) => Promise<true | undefined>;
  getAssetFileNameList: () => Promise<string[] | undefined>;
  mergeDoc: (name: string, doc: Y.Doc) => Promise<void>;

  /**
   * Once the instance is disconnected, it shouldn't be reused.
   * Exception: Local file access can be reused because it can retrieve file handlers itself.
   */
  disconnect: () => Promise<void>;
}

export async function exportWorkspaceToAnother(
  srcAccess: FileAccess,
  distAccess: FileAccess,
  onProgress?: (rate: number) => void,
) {
  try {
    const assetFiles = await srcAccess.getAssetFileNameList();
    if (!assetFiles) return;

    const res = await distAccess.openDirectory();
    if (!res) throw new Error("Failed to open target workspace");

    let sheetIds: string[] = [];
    {
      const diagramDoc = new Y.Doc();
      try {
        const res = await srcAccess.openDoc(DIAGRAM_FILE_NAME, diagramDoc);
        if (!res) throw new Error("Failed to open src diagram file");
        await distAccess.mergeDoc(DIAGRAM_FILE_NAME, diagramDoc);

        const sheetStore = newSheetStore({ ydoc: diagramDoc });
        sheetIds = sheetStore.getEntities().map((s) => s.id);
      } finally {
        diagramDoc.destroy();
      }
    }

    const totalFileCount = sheetIds.length + assetFiles.length + 1;
    let finishedFileCount = 0;

    const handleFinishFile = () => {
      finishedFileCount++;
      onProgress?.(finishedFileCount / totalFileCount);
    };

    // The diagram file has been finished.
    handleFinishFile();

    for (const sheetId of sheetIds) {
      const name = getSheetFileName(sheetId);
      const doc = new Y.Doc();
      try {
        const res = await srcAccess.openDoc(name, doc);
        if (!res) throw new Error(`Failed to open src file: ${name}`);
        await distAccess.mergeDoc(name, doc);
        handleFinishFile();
      } finally {
        doc.destroy();
      }
    }

    // Exporting all files in asset folder rather than narrowing down used ones because it's quite tough.
    for (const name of assetFiles) {
      const file = await srcAccess.loadAsset(name);
      if (!file) throw new Error(`Failed to open src asset file: ${name}`);
      await distAccess.saveAsset(name, file);
      handleFinishFile();
    }
  } catch (e: any) {
    alert(`Failed to export: ${e.message}`);
  }
}

export function isFollySheetFileName(loweredName: string): boolean {
  return loweredName.endsWith(DOC_FILE_NAME_SUFFIX) && loweredName !== DIAGRAM_FILE_NAME;
}

export async function blobToBase64(blob: Blob | File, withURI = false): Promise<string> {
  const fileReader: FileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.readAsBinaryString(blob);
    fileReader.onload = () => {
      const data = btoa(fileReader.result as string);
      const base64 = withURI ? `data:${blob.type};base64,${data}` : data;
      resolve(base64);
    };
    fileReader.onerror = reject;
  });
}

export function base64ToBlob(base64: string, type: string): Blob {
  const bin = atob(base64.replace(/^.*,/, ""));
  const buffer = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i);
  }
  const blob = new Blob([buffer.buffer], { type });
  return blob;
}

export function getBase64Type(base64: string): string {
  const data = base64.match(/^data:(.+);/);
  return data && data[1] ? data[1] : "application/octet-stream";
}
