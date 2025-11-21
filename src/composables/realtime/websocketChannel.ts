// import * as Y from "yjs";
import { RealtimeHandler, RTUpdateData } from "./core";

const WS_ENDPOINT = "wss://example.com/ws";
export const WS_UPDATE_ORIGIN = "ws-update";

let client: WebSocket | undefined;
const messageHandlers = new Set<(e: MessageEvent) => void>();

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
        for (const h of messageHandlers) {
          preClient.addEventListener("message", h);
        }
        resolve();
      },
      { once: true },
    );
  });
}

export function closeWSClient() {
  if (!client) return;

  for (const h of messageHandlers) {
    client.removeEventListener("message", h);
  }
  client.close();
  client = undefined;
}

function addMeesageHandler(h: (e: MessageEvent) => void) {
  messageHandlers.add(h);
  client?.addEventListener("message", h);
}

function removeMeesageHandler(h: (e: MessageEvent) => void) {
  messageHandlers.delete(h);
  client?.removeEventListener("message", h);
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
      type: "diagram",
      id: props.diagramDoc.meta.diagramId,
      update,
    } as RTUpdateData);
  }
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === WS_UPDATE_ORIGIN) return;

    postWSMessage({
      type: "sheet",
      id: props.sheetDoc.meta.sheetId,
      update,
    } as RTUpdateData);
  }
  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  function onMessage(e: MessageEvent) {
    if (closed) return;

    const data = JSON.parse(e.data) as RTUpdateData;
    console.log(data);
    // switch (data.type) {
    //   case "diagram": {
    //     if (data.update) {
    //       Y.applyUpdate(props.diagramDoc, data.update, WS_UPDATE_ORIGIN);
    //     }
    //     break;
    //   }
    //   case "sheet": {
    //     if (data.update && data.id === props.sheetDoc.meta.sheetId) {
    //       Y.applyUpdate(props.sheetDoc, data.update, WS_UPDATE_ORIGIN);
    //     }
    //     break;
    //   }
    // }
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
