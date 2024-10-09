import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, LineDash, StrokeStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { getLineCap, getLineDap, getLineDashArrayWithCap, getLineJoin } from "../../utils/strokeStyle";
import { InlineField } from "../atoms/InlineField";
import { BlockGroupField } from "../atoms/BlockGroupField";

const LINE_DASH_KEYS: LineDash[] = ["dot", "short", "long", "solid"];
const LINE_CAP_KEYS: CanvasLineCap[] = ["butt", "square", "round"];
const LINE_JOIN_KEYS: CanvasLineJoin[] = ["bevel", "miter", "round"];

interface Props {
  stroke: StrokeStyle;
  onChanged?: (stroke: StrokeStyle, draft?: boolean) => void;
}

export const StrokePanel: React.FC<Props> = ({ stroke, onChanged }) => {
  const onColorChange = useCallback(
    (color: Color, draft = false) => {
      onChanged?.({ ...stroke, color: { ...color, a: stroke.color.a } }, draft);
    },
    [stroke, onChanged],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ ...stroke, color: { ...stroke.color, a: val } }, draft);
    },
    [onChanged, stroke],
  );

  const onWidthChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ ...stroke, width: val }, draft);
    },
    [onChanged, stroke],
  );

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.({ ...stroke, disabled: val });
    },
    [onChanged, stroke],
  );

  const onDashChanged = useCallback(
    (val: LineDash) => {
      onChanged?.({ ...stroke, dash: val === "solid" ? undefined : val });
    },
    [onChanged, stroke],
  );

  const dashButtons = (
    <InlineField label="Dash:">
      <div className="flex items-center justify-end gap-1">
        {LINE_DASH_KEYS.map((lineDash) => {
          return (
            <LineDashButton
              key={lineDash}
              lineDash={lineDash}
              highlight={lineDash === getLineDap(stroke.dash)}
              onClick={onDashChanged}
            />
          );
        })}
      </div>
    </InlineField>
  );

  const onCapChanged = useCallback(
    (val: CanvasLineCap) => {
      onChanged?.({ ...stroke, lineCap: val });
    },
    [onChanged, stroke],
  );

  const capButtons = (
    <InlineField label="Cap:">
      <div className="flex items-center justify-end gap-1">
        {LINE_CAP_KEYS.map((lineCap) => {
          return (
            <LineCapButton
              key={lineCap}
              lineCap={lineCap}
              highlight={lineCap === getLineCap(stroke.lineCap)}
              onClick={onCapChanged}
            />
          );
        })}
      </div>
    </InlineField>
  );

  const onJoinChanged = useCallback(
    (val: CanvasLineJoin) => {
      onChanged?.({ ...stroke, lineJoin: val });
    },
    [onChanged, stroke],
  );

  const joinButtons = (
    <InlineField label="Join:">
      <div className="flex items-center justify-end gap-1">
        {LINE_JOIN_KEYS.map((lineJoin) => {
          return (
            <LineJoinButton
              key={lineJoin}
              lineJoin={lineJoin}
              highlight={lineJoin === getLineJoin(stroke.lineJoin)}
              onClick={onJoinChanged}
            />
          );
        })}
      </div>
    </InlineField>
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
        <div>{capButtons}</div>
        <div>{joinButtons}</div>
        <div>{dashButtons}</div>
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

interface LineDashButtonProps {
  lineDash: LineDash;
  highlight?: boolean;
  onClick?: (lineDash: LineDash) => void;
}

const LineDashButton: React.FC<LineDashButtonProps> = ({ lineDash, highlight, onClick }) => {
  const dashArray = useMemo(() => {
    return getLineDashArrayWithCap(lineDash, "butt", 4).join(" ");
  }, [lineDash]);

  const handleClick = useCallback(() => {
    onClick?.(lineDash);
  }, [lineDash, onClick]);

  return (
    <button
      type="button"
      className={"w-8 h-8 p-1 flex item-center justify-center border rounded" + (highlight ? " border-sky-400" : "")}
      title={lineDash}
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <line stroke="#000" strokeWidth="4" strokeDasharray={dashArray} x1="2" y1="30" x2="30" y2="2" />
      </svg>
    </button>
  );
};

interface LineCapButtonProps {
  lineCap: CanvasLineCap;
  highlight?: boolean;
  onClick?: (val: CanvasLineCap) => void;
}

const LineCapButton: React.FC<LineCapButtonProps> = ({ lineCap, highlight, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(lineCap);
  }, [lineCap, onClick]);

  return (
    <button
      type="button"
      className={"w-8 h-8 p-1 flex item-center justify-center border rounded" + (highlight ? " border-sky-400" : "")}
      title={lineCap}
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path fill="none" stroke="#000" strokeWidth="12" strokeLinecap={lineCap} d="M6,15 L24,15" />
      </svg>
    </button>
  );
};

interface LineJoinButtonProps {
  lineJoin: CanvasLineJoin;
  highlight?: boolean;
  onClick?: (val: CanvasLineJoin) => void;
}

const LineJoinButton: React.FC<LineJoinButtonProps> = ({ lineJoin, highlight, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(lineJoin);
  }, [lineJoin, onClick]);

  return (
    <button
      type="button"
      className={"w-8 h-8 p-1 flex item-center justify-center border rounded" + (highlight ? " border-sky-400" : "")}
      title={lineJoin}
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path fill="none" stroke="#000" strokeWidth="10" strokeLinejoin={lineJoin} d="M6,28 L15,8 L24,28" />
      </svg>
    </button>
  );
};
