import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { ToggleInput } from "./atoms/inputs/ToggleInput";

export const UserSettingPanel: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const [userSetting, setUserSetting] = useState(acctx.userSettingStore.getState());

  useEffect(() => {
    return acctx.userSettingStore.watch(() => {
      setUserSetting(acctx.userSettingStore.getState());
    });
  }, []);

  const handleWheelActionChange = useCallback((val: boolean) => {
    acctx.userSettingStore.patchState({ wheelAction: val ? "pan" : undefined });
  }, []);

  return (
    <div>
      <div className="flex flex-col">
        <ToggleInput value={userSetting.wheelAction === "pan"} onChange={handleWheelActionChange}>
          Pan by wheeling
        </ToggleInput>
      </div>
    </div>
  );
};
