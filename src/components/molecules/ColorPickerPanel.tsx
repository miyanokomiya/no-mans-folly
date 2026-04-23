import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, RGBA } from "../../models";
import {
  COLORS,
  HSVA,
  colorToHex,
  hexToColor,
  hsvaToRgba,
  isIndexedColor,
  isPartialRGBA,
  isSameColor,
  rednerRGBA,
  resolveColor,
  rgbaToHsva,
} from "../../utils/color";
import { useColorPalette } from "../../hooks/storeHooks";
import { useGlobalDrag } from "../../hooks/window";
import { clamp } from "okageo";
import { TextInput } from "../atoms/inputs/TextInput";
import eyeDropperIcon from "../../assets/icons/eyedropper.svg";
import { isEyedropperAvailable } from "../../utils/devices";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { IndexedColors } from "./IndexedColors";

const getV = (i: number) => clamp(0, 255, 51 * i);
const base = [...Array(5)].map((_, i) => i - 2);
const COLOR_TABLE: RGBA[][] = [
  [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 64, g: 64, b: 64, a: 1 },
    { r: 127, g: 127, b: 127, a: 1 },
    { r: 191, g: 191, b: 191, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
  ],
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i + 2.5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 2.5), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i + 2.5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 2.5), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 2.5), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i + 2.5), a: 1 })),
];
const COLOR_GROUP_SIZE = COLOR_TABLE.length;

const ColorPickerItem: React.FC<{ color: RGBA; onClick?: (color: RGBA) => void }> = (props) => {
  const palette = useColorPalette();
  const onClick = useCallback(() => {
    props.onClick?.(props.color);
  }, [props]);

  return (
    <button
      type="button"
      className="w-4.5 h-4.5 border"
      style={{ backgroundColor: rednerRGBA(resolveColor(props.color, palette)) }}
      onClick={onClick}
    ></button>
  );
};

interface ColorPickerPanelProps {
  color?: Color;
  onChange?: (color: Partial<Color>, draft?: boolean) => void;
  alphaDisabled?: boolean;
  indexedColorDisabled?: boolean;
}

