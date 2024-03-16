import * as Y from "yjs";
import { FileAccess } from "../../composables/fileAcess";
import { GoogleDriveFile } from "../types";
import { ASSET_DIRECTORY_NAME, DIAGRAM_FILE_NAME } from "../../models/file";

const GOOGLE_API_URI = "https://www.googleapis.com/drive/v3";

interface Props {
  folderId: string;
  token: string;
}

export function newDriveAccess({ folderId, token }: Props): FileAccess {
  let files: GoogleDriveFile[] | undefined;

  async function loadClient() {
    return new Promise<void>((resolve, reject) => {
      // Suppose "gapi" has been loaded.
      // => It's been loaded along with Google Drive Picker.
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            apiKey: process.env.GOOGLE_API_KEY,
            clientId: process.env.GOOGLE_CLIENT_ID,
          });
          gapi.client.setToken({ access_token: token });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async function loadDiagram() {
    await loadClient();
    files = await fetchFilesInFolder();

    const assetFolder = files.find((f) => f.name === ASSET_DIRECTORY_NAME);
    if (!assetFolder) {
      const res = await createFolder(folderId, ASSET_DIRECTORY_NAME);
      if (res.status === 200) {
        const file = res.result as GoogleDriveFile;
        files ??= [];
        files.push(file);
      }
    }
  }

  async function fetchFilesInFolder(): Promise<GoogleDriveFile[]> {
    if (!token) return [];

    const res = await gapi.client.request({
      path: `${GOOGLE_API_URI}/files?q='${folderId}' in parents and trashed=false`,
    });
    return (res.result?.files ?? []) as GoogleDriveFile[];
  }

  function hasHnadle(): boolean {
    return !!files;
  }

  async function openDirectory(): Promise<true | undefined> {
    await loadDiagram();
    return true;
  }

  async function openDoc(id: string, doc: Y.Doc): Promise<true | undefined> {
    if (!hasHnadle()) return;

    const file = files?.find((f) => f.name === id);
    if (!file) return;

    const blob = await getFile(file.id);
    const buffer = await blob.arrayBuffer();
    if (buffer.byteLength > 0) {
      const baseUpdate = new Uint8Array(buffer);
      Y.applyUpdate(doc, baseUpdate);
    }
    return true;
  }

  async function openDiagram(diagramDoc: Y.Doc): Promise<true | undefined> {
    await openDirectory();
    if (!hasHnadle()) return;

    const file = files?.find((f) => f.name === DIAGRAM_FILE_NAME);
    if (!file) {
      return await overwriteDiagramDoc(diagramDoc);
    } else {
      return await openDoc(DIAGRAM_FILE_NAME, diagramDoc);
    }
  }

  async function openSheet(sheetId: string, sheetDoc: Y.Doc): Promise<true | undefined> {
    return openDoc(sheetId, sheetDoc);
  }

  async function overwriteDoc(id: string, doc: Y.Doc): Promise<true | undefined> {
    if (!hasHnadle()) return;

    const update = Y.encodeStateAsUpdate(doc);
    const name = id;
    const data = new Blob([update]);

    const metadata = {
      name,
      mimeType: "application/octet-stream",
    };

    const file = files?.find((f) => f.name === id);
    if (file) {
      const res = await patchFile(file.id, data, metadata);
      if (res.status === 200) return true;
    } else {
      const res = await postFile(data, { ...metadata, parents: [folderId] });
      if (res.status === 200) {
        const file = res.result as GoogleDriveFile;
        files ??= [];
        files.push(file);
        return true;
      }
    }
  }

  async function overwriteDiagramDoc(doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(DIAGRAM_FILE_NAME, doc);
  }

  async function overwriteSheetDoc(sheetId: string, doc: Y.Doc): Promise<true | undefined> {
    return overwriteDoc(sheetId, doc);
  }

  async function saveAsset(assetId: string, blob: Blob | File): Promise<void> {
    if (!hasHnadle()) return;

    const assetFolder = files?.find((f) => f.name === ASSET_DIRECTORY_NAME);
    if (!assetFolder) return;

    const name = assetId;
    const data = blob;

    const metadata = {
      name,
      mimeType: blob.type,
      parents: [assetFolder.id],
    };

    await postFile(data, metadata);
  }

  async function loadAsset(assetId: string): Promise<File | undefined> {
    if (!hasHnadle()) return;

    const file = files?.find((f) => f.name === assetId);
    if (!file) return;

    const blob = await getFile(file.id);
    return new File([blob], assetId, { type: blob.type });
  }

  async function disconnect() {
    files = undefined;
  }

  async function getFile(fileId: string): Promise<Blob> {
    // "gapi.client.request" can't return Blob body.
    const res = await fetch(`${GOOGLE_API_URI}/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await res.blob();
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

    disconnect,
  };
}

async function postFile(data: Blob, metadata: { [key: string]: any }) {
  const base64 = await blobToBase64(data);
  const { boundary, delimiter, close_delim } = getMultipartItems();
  const contentType = metadata.mimeType ?? "application/octet-stream";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " +
    contentType +
    "\r\n" +
    "Content-Transfer-Encoding: base64" +
    "\r\n\r\n" +
    base64 +
    close_delim;

  return gapi.client.request({
    path: "/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "multipart" },
    headers: {
      "Content-Type": 'multipart/related; boundary="' + boundary + '"',
    },
    body: multipartRequestBody,
  });
}

async function patchFile(googleFileId: string, data: Blob, metadata: { [key: string]: any }) {
  const base64 = await blobToBase64(data);
  const { boundary, delimiter, close_delim } = getMultipartItems();
  const contentType = metadata.mimeType ?? "application/octet-stream";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " +
    contentType +
    "\r\n" +
    "Content-Transfer-Encoding: base64" +
    "\r\n\r\n" +
    base64 +
    close_delim;

  return gapi.client.request({
    path: `/upload/drive/v3/files/${googleFileId}`,
    method: "PATCH",
    params: { uploadType: "multipart" },
    headers: {
      "Content-Type": 'multipart/related; boundary="' + boundary + '"',
    },
    body: multipartRequestBody,
  });
}

async function createFolder(parentFolderId: string, folderName: string) {
  const { boundary, delimiter, close_delim } = getMultipartItems();
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],
  };
  const multipartRequestBody =
    delimiter + "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata) + close_delim;

  return gapi.client.request({
    path: "/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "multipart" },
    headers: {
      "Content-Type": 'multipart/related; boundary="' + boundary + '"',
    },
    body: multipartRequestBody,
  });
}

function getMultipartItems() {
  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";
  return { boundary, delimiter, close_delim };
}

function blobToBase64(blob: Blob): Promise<string> {
  const fileReader: FileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.readAsBinaryString(blob);
    fileReader.onload = () => resolve(btoa(fileReader.result as string));
    fileReader.onerror = reject;
  });
}
