import * as Y from "yjs";

type RTUpdateData = {
  type:
    | "diagram-sync-req"
    | "diagram-open"
    | "diagram-update"
    | "sheet-sync-req"
    | "sheet-update"
    | "diagram-saved"
    | "sheet-saved";
  id: string; // ID of either the diagram or the sheet
  update?: string; // Encoded Uint8Array
  syncRequester?: string;
};

type RTRoomData = {
  type: "room";
  count: number;
};

export type RTMessageData = RTUpdateData | RTRoomData;

export type RealtimeHandler = (props: {
  roomId: string;
  diagramDoc: Y.Doc;
  sheetDoc: Y.Doc;
  skipDiagramSave: () => void;
  skipSheetSave: () => void;
  loadSheet: (sheetId: string) => Promise<Y.Doc>;
  initDiagram: (diagramUpdate: Uint8Array) => Promise<void>;
  saveSheet: (sheetId: string, update: Uint8Array) => void;
}) => { close: () => void };
