import { useCallback } from "react";
import { RGBA } from "../../models";
import { rednerRGBA } from "../../utils/color";

interface Props {
  palette: RGBA[];
  selected?: number;
  onClick?: (index: number) => void;
}

export const IndexedColors: React.FC<Props> = ({ selected, palette, onClick }) => {
  return (
    <div className="grid grid-cols-10 grid-flow-row">
      {palette.map((color, i) => {
        return <ColorIndexItem key={i} index={i} color={color} selected={i === selected} onClick={onClick} />;
      })}
    </div>
  );
};

interface ColorIndexItemProps {
  index: number;
  color: RGBA;
  selected?: boolean;
  onClick?: (index: number) => void;
}

const ColorIndexItem: React.FC<ColorIndexItemProps> = ({ index, color, selected, onClick }) => {
  const handleClick = useCallback(() => onClick?.(index), [index, onClick]);
  return (
    <button
      key={index}
      type="button"
      className={
        "w-6 h-6 border-2 flex items-center justify-center text-xs text-shadow-md text-shadow-white" +
        (selected ? " border-3 border-cyan-400 font-bold rounded-full" : "")
      }
      style={{ backgroundColor: rednerRGBA(color) }}
      onClick={handleClick}
    >
      {index}
    </button>
  );
};
