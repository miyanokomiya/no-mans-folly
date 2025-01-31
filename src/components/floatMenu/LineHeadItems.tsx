import { useCallback, useMemo } from "react";
import { LineHead } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";

import iconHeadSwap from "../../assets/icons/head_swap.svg";
import iconHeadNone from "../../assets/icons/head_none.svg";
import iconHeadOpen from "../../assets/icons/head_open.svg";

import iconHeadClosedFilled from "../../assets/icons/head_closed_filled.svg";
import iconHeadClosedBlank from "../../assets/icons/head_closed_blank.svg";

import iconHeadDotFilled from "../../assets/icons/head_dot_filled.svg";
import iconHeadDotBlank from "../../assets/icons/head_dot_blank.svg";
import iconHeadDotTopFilled from "../../assets/icons/head_dot_top_filled.svg";
import iconHeadDotTopBlank from "../../assets/icons/head_dot_top_blank.svg";
import iconHeadStartStiffFilled from "../../assets/icons/head_star_stiff_filled.svg";
import iconHeadStartStiffBlank from "../../assets/icons/head_star_stiff_blank.svg";

import iconHeadDiamondFilled from "../../assets/icons/head_diamond_filled.svg";
import iconHeadDiamondBlank from "../../assets/icons/head_diamond_blank.svg";

import iconHeadOne from "../../assets/icons/head_one.svg";
import iconHeadMany from "../../assets/icons/head_many.svg";
import iconHeadOneOnly from "../../assets/icons/head_one_only.svg";
import iconHeadOneMany from "../../assets/icons/head_one_many.svg";
import iconHeadZeroOne from "../../assets/icons/head_zero_one.svg";
import iconHeadZeroMany from "../../assets/icons/head_zero_many.svg";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { DEFAULT_HEAD_SIZE } from "../../shapes/lineHeads/core";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { getLinePath, LineShape } from "../../shapes/line";

const HEAD_TYPES = [
  [
    "none",
    "open",
    "closed_filled",
    "closed_blank",
    "diamond_filled",
    "diamond_blank",
    "dot_top_filled",
    "dot_top_blank",
    "dot_filled",
    "dot_blank",
    "star_stiff_filled",
    "star_stiff_blank",
  ],
  ["er_one", "er_many", "er_one_only", "er_one_many", "er_zero_one", "er_zero_many"],
];

const HEAD_ICONS = {
  none: iconHeadNone,
  open: iconHeadOpen,
  closed_filled: iconHeadClosedFilled,
  closed_blank: iconHeadClosedBlank,
  diamond_filled: iconHeadDiamondFilled,
  diamond_blank: iconHeadDiamondBlank,
  dot_top_blank: iconHeadDotTopBlank,
  dot_top_filled: iconHeadDotTopFilled,
  dot_blank: iconHeadDotBlank,
  dot_filled: iconHeadDotFilled,
  star_stiff_filled: iconHeadStartStiffFilled,
  star_stiff_blank: iconHeadStartStiffBlank,

  er_one: iconHeadOne,
  er_many: iconHeadMany,
  er_one_only: iconHeadOneOnly,
  er_one_many: iconHeadOneMany,
  er_zero_one: iconHeadZeroOne,
  er_zero_many: iconHeadZeroMany,
};

function getHeadIcon(type = "none"): string {
  return (HEAD_ICONS as any)[type] ?? iconHeadNone;
}

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  popupDefaultDirection?: PopupDirection;
  lineShape: LineShape;
  onChange?: (val: { pHead?: LineHead; qHead?: LineHead }, draft?: boolean) => void;
  highlighShape?: (meta: HighlightShapeMeta) => void;
}

