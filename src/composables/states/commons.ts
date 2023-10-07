import { IVec2, IRectangle } from "okageo";
import type { ModeStateBase, ModeStateContextBase, ModeStateEvent, ModeStateEventBase } from "./core";
import type { CommandExam, ContextMenuItem, EditMovement, ToastMessage } from "./types";
import { StyleScheme } from "../../models";

export interface CanvasStateContext extends ModeStateContextBase {
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;

  getRenderCtx: () => CanvasRenderingContext2D | undefined;
  setViewport: (rect?: IRectangle, margin?: number) => void;
  zoomView: (step: number, center?: boolean) => number;
  setZoom: (value: number, center?: boolean) => number;
  getScale: () => number;
  getViewRect: () => IRectangle;
  panView: (val: EditMovement) => void;
  startDragging: () => void;
  stopDragging: () => void;
  getCursorPoint: () => IVec2; // must be canvas space

  toView: (p: IVec2) => IVec2;
  showFloatMenu: () => void;
  hideFloatMenu: () => void;
  setContextMenuList: (val?: { items: ContextMenuItem[]; point: IVec2 }) => void;
  setCommandExams: (exams?: CommandExam[]) => void;
  showToastMessage: (val: ToastMessage) => void;
  setCursor: (val?: string) => void;

  undo: () => void;
  redo: () => void;
  setCaptureTimeout: (timeout?: number) => void;
}

export interface HistoryEvent extends ModeStateEventBase {
  type: "history";
  data: "undo" | "redo";
}

export type CanvasStateEvent = ModeStateEvent | HistoryEvent;

export type CanvasState = ModeStateBase<CanvasStateContext, CanvasStateEvent>;

export function newPanningState(): CanvasState {
  return panningState;
}

const panningState: CanvasState = {
  getLabel: () => "Panning",
  onStart: (ctx) => {
    ctx.startDragging();
  },
  onEnd: (ctx) => {
    ctx.stopDragging();
  },
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointermove":
        ctx.panView(event.data);
        return;
      case "pointerup":
        return { type: "break" };
    }
  },
};
