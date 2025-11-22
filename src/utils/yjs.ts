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

export function uint8ArrayToString(uint8Array: Uint8Array): string {
  let binaryString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

export function stringToUint8Array(data: string): Uint8Array {
  const binaryStringDecoded = atob(data);
  const uint8ArrayDecoded = new Uint8Array(binaryStringDecoded.length);
  for (let i = 0; i < binaryStringDecoded.length; i++) {
    uint8ArrayDecoded[i] = binaryStringDecoded.charCodeAt(i);
  }
  return uint8ArrayDecoded;
}
