import { useCallback, useMemo } from "react";
import { BoxPadding } from "../../models";
import { PopupButton } from "../atoms/PopupButton";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { createBoxPadding } from "../../utils/boxPadding";
import iconPadding from "../../assets/icons/padding.svg";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  value?: BoxPadding;
  onChange?: (val: BoxPadding, draft?: boolean) => void;
}

export const BoxPaddingButton: React.FC<Props> = ({ popupedKey, setPopupedKey, value, onChange }) => {
  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="box-padding"
        opened={popupedKey === "box-padding"}
        popup={<BoxPaddingPanel value={value} onChange={onChange} />}
        onClick={setPopupedKey}
      >
        <img className="w-8 h-8" src={iconPadding} alt="Text padding" />
      </PopupButton>
    </div>
  );
};

interface BoxPaddingProps {
  value?: BoxPadding;
  onChange?: (value: BoxPadding, draft?: boolean) => void;
}

const BoxPaddingPanel: React.FC<BoxPaddingProps> = ({ onChange, value }) => {
  const currentValue = value ?? createBoxPadding();

  const sliderAttrs = useMemo(() => {
    return currentValue.type === "relative"
      ? {
          min: -1,
          max: 1,
          step: 0.01,
          showValue: true,
        }
      : {
          min: -100,
          max: 100,
          step: 1,
          showValue: true,
        };
  }, [currentValue]);

  const onRelativeChange = useCallback(
    (val: boolean) => {
      // Just reset each padding instead of conserve current padding.
      // => Keeping it requires parent bounds and it would be too complex for this feature.
      onChange?.(createBoxPadding(undefined, val ? "relative" : undefined));
    },
    [currentValue, onChange],
  );

  const onChangeTop = useCallback(
    (val: number, draft = false) => {
      onChange?.(
        { ...currentValue, value: [val, currentValue.value[1], currentValue.value[2], currentValue.value[3]] },
        draft,
      );
    },
    [currentValue, onChange],
  );

  const onChangeRight = useCallback(
    (val: number, draft = false) => {
      onChange?.(
        { ...currentValue, value: [currentValue.value[0], val, currentValue.value[2], currentValue.value[3]] },
        draft,
      );
    },
    [currentValue, onChange],
  );

  const onChangeBottom = useCallback(
    (val: number, draft = false) => {
      onChange?.(
        { ...currentValue, value: [currentValue.value[0], currentValue.value[1], val, currentValue.value[3]] },
        draft,
      );
    },
    [currentValue, onChange],
  );

  const onChangeLeft = useCallback(
    (val: number, draft = false) => {
      onChange?.(
        { ...currentValue, value: [currentValue.value[0], currentValue.value[1], currentValue.value[2], val] },
        draft,
      );
    },
    [currentValue, onChange],
  );

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={currentValue.type === "relative"} onChange={onRelativeChange}>
          Relative
        </ToggleInput>
      </div>
      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="w-24">
          <SliderInput {...sliderAttrs} value={currentValue.value[0]} onChanged={onChangeTop} />
        </div>
        <div className="flex gap-1">
          <div className="w-24">
            <SliderInput {...sliderAttrs} value={currentValue.value[3]} onChanged={onChangeLeft} />
          </div>
          <div className="w-24">
            <SliderInput {...sliderAttrs} value={currentValue.value[1]} onChanged={onChangeRight} />
          </div>
        </div>
        <div className="w-24">
          <SliderInput {...sliderAttrs} value={currentValue.value[2]} onChanged={onChangeBottom} />
        </div>
      </div>
    </div>
  );
};
