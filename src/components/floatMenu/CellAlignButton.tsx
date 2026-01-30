import { useCallback, useMemo } from "react";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import iconCellCenter from "../../assets/icons/cell_inset_center.svg";
import iconCellLeft from "../../assets/icons/cell_inset_left.svg";
import iconCellTopLeft from "../../assets/icons/cell_inset_top_left.svg";
import { CellAlign } from "../../utils/layouts/table";

const iconList: [string, style: string, alt: string][] = [
  [iconCellTopLeft, "", "Top Left"],
  [iconCellLeft, "rotate-90", "Top Center"],
  [iconCellTopLeft, "rotate-90", "Top Right"],
  [iconCellLeft, "", "Center Left"],
  [iconCellCenter, "", "Center Center"],
  [iconCellLeft, "rotate-180", "Center Right"],
  [iconCellTopLeft, "-rotate-90", "Bottom Left"],
  [iconCellLeft, "-rotate-90", "Bottom Center"],
  [iconCellTopLeft, "rotate-180", "Bottom Right"],
];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  cellAlign: CellAlign;
  onChange?: (val: CellAlign) => void;
}

export const CellAlignButton: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  cellAlign,
  onChange,
}) => {
  const index = useMemo(() => {
    let ret = 0;

    switch (cellAlign.hAlign) {
      case "left":
        break;
      case "right":
        ret += 2;
        break;
      default:
        ret += 1;
        break;
    }

    switch (cellAlign.vAlign) {
      case "top":
        break;
      case "bottom":
        ret += 6;
        break;
      default:
        ret += 3;
        break;
    }

    return ret;
  }, [cellAlign]);

  const onIndexChange = useCallback(
    (index: number) => {
      onChange?.({
        hAlign: (["left", "center", "right"] as const)[index % 3],
        vAlign: (["top", "center", "bottom"] as const)[Math.floor(index / 3)],
      });
    },
    [onChange],
  );

  const iconInfo = iconList[index];

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="cell-align"
        opened={popupedKey === "cell-align"}
        popup={<AlignPanel index={index} onClick={onIndexChange} />}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <img className={"w-8 h-8 " + iconInfo[1]} src={iconInfo[0]} alt="Anchor" />
      </PopupButton>
    </div>
  );
};

interface AlignPanelProps {
  index: number;
  onClick?: (index: number) => void;
}

const AlignPanel: React.FC<AlignPanelProps> = ({ index, onClick }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = parseInt(e.currentTarget.getAttribute("data-index")!);
      onClick?.(type);
    },
    [onClick],
  );

  const table = useMemo(() => {
    return iconList.map(([icon, style, alt], i) => (
      <button
        key={icon + style}
        type="button"
        className={"rounded-xs border" + (index === i ? " bg-sky-200" : "")}
        data-index={i}
        onClick={onClickButton}
      >
        <img src={icon} alt={alt} className={"w-8 h-8 " + style} />
      </button>
    ));
  }, [index, onClickButton]);

  return (
    <div className="p-1">
      <div className="mt-1 w-max grid grid-cols-3 gap-1">{table}</div>
    </div>
  );
};
