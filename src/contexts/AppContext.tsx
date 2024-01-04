import { createContext, useCallback, useMemo, useRef, useState } from "react";
import { AppCanvasContext, IAppCanvasContext, createInitialAppCanvasStateContext } from "./AppCanvasContext";
import { AppCanvasEvent, AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { generateUuid } from "../utils/random";
import { StateMachine, newStateMachine } from "../composables/states/core";
import { newDefaultState } from "../composables/states/appCanvas/defaultState";

interface AppCanvasProviderProps {
  children: React.ReactNode;
  getAssetAPI?: AppCanvasStateContext["getAssetAPI"];
  acctx: IAppCanvasContext;
}

export const AppCanvasProvider: React.FC<AppCanvasProviderProps> = ({ children, getAssetAPI, acctx }) => {
  const initialContext = useMemo(() => {
    return createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid,
      getStyleScheme: acctx.getStyleScheme,
      getUserSetting: acctx.userSettingStore.getState,
      getAssetAPI,
    });
  }, [acctx, getAssetAPI]);

  const [stateContext, setStateContext] = useState(initialContext);
  const stateContextRef = useRef(stateContext);

  const stateMachine = useMemo(() => {
    return newStateMachine(() => stateContextRef.current, newDefaultState);
  }, []);

  const handleSetStateContext = useCallback<React.Dispatch<AppCanvasStateContextPart>>(
    (val) => {
      setStateContext((prev) => {
        const next = {
          getTimestamp: prev.getTimestamp,
          generateUuid: prev.generateUuid,
          getShapeStruct: prev.getShapeStruct,
          getStyleScheme: prev.getStyleScheme,
          getUserSetting: prev.getUserSetting,
          getAssetAPI: prev.getAssetAPI,
          ...val,
        };
        stateContextRef.current = next;
        return next;
      });
    },
    [setStateContext],
  );

  return (
    <AppCanvasContext.Provider value={acctx}>
      <AppStateMachineContext.Provider value={stateMachine}>
        <SetAppStateContext.Provider value={handleSetStateContext}>
          <AppStateContext.Provider value={stateContext}>{children}</AppStateContext.Provider>
        </SetAppStateContext.Provider>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
};

export const AppStateContext = createContext<AppCanvasStateContext>(undefined as any);
export const SetAppStateContext = createContext<React.Dispatch<AppCanvasStateContextPart>>(() => undefined);
export const AppStateMachineContext = createContext<StateMachine<AppCanvasEvent>>(undefined as any);

type AppCanvasStateContextPart = Omit<
  AppCanvasStateContext,
  "getTimestamp" | "generateUuid" | "getShapeStruct" | "getStyleScheme" | "getUserSetting" | "getAssetAPI"
>;
