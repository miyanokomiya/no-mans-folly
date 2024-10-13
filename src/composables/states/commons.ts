import { IVec2, IRectangle } from "okageo";
import type { ModeStateBase, ModeStateContextBase, ModeStateEvent, ModeStateEventBase, WheelEvent } from "./core";
import type { CommandExam, ContextMenuItem, EditMovement, ToastMessage } from "./types";
import { StyleScheme, UserSetting } from "../../models";

export interface CanvasStateContext extends ModeStateContextBase {
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getUserSetting: () => UserSetting;

  redraw: () => void;
  getRenderCtx: () => CanvasRenderingContext2D | undefined;
  setViewport: (rect?: IRectangle, margin?: number) => void;
  zoomView: (step: number, center?: boolean) => number;
  setZoom: (value: number, center?: boolean) => number;
  getScale: () => number;
  getViewRect: () => IRectangle;
  panView: (val: EditMovement) => void;
  scrollView: (delta: IVec2) => void;
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

/**
 * Procs zooming or panning depending on the user setting.
 * Returns the latest scale.
 */
export function handleCommonWheel(
  ctx: Pick<CanvasStateContext, "getUserSetting" | "scrollView" | "zoomView" | "getScale">,
  event: WheelEvent,
): number {
  if (!!event.data.options.ctrl !== (ctx.getUserSetting().wheelAction === "pan")) {
    ctx.scrollView(event.data.options.shift ? { x: event.data.delta.y, y: event.data.delta.x } : event.data.delta);
    return ctx.getScale();
  }

  return ctx.zoomView(event.data.delta.y);
}
