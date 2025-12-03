import * as Y from "yjs";
import { AssetAPI } from "../assetAPI";
import { Color } from "../../models";

type RTData = {
  sender?: string; // Set by the server
  author?: string; // Original sender who initiates the consequent messages
};

type RTUpdateData = RTData & {
  type:
    | "diagram-sync-req"
    | "diagram-sync-res"
    | "diagram-open"
    | "diagram-update"
    | "sheet-sync-req"
    | "sheet-sync-res"
    | "sheet-update";
  id: string; // ID of either the diagram or the sheet
  update?: string; // Encoded Uint8Array
};

type RTAssetData = RTData & {
  type: "asset-req" | "asset-res";
  id: string;
  asset?: string;
  fileType?: string;
};

type RTInitialData = {
  type: "initial";
  id: string;
};

type RTRoomData = {
  type: "room";
  count: number;
};

type RTConnectionData = {
  type: "connection";
  canHost: boolean;
};

type RTAwareness = RTData & {
  type: "awareness";
  sheetId?: string;
  shapeIds?: string[];
  closed?: boolean;
};

type RTPing = {
  type: "ping";
};

export type RTMessageData =
  | RTPing
  | RTAwareness
  | RTUpdateData
  | RTRoomData
  | RTConnectionData
  | RTInitialData
  | RTAssetData;

export type RealtimeHandler = (props: {
  roomId: string;
  diagramDoc: Y.Doc;
  sheetDoc: Y.Doc;
  skipDiagramSave: () => void;
  skipSheetSave: () => void;
  loadSheet: (sheetId: string) => Promise<Y.Doc>;
  openDiagram: (diagramUpdate: Uint8Array) => Promise<void>;
  saveSheet: (sheetId: string, update: Uint8Array) => void;
  assetAPI: AssetAPI;
}) => { close: () => void };

export type UserAwareness = {
  id: string;
  color: Color;
  sheetId?: string;
  shapeIds?: string[];
  timestamp: number;
};
