import * as Y from "yjs";

export function encodeStateAsUpdateWithGC(doc: Y.Doc): Uint8Array {
  const update = Y.encodeStateAsUpdate(doc);

  // Run "applyUpdate" to activate GC
  const tmp = new Y.Doc();
  Y.applyUpdate(tmp, update);
  const tmpUpdate = Y.encodeStateAsUpdate(tmp);
  tmp.destroy();

  return tmpUpdate;
}
