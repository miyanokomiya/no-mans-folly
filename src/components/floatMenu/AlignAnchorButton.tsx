import { useCallback, useMemo } from "react";
import { BoxAlign } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import iconTL from "../../assets/icons/anchor_tl.svg";
import iconTC from "../../assets/icons/anchor_tc.svg";
import iconTR from "../../assets/icons/anchor_tr.svg";
import iconCL from "../../assets/icons/anchor_cl.svg";
import iconCC from "../../assets/icons/anchor_cc.svg";
import iconCR from "../../assets/icons/anchor_cr.svg";
import iconBL from "../../assets/icons/anchor_bl.svg";
import iconBC from "../../assets/icons/anchor_bc.svg";
import iconBR from "../../assets/icons/anchor_br.svg";

const anchorList = [iconTL, iconTC, iconTR, iconCL, iconCC, iconCR, iconBL, iconBC, iconBR];
const altList = [
  "Top Left",
  "Top Center",
  "Top Right",
  "Center Left",
  "Center Center",
  "Center Right",
  "Bottom Left",
  "Bottom Center",
  "Bottom Right",
];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  boxAlign: BoxAlign;
  onChange?: (val: BoxAlign) => void;
}

export const AlignAnchorButton: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  boxAlign,
  onChange,
}) => {
  const index = useMemo(() => {
    let ret = 0;

    switch (boxAlign.hAlign) {
      case "center":
        ret += 1;
        break;
      case "right":
        ret += 2;
        break;
    }

    switch (boxAlign.vAlign) {
      case "center":
        ret += 3;
        break;
      case "bottom":
        ret += 6;
        break;
    }

    return ret;
  }, [boxAlign]);

  const onIndexChange = useCallback(
    (index: number) => {
      onChange?.({
        hAlign: (["left", "center", "right"] as const)[index % 3],
        vAlign: (["top", "center", "bottom"] as const)[Math.floor(index / 3)],
      });
    },
    [onChange],
  );

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="align-anchor"
        opened={popupedKey === "align-anchor"}
        popup={<AnchorPanel onClick={onIndexChange} />}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <img className="w-8 h-8" src={anchorList[index]} alt="Anchor" />
      </PopupButton>
    </div>
  );
};

interface AnchorPanelProps {
  onClick?: (index: number) => void;
}

const AnchorPanel: React.FC<AnchorPanelProps> = ({ onClick }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = parseInt(e.currentTarget.getAttribute("data-index")!);
      onClick?.(type);
    },
    [onClick],
  );

  const table = useMemo(() => {
    return anchorList.map((icon, i) => (
      <button key={icon} type="button" className="rounded border" data-index={i} onClick={onClickButton}>
        <img src={icon} alt={altList[i]} className="w-8 h-8" />
      </button>
    ));
  }, [onClickButton]);

  return <div className="w-max grid grid-cols-3 gap-1">{table}</div>;
};
