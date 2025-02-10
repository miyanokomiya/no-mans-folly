import { useCallback } from "react";
import iconDropdown from "../../assets/icons/dropdown.svg";
import iconCustom from "../../assets/icons/custom.svg";
import { InlineField } from "../atoms/InlineField";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { useUserSetting } from "../../hooks/storeHooks";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

export const FrameToolPanel: React.FC = () => {
  const [open, setOpen] = useLocalStorageAdopter({
    key: "frame-tool-panel",
    version: "1",
    initialValue: false,
    duration: 0,
  });
  const handleOpenClick = useCallback(() => {
    setOpen((v) => !v);
  }, [setOpen]);

  const [{ frameLabelSize }, patchUserSetting] = useUserSetting();
  const handleFrameLabelSizeChange = useCallback(
    (val: number) => {
      patchUserSetting({ frameLabelSize: val });
    },
    [patchUserSetting],
  );

  return (
    <div>
      <button
        type="button"
        onClick={handleOpenClick}
        className="w-full h-6 flex items-center justify-center border rounded-sm hover:bg-gray-200"
      >
        {open ? (
          <img src={iconDropdown} alt="Close tool panel" className="w-4 h-4" />
        ) : (
          <img src={iconCustom} alt="Open tool panel" className="w-4 h-4" />
        )}
      </button>
      {open ? (
        <div className="p-2">
          <InlineField label="Label size">
            <div className="w-40">
              <SliderInput
                value={frameLabelSize ?? 18}
                onChanged={handleFrameLabelSizeChange}
                min={0}
                max={100}
                step={1}
                showValue
              />
            </div>
          </InlineField>
        </div>
      ) : undefined}
    </div>
  );
};
