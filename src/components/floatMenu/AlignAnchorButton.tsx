import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BoxAlign } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import iconExpandDirectionTL from "../../assets/icons/expand_direction_tl.svg";
import iconExpandDirectionT from "../../assets/icons/expand_direction_t.svg";
import iconExpandDirectionNewtral from "../../assets/icons/expand_direction_newtral.svg";

const iconList: [string, style: string, alt: string][] = [
  [iconExpandDirectionTL, "", "Top Left"],
  [iconExpandDirectionT, "", "Top Center"],
  [iconExpandDirectionTL, "rotate-90", "Top Right"],
  [iconExpandDirectionT, "-rotate-90", "Center Left"],
  [iconExpandDirectionNewtral, "", "Center Center"],
  [iconExpandDirectionT, "rotate-90", "Center Right"],
  [iconExpandDirectionTL, "-rotate-90", "Bottom Left"],
  [iconExpandDirectionT, "rotate-180", "Bottom Center"],
  [iconExpandDirectionTL, "rotate-180", "Bottom Right"],
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
      case "right":
        break;
      case "center":
        ret += 1;
        break;
      default:
        ret += 2;
        break;
    }

    switch (boxAlign.vAlign) {
      case "bottom":
        break;
      case "center":
        ret += 3;
        break;
      default:
        ret += 6;
        break;
    }

    return ret;
  }, [boxAlign]);

  const onIndexChange = useCallback(
    (index: number) => {
      onChange?.({
        hAlign: (["right", "center", "left"] as const)[index % 3],
        vAlign: (["bottom", "center", "top"] as const)[Math.floor(index / 3)],
      });
    },
    [onChange],
  );

  const iconInfo = iconList[index];

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="align-anchor"
        opened={popupedKey === "align-anchor"}
        popup={<AnchorPanel index={index} onClick={onIndexChange} />}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <img className={"w-8 h-8 " + iconInfo[1]} src={iconInfo[0]} alt="Anchor" />
      </PopupButton>
    </div>
  );
};

interface AnchorPanelProps {
  index: number;
  onClick?: (index: number) => void;
}

const AnchorPanel: React.FC<AnchorPanelProps> = ({ index, onClick }) => {
  const { t } = useTranslation();

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
      <p>{t("floatmenu.grow_direction")}</p>
      <div className="mt-1 w-max grid grid-cols-3 gap-1">{table}</div>
    </div>
  );
};
