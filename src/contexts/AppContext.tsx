import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, IAppCanvasContext, createInitialAppCanvasStateContext } from "./AppCanvasContext";
import { AppCanvasEvent, AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { generateUuid } from "../utils/random";
import { StateMachine, newStateMachine } from "../composables/states/core";
import { AssetAPI } from "../hooks/persistence";
import { ToastMessage } from "../composables/states/types";
import { ToastMessageContext } from "./ToastMessageContext";

interface AppCanvasProviderProps {
  children: React.ReactNode;
  assetAPI?: AssetAPI;
  toastMessages: ToastMessage[];
  showToastMessage: (val: ToastMessage) => void;
  acctx: IAppCanvasContext;
}

export const AppCanvasProvider: React.FC<AppCanvasProviderProps> = ({
  children,
  assetAPI,
  toastMessages,
  showToastMessage,
  acctx,
}) => {
  const initialContext = useMemo(() => {
    return createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid,
      getStyleScheme: acctx.getStyleScheme,
      getUserSetting: acctx.userSettingStore.getState,
      showToastMessage,
      assetAPI,
    });
  }, [acctx, assetAPI, showToastMessage]);

  const [stateContext, setStateContext] = useState(initialContext);
  const stateContextRef = useRef(stateContext);

  const stateMachine = useMemo(() => {
    return newStateMachine(() => stateContextRef.current, stateContext.states.newSelectionHubState);
  }, [stateContext.states.newSelectionHubState]);

  useEffect(() => {
    acctx;
    stateMachine.reset();
  }, [stateMachine, acctx]);

  const handleSetStateContext = useCallback<React.Dispatch<AppCanvasStateContextPart>>(
    (val) => {
      setStateContext((prev) => {
        const next = { ...prev, ...val };
        stateContextRef.current = next;
        return next;
      });
    },
    [setStateContext],
  );

  useEffect(() => {
    // Apply props' changes to the context.
    setStateContext((prev) => {
      const next = {
        ...prev,
        getStyleScheme: acctx.getStyleScheme,
        getUserSetting: acctx.userSettingStore.getState,
        assetAPI,
      } as AppCanvasStateContext;
      stateContextRef.current = next;
      return next;
    });
  }, [acctx, assetAPI]);

  const getStateContext = useCallback(() => {
    return stateContextRef.current;
  }, []);

  return (
    <AppCanvasContext.Provider value={acctx}>
      <AppStateMachineContext.Provider value={stateMachine}>
        <SetAppStateContext.Provider value={handleSetStateContext}>
          <GetAppStateContext.Provider value={getStateContext}>
            <ToastMessageContext.Provider value={toastMessages}>
              <AppStateContext.Provider value={stateContext}>{children}</AppStateContext.Provider>
            </ToastMessageContext.Provider>
          </GetAppStateContext.Provider>
        </SetAppStateContext.Provider>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
};

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
  | "showToastMessage"
  | "assetAPI"
  | "states"
>;
