import * as Y from "yjs";

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
  getFileNameList: () => Promise<{ root: string[]; assets: string[] } | undefined>;
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
    const files = await srcAccess.getFileNameList();
    if (!files) return;

    const res = await distAccess.openDirectory();
    if (!res) throw new Error("Failed to open target workspace");

    const totalFileCount = files.root.length + files.assets.length;
    let finishedFileCount = 0;

    const handleFinishFile = () => {
      finishedFileCount++;
      onProgress?.(finishedFileCount / totalFileCount);
    };

    for (const name of files.root) {
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

    for (const name of files.assets) {
      const file = await srcAccess.loadAsset(name);
      if (!file) throw new Error(`Failed to open src asset file: ${name}`);
      await distAccess.saveAsset(name, file);
      handleFinishFile();
    }
  } catch (e: any) {
    alert(`Failed to export: ${e.message}`);
  }
}
