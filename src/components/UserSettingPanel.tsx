import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { ToggleInput } from "./atoms/inputs/ToggleInput";
import { SelectInput } from "./atoms/inputs/SelectInput";
import { InlineField } from "./atoms/InlineField";
import { UserSetting } from "../models";
import { BlockGroupField } from "./atoms/BlockGroupField";
import { NumberInput } from "./atoms/inputs/NumberInput";

const modifierSupportOptions: { value: Exclude<UserSetting["virtualKeyboard"], undefined>; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "modifiers", label: "Modifiers" },
];

const gridSizeOptions: { value: Exclude<UserSetting["gridSizeType"], undefined>; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "custom", label: "Custom" },
];

export const UserSettingPanel: React.FC = () => {
  const { userSettingStore } = useContext(AppCanvasContext);
  const [userSetting, setUserSetting] = useState(userSettingStore.getState());

  useEffect(() => {
    return userSettingStore.watch(() => {
      setUserSetting(userSettingStore.getState());
    });
  }, [userSettingStore]);

  const handleDebugChange = useCallback(
    (val: boolean) => {
      userSettingStore.patchState({ debug: val ? "on" : undefined });
    },
    [userSettingStore],
  );

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

  const handleModifierSupportChange = useCallback(
    (val: UserSetting["virtualKeyboard"]) => {
      userSettingStore.patchState({ virtualKeyboard: val });
    },
    [userSettingStore],
  );

  const handleGridChange = useCallback(
    (val: boolean) => {
      userSettingStore.patchState({ grid: val ? "on" : "off" });
    },
    [userSettingStore],
  );

  const handleGridSizeTypeChange = useCallback(
    (val: UserSetting["gridSizeType"]) => {
      userSettingStore.patchState({ gridSizeType: val });
    },
    [userSettingStore],
  );

  const handleGridSizeChange = useCallback(
    (val: number) => {
      userSettingStore.patchState({ gridSize: val });
    },
    [userSettingStore],
  );

  const virtualKeyboardValue = userSetting.virtualKeyboard ?? "off";

  return (
    <div>
      <div className="flex flex-col gap-1">
        {import.meta.env.DEV ? (
          <ToggleInput value={userSetting.debug === "on"} onChange={handleDebugChange}>
            Debug mode
          </ToggleInput>
        ) : undefined}
        <ToggleInput value={userSetting.wheelAction === "pan"} onChange={handleWheelActionChange}>
          Pan by wheeling
        </ToggleInput>
        <ToggleInput value={userSetting.leftDragAction === "pan"} onChange={handleLeftDragActionChange}>
          Pan by left dragging
        </ToggleInput>
        <div>
          <InlineField label="Virtual keyboard">
            <SelectInput
              value={virtualKeyboardValue}
              options={modifierSupportOptions}
              onChange={handleModifierSupportChange}
            />
          </InlineField>
          {virtualKeyboardValue !== "off" ? (
            <p className="text-red-500 font-sm text-right">(Not work well with stylus pens)</p>
          ) : undefined}
        </div>
        <BlockGroupField label="Grid">
          <ToggleInput value={userSetting.grid !== "off"} onChange={handleGridChange}>
            Grid
          </ToggleInput>
          <InlineField label="Grid size type">
            <SelectInput
              value={userSetting.gridSizeType ?? "auto"}
              options={gridSizeOptions}
              onChange={handleGridSizeTypeChange}
            />
          </InlineField>
          <InlineField label="Grid size" inert={userSetting.gridSizeType !== "custom"}>
            <div className="w-24">
              <NumberInput min={1} slider={true} value={userSetting.gridSize ?? 50} onChange={handleGridSizeChange} />
            </div>
          </InlineField>
        </BlockGroupField>
      </div>
    </div>
  );
};
