import * as Y from "yjs";

const DIAGRAM_FILE_NAME = "diagram.folly";
const ASSET_DIRECTORY_NAME = "assets";

export function newFileAccess() {
  let handle: FileSystemDirectoryHandle | undefined;
  let assetHandle: FileSystemDirectoryHandle | undefined;

  function hasHnadle(): boolean {
    return !!handle;
  }

  async function openDirectory(): Promise<true | undefined> {
    assetHandle = undefined;
    const _handle = await getDirectoryHandle();
    if (_handle) {
      handle = _handle;
      return true;
    }
  }

  async function openAssetDirectory(): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;
    assetHandle = await handle.getDirectoryHandle(ASSET_DIRECTORY_NAME, { create: true });
    return !!assetHandle;
  }

  async function openDoc(name: string, doc: Y.Doc): Promise<true | undefined> {
    if (!handle) return;

    const baseFileHandler = await handle.getFileHandle(name, { create: true });
    const baseUpdate = await readFileAsUnit8Array(baseFileHandler);

    if (baseUpdate) {
      Y.applyUpdate(doc, baseUpdate);
    }

    return true;
  }

  async function openDiagram(diagramDoc: Y.Doc): Promise<true | undefined> {
    await openDirectory();
    if (!handle) return;

    return openDoc(DIAGRAM_FILE_NAME, diagramDoc);
  }

  async function openSheet(sheetId: string, sheetDoc: Y.Doc): Promise<true | undefined> {
    return openDoc(getSheetFileName(sheetId), sheetDoc);
  }

  async function overwriteDoc(name: string, doc: Y.Doc): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;

    const update = Y.encodeStateAsUpdate(doc);
    const fileHandler = await handle.getFileHandle(name, { create: true });
    await writeFile(fileHandler, update);

    return true;
  }

  async function overwriteDiagramDoc(doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(DIAGRAM_FILE_NAME, doc);
  }

  async function overwriteSheetDoc(sheetId: string, doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(getSheetFileName(sheetId), doc);
  }

  async function saveAsset(assetId: string, blob: Blob | File): Promise<void> {
    if (!assetHandle) {
      await openAssetDirectory();
    }
    if (!assetHandle) return;

    const sheetFileHnadle = await assetHandle.getFileHandle(assetId, { create: true });
    await writeFile(sheetFileHnadle, blob);
  }

  async function loadAsset(assetId: string): Promise<File | undefined> {
    if (!assetHandle) {
      await openAssetDirectory();
    }
    if (!assetHandle) return;

    const sheetFileHnadle = await assetHandle.getFileHandle(assetId);
    return await readFile(sheetFileHnadle);
  }

  return {
    hasHnadle,
    openDirectory,
    openDiagram,
    openSheet,

    overwriteDiagramDoc,
    overwriteSheetDoc,

    saveAsset,
    loadAsset,
  };
}

async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    return handle;
  } catch (e) {
    // ignore the error caused by aborting a request
    if (e instanceof Error && e.message?.includes("aborted")) return;
    throw e;
  }
}

async function writeFile(handle: FileSystemFileHandle, content: FileSystemWriteChunkType) {
  let writable: FileSystemWritableFileStream | undefined = undefined;

  try {
    writable = await handle.createWritable();
    await writable.write(content);
  } catch (e) {
    // ignore the error caused by not allowing
    if (e instanceof Error && e.message?.includes("not allowed")) return;
    throw e;
  } finally {
    await writable?.close();
  }
}

async function readFileAsUnit8Array(handle: FileSystemFileHandle): Promise<Uint8Array | undefined> {
  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) return;

  const array = new Uint8Array(buffer);
  return array;
}

async function readFile(handle: FileSystemFileHandle): Promise<File | undefined> {
  const file = await handle.getFile();
  return file;
}

function getSheetFileName(sheetId: string): string {
  return `${sheetId}.folly`;
}
