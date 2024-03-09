import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { ToggleInput } from "./atoms/inputs/ToggleInput";

export const UserSettingPanel: React.FC = () => {
  const { userSettingStore } = useContext(AppCanvasContext);
  const [userSetting, setUserSetting] = useState(userSettingStore.getState());

  useEffect(() => {
    return userSettingStore.watch(() => {
      setUserSetting(userSettingStore.getState());
    });
  }, [userSettingStore]);

  const handleWheelActionChange = useCallback(
    (val: boolean) => {
      userSettingStore.patchState({ wheelAction: val ? "pan" : undefined });
    },
    [userSettingStore],
  );

  const handleLeftDragActionChange = useCallback(
    (val: boolean) => {
      userSettingStore.patchState({ leftDragAction: val ? "pan" : undefined });
    },
    [userSettingStore],
  );

  return (
    <div>
      <div className="flex flex-col">
        <ToggleInput value={userSetting.wheelAction === "pan"} onChange={handleWheelActionChange}>
          Pan by wheeling
        </ToggleInput>
        <ToggleInput value={userSetting.leftDragAction === "pan"} onChange={handleLeftDragActionChange}>
          Pan by left dragging
        </ToggleInput>
      </div>
    </div>
  );
};
