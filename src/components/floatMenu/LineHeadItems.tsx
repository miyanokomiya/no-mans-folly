import { useCallback, useMemo } from "react";
import { LineHead } from "../../models";
import { PopupButton } from "../atoms/PopupButton";
import iconHeadNone from "../../assets/icons/head_none.svg";
import iconHeadClosedFilled from "../../assets/icons/head_closed_filled.svg";
import iconHeadClosedBlank from "../../assets/icons/head_closed_blank.svg";

const HEAD_ICONS = {
  none: iconHeadNone,
  closed_filled: iconHeadClosedFilled,
  closed_blank: iconHeadClosedBlank,
};

function getHeadIcon(type = "none"): string {
  return (HEAD_ICONS as any)[type] ?? "none";
}

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  pHead?: LineHead;
  qHead?: LineHead;
  onChange?: (val: { pHead?: LineHead; qHead?: LineHead }) => void;
}

export const LineHeadItems: React.FC<Props> = ({ popupedKey, setPopupedKey, pHead, qHead, onChange }) => {
  const onPHeadClick = useCallback(() => {
    setPopupedKey("line-p-head");
  }, [setPopupedKey]);

  const onPHeadChanged = useCallback(
    (value?: LineHead) => {
      onChange?.({ pHead: value });
    },
    [onChange]
  );

  const onQHeadClick = useCallback(() => {
    setPopupedKey("line-q-head");
  }, [setPopupedKey]);

  const onQHeadChanged = useCallback(
    (value?: LineHead) => {
      onChange?.({ qHead: value });
    },
    [onChange]
  );

  return (
    <div className="flex gap-1">
      <PopupButton
        name="line-p-head"
        opened={popupedKey === "line-p-head"}
        popup={<LineHeadPanel type={pHead?.type} onClick={onPHeadChanged} flip />}
        onClick={onPHeadClick}
      >
        <div className="w-8 h-8 p-1 border rounded" style={{ transform: "scaleX(-1)" }}>
          <img src={getHeadIcon(pHead?.type)} alt="Closed Filled" />
        </div>
      </PopupButton>
      <PopupButton
        name="line-q-head"
        opened={popupedKey === "line-q-head"}
        popup={<LineHeadPanel type={qHead?.type} onClick={onQHeadChanged} />}
        onClick={onQHeadClick}
      >
        <div className="w-8 h-8 p-1 border rounded">
          <img src={getHeadIcon(qHead?.type)} alt="Closed Filled" />
        </div>
      </PopupButton>
    </div>
  );
};

interface LineHeadPanelProps {
  type?: string;
  onClick?: (value?: LineHead) => void;
  flip?: boolean;
}

const LineHeadPanel: React.FC<LineHeadPanelProps> = ({ type, onClick, flip }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = e.currentTarget.getAttribute("data-type");
      if (!type || type === "none") {
        onClick?.(undefined);
      } else {
        onClick?.({ type });
      }
    },
    [onClick]
  );

  const iconStyle = useMemo(() => {
    return flip ? { transform: "scaleX(-1)" } : {};
  }, [flip]);

  const items = useMemo(() => {
    return ["none", "closed_filled"].map((t) => {
      const selected = type ? type === t : t === "none";
      return (
        <button
          key={t}
          type="button"
          className={"w-8 p-1 rounded border" + (selected ? " border-cyan-400" : "")}
          data-type={t}
          onClick={onClickButton}
        >
          <img src={getHeadIcon(t)} alt={t} style={iconStyle} />
        </button>
      );
    });
  }, [type, onClickButton, iconStyle]);

  return <div className="flex gap-1">{items}</div>;
};
