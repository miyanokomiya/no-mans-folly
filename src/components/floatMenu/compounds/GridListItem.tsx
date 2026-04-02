import { useCallback } from "react";
import { GridItem } from "../../../shapes/compoundGrid";
import { NumberInput } from "../../atoms/inputs/NumberInput";
import { SliderInput } from "../../atoms/inputs/SliderInput";
import { ToggleInput } from "../../atoms/inputs/ToggleInput";
import { IconButton } from "../../atoms/buttons/IconButton";
import iconDustbinRed from "../../../assets/icons/dustbin_red.svg";
import iconAdd from "../../../assets/icons/add_filled.svg";

interface GridItemProps {
  index: number;
  item: GridItem;
  onChange?: (index: number, val: GridItem, draft?: boolean) => void;
  onAdd?: (index: number, val: GridItem) => void;
  onDelete?: (index: number) => void;
}

export const GridListItem: React.FC<GridItemProps> = ({ index, item, onChange, onAdd, onDelete }) => {
  const handleValueChange = useCallback(
    (value: number, draft = false) => {
      onChange?.(index, { ...item, value }, draft);
    },
    [index, item, onChange],
  );

  const handleValueCommit = useCallback(() => {
    onChange?.(index, item);
  }, [index, item, onChange]);

  const handleScaleChange = useCallback(
    (scale: number, draft = false) => {
      onChange?.(index, { ...item, scale: scale }, draft);
    },
    [index, item, onChange],
  );

  const handleLabeledChange = useCallback(
    (labeled: boolean) => {
      onChange?.(index, { ...item, labeled });
    },
    [index, item, onChange],
  );

  const handleAdd = useCallback(() => {
    onAdd?.(index, item);
  }, [index, item, onAdd]);

  const handleDelete = useCallback(() => {
    onDelete?.(index);
  }, [index, onDelete]);

  return (
    <div className="flex items-center gap-2">
      <div className="w-26">
        <NumberInput min={0} value={item.value} onChange={handleValueChange} onBlur={handleValueCommit} slider />
      </div>
      <div className="w-20">
        <SliderInput min={0} max={1} step={0.1} value={item.scale ?? 1} onChanged={handleScaleChange} showValue />
      </div>
      <div className="w-16">
        <ToggleInput value={item.labeled} onChange={handleLabeledChange} />
      </div>
      <IconButton icon={iconAdd} size={8} alt="Add" onClick={handleAdd} />
      <IconButton icon={iconDustbinRed} size={8} alt="Delete" onClick={handleDelete} disabled={!onDelete} />
    </div>
  );
};
