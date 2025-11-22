import * as Y from "yjs";
import { RealtimeHandler, RTUpdateData } from "./core";
import { stringToUint8Array, uint8ArrayToString } from "../../utils/yjs";
import { newCallback } from "../../utils/stateful/reactives";

const WS_ENDPOINT = process.env.API_HOST!.replace(/^http(s?):/, "ws$1:") + "ws";
export const WS_UPDATE_ORIGIN = "ws-update";

let client: WebSocket | undefined;
export const websocketChannelCallback = newCallback<boolean>();
const messageCallback = newCallback<MessageEvent>();

export function isWebsocketChannelActive(): boolean {
  return !!client;
}

export async function initWSClient(props: { roomId: string; onClose?: () => void }) {
  closeWSClient();
  const preClient = new WebSocket(`${WS_ENDPOINT}/rooms/${props.roomId}`);

  return new Promise<void>((resolve, reject) => {
    preClient?.addEventListener("error", reject);
    if (props.onClose) {
      preClient?.addEventListener("close", props.onClose);
    }
    preClient?.addEventListener(
      "open",
      () => {
        preClient?.removeEventListener("error", reject);
        client = preClient;
        websocketChannelCallback.dispatch(true);
        preClient.addEventListener("message", messageCallback.dispatch);
        resolve();
      },
      { once: true },
    );
  });
}

export function closeWSClient() {
  if (!client) return;

  client.removeEventListener("message", messageCallback.dispatch);
  client.close();
  client = undefined;
  websocketChannelCallback.dispatch(false);
}

function addMeesageHandler(h: (e: MessageEvent) => void) {
  messageCallback.bind(h);
}

function removeMeesageHandler(h: (e: MessageEvent) => void) {
  messageCallback.unbind(h);
}

export function postWSMessage(data: RTUpdateData) {
  // Needless to initialize the client unless listening
  client?.send(JSON.stringify(data));
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
    } as RTUpdateData);
  }
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === WS_UPDATE_ORIGIN) return;

    postWSMessage({
      type: "sheet-update",
      id: props.sheetDoc.meta.sheetId,
      update: uint8ArrayToString(update),
    } as RTUpdateData);
  }
  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  async function onMessage(e: MessageEvent) {
    if (closed) return;

    const data = JSON.parse(e.data) as RTUpdateData;
    switch (data.type) {
      case "diagram-sync-req": {
        if (!data.update) return;

        if (data.id === props.diagramDoc.meta.diagramId) {
          // Merge the requestee's diagram
          Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update));
          // Broadcast as an usual diagram update
          postWSMessage({
            type: "diagram-update",
            id: props.diagramDoc.meta.diagramId,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
          } as RTUpdateData);
        } else {
          // Discard the requestee's diagram
          postWSMessage({
            type: "diagram-open",
            id: props.diagramDoc.meta.diagramId,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(props.diagramDoc)),
          } as RTUpdateData);
        }
        return;
      }
      case "diagram-open": {
        if (!data.update) return;

        props.initDiagram(stringToUint8Array(data.update));
        return;
      }
      case "diagram-update": {
        if (data.update) {
          Y.applyUpdate(props.diagramDoc, stringToUint8Array(data.update), WS_UPDATE_ORIGIN);
        }
        return;
      }
      case "sheet-sync-req": {
        if (!data.update) return;

        // Merge the requestee's sheet
        if (props.sheetDoc.meta.sheetId === data.id) {
          const sheet = props.sheetDoc;
          Y.applyUpdate(sheet, stringToUint8Array(data.update));

          // Broadcast as an usual sheet update
          postWSMessage({
            type: "sheet-update",
            id: data.id,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(sheet)),
          } as RTUpdateData);
        } else {
          const sheet = await props.loadSheet(data.id);
          Y.applyUpdate(sheet, stringToUint8Array(data.update));

          // Broadcast as an usual sheet update
          postWSMessage({
            type: "sheet-update",
            id: data.id,
            update: uint8ArrayToString(Y.encodeStateAsUpdate(sheet)),
          } as RTUpdateData);

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

export function requestDiagramSync(id: string, update: Uint8Array) {
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
