import { useCallback, useMemo } from "react";
import { Shape } from "../../models";
import { BlockGroupField } from "../atoms/BlockGroupField";
import iconStretchNone from "../../assets/icons/cell_inset_stretch_none.svg";
import iconStretchH from "../../assets/icons/cell_inset_stretch_h_auto.svg";
import iconStretchV from "../../assets/icons/cell_inset_stretch_v_auto.svg";
import iconStretch from "../../assets/icons/cell_inset_stretch_auto.svg";

const options = [
  { icon: iconStretchNone, alt: "No Stretch" },
  { icon: iconStretchH, alt: "Horizontal Stretch" },
  { icon: iconStretchV, alt: "Vertical Stretch" },
  { icon: iconStretch, alt: "Stretch" },
];

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const TableConstraintInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const selectedValue = useMemo(() => {
    if (targetShape.lcH === 1 && targetShape.lcV === 1) return 3;
    if (targetShape.lcV === 1) return 2;
    if (targetShape.lcH === 1) return 1;
    return 0;
  }, [targetShape]);

  const handleStretchChange = useCallback(
    (val: number) => {
      updateTargetShape({ lcH: val === 1 || val === 3 ? 1 : 0, lcV: val === 2 || val === 3 ? 1 : 0 });
    },
    [updateTargetShape],
  );

  return (
    <BlockGroupField label="Table constraints" accordionKey="table-constraint-inspector">
      <div className="flex flex-wrap justify-end gap-1">
        {options.map((option, i) => (
          <ItemButton
            key={i}
            icon={option.icon}
            alt={option.alt}
            value={i}
            selectedValue={selectedValue}
            onClick={handleStretchChange}
          />
        ))}
      </div>
    </BlockGroupField>
  );
};

interface ItemButtonProps {
  value: number;
  icon: string;
  alt: string;
  selectedValue?: number;
  onClick?: (val: number) => void;
}

const ItemButton: React.FC<ItemButtonProps> = ({ value, icon, alt, selectedValue, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(value);
  }, [value, onClick]);

  const highlightClassName = value === (selectedValue ?? 0) ? " border-2 border-cyan-400" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={"relative w-12 h-12 flex justify-center items-center"}
      title={alt}
    >
      <img src={icon} alt={alt} className="w-10 h-10" />
      <div className={"absolute inset-0" + highlightClassName} />
    </button>
  );
};
