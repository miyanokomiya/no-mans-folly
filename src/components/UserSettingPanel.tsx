import { useCallback } from "react";
import { ToggleInput } from "./atoms/inputs/ToggleInput";
import { SelectInput } from "./atoms/inputs/SelectInput";
import { InlineField } from "./atoms/InlineField";
import { UserSetting } from "../models";
import { BlockGroupField } from "./atoms/BlockGroupField";
import { NumberInput } from "./atoms/inputs/NumberInput";
import { useUserSetting } from "../hooks/storeHooks";

const modifierSupportOptions: { value: Exclude<UserSetting["virtualKeyboard"], undefined>; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "modifiers", label: "Modifiers" },
];

export const UserSettingPanel: React.FC = () => {
  const [userSetting, patchUserSetting] = useUserSetting();

  const handleDebugChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ debug: val ? "on" : undefined });
    },
    [patchUserSetting],
  );

  const handleWheelActionChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ wheelAction: val ? "pan" : undefined });
    },
    [patchUserSetting],
  );

  const handleLeftDragActionChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ leftDragAction: val ? "pan" : undefined });
    },
    [patchUserSetting],
  );

  const handleModifierSupportChange = useCallback(
    (val: UserSetting["virtualKeyboard"]) => {
      patchUserSetting({ virtualKeyboard: val });
    },
    [patchUserSetting],
  );

  const handleGridChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ grid: val ? "on" : "off" });
    },
    [patchUserSetting],
  );

  const handlePreviewChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ preview: val ? "on" : "off" });
    },
    [patchUserSetting],
  );

  const handleGridSizeChange = useCallback(
    (val: number) => {
      patchUserSetting({ gridSize: val });
    },
    [patchUserSetting],
  );

  const handleAttachToLineChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ attachToLine: val ? "on" : "off" });
    },
    [patchUserSetting],
  );

  const handleSnapIgnoreLineChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ snapIgnoreLine: val ? "on" : "off" });
    },
    [patchUserSetting],
  );

  const handleSnapIgnoreNonoverlapPairChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ snapIgnoreNonoverlapPair: val ? "on" : "off" });
    },
    [patchUserSetting],
  );

  const virtualKeyboardValue = userSetting.virtualKeyboard ?? "off";

  return (
    <div>
      <div className="flex flex-col gap-1">
        {import.meta.env.DEV ? (
          <InlineField label="Debug mode">
            <ToggleInput value={userSetting.debug === "on"} onChange={handleDebugChange} />
          </InlineField>
        ) : undefined}
        <BlockGroupField label="Operation">
          <InlineField label="Pan by wheeling">
            <ToggleInput value={userSetting.wheelAction === "pan"} onChange={handleWheelActionChange} />
          </InlineField>
          <InlineField label="Pan by left dragging">
            <ToggleInput value={userSetting.leftDragAction === "pan"} onChange={handleLeftDragActionChange} />
          </InlineField>
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
        </BlockGroupField>
        <BlockGroupField label="Grid">
          <InlineField label="Grid">
            <ToggleInput value={userSetting.grid !== "off"} onChange={handleGridChange} />
          </InlineField>
          <InlineField label="Size">
            <div className="w-24">
              <NumberInput
                min={1}
                max={200}
                slider={true}
                value={userSetting.gridSize ?? 50}
                onChange={handleGridSizeChange}
              />
            </div>
          </InlineField>
        </BlockGroupField>
        <BlockGroupField label="General snap">
          <InlineField label="Ignore line">
            <ToggleInput value={userSetting.snapIgnoreLine === "on"} onChange={handleSnapIgnoreLineChange} />
          </InlineField>
          <InlineField label="Ignore non-overlapping pair">
            <ToggleInput
              value={userSetting.snapIgnoreNonoverlapPair === "on"}
              onChange={handleSnapIgnoreNonoverlapPairChange}
            />
          </InlineField>
        </BlockGroupField>
        <InlineField label="Attach to line">
          <ToggleInput value={userSetting.attachToLine === "on"} onChange={handleAttachToLineChange} />
        </InlineField>
        <InlineField label="Preview dialog">
          <ToggleInput value={userSetting.preview === "on"} onChange={handlePreviewChange} />
        </InlineField>
      </div>
    </div>
  );
};
