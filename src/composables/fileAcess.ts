import * as Y from "yjs";

const DIAGRAM_FILE_NAME = "diagram";

export function newFileAccess() {
  let handle: FileSystemDirectoryHandle | undefined;

  function hasHnadle(): boolean {
    return !!handle;
  }

  async function openDirectory() {
    handle = await getDirectoryHandle();
  }

  async function openDiagram(diagramDoc: Y.Doc): Promise<true | undefined> {
    await openDirectory();
    if (!handle) return;

    for await (const [name, h] of handle as any) {
      if (h.kind === "file" && name === DIAGRAM_FILE_NAME) {
        const update = await readFileAsUnit8Array(h);
        Y.applyUpdate(diagramDoc, update);
        return true;
      }
    }
  }

  async function openSheet(sheetDoc: Y.Doc, sheetId: string): Promise<true | undefined> {
    if (!handle) return;

    const h = await handle.getFileHandle(sheetId, { create: true });
    const update = await readFileAsUnit8Array(h);
    Y.applyUpdate(sheetDoc, update);
    console.log("file sheet: ", sheetId);
    return true;
  }

  async function save(diagramDoc: Y.Doc, sheetDoc: Y.Doc, sheetId: string): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;

    await saveDoc(diagramDoc);
    await saveSheet(sheetDoc, sheetId);
    return true;
  }

  async function saveDoc(diagramDoc: Y.Doc): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;

    const diagramUpdate = Y.encodeStateAsUpdate(diagramDoc);
    const diagramFileHnadle = await handle.getFileHandle(DIAGRAM_FILE_NAME, { create: true });
    await overrideFile(diagramFileHnadle, diagramUpdate);
    return true;
  }

  async function saveSheet(sheetDoc: Y.Doc, sheetId: string): Promise<true | undefined> {
    if (!handle) {
      await openDirectory();
    }
    if (!handle) return;

    const sheetUpdate = Y.encodeStateAsUpdate(sheetDoc);
    const sheetFileHnadle = await handle.getFileHandle(sheetId, { create: true });
    await overrideFile(sheetFileHnadle, sheetUpdate);
    return true;
  }

  return { openDiagram, openSheet, save, hasHnadle, saveDoc, saveSheet };
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

async function overrideFile(handle: FileSystemFileHandle, content: FileSystemWriteChunkType) {
  let writable: FileSystemWritableFileStream | undefined = undefined;

  try {
    writable = await handle.createWritable();
    await writable.write(content);
  } catch (e) {
    // ignore the error caused by not allowing
    if (e instanceof Error && e.message?.includes("not allowed")) return;
    throw e;
  } finally {
    writable?.close();
  }
}

async function readFileAsUnit8Array(handle: FileSystemFileHandle): Promise<Uint8Array> {
  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  const array = new Uint8Array(buffer);
  return array;
}
