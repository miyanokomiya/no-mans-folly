import * as Y from "yjs";
import { FileAccess, ASSET_DIRECTORY_NAME, DIAGRAM_FILE_NAME, getSheetFileName } from "../utils/fileAccess";
import { encodeStateAsUpdateWithGC } from "../utils/yjs";
import { newSheetStore } from "../stores/sheets";

let hasMoveAPI = true;

export function newFileAccess(): FileAccess {
  let handle: FileSystemDirectoryHandle | undefined;
  let assetHandle: FileSystemDirectoryHandle | undefined;

  function hasHandle(): boolean {
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

  async function openAssetDirectory(ifPossible?: boolean): Promise<true | undefined> {
    if (!handle && !ifPossible) {
      await openDirectory();
    }
    if (!handle) return;
    assetHandle = await handle.getDirectoryHandle(ASSET_DIRECTORY_NAME, { create: true });
    return !!assetHandle;
  }

  async function getAssetFileNameList(): Promise<string[] | undefined> {
    if (!assetHandle) {
      await openAssetDirectory();
    }
    if (!assetHandle) return;

    const assets: string[] = [];
    for await (const entry of (assetHandle as any).values()) {
      if (entry.kind === "file") {
        assets.push(entry.name);
      }
    }

    return assets;
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

    const res = await openDoc(DIAGRAM_FILE_NAME, diagramDoc);
    if (!res) {
      return overwriteDiagramDoc(diagramDoc);
    } else {
      return res;
    }
  }

  async function reopenDiagram(diagramDoc: Y.Doc): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;

    const res = await openDoc(DIAGRAM_FILE_NAME, diagramDoc);
    if (!res) {
      return overwriteDiagramDoc(diagramDoc);
    } else {
      return res;
    }
  }

  async function openSheet(sheetId: string, sheetDoc: Y.Doc): Promise<true | undefined> {
    return openDoc(getSheetFileName(sheetId), sheetDoc);
  }

  async function overwriteDoc(name: string, doc: Y.Doc): Promise<true | undefined> {
    return navigator.locks.request(`save-doc-${name}`, async () => {
      if (!handle) {
        await openDirectory();
      }
      if (!handle) return;

      const update = encodeStateAsUpdateWithGC(doc);
      await writeFileBySwap(handle, name, update as unknown as ArrayBuffer);

      return true;
    });
  }

  async function overwriteDiagramDoc(doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(DIAGRAM_FILE_NAME, doc);
  }

  async function overwriteSheetDoc(sheetId: string, doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(getSheetFileName(sheetId), doc);
  }

  async function mergeDoc(name: string, doc: Y.Doc): Promise<void> {
    if (!handle) throw new Error(`No file handler: ${name}`);

    const res0 = await openDoc(name, doc);
    if (!res0) throw new Error(`Failed to open file: ${name}`);

    const res1 = await overwriteDoc(name, doc);
    if (!res1) throw new Error(`Failed to save file: ${name}`);
  }

  async function saveAsset(assetId: string, blob: Blob | File, ifPossible?: boolean): Promise<void> {
    if (!assetHandle) {
      if (ifPossible) return;

      await openAssetDirectory();
    }
    if (!assetHandle) return;

    const sheetFileHnadle = await assetHandle.getFileHandle(assetId, { create: true });
    return navigator.locks.request(`save-asset-${assetId}`, async () => {
      await writeFile(sheetFileHnadle, blob);
    });
  }

  async function loadAsset(assetId: string, ifPossible?: boolean): Promise<File | undefined> {
    if (!assetHandle) {
      await openAssetDirectory(ifPossible);
    }
    if (!assetHandle) return;

    const sheetFileHnadle = await assetHandle.getFileHandle(assetId);
    return await readFile(sheetFileHnadle);
  }

  async function disconnect() {
    handle = undefined;
    assetHandle = undefined;
  }

  return {
    name: "file-system",
    hasHandle,
    openDirectory,
    openDiagram,
    reopenDiagram,
    openSheet,

    overwriteDiagramDoc,
    overwriteSheetDoc,

    saveAsset,
    loadAsset,

    openDoc,
    getAssetFileNameList,
    mergeDoc,

    disconnect,
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
    // ignore the error caused by not allowed
    if (e instanceof Error && e.message?.includes("not allowed")) return;
    throw e;
  } finally {
    await writable?.close();
  }
}

/**
 * Create temporary swap file, delete the target file, then rename the swap file to the target file.
 */
async function writeFileBySwap(dirHandle: FileSystemDirectoryHandle, name: string, content: FileSystemWriteChunkType) {
  const swapName = `${name}.swap`;

  const swapFileHandler = await dirHandle.getFileHandle(swapName, { create: true });
  await writeFile(swapFileHandler, content);

  try {
    if (hasMoveAPI) {
      try {
        // Since this method is quite a newly one, only Chrome supports it.
        // => Fallback to overwriting way when it fails.
        await (swapFileHandler as any).move(name);
      } catch {
        hasMoveAPI = false;
      }
    }

    if (!hasMoveAPI) {
      const fileHandler = await dirHandle.getFileHandle(name, { create: true });
      await writeFile(fileHandler, content);
      await dirHandle.removeEntry(swapName);
    }
  } catch (e) {
    // ignore the error caused by not allowed
    if (e instanceof Error && e.message?.includes("not allowed")) return;
    throw e;
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
