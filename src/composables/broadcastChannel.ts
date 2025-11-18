import * as Y from "yjs";

const BC_PREFIX = "no-mans-folly-bc";
export const BC_UPDATE_ORIGIN = "bc-update";

type UpdateData = {
  type: "diagram" | "sheet" | "diagram-saved" | "sheet-saved";
  id: string;
  update?: Uint8Array;
};

const bc = new BroadcastChannel(BC_PREFIX);

export function postBCMessage(data: UpdateData) {
  bc.postMessage(data);
}

export function newBroadcastChannel(props: {
  diagramDoc: Y.Doc;
  sheetDoc: Y.Doc;
  skipDiagramSave: () => void;
  skipSheetSave: () => void;
}) {
  let closed = false;

  function onDiagramUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === BC_UPDATE_ORIGIN) return;

    postBCMessage({
      type: "diagram",
      id: props.diagramDoc.meta.diagramId,
      update,
    } as UpdateData);
  }
  function onSheetUpdate(update: Uint8Array, origin: string) {
    if (closed || origin === BC_UPDATE_ORIGIN) return;

    postBCMessage({
      type: "sheet",
      id: props.sheetDoc.meta.sheetId,
      update,
    } as UpdateData);
  }
  props.diagramDoc.on("update", onDiagramUpdate);
  props.sheetDoc.on("update", onSheetUpdate);

  function onMessage(e: MessageEvent) {
    if (closed) return;

    const data = e.data as UpdateData;
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
  bc.addEventListener("message", onMessage);

  return {
    close() {
      if (closed) return;

      props.diagramDoc.off("update", onDiagramUpdate);
      props.sheetDoc.off("update", onSheetUpdate);
      bc.removeEventListener("message", onMessage);
      closed = true;
    },
  };
}
