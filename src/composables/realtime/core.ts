import * as Y from "yjs";

export type RTUpdateData = {
  type: "diagram" | "sheet" | "diagram-saved" | "sheet-saved";
  id: string; // ID of either the diagram or the sheet
  update?: Uint8Array;
};

export type RealtimeHandler = (props: {
  roomId: string;
  diagramDoc: Y.Doc;
  sheetDoc: Y.Doc;
  skipDiagramSave: () => void;
  skipSheetSave: () => void;
}) => { close: () => void };