export const ColorPickerPanel: React.FC<ColorPickerPanelProps> = ({
  color,
  onChange,
  alphaDisabled,
  indexedColorDisabled,
}) => {
  const palette = useColorPalette();
  const [colorHistory, setColorHistory] = useLocalStorageAdopter<RGBA[]>({
    key: "color-history",
    version: "1",
    initialValue: () => [],
    duration: 0,
  });
  const colorValue = color ?? COLORS.BLACK;
  const actualColor: RGBA = useMemo(() => resolveColor(colorValue, palette), [colorValue, palette]);
  const hsva = useMemo(() => rgbaToHsva(actualColor), [actualColor]);

  const handleColorChange = useCallback(
    (val: Partial<Color>, draft?: boolean) => {
      if (isPartialRGBA(val)) {
        onChange?.({ ...val, index: undefined }, draft);
      } else {
        onChange?.({ index: val.index }, draft);
      }
    },
    [onChange],
  );

  const handleRGBAChange = useCallback(
    (val: Partial<RGBA>, draft?: boolean) => {
      handleColorChange?.(val, draft);
      const nextColor = { ...actualColor, ...val };

      if (!draft) {
        setColorHistory((v) => {
          const next = v.filter((a) => !isSameColor(a, nextColor));
          next.unshift(nextColor);
          return next.slice(0, COLOR_GROUP_SIZE * 2);
        });
      }
    },
    [handleColorChange, setColorHistory, actualColor],
  );

  const table = useMemo(
    () =>
      COLOR_TABLE.map((line) => {
        return line.map((item) => {
          return <ColorPickerItem key={rednerRGBA(item)} color={item} onClick={handleRGBAChange} />;
        });
      }),
    [handleRGBAChange],
  );

  // Keep HSVA detail as much as possible even if it's lost by RGBA converting.
  const [hsvaCache, setHsvaCache] = useState(hsva);
  useLayoutEffect(() => {
    if (hsva.v === 0) {
      setHsvaCache((prev) => ({ ...hsva, h: prev.h, s: prev.s }));
    } else if (hsva.s === 0) {
      setHsvaCache((prev) => ({ ...hsva, h: prev.h }));
    } else {
      setHsvaCache(hsva);
    }
  }, [hsva]);

  const handleHSVChange = useCallback(
    (val: HSVA, draft = false) => {
      setHsvaCache(val);
      const rgba = hsvaToRgba(val);
      handleRGBAChange?.({ r: rgba.r, g: rgba.g, b: rgba.b }, draft);
    },
    [handleRGBAChange],
  );

  const handleHueChange = useCallback(
    (val: number, draft = false) => {
      const nextHsva = { ...hsva, h: val };
      setHsvaCache(nextHsva);
      const rgba = hsvaToRgba(nextHsva);
      handleRGBAChange?.({ r: rgba.r, g: rgba.g, b: rgba.b }, draft);
    },
    [hsva, handleRGBAChange],
  );

  const handleEyedropperClick = useCallback(async () => {
    let hex: string | undefined;
    try {
      const eyedropper = new (window as any).EyeDropper();
      const result = await eyedropper.open();
      hex = result.sRGBHex;
    } catch (e) {
      // DOMException happens when the user cancels the operation.
      if (!(e instanceof DOMException)) throw e;
    }
    if (!hex) return;

    handleRGBAChange?.(hexToColor(hex));
  }, [handleRGBAChange]);

  const handleAlphaChanged = useCallback(
    (val: number, draft = false) => {
      handleColorChange?.({ a: val }, draft);
    },
    [handleColorChange],
  );

  const handleIndexedColorClick = useCallback(
    (val: number) => {
      handleColorChange?.({ index: val });
    },
    [handleColorChange],
  );

  return (
    <div className="flex flex-col gap-1">
      {indexedColorDisabled ? undefined : (
        <IndexedColors
          palette={palette}
          selected={isIndexedColor(colorValue) ? colorValue.index : undefined}
          onClick={handleIndexedColorClick}
        />
      )}
      <div>
        {alphaDisabled ? undefined : (
          <div className="flex items-center">
            <span>Alpha:</span>
            <div className="ml-2 flex-1">
              <SliderInput min={0} max={1} step={0.1} value={actualColor.a} onChanged={handleAlphaChanged} showValue />
            </div>
          </div>
        )}
        <div className="grid grid-rows-5 grid-flow-col">{table}</div>
        {colorHistory.length > 0 ? (
          <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${COLOR_GROUP_SIZE}, minmax(0, 1fr))` }}>
            {colorHistory.map((color) => (
              <ColorPickerItem key={rednerRGBA(color)} color={color} onClick={handleRGBAChange} />
            ))}
          </div>
        ) : undefined}
      </div>
      <BlockGroupField label="Color detail" accordionKey="color-detail">
        <HSVColorRect hsva={hsvaCache} onChange={handleHSVChange} />
        <HueBar value={hsvaCache.h} onChange={handleHueChange} />
        <div className="flex items-center">
          {isEyedropperAvailable() ? (
            <button
              type="button"
              className="w-8 h-8 border rounded-xs flex items-center justify-center"
              onClick={handleEyedropperClick}
            >
              <img src={eyeDropperIcon} alt="Eyedropper" className="w-6 h-6" />
            </button>
          ) : undefined}
          <div className="ml-auto">
            <HexField {...actualColor} onChange={handleRGBAChange} />
          </div>
        </div>
      </BlockGroupField>
    </div>
  );
};

interface HSVColorRectProps {
  hsva: HSVA;
  onChange?: (val: HSVA, draft?: boolean) => void;
}

export const HSVColorRect: React.FC<HSVColorRectProps> = ({ hsva, onChange }) => {
  const baseColor = useMemo(() => {
    return rednerRGBA(hsvaToRgba({ h: hsva.h, s: 1, v: 1, a: 1 }));
  }, [hsva]);

  const rectElm = useRef<HTMLDivElement>(null);

  const emit = useCallback(
    (e: { pageX: number; pageY: number }, draft = false) => {
      if (!rectElm.current) return;

      const bounds = rectElm.current.getBoundingClientRect();
      const rate = { x: (e.pageX - bounds.left) / bounds.width, y: (e.pageY - bounds.top) / bounds.height };
      onChange?.({ h: hsva.h, s: clamp(0, 1, rate.x), v: clamp(0, 1, 1 - rate.y), a: 1 }, draft);
    },
    [hsva.h, onChange],
  );

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e) => {
        e.preventDefault();
        emit(e, true);
      },
      [emit],
    ),
    useCallback(
      (e) => {
        emit(e);
      },
      [emit],
    ),
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startDragging();
      emit(e.nativeEvent, true);
    },
    [startDragging, emit],
  );

  return (
    <div
      ref={rectElm}
      className="h-24 w-full"
      style={{
        backgroundColor: baseColor,
        backgroundImage:
          "linear-gradient(rgba(0, 0, 0, 0), rgb(0, 0, 0)), linear-gradient(to right, rgb(255, 255, 255), rgba(255, 255, 255, 0))",
      }}
      onPointerDown={handlePointerDown}
    >
      <div
        className="w-full h-full pointer-events-none"
        style={{ transform: `translate(${hsva.s * 100}%,${(1 - hsva.v) * 100}%)` }}
      >
        <div
          className="bg-white border border-black rounded-full w-3 h-3"
          style={{ transform: `translate(-50%, -50%)` }}
        />
      </div>
    </div>
  );
};

interface HueBarProps {
  value: number;
  onChange?: (val: number, draft?: boolean) => void;
}

export const HueBar: React.FC<HueBarProps> = ({ value, onChange }) => {
  const rectElm = useRef<HTMLDivElement>(null);

  const emitDraft = useCallback(
    (e: MouseEvent) => {
      if (!rectElm.current) return;

      const bounds = rectElm.current.getBoundingClientRect();
      const rate = (e.pageX - bounds.left) / bounds.width;
      onChange?.(clamp(0, 1, rate) * 360, true);
    },
    [onChange],
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      emitDraft(e);
    },
    [emitDraft],
  );

  const handlePointerUp = useCallback(() => {
    onChange?.(value);
  }, [value, onChange]);

  const { startDragging } = useGlobalDrag(handlePointerMove, handlePointerUp);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startDragging();
      emitDraft(e.nativeEvent);
    },
    [startDragging, emitDraft],
  );

  return (
    <div
      ref={rectElm}
      className="h-4 w-full"
      style={{
        background: "linear-gradient(to right, #f00 0, #ff0 16%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 84%, #ff0004 100%)",
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="w-full h-full pointer-events-none" style={{ transform: `translateX(${(value / 360) * 100}%)` }}>
        <div className="bg-white border border-black rounded-full w-1 h-4" style={{ transform: `translateX(-50%)` }} />
      </div>
    </div>
  );
};

interface HexFieldProps {
  r: number;
  g: number;
  b: number;
  onChange?: (color: RGBA, draft?: boolean) => void;
}

export const HexField: React.FC<HexFieldProps> = ({ r, g, b, onChange }) => {
  const hex = useMemo(() => colorToHex({ r: Math.round(r), g: Math.round(g), b: Math.round(b), a: 1 }), [r, g, b]);
  const [draftValue, setDraftValue] = useState(hex);
  useLayoutEffect(() => {
    setDraftValue(hex.replace("#", ""));
  }, [hex]);

  const finish = useCallback(() => {
    onChange?.(hexToColor(`#${draftValue.replace("#", "")}`));
  }, [onChange, draftValue]);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent) => {
      e.preventDefault();
      finish();
    },
    [finish],
  );

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <div className="w-8 h-8 rounded-xs border" style={{ backgroundColor: hex }} />
      <div className="w-20 flex items-center">
        <span className="text-lg">#</span>
        <TextInput value={draftValue} onChange={setDraftValue} onBlur={finish} keepFocus placeholder="000000" />
      </div>
    </form>
  );
};
