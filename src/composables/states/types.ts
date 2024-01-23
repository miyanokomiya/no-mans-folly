import type { IVec2 } from "okageo";
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

export interface ContextMenuItem {
  label: string;
  key: string;
  children?: ContextMenuItem[];
}

export type CommandExam = { command?: string; title: string };

export type ToastMessage = {
  text: string;
  type: "info" | "warn" | "error";
};
