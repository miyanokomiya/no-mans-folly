import type { IVec2 } from "okageo";

export type ModifierOptions = {
  // "Command" key is also treated as Ctrl key
  // When those keys need to be distinguished, check "command" value and use "isMac" in "devices.ts"
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  command?: boolean;
};

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

export interface ContextMenuItem {
  label: string;
  key?: string;
  exec?: () => void;
  data?: { [key: string]: string };
  children?: ContextMenuItem[];
}

export type CommandExam = { command?: string; title: string };
