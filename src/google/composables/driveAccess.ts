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
  let files: GoogleDriveFile[] = [];
  let assetFolderId: string = "";

  function loadClient() {
    // Suppose "gapi" has been loaded.
    gapi.load("client", async () => {
      await gapi.client.init({
        apiKey: process.env.GOOGLE_API_KEY,
        clientId: process.env.GOOGLE_CLIENT_ID,
      });
      gapi.client.setToken({ access_token: token });
      await loadDiagram();
    });
  }

  async function loadDiagram() {
    files = await fetchFilesInFolder();
    const assetFolder = files.find((f) => f.name === ASSET_DIRECTORY_NAME);
    if (assetFolder) {
      assetFolderId = assetFolder.id;
    } else {
      await createFolder(folderId, ASSET_DIRECTORY_NAME);
    }
  }

  async function fetchFilesInFolder(): Promise<GoogleDriveFile[]> {
    if (!token) return [];

    const res = await gapi.client.request({
      path: `${GOOGLE_API_URI}/files?q='${folderId}' in parents and trashed=false`,
    });
    return (res.result?.files ?? []) as GoogleDriveFile[];
  }

  loadClient();

  function hasHnadle(): boolean {
    return !!token;
  }

  async function openDirectory(): Promise<true | undefined> {}

  async function openAssetDirectory(): Promise<true | undefined> {}

  async function openDoc(name: string, doc: Y.Doc): Promise<true | undefined> {}

  async function openDiagram(diagramDoc: Y.Doc): Promise<true | undefined> {}

  async function openSheet(sheetId: string, sheetDoc: Y.Doc): Promise<true | undefined> {}

  async function overwriteDoc(name: string, doc: Y.Doc): Promise<true | undefined> {}

  async function overwriteDiagramDoc(doc: Y.Doc): Promise<true | undefined> {
    if (!token) return;

    const update = Y.encodeStateAsUpdate(doc);
    const name = DIAGRAM_FILE_NAME;
    const data = new Blob([update]);

    const metadata = {
      name,
      mimeType: "application/octet-stream",
      parents: [folderId],
    };

    const request = await postFile(data, metadata);
  }

  async function overwriteSheetDoc(sheetId: string, doc: Y.Doc): Promise<true | undefined> {}

  async function saveAsset(assetId: string, blob: Blob | File): Promise<void> {}

  async function loadAsset(assetId: string): Promise<File | undefined> {}

  async function disconnect() {}

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
  const { boundary, delimiter, close_delim } = getMultipartItems();
  const contentType = metadata.mimeType ?? "application/octet-stream";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " +
    contentType +
    "\r\n\r\n" +
    data +
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
