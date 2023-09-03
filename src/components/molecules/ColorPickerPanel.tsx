import { useCallback, useMemo } from "react";
import { Color } from "../../models";
import { rednerRGBA } from "../../utils/color";

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
      className="w-8 h-8 border rounded-full"
      style={{ backgroundColor: rednerRGBA(props.color) }}
      onClick={onClick}
    ></button>
  );
};

interface Option {
  onClick?: (color: Color) => void;
}

export const ColorPickerPanel: React.FC<Option> = ({ onClick }) => {
  const table = useMemo(
    () =>
      COLOR_TABLE.map((line) => {
        return line.map((item) => {
          return (
            <div key={rednerRGBA(item)}>
              <ColorPickerItem color={item} onClick={onClick} />
            </div>
          );
        });
      }),
    [onClick]
  );

  return (
    <div className="">
      <div className="grid grid-rows-5 grid-flow-col gap-1">{table}</div>
    </div>
  );
};