export const LineHeadItems: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  popupDefaultDirection,
  lineShape,
  onChange,
  highlighShape,
}) => {
  const { pHead, qHead } = lineShape;

  const onPHeadClick = useCallback(() => {
    setPopupedKey("line-p-head");
  }, [setPopupedKey]);

  const onPHeadChanged = useCallback(
    (value?: LineHead, draft = false) => {
      onChange?.({ pHead: value }, draft);
    },
    [onChange],
  );

  const onQHeadClick = useCallback(() => {
    setPopupedKey("line-q-head");
  }, [setPopupedKey]);

  const onQHeadChanged = useCallback(
    (value?: LineHead, draft = false) => {
      onChange?.({ qHead: value }, draft);
    },
    [onChange],
  );

  const onHeadSwapClick = useCallback(() => {
    onChange?.({ pHead: qHead, qHead: pHead });
  }, [onChange, pHead, qHead]);

  const handleFirstVertexEnter = useCallback(() => {
    highlighShape?.({ type: "vertex", index: 0 });
  }, [highlighShape]);

  const handleLastVertexEnter = useCallback(() => {
    highlighShape?.({ type: "vertex", index: getLinePath(lineShape).length - 1 });
  }, [highlighShape, lineShape]);

  const handleLeave = useCallback(() => {
    highlighShape?.({ type: "vertex", index: -1 });
  }, [highlighShape]);

  return (
    <div className="flex gap-1 items-center">
      <div onPointerEnter={handleFirstVertexEnter} onPointerLeave={handleLeave}>
        <PopupButton
          name="line-p-head"
          opened={popupedKey === "line-p-head"}
          popup={<LineHeadPanel head={pHead} onChange={onPHeadChanged} flip />}
          defaultDirection={popupDefaultDirection}
          onClick={onPHeadClick}
        >
          <div className="w-8 h-8 p-1" style={{ transform: "scaleX(-1)" }}>
            <img src={getHeadIcon(pHead?.type)} alt="Closed Filled" />
          </div>
        </PopupButton>
      </div>
      <button type="button" className="w-7 h-7 p-1 border rounded-xs" onClick={onHeadSwapClick}>
        <img src={iconHeadSwap} alt="Swap heads" />
      </button>
      <div onPointerEnter={handleLastVertexEnter} onPointerLeave={handleLeave}>
        <PopupButton
          name="line-q-head"
          opened={popupedKey === "line-q-head"}
          popup={<LineHeadPanel head={qHead} onChange={onQHeadChanged} />}
          defaultDirection={popupDefaultDirection}
          onClick={onQHeadClick}
        >
          <div className="w-8 h-8 p-1">
            <img src={getHeadIcon(qHead?.type)} alt="Closed Filled" />
          </div>
        </PopupButton>
      </div>
    </div>
  );
};

interface LineHeadPanelProps {
  head?: LineHead;
  onChange?: (value?: LineHead, draft?: boolean) => void;
  flip?: boolean;
}

const LineHeadPanel: React.FC<LineHeadPanelProps> = ({ head, onChange, flip }) => {
  const handleTypeChange = useCallback(
    (e: React.MouseEvent) => {
      const type = e.currentTarget.getAttribute("data-type");
      if (!type || type === "none") {
        onChange?.(undefined);
      } else {
        onChange?.({ ...head, type });
      }
    },
    [head, onChange],
  );

  const handleSizeChange = useCallback(
    (val: number, draft = false) => {
      if (!head || head?.type === "none") return;
      onChange?.({ ...head, size: val }, draft);
    },
    [head, onChange],
  );

  const iconStyle = useMemo(() => {
    return flip ? { transform: "scaleX(-1)" } : {};
  }, [flip]);

  const items = useMemo(() => {
    return HEAD_TYPES.map((group, i) => {
      const groupItems = group.map((t) => {
        const selected = head?.type ? head.type === t : t === "none";
        return (
          <button
            key={t}
            type="button"
            className={"w-10 h-10 p-1 rounded-xs border" + (selected ? " border-cyan-400" : "")}
            data-type={t}
            onClick={handleTypeChange}
          >
            <img src={getHeadIcon(t)} alt={t} style={iconStyle} />
          </button>
        );
      });
      return (
        <div key={i} className="w-max grid grid-cols-6">
          {groupItems}
        </div>
      );
    });
  }, [head, handleTypeChange, iconStyle]);

  return (
    <div className="p-2">
      <div className="flex items-center mb-1">
        <span>Size:</span>
        <div className="ml-4 flex-1">
          <SliderInput
            value={head?.size ?? DEFAULT_HEAD_SIZE}
            min={1}
            max={10}
            step={0.1}
            onChanged={handleSizeChange}
            showValue
          />
        </div>
      </div>
      <div>{items}</div>
    </div>
  );
};
