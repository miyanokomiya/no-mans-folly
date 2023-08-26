import type { IVec2 } from "okageo";

type ModifierOptions = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type EditMovement = {
  current: IVec2;
  start: IVec2;
  scale: number;
} & ModifierOptions;

export type HoverMovement = Omit<EditMovement, "start">;

export type KeyOptions = {
  key: string;
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
