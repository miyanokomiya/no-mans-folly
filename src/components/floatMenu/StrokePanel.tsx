import { useCallback, useEffect, useMemo, useState } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, LineDash, StrokeStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { getLineCap, getLineDash, getLineDashArrayWithCap, getLineJoin } from "../../utils/strokeStyle";
import { InlineField } from "../atoms/InlineField";
import { BlockGroupField } from "../atoms/BlockGroupField";
import iconCustom from "../../assets/icons/custom.svg";
import { TextInput } from "../atoms/inputs/TextInput";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { RadioSelectInput } from "../atoms/inputs/RadioSelectInput";

const LINE_DASH_KEYS: LineDash[] = ["dot", "short", "long", "solid"];
const LINE_CAP_KEYS: CanvasLineCap[] = ["butt", "square", "round"];
const LINE_JOIN_KEYS: CanvasLineJoin[] = ["bevel", "miter", "round"];

interface Props {
  stroke: StrokeStyle;
  onChanged?: (stroke: Partial<StrokeStyle>, draft?: boolean) => void;
}

export const StrokePanel: React.FC<Props> = ({ stroke, onChanged }) => {
  const onColorChange = useCallback(
    (color: Color, draft = false) => {
      onChanged?.({ color: { ...color, a: stroke.color.a } }, draft);
    },
    [stroke, onChanged],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ color: { ...stroke.color, a: val } }, draft);
    },
    [onChanged, stroke],
  );

  const onWidthChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ width: val }, draft);
    },
    [onChanged],
  );

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.({ disabled: val });
    },
    [onChanged],
  );

  const onCapChanged = useCallback(
    (val: CanvasLineCap) => {
      onChanged?.({ lineCap: val });
    },
    [onChanged],
  );

  const onJoinChanged = useCallback(
    (val: CanvasLineJoin) => {
      onChanged?.({ lineJoin: val });
    },
    [onChanged],
  );

  return (
    <div className="p-2 w-max">
      <div className="flex justify-end">
        <ToggleInput value={stroke.disabled} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className="mt-2 flex items-center">
        <span>Width:</span>
        <div className="ml-2 flex-1">
          <SliderInput min={1} max={20} step={1} value={stroke.width ?? 1} onChanged={onWidthChanged} showValue />
        </div>
      </div>
      <BlockGroupField label="Stroke styles" accordionKey="stroke-style">
        <InlineField label="Cap:">
          <RadioSelectInput
            value={getLineCap(stroke.lineCap)}
            options={useMemo(getLineCapOptions, [])}
            onChange={onCapChanged}
          />
        </InlineField>
        <InlineField label="Join:">
          <RadioSelectInput
            value={getLineJoin(stroke.lineJoin)}
            options={useMemo(getLineJoinOptions, [])}
            onChange={onJoinChanged}
          />
        </InlineField>
        <LineDashField stroke={stroke} onChange={onChanged} />
      </BlockGroupField>
      <div className={stroke.disabled ? "opacity-50 pointer-events-none" : ""}>
        <div className="mt-2 flex items-center">
          <span>Alpha:</span>
          <div className="ml-2 flex-1">
            <SliderInput min={0} max={1} step={0.1} value={stroke.color.a} onChanged={onAlphaChanged} showValue />
          </div>
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={stroke.color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};

interface LineDashFieldProps {
  stroke: Pick<StrokeStyle, "dash" | "dashCustom">;
  onChange?: (stroke: Partial<StrokeStyle>, draft?: boolean) => void;
}

const LineDashField: React.FC<LineDashFieldProps> = ({ stroke, onChange }) => {
  const onDashChanged = useCallback(
    (val: LineDash) => {
      onChange?.({ dash: val === "solid" ? undefined : val });
    },
    [onChange],
  );

  const [customDashValue, setCustomDashValue] = useState("");
  useEffect(() => {
    setCustomDashValue((currentStr) => {
      const current = parseLineDashCustomValue(currentStr);
      const next = stroke.dashCustom?.dash.join(",") ?? "";
      if (current.join(",") === next) {
        // Keep current string when dash array doesn't change.
        // Draft dash array string, such as "1,2,", can be preserved by this way.
        return currentStr;
      }
      return next;
    });
  }, [stroke]);

  const commitDashCustom = useCallback(() => {
    onChange?.({ dashCustom: stroke.dashCustom });
  }, [onChange, stroke]);

  const onDashCustomValueChange = useCallback(
    (val: string) => {
      const current = parseLineDashCustomValue(customDashValue);
      const dash = parseLineDashCustomValue(val);
      if (current.join(",") !== dash.join(",")) {
        onChange?.({ dashCustom: { dash, valueType: "scale", offset: 0 } }, true);
      }
      setCustomDashValue(val);
    },
    [onChange, customDashValue],
  );

  const onDashCustomOffsetChange = useCallback(
    (val: number, draft = false) => {
      const dash = parseLineDashCustomValue(customDashValue);
      onChange?.({ dashCustom: { dash, valueType: "scale", offset: val } }, draft);
    },
    [onChange, customDashValue],
  );

  const lineDash = getLineDash(stroke.dash);

  return (
    <BlockGroupField label="Dash">
      <div className="flex justify-end">
        <RadioSelectInput value={lineDash} options={useMemo(getLineDashOptions, [])} onChange={onDashChanged} />
      </div>
      <InlineField label="Array:" inert={lineDash !== "custom"}>
        <div className="w-24">
          <TextInput
            value={customDashValue}
            onChange={onDashCustomValueChange}
            onBlur={commitDashCustom}
            keepFocus
            placeholder="1,2,3,4"
          />
        </div>
      </InlineField>
      <InlineField label="Offset:" inert={lineDash !== "custom"}>
        <div className="w-24">
          <NumberInput
            value={stroke.dashCustom?.offset ?? 0}
            onChange={onDashCustomOffsetChange}
            onBlur={commitDashCustom}
            slider
            keepFocus
          />
        </div>
      </InlineField>
    </BlockGroupField>
  );
};

function parseLineDashCustomValue(str: string): number[] {
  return str
    .split(/,/)
    .map((s) => parseFloat(s))
    .filter((v) => !isNaN(v))
    .map((v) => Math.max(0, v));
}

function getLineCapOptions() {
  return LINE_CAP_KEYS.map((value) => ({
    value,
    element: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 p-1">
        <path fill="none" stroke="#000" strokeWidth="12" strokeLinecap={value} d="M6,15 L24,15" />
      </svg>
    ),
  }));
}

function getLineJoinOptions() {
  return LINE_JOIN_KEYS.map((value) => ({
    value,
    element: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 p-1">
        <path fill="none" stroke="#000" strokeWidth="10" strokeLinejoin={value} d="M6,28 L15,8 L24,28" />
      </svg>
    ),
  }));
}

function getLineDashOptions() {
  const ret = LINE_DASH_KEYS.map((ld) => ({
    value: ld,
    element: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 p-1">
        <line
          stroke="#000"
          strokeWidth="4"
          strokeDasharray={getLineDashArrayWithCap({ dash: ld, lineCap: "butt", width: 4 }).join(" ")}
          x1="2"
          y1="30"
          x2="30"
          y2="2"
        />
      </svg>
    ),
  }));
  ret.push({
    value: "custom",
    element: <img src={iconCustom} alt="" className="w-8 h-8 p-1" />,
  });
  return ret;
}
