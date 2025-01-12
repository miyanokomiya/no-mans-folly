import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color } from "../../models";
import { COLORS, HSVA, colorToHex, hexToColor, hsvaToRgba, rednerRGBA, rgbaToHsva } from "../../utils/color";
import { useGlobalDrag } from "../../hooks/window";
import { clamp } from "okageo";
import { TextInput } from "../atoms/inputs/TextInput";
import eyeDropperIcon from "../../assets/icons/eyedropper.svg";
import { isEyedropperAvailable } from "../../utils/devices";
import { BlockGroupField } from "../atoms/BlockGroupField";

const v = 51;
const getV = (i: number) => Math.min(Math.max(v * i, 0), 255);
const base = [...Array(5)].map((_, i) => i - 2);
const COLOR_TABLE: Color[][] = [
  [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 64, g: 64, b: 64, a: 1 },
    { r: 127, g: 127, b: 127, a: 1 },
    { r: 191, g: 191, b: 191, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
  ],
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i + 5), a: 1 })),
];

const ColorPickerItem: React.FC<{ color: Color; onClick?: (color: Color) => void }> = (props) => {
  const onClick = useCallback(() => {
    props.onClick?.(props.color);
  }, [props]);

  return (
    <button
      type="button"
      className="w-6 h-6 border rounded-full"
      style={{ backgroundColor: rednerRGBA(props.color) }}
      onClick={onClick}
    ></button>
  );
};

interface ColorPickerPanelProps {
  color?: Color;
  onChange?: (color: Color, draft?: boolean) => void;
}

export const ColorPickerPanel: React.FC<ColorPickerPanelProps> = ({ color, onChange }) => {
  const table = useMemo(
    () =>
      COLOR_TABLE.map((line) => {
        return line.map((item) => {
          return <ColorPickerItem key={rednerRGBA(item)} color={item} onClick={onChange} />;
        });
      }),
    [onChange],
  );

  const actualColor = color ?? COLORS.BLACK;
  const hsva = useMemo(() => rgbaToHsva(actualColor), [actualColor]);

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

  const handleHSVAChange = useCallback(
    (val: HSVA, draft = false) => {
      setHsvaCache(val);
      onChange?.(hsvaToRgba(val), draft);
    },
    [onChange],
  );

  const handleHueChange = useCallback(
    (val: number, draft = false) => {
      const nextHsva = { ...hsva, h: val };
      setHsvaCache(nextHsva);
      onChange?.(hsvaToRgba(nextHsva), draft);
    },
    [hsva, onChange],
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

    onChange?.(hexToColor(hex));
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-rows-5 grid-flow-col gap-1">{table}</div>
      <BlockGroupField label="Color detail" accordionKey="color-detail">
        <HSVColorRect hsva={hsvaCache} onChange={handleHSVAChange} />
        <HueBar value={hsvaCache.h} onChange={handleHueChange} />
        <div className="flex items-center">
          {isEyedropperAvailable() ? (
            <button
              type="button"
              className="w-8 h-8 border rounded flex items-center justify-center"
              onClick={handleEyedropperClick}
            >
              <img src={eyeDropperIcon} alt="Eyedropper" className="w-6 h-6" />
            </button>
          ) : undefined}
          <div className="ml-auto">
            <HexField {...actualColor} onChange={onChange} />
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
  onChange?: (color: Color, draft?: boolean) => void;
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
    (e: React.FormEvent) => {
      e.preventDefault();
      finish();
    },
    [finish],
  );

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <div className="w-8 h-8 rounded border" style={{ backgroundColor: hex }} />
      <div className="w-20 flex items-center">
        <span className="text-lg">#</span>
        <TextInput value={draftValue} onChange={setDraftValue} onBlur={finish} keepFocus placeholder="000000" />
      </div>
    </form>
  );
};
