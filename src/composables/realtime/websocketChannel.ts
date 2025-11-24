import * as Y from "yjs";
import { RealtimeHandler, RTMessageData } from "./core";
import { encodeStateAsUpdateWithGC, stringToUint8Array, uint8ArrayToString } from "../../utils/yjs";
import { newCallback } from "../../utils/stateful/reactives";
import { base64ToBlob, blobToBase64 } from "../../utils/fileAccess";

const WS_ENDPOINT = process.env.API_HOST!.replace(/^http(s?):/, "ws$1:") + "ws";
export const WS_UPDATE_ORIGIN = "ws-update";
// This is used to idenfity if the message is originated by this client
let connectionId: string | undefined = undefined;

export type WSClient = { client: WebSocket; id: string; count: number };
let client: WSClient | undefined;
export const websocketCallback = newCallback<WSClient | undefined>();
export const websocketAssetCallback = newCallback<{ id: string; asset: Blob }>();
const messageCallback = newCallback<MessageEvent>();

function setClient(val: WSClient | undefined) {
  client = val;
  websocketCallback.dispatch(client as any);
}

export function getWebsocketClient(): WSClient | undefined {
  return client;
}

export async function initWSClient(props: { canHost: boolean; roomId: string; onClose?: () => void }) {
  closeWSClient();
  const encodedRoomId = encodeURI(props.roomId);
  const preClient = new WebSocket(`${WS_ENDPOINT}/rooms/${encodedRoomId}?canHost=${props.canHost ? 1 : 0}`);

  return new Promise<void>((resolve, reject) => {
    preClient?.addEventListener("error", reject);
    if (props.onClose) {
      preClient?.addEventListener("close", () => {
        setClient(undefined);
      });
    }
    preClient?.addEventListener(
      "open",
      () => {
        preClient?.removeEventListener("error", reject);
        const nextClient = { client: preClient, id: props.roomId, count: 0 };
        setClient(nextClient);
        websocketCallback.dispatch(nextClient);
        preClient.addEventListener("message", messageCallback.dispatch);
        resolve();
      },
      { once: true },
    );
  });
}

export function closeWSClient() {
  if (!client) return;

  connectionId = undefined;
  client.client.removeEventListener("message", messageCallback.dispatch);
  client.client.close();
  setClient(undefined);
}

function addMeesageHandler(h: (e: MessageEvent) => void) {
  messageCallback.bind(h);
}

function removeMeesageHandler(h: (e: MessageEvent) => void) {
  messageCallback.unbind(h);
}

export function postWSMessage(data: RTMessageData) {
  // Needless to initialize the client unless listening
  client?.client.send(JSON.stringify(data));
}

/**
 * - Synchronize diagrams regardless of their IDs.
 * - Synchronize sheets having the same ID.
 */
export const newWSChannel: RealtimeHandler = (props) => {
  let closed = false;

  function onDiagramUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === WS_UPDATE_ORIGIN) return;

    postWSMessage({
      type: "diagram-update",
      id: props.diagramDoc.meta.diagramId,
      update: uint8ArrayToString(update),
    } as RTMessageData);
  }
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === WS_UPDATE_ORIGIN) return;

    postWSMessage({
      type: "sheet-update",
      id: props.sheetDoc.meta.sheetId,
      update: uint8ArrayToString(update),
    } as RTMessageData);
  }
  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  async function onMessage(e: MessageEvent) {
    if (closed || !client) return;

    const data = JSON.parse(e.data) as RTMessageData;

    // Preparation events
    switch (data.type) {
      case "initial": {
        connectionId = data.id;
        requestDiagramSync(props.diagramDoc.meta.diagramId, encodeStateAsUpdateWithGC(props.diagramDoc));
        return;
      }
      case "room": {
        setClient({ ...client, count: data.count });
        return;
      }
    }

    // Other events should wait for "connectionId"
    if (!connectionId) return;

    switch (data.type) {
      case "diagram-sync-req": {
        if (!data.update) return;

        if (data.id === props.diagramDoc.meta.diagramId) {
          // Merge the requester's diagram
          Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update));
          // Broadcast as an usual diagram update
          postWSMessage({
            type: "diagram-update",
            id: props.diagramDoc.meta.diagramId,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
            author: data.sender,
          } as RTMessageData);
        } else {
          // Discard the requester's diagram
          postWSMessage({
            type: "diagram-open",
            id: props.diagramDoc.meta.diagramId,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
            author: data.sender,
          } as RTMessageData);
        }
        return;
      }
      case "diagram-open": {
        if (!data.update) return;
        if (data.author !== connectionId) return;

        props.openDiagram(stringToUint8Array(data.update));
        return;
      }
      case "diagram-update": {
        if (data.update) {
          Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);

          // Request to sync current sheet if this update comes for the diagram sync
          if (data.author === connectionId) {
            requestSheetSync(props.sheetDoc.meta.sheetId, Y.encodeStateAsUpdate(props.sheetDoc));
          }
        }
        return;
      }
      case "sheet-sync-req": {
        if (!data.update) return;

        const isCurrentSheet = props.sheetDoc.meta.sheetId === data.id;
        const sheet = isCurrentSheet ? props.sheetDoc : await props.loadSheet(data.id);
        Y.applyUpdate(sheet, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);

        // Broadcast as an usual sheet update
        postWSMessage({
          type: "sheet-update",
          id: data.id,
          update: uint8ArrayToString(Y.encodeStateAsUpdate(sheet)),
          author: data.sender,
        } as RTMessageData);

        if (!isCurrentSheet) {
          sheet.destroy();
        }
        return;
      }
      case "sheet-update": {
        if (!data.update) return;

        if (data.id === props.sheetDoc.meta.sheetId) {
          Y.applyUpdate(props.sheetDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        } else {
          props.saveSheet(data.id, stringToUint8Array(data.update));
        }
        return;
      }
      case "asset-req": {
        if (!props.assetAPI.enabled) return;

        const file = await props.assetAPI.loadAsset(data.id);
        if (!file) return;

        const asset = await blobToBase64(file);
        postWSMessage({
          type: "asset-res",
          id: data.id,
          asset,
          fileType: file.type,
          author: data.sender,
        } as RTMessageData);
        return;
      }
      case "asset-res": {
        if (!props.assetAPI.enabled || !data.asset || !data.fileType) return;

        const asset = base64ToBlob(data.asset, data.fileType);
        await props.assetAPI.saveAsset(data.id, asset);
        websocketAssetCallback.dispatch({ id: data.id, asset });
      }
    }
  }
  addMeesageHandler(onMessage);

  return {
    close() {
      if (closed) return;

      props.diagramDoc.off("update", onDiagramUpdate);
      props.sheetDoc.off("update", onSheetUpdate);
      removeMeesageHandler(onMessage);
      closed = true;
    },
  };
};

function requestDiagramSync(id: string, update: Uint8Array) {
  postWSMessage({
    type: "diagram-sync-req",
    id,
    update: uint8ArrayToString(update),
  });
}

export function requestSheetSync(id: string, update: Uint8Array) {
  postWSMessage({
    type: "sheet-sync-req",
    id,
    update: uint8ArrayToString(update),
  });
}

export function postConnectionInfo(canHost: boolean) {
  postWSMessage({
    type: "connection",
    canHost,
  });
}

export function requestAssetSync(assetId: string) {
  postWSMessage({
    type: "asset-req",
    id: assetId,
  });
}
