import { useCallback, useMemo } from "react";
import { PopupDirection, PopupButton } from "../atoms/PopupButton";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import iconAlignLeft from "../../assets/icons/align_left.svg";
import iconAlignCenter from "../../assets/icons/align_center.svg";
import iconAlignRight from "../../assets/icons/align_right.svg";
import iconDirectionTop from "../../assets/icons/direction_top.svg";
import iconDirectionMiddle from "../../assets/icons/direction_middle.svg";
import iconDirectionBottom from "../../assets/icons/direction_bottom.svg";
import iconLineheight from "../../assets/icons/lineheight.svg";
import { NumberCombobox } from "../atoms/inputs/NumberCombobox";
import { TextColorPanel } from "./texts/TextColorPanel";
import { TextDecoration } from "./texts/TextDecoration";
import { TextBackgroundPanel } from "./texts/TextBackgroundPanel";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { DEFAULT_FONT_SIZE, DEFAULT_LINEHEIGHT } from "../../utils/textEditorCore";
import { TextColorBgIcon, TextColorIcon } from "../atoms/icons/TextColorIcon";
import { TextLink } from "./texts/TextLink";
import { RadioSelectInput } from "../atoms/inputs/RadioSelectInput";

const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42].map((v) => ({ value: v, label: `${v}` }));

interface AlignPanelProps {
  value: string;
  onClick?: (value: string) => void;
}

const AlignPanel: React.FC<AlignPanelProps> = ({ value, onClick }) => {
  const onClickButton = useCallback(
    (val: string) => {
      onClick?.(val);
    },
    [onClick],
  );

  const options = useMemo(
    () => [
      { value: "left", element: <img src={iconAlignLeft} alt="Align Left" className="w-8 h-8 p-1" /> },
      { value: "center", element: <img src={iconAlignCenter} alt="Align Center" className="w-8 h-8 p-1" /> },
      { value: "right", element: <img src={iconAlignRight} alt="Align Right" className="w-8 h-8 p-1" /> },
    ],
    [],
  );

  return (
    <div className="p-1">
      <RadioSelectInput value={value} options={options} onChange={onClickButton} />
    </div>
  );
};

interface DirectionPanelProps {
  value: string;
  onClick?: (value: string) => void;
}

const DirectionPanel: React.FC<DirectionPanelProps> = ({ value, onClick }) => {
  const onClickButton = useCallback(
    (val: string) => {
      onClick?.(val);
    },
    [onClick],
  );

  const options = useMemo(
    () => [
      { value: "top", element: <img src={iconDirectionTop} alt="Direction Top" className="w-8 h-8 p-1" /> },
      {
        value: "middle",
        element: <img src={iconDirectionMiddle} alt="Direction Middle" className="w-8 h-8 p-1" />,
      },
      {
        value: "bottom",
        element: <img src={iconDirectionBottom} alt="Direction Bottom" className="w-8 h-8 p-1" />,
      },
    ],
    [],
  );

  return (
    <div className="p-1">
      <RadioSelectInput value={value} options={options} onChange={onClickButton} />
    </div>
  );
};

interface LineheightPanelProps {
  value: number;
  onChange?: (value: number, draft?: boolean) => void;
}

const LineheightPanel: React.FC<LineheightPanelProps> = ({ value, onChange }) => {
  return (
    <div className="w-40 p-1">
      <SliderInput min={0.5} max={3} step={0.1} value={value} onChanged={onChange} showValue={true} />
    </div>
  );
};

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string, option?: { keepFocus?: boolean }) => void;
  defaultDirection?: PopupDirection; // bottom by default
  onInlineChanged?: (val: DocAttributes, draft?: boolean) => void;
  onBlockChanged?: (val: DocAttributes, draft?: boolean) => void;
  onDocChanged?: (val: DocAttributes, draft?: boolean) => void;
  docAttrInfo: DocAttrInfo;
  textEditing: boolean;
}

