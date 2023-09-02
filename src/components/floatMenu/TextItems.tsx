import { useCallback, useMemo } from "react";
import { PopupButton } from "../atoms/PopupButton";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import iconAlignLeft from "../../assets/icons/align_left.svg";
import iconAlignCenter from "../../assets/icons/align_center.svg";
import iconAlignRight from "../../assets/icons/align_right.svg";
import iconDirectionTop from "../../assets/icons/direction_top.svg";
import iconDirectionMiddle from "../../assets/icons/direction_middle.svg";
import iconDirectionBottom from "../../assets/icons/direction_bottom.svg";
import { NumberCombobox } from "../atoms/inputs/NumberCombobox";

const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42].map((v) => ({ value: v, label: `${v}` }));

interface AlignPanelProps {
  onClick?: (value: string) => void;
}

const AlignPanel: React.FC<AlignPanelProps> = ({ onClick }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = e.currentTarget.getAttribute("data-type")!;
      onClick?.(type);
    },
    [onClick]
  );

  return (
    <div className="flex gap-1">
      <button type="button" className="w-8 p-1 rounded border" data-type="left" onClick={onClickButton}>
        <img src={iconAlignLeft} alt="Align Left" />
      </button>
      <button type="button" className="w-8 p-1 rounded border" data-type="center" onClick={onClickButton}>
        <img src={iconAlignCenter} alt="Align Center" />
      </button>
      <button type="button" className="w-8 p-1 rounded border" data-type="right" onClick={onClickButton}>
        <img src={iconAlignRight} alt="Align Right" />
      </button>
    </div>
  );
};

const DirectionPanel: React.FC<AlignPanelProps> = ({ onClick }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = e.currentTarget.getAttribute("data-type")!;
      onClick?.(type);
    },
    [onClick]
  );

  return (
    <div className="flex gap-1">
      <button type="button" className="w-8 p-1 rounded border" data-type="top" onClick={onClickButton}>
        <img src={iconDirectionTop} alt="Direction Top" />
      </button>
      <button type="button" className="w-8 p-1 rounded border" data-type="middle" onClick={onClickButton}>
        <img src={iconDirectionMiddle} alt="Direction Middle" />
      </button>
      <button type="button" className="w-8 p-1 rounded border" data-type="bottom" onClick={onClickButton}>
        <img src={iconDirectionBottom} alt="Direction Bottom" />
      </button>
    </div>
  );
};

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  onInlineChanged?: (val: DocAttributes) => void;
  onBlockChanged?: (val: DocAttributes) => void;
  onDocChanged?: (val: DocAttributes) => void;
  docAttrInfo: DocAttrInfo;
}

export const TextItems: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  onInlineChanged,
  onBlockChanged,
  onDocChanged,
  docAttrInfo,
}) => {
  const onAlignClick = useCallback(() => {
    setPopupedKey("align");
  }, [setPopupedKey]);

  const onAlignChanged = useCallback(
    (value: string) => {
      onBlockChanged?.({ align: value as any });
    },
    [onBlockChanged]
  );

  const alignIcon = useMemo(() => getAlignIcon(docAttrInfo), [docAttrInfo]);

  const onDirectionClick = useCallback(() => {
    setPopupedKey("direction");
  }, [setPopupedKey]);

  const onDirectionChanged = useCallback(
    (value: string) => {
      onDocChanged?.({ direction: value as any });
    },
    [onDocChanged]
  );

  const directionIcon = useMemo(() => getDirectionIcon(docAttrInfo), [docAttrInfo]);

  const onSizeChanged = useCallback(
    (value: number, draft = false) => {
      if (draft) return;
      onInlineChanged?.({ size: value });
    },
    [onInlineChanged]
  );

  const onActivateCombobox = useCallback(() => {
    setPopupedKey("");
  }, [setPopupedKey]);

  return (
    <div className="flex gap-1">
      <PopupButton
        name="align"
        opened={popupedKey === "align"}
        popup={<AlignPanel onClick={onAlignChanged} />}
        onClick={onAlignClick}
      >
        <div className="w-8 h-8 p-1 border rounded">
          <img src={alignIcon} alt="Align" />
        </div>
      </PopupButton>
      <PopupButton
        name="direction"
        opened={popupedKey === "direction"}
        popup={<DirectionPanel onClick={onDirectionChanged} />}
        onClick={onDirectionClick}
      >
        <div className="w-8 h-8 p-1 border rounded">
          <img src={directionIcon} alt="Direction" />
        </div>
      </PopupButton>
      <div className="w-12 h-full flex items-center">
        <NumberCombobox
          value={docAttrInfo.cursor?.size ?? 18}
          options={FONT_SIZE_OPTIONS}
          min={1}
          onChanged={onSizeChanged}
          onActivate={onActivateCombobox}
        />
      </div>
    </div>
  );
};

function getAlignIcon(docAttrInfo: DocAttrInfo) {
  switch (docAttrInfo.block?.align) {
    case "center":
      return iconAlignCenter;
    case "right":
      return iconAlignRight;
    default:
      return iconAlignLeft;
  }
}

function getDirectionIcon(docAttrInfo: DocAttrInfo) {
  switch (docAttrInfo.doc?.direction) {
    case "middle":
      return iconDirectionMiddle;
    case "bottom":
      return iconDirectionBottom;
    default:
      return iconDirectionTop;
  }
}
