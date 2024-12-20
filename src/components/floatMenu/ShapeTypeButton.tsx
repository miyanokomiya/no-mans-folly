import { useCallback, useMemo } from "react";
import { ShapeTypeItem } from "../../composables/shapeTypes";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { IconButton } from "../atoms/buttons/IconButton";

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  shapeTypeList: ShapeTypeItem[];
  defaultDirection?: PopupDirection;
  selectedType?: string;
  onChange?: (type: string) => void;
}

export const ShapeTypeButton: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  shapeTypeList,
  defaultDirection,
  selectedType,
  onChange: onSelect,
}) => {
  const selectedItem = useMemo(
    () => shapeTypeList.find((item) => item.type === selectedType) ?? shapeTypeList[0],
    [selectedType, shapeTypeList],
  );

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="shape-type"
        opened={popupedKey === "shape-type"}
        popup={<ShapeTypePanel shapeTypeList={shapeTypeList} selectedType={selectedType} onChange={onSelect} />}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={selectedItem.icon} alt={selectedItem.type} />
        </div>
      </PopupButton>
    </div>
  );
};

interface ShapeTypePanelProps {
  shapeTypeList: ShapeTypeItem[];
  selectedType?: string;
  onChange?: (type: string) => void;
}

const ShapeTypePanel: React.FC<ShapeTypePanelProps> = ({ shapeTypeList, selectedType, onChange }) => {
  const handleClick = useCallback(
    (type: string) => {
      if (type === selectedType) return;
      onChange?.(type);
    },
    [selectedType, onChange],
  );

  const list = shapeTypeList.map((item) => (
    <IconButton
      key={item.type}
      value={item.type}
      icon={item.icon}
      size={10}
      highlight={selectedType === item.type}
      onClick={handleClick}
    />
  ));

  return <div className="w-max grid grid-cols-4">{list}</div>;
};
