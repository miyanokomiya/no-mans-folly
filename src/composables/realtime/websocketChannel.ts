import * as Y from "yjs";
import { RealtimeHandler, RTMessageData, UserAwareness } from "./core";
import { encodeStateAsUpdateWithGC, stringToUint8Array, uint8ArrayToString } from "../../utils/yjs";
import { newCallback } from "../../utils/stateful/reactives";
import { base64ToBlob, blobToBase64 } from "../../utils/fileAccess";
import { generateUIColorFromInteger } from "../../utils/color";
import { generateSimpleIntegerHash } from "../../utils/hash";
import { newThrottle } from "../../utils/stateful/throttle";

const WS_ENDPOINT = process.env.API_HOST!.replace(/^http(s?):/, "ws$1:") + "ws";
export const WS_UPDATE_ORIGIN = "ws-update";
// This is used to idenfity if the message is originated by this client
let connectionId: string | undefined = undefined;

export type WSClient = {
  client: WebSocket;
  id: string;
  count: number;
  awareness: Map<string, UserAwareness>;
};
let client: WSClient | undefined;
let myAwareness: Omit<UserAwareness, "id" | "color"> | undefined;

export const websocketCallback = newCallback<WSClient | undefined>();
export const websocketAssetCallback = newCallback<{ id: string; asset: Blob }>();
const messageCallback = newCallback<MessageEvent>();
export const awarenessCallback = newCallback();
let keepAliveTimer: number | undefined = undefined;

function setClient(val: WSClient | undefined) {
  client = val;
  websocketCallback.dispatch(client);
  awarenessCallback.dispatch();
  resetKeepAliveTimer();
}

export function getWebsocketClient(): WSClient | undefined {
  return client;
}

function resetKeepAliveTimer() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = undefined;
  }
  if (!client) return;

  keepAliveTimer = setInterval(() => {
    postWSMessage({ type: "ping" });
  }, 1000 * 70) as any;
}