export const TextItems: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  onInlineChanged,
  onBlockChanged,
  onDocChanged,
  docAttrInfo,
  textEditing,
}) => {
  const onAlignClick = useCallback(() => {
    setPopupedKey("align");
  }, [setPopupedKey]);

  const onAlignChanged = useCallback(
    (value: string) => {
      onBlockChanged?.({ align: value as any });
    },
    [onBlockChanged],
  );

  const alignIcon = useMemo(() => getAlignIcon(docAttrInfo), [docAttrInfo]);

  const onDirectionClick = useCallback(() => {
    setPopupedKey("direction");
  }, [setPopupedKey]);

  const onDirectionChanged = useCallback(
    (value: string) => {
      onDocChanged?.({ direction: value as any });
    },
    [onDocChanged],
  );

  const onLineheightChanged = useCallback(
    (value: number, draft?: boolean) => {
      onBlockChanged?.({ lineheight: value }, draft);
    },
    [onBlockChanged],
  );

  const directionIcon = useMemo(() => getDirectionIcon(docAttrInfo), [docAttrInfo]);

  const onSizeChanged = useCallback(
    (value: number, draft = false) => {
      if (draft) return;
      onInlineChanged?.({ size: value });
    },
    [onInlineChanged],
  );

  const onActivateCombobox = useCallback(() => {
    setPopupedKey("", { keepFocus: true });
  }, [setPopupedKey]);

  const onColorChanged = useCallback(
    (value: string, draft?: boolean) => {
      onInlineChanged?.({ color: value }, draft);
    },
    [onInlineChanged],
  );

  const onBackgroundChanged = useCallback(
    (value?: string, draft?: boolean) => {
      onInlineChanged?.({ background: value ?? null }, draft);
    },
    [onInlineChanged],
  );

  return (
    <div className="flex gap-1 items-center">
      <div className="w-12 h-full flex items-center">
        <NumberCombobox
          value={docAttrInfo.cursor?.size ?? DEFAULT_FONT_SIZE}
          options={FONT_SIZE_OPTIONS}
          min={1}
          onChanged={onSizeChanged}
          onActivate={onActivateCombobox}
          defaultDirection={defaultDirection}
        />
      </div>
      <PopupButton
        name="color"
        opened={popupedKey === "color"}
        popup={<TextColorPanel value={docAttrInfo.cursor?.color ?? undefined} onChanged={onColorChanged} />}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div
          className="w-8 h-8 flex justify-center items-center"
          style={{ color: docAttrInfo.cursor?.color ?? "#000000" }}
        >
          <TextColorIcon />
        </div>
      </PopupButton>
      <PopupButton
        name="background"
        opened={popupedKey === "background"}
        popup={
          <TextBackgroundPanel value={docAttrInfo.cursor?.background ?? undefined} onChanged={onBackgroundChanged} />
        }
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div
          className="w-8 h-8 flex justify-center items-center"
          style={{ color: docAttrInfo.cursor?.background ?? "transparent" }}
        >
          <TextColorBgIcon color={docAttrInfo.cursor?.color ?? undefined} />
        </div>
      </PopupButton>
      <TextDecoration
        popupedKey={popupedKey}
        setPopupedKey={setPopupedKey}
        defaultDirection={defaultDirection}
        value={docAttrInfo.cursor}
        onChange={onInlineChanged}
      />
      {textEditing ? (
        <TextLink
          popupedKey={popupedKey}
          setPopupedKey={setPopupedKey}
          defaultDirection={defaultDirection}
          value={docAttrInfo.cursor}
          onChange={onInlineChanged}
        />
      ) : undefined}
      <PopupButton
        name="align"
        opened={popupedKey === "align"}
        popup={<AlignPanel value={getAlign(docAttrInfo)} onClick={onAlignChanged} />}
        onClick={onAlignClick}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={alignIcon} alt="Align" />
        </div>
      </PopupButton>
      <PopupButton
        name="direction"
        opened={popupedKey === "direction"}
        popup={<DirectionPanel value={getDirection(docAttrInfo)} onClick={onDirectionChanged} />}
        onClick={onDirectionClick}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={directionIcon} alt="Direction" />
        </div>
      </PopupButton>
      <PopupButton
        name="lineheight"
        opened={popupedKey === "lineheight"}
        popup={
          <LineheightPanel value={docAttrInfo.block?.lineheight ?? DEFAULT_LINEHEIGHT} onChange={onLineheightChanged} />
        }
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 flex justify-center items-center">
          <img src={iconLineheight} alt="Line height" />
        </div>
      </PopupButton>
    </div>
  );
};

function getAlign(docAttrInfo: DocAttrInfo): string {
  return docAttrInfo.block?.align ?? "left";
}

function getAlignIcon(docAttrInfo: DocAttrInfo) {
  switch (getAlign(docAttrInfo)) {
    case "center":
      return iconAlignCenter;
    case "right":
      return iconAlignRight;
    default:
      return iconAlignLeft;
  }
}

function getDirection(docAttrInfo: DocAttrInfo): string {
  return docAttrInfo.block?.direction ?? "top";
}

function getDirectionIcon(docAttrInfo: DocAttrInfo) {
  switch (getDirection(docAttrInfo)) {
    case "middle":
      return iconDirectionMiddle;
    case "bottom":
      return iconDirectionBottom;
    default:
      return iconDirectionTop;
  }
}
