import * as Y from "yjs";
import { RealtimeHandler, RTUpdateData } from "./core";

const BC_PREFIX = "no-mans-folly-bc";
export const BC_UPDATE_ORIGIN = "bc-update";

let client: BroadcastChannel | undefined;
function getClient(): BroadcastChannel {
  if (!client) {
    client = new BroadcastChannel(BC_PREFIX);
  }
  return client;
}

export function postBCMessage(data: RTUpdateData) {
  // Needless to initialize the client unless listening
  client?.postMessage(data);
}

export const newBroadcastChannel: RealtimeHandler = (props) => {
  let closed = false;

  function onDiagramUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === BC_UPDATE_ORIGIN) return;

    postBCMessage({
      type: "diagram",
      id: props.diagramDoc.meta.diagramId,
      update,
    } as RTUpdateData);
  }
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === BC_UPDATE_ORIGIN) return;

    postBCMessage({
      type: "sheet",
      id: props.sheetDoc.meta.sheetId,
      update,
    } as RTUpdateData);
  }
  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  function onMessage(e: MessageEvent) {
    if (closed) return;

    const data = e.data as RTUpdateData;
    switch (data.type) {
      case "diagram": {
        if (data.update && data.id === props.diagramDoc.meta.diagramId) {
          Y.applyUpdate(props.diagramDoc, data.update, BC_UPDATE_ORIGIN);
        }
        break;
      }
      case "sheet": {
        if (data.update && data.id === props.sheetDoc.meta.sheetId) {
          Y.applyUpdate(props.sheetDoc, data.update, BC_UPDATE_ORIGIN);
        }
        break;
      }
      case "diagram-saved": {
        if (data.id === props.diagramDoc.meta.diagramId) {
          props.skipDiagramSave();
        }
        break;
      }
      case "sheet-saved": {
        if (data.id === props.sheetDoc.meta.sheetId) {
          props.skipSheetSave();
        }
        break;
      }
    }
  }
  getClient().addEventListener("message", onMessage);

  return {
    close() {
      if (closed) return;

      props.diagramDoc.off("update", onDiagramUpdate);
      props.sheetDoc.off("update", onSheetUpdate);
      getClient().removeEventListener("message", onMessage);
      closed = true;
    },
  };
};
