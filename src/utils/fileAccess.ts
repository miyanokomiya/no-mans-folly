import * as Y from "yjs";

/**
 * Never change these values otherwise workspace structure becomes invalid.
 */
const DOC_FILE_NAME_SUFFIX = ".folly";
export const DIAGRAM_FILE_NAME = `diagram${DOC_FILE_NAME_SUFFIX}`;
export const ASSET_DIRECTORY_NAME = "assets";
const SHEET_THUMBNAIL_PREFIX = "sheet_";
export function getSheetFileName(sheetId: string): string {
  return `${sheetId}${DOC_FILE_NAME_SUFFIX}`;
}
export function getSheetThumbnailFileName(sheetId: string): string {
  return `${SHEET_THUMBNAIL_PREFIX}${sheetId}.svg`;
}
export function getSheetIdFromThumbnailFileName(fileName: string): string | undefined {
  if (!fileName.startsWith(SHEET_THUMBNAIL_PREFIX) || !fileName.endsWith(".svg")) {
    return;
  }
  return fileName.slice(SHEET_THUMBNAIL_PREFIX.length, -4);
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

export function blobToText(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