export async function initWSClient(props: { canHost: boolean; roomId: string; onClose?: () => void }) {
  closeWSClient();
  const encodedRoomId = encodeURI(props.roomId);
  const preClient = new WebSocket(`${WS_ENDPOINT}/room?id=${encodedRoomId}&canHost=${props.canHost ? 1 : 0}`);

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
        const nextClient = {
          client: preClient,
          id: props.roomId,
          count: 0,
          awareness: new Map<string, UserAwareness>(),
        };
        setClient(nextClient);
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

export function postWSMessage(data: RTMessageData) {
  try {
    // Needless to initialize the client unless listening
    client?.client.send(JSON.stringify(data));
  } catch (e: any) {
    console.error(e);
    if (e?.message?.includes("CLOSING or CLOSED")) {
      closeWSClient();
    }
  }
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

  // Avoid frequent sheet update messagings especially for text editing.
  let sheetUpdates: Uint8Array[] = [];
  function postSheetUpdate() {
    if (sheetUpdates.length === 0) return;

    postWSMessage({
      type: "sheet-update",
      id: props.sheetDoc.meta.sheetId,
      update: uint8ArrayToString(Y.mergeUpdates(sheetUpdates)),
    } as RTMessageData);
    sheetUpdates = [];
  }
  const postSheetUpdateThrottle = newThrottle(postSheetUpdate, 2000, true);
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === WS_UPDATE_ORIGIN) return;

    sheetUpdates.push(update);
    postSheetUpdateThrottle();
  }

  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  async function onMessage(e: MessageEvent) {
    if (closed || !client) return;

    const data = JSON.parse(e.data) as RTMessageData;
    resetKeepAliveTimer();

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
          // Broadcast the diagram update for other members
          postWSMessage({
            type: "diagram-update",
            id: data.id,
            update: data.update,
          } as RTMessageData);

          // Merge the requester's diagram then return it to them
          Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update));
          postWSMessage({
            type: "diagram-sync-res",
            id: data.id,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
            author: data.sender,
            awareness: getAwarenessListWithMine(),
          } as RTMessageData);
        } else {
          // Discard the requester's diagram and let them open current one
          postWSMessage({
            type: "diagram-open",
            id: props.diagramDoc.meta.diagramId,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
            author: data.sender,
            awareness: getAwarenessListWithMine(),
          } as RTMessageData);
        }
        return;
      }
      case "diagram-sync-res": {
        if (!data.update) return;

        Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        requestSheetSync(props.sheetDoc.meta.sheetId, Y.encodeStateAsUpdate(props.sheetDoc));
        setAwarenessList(data.awareness);
        return;
      }
      case "diagram-open": {
        if (!data.update) return;

        props.openDiagram(stringToUint8Array(data.update));
        setAwarenessList(data.awareness);
        return;
      }
      case "diagram-update": {
        if (!data.update) return;

        Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        keepAwarenessAlive(data.sender);
        return;
      }
      case "sheet-sync-req": {
        if (!data.update) return;

        const isCurrentSheet = props.sheetDoc.meta.sheetId === data.id;
        const sheet = isCurrentSheet ? props.sheetDoc : await props.loadSheet(data.id);

        // Merge and return the sheet to the requester
        Y.applyUpdate(sheet, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        postWSMessage({
          type: "sheet-sync-res",
          id: data.id,
          update: uint8ArrayToString(Y.encodeStateAsUpdate(sheet)),
          author: data.sender,
        } as RTMessageData);

        if (!isCurrentSheet) {
          sheet.destroy();
        }
        return;
      }
      case "sheet-update":
      case "sheet-sync-res": {
        if (!data.update) return;

        if (data.id === props.sheetDoc.meta.sheetId) {
          Y.applyUpdate(props.sheetDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        } else {
          props.saveSheet(data.id, stringToUint8Array(data.update));
        }
        keepAwarenessAlive(data.sender);
        return;
      }
      case "asset-req": {
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
        if (!data.asset || !data.fileType) return;

        const asset = base64ToBlob(data.asset, data.fileType);
        await props.assetAPI.saveAsset(data.id, asset);
        websocketAssetCallback.dispatch({ id: data.id, asset });
        return;
      }
      case "awareness": {
        if (!data.sender) return;

        const current = client.awareness.get(data.sender);
        if (current && data.closed) {
          client.awareness.delete(data.sender);
          awarenessCallback.dispatch();
          return;
        }

        const color = current?.color ?? generateUIColorFromInteger(generateSimpleIntegerHash(data.sender));
        client.awareness.set(data.sender, {
          id: data.sender,
          sheetId: data.sheetId,
          shapeIds: data.shapeIds,
          color,
        });
        awarenessCallback.dispatch();
        return;
      }
    }
  }
  messageCallback.bind(onMessage);

  return {
    close() {
      if (closed) return;

      props.diagramDoc.off("update", onDiagramUpdate);
      props.sheetDoc.off("update", onSheetUpdate);
      messageCallback.unbind(onMessage);
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

export function sendAwareness(data: Omit<UserAwareness, "id" | "color">) {
  myAwareness = {
    sheetId: data.sheetId,
    shapeIds: data.shapeIds,
  };
  postWSMessage({
    type: "awareness",
    ...myAwareness,
  });
  resetKeepAliveTimer();
}

function keepAwarenessAlive(id?: string) {
  if (!client || !id) return;

  const a = client.awareness.get(id);
  if (a) {
    client.awareness.set(id, a);
    awarenessCallback.dispatch();
  }
}

function getAwarenessListWithMine() {
  if (!client || !connectionId) return;

  const list = Array.from(client.awareness.values()).map<Omit<UserAwareness, "color">>((a) => ({
    id: a.id,
    sheetId: a.sheetId,
    shapeIds: a.shapeIds,
  }));
  if (myAwareness) {
    list.push({ ...myAwareness, id: connectionId });
  }
  return list;
}

function setAwarenessList(list?: Omit<UserAwareness, "color">[]) {
  if (!client || !list || list.length === 0) return;

  for (const a of list) {
    const current = client.awareness.get(a.id);
    const color = current?.color ?? generateUIColorFromInteger(generateSimpleIntegerHash(a.id));
    client.awareness.set(a.id, {
      id: a.id,
      sheetId: a.sheetId,
      shapeIds: a.shapeIds,
      color,
    });
  }
  awarenessCallback.dispatch();
}
