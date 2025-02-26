import type { IRectangle, IVec2 } from "okageo";
import { ModifierOptions } from "../../utils/devices";

export type EditMovement = {
  current: IVec2;
  start: IVec2;
  scale: number;
} & ModifierOptions;

export type HoverMovement = Omit<EditMovement, "start">;

export type KeyOptions = {
  key: string;
  prevent?: () => void;
} & ModifierOptions;

export type MouseOptions = {
  button: number;
} & ModifierOptions;

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSeparatorItem;

export type ContextMenuActionItem = {
  label: string;
  key: string;
  icon?: string;
  meta?: any;
  children?: ContextMenuItem[];
};

export type ContextMenuSeparatorItem = { separator: true };

export type CommandExam = { command?: string; title: string };

export type ToastMessage = {
  text: string;
  type: "info" | "warn" | "error";
};

export type LinkInfo = {
  link: string;
  bounds: IRectangle;
  shapeId: string;
  docRange: [cursor: number, selection: number];
  key: string; // Unique key for the same link info
};
