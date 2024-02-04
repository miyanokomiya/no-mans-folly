import { useCallback, useMemo, useRef } from "react";
import { Color } from "../../models";
import { HSVA, hsvaToRgba, rednerRGBA, rgbaToHsva } from "../../utils/color";
import { useGlobalDrag } from "../../composables/window";
import { clamp } from "okageo";

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

interface Option {
  color?: Color;
  onChange?: (color: Color, draft?: boolean) => void;
}

export const ColorPickerPanel: React.FC<Option> = ({ color, onChange }) => {
  const table = useMemo(
    () =>
      COLOR_TABLE.map((line) => {
        return line.map((item) => {
          return <ColorPickerItem key={rednerRGBA(item)} color={item} onClick={onChange} />;
        });
      }),
    [onChange],
  );

  const hsva = useMemo(() => (color ? rgbaToHsva(color) : { h: 0, s: 0, v: 0, a: 1 }), [color]);

  const handleHSVAChange = useCallback(
    (val: HSVA, draft = false) => {
      onChange?.(hsvaToRgba(val), draft);
    },
    [onChange],
  );

  const handleHueChange = useCallback(
    (val: number, draft = false) => {
      onChange?.(hsvaToRgba({ ...hsva, h: val }), draft);
    },
    [hsva, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-rows-5 grid-flow-col gap-1">{table}</div>
      <HSVColorRect hsva={hsva} onChange={handleHSVAChange} />
      <HueBar value={hsva.h} onChange={handleHueChange} />
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
