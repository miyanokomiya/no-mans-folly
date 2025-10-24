import type { IRectangle, IVec2 } from "okageo";
import { ModifierOptions } from "../../utils/devices";

export type EditMovement = {
  current: IVec2;
  start: IVec2; // This can change when the viewport is moved while editing.
  startAbs: IVec2; // This isn't affected by the viewport shift while editing.
  scale: number;
} & ModifierOptions;

export type HoverMovement = Omit<EditMovement, "start" | "startAbs">;

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
  text: string; // When set empty, all messages having the specified key will be removed.
  type: "info" | "warn" | "error";
  timeout?: number;
  key?: string; // When defined, items having the same key are treated as the same one regardless of their text.
};

export type LinkInfo = {
  link: string;
  bounds: IRectangle;
  shapeId: string;
  docRange: [cursor: number, selection: number];
  key: string; // Unique key for the same link info
};
