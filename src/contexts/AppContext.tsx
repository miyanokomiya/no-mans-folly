import { createContext } from "react";
import { AppCanvasEvent, AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { StateMachine } from "../composables/states/core";

export const AppStateContext = createContext<AppCanvasStateContext>(undefined as any);
export const SetAppStateContext = createContext<React.Dispatch<AppCanvasStateContextPart>>(() => undefined);
export const GetAppStateContext = createContext<() => AppCanvasStateContext>(() => undefined as any);
export const AppStateMachineContext = createContext<StateMachine<AppCanvasEvent>>(undefined as any);

type AppCanvasStateContextPart = Omit<
  AppCanvasStateContext,
  | "getTimestamp"
  | "generateUuid"
  | "getShapeStruct"
  | "getStyleScheme"
  | "getUserSetting"
  | "patchUserSetting"
  | "showToastMessage"
  | "assetAPI"
  | "states"
>;
