import { useCallback, useState } from "react";
import { ToggleInput } from "./atoms/inputs/ToggleInput";
import { SelectInput } from "./atoms/inputs/SelectInput";
import { InlineField } from "./atoms/InlineField";
import { Color, UserSetting } from "../models";
import { BlockGroupField } from "./atoms/BlockGroupField";
import { NumberInput } from "./atoms/inputs/NumberInput";
import { useUserSetting } from "../hooks/storeHooks";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { PopupButton } from "./atoms/PopupButton";
import { ColorPickerPanel } from "./molecules/ColorPickerPanel";
import { parseRGBA, rednerRGBA } from "../utils/color";
import { GRID_DEFAULT_COLOR } from "../composables/grid";

const modifierSupportOptions: { value: Exclude<UserSetting["virtualKeyboard"], undefined>; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "modifiers", label: "Modifiers" },
];

const listDetectionOptions: { value: Exclude<UserSetting["listDetection"], undefined>; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "shift", label: "Reverse" },
];

const gridTypeOptions: { value: Exclude<UserSetting["gridType"], undefined>; label: string }[] = [
  { value: "dot", label: "Dot" },
  { value: "line", label: "Line" },
  { value: "dash", label: "Dash" },
];

const displayModeOptions: { value: Exclude<UserSetting["displayMode"], undefined>; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "no-hud", label: "No HUD" },
];

export const UserSettingPanel: React.FC = () => {
  const [userSetting, patchUserSetting] = useUserSetting();
  const [popupedKey, setPopupedKey] = useState<string>();
  const closePopup = useCallback(() => setPopupedKey(undefined), []);

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

  const handleListDetectionChange = useCallback(
    (val: string) => {
      patchUserSetting({ listDetection: val as any });
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

  const handleGridTypeChange = useCallback(
    (val: string) => {
      patchUserSetting({ gridType: val as any });
    },
    [patchUserSetting],
  );

  const handleGridColorChange = useCallback(
    (val: Color) => {
      patchUserSetting({ gridColor: rednerRGBA(val) });
    },
    [patchUserSetting],
  );

  const handleGridOrderChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ gridOrder: val ? "front" : "back" });
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

  const handleDisplayModeChange = useCallback(
    (val: string) => {
      patchUserSetting({ displayMode: val as any });
    },
    [patchUserSetting],
  );

  const handleShowAttachmentChange = useCallback(
    (val: boolean) => {
      patchUserSetting({ showAttachment: val ? "on" : "off" });
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
        <BlockGroupField label="Text">
          <InlineField label="List detection">
            <div className="w-24">
              <SelectInput
                value={userSetting.listDetection ?? "auto"}
                options={listDetectionOptions}
                onChange={handleListDetectionChange}
              />
            </div>
          </InlineField>
          <div className="text-sm text-right">
            {userSetting.listDetection === "shift" ? (
              <>
                <p>With shift key: Start a list</p>
                <p>Without shift key: Keep as text</p>
              </>
            ) : (
              <>
                <p>With shift key: Keep as text</p>
                <p>Without shift key: Start a list</p>
              </>
            )}
          </div>
        </BlockGroupField>
        <BlockGroupField label="Grid">
          <InlineField label="On">
            <ToggleInput value={userSetting.grid !== "off"} onChange={handleGridChange} />
          </InlineField>
          <InlineField label="Overlay">
            <ToggleInput value={userSetting.gridOrder === "front"} onChange={handleGridOrderChange} />
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
          <InlineField label="Type">
            <div className="w-24">
              <SelectInput
                value={userSetting.gridType ?? "dot"}
                options={gridTypeOptions}
                onChange={handleGridTypeChange}
              />
            </div>
          </InlineField>
          <InlineField label="Color">
            <OutsideObserver onClick={closePopup}>
              <PopupButton
                name="bgColor"
                opened={popupedKey === "bgColor"}
                popup={
                  <div className="p-2">
                    <ColorPickerPanel
                      color={parseRGBA(userSetting.gridColor ?? GRID_DEFAULT_COLOR)}
                      onChange={handleGridColorChange}
                    />
                  </div>
                }
                onClick={setPopupedKey}
                popupPosition="left"
              >
                <div
                  className="w-6 h-6 border-2 rounded-full"
                  style={{ backgroundColor: userSetting.gridColor ?? GRID_DEFAULT_COLOR }}
                />
              </PopupButton>
            </OutsideObserver>
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
        <InlineField label="Show pinned relation">
          <ToggleInput value={userSetting.showAttachment === "on"} onChange={handleShowAttachmentChange} />
        </InlineField>
        <InlineField label="Preview dialog">
          <ToggleInput value={userSetting.preview === "on"} onChange={handlePreviewChange} />
        </InlineField>
        <InlineField label="Display mode">
          <div className="w-24">
            <SelectInput
              value={userSetting.displayMode ?? "default"}
              options={displayModeOptions}
              onChange={handleDisplayModeChange}
            />
          </div>
        </InlineField>
      </div>
    </div>
  );
};
