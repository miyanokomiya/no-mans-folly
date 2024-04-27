import { useCallback } from "react";
import { ShapeTypeItem, shapeTypeList, shapeWithoutTextTypeList, layoutTypeList } from "../../composables/shapeTypes";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";

interface Props {
  onShapeTypeDragStart: (type: string) => void;
  onShapeTypeClick: (type: string) => void;
}

export const ShapeListPanel: React.FC<Props> = ({ onShapeTypeDragStart, onShapeTypeClick }) => {
  const getIconElm = (item: ShapeTypeItem) => (
    <ShapeItemButton key={item.type} item={item} onClick={onShapeTypeClick} onDragStart={onShapeTypeDragStart} />
  );

  return (
    <div>
      <h3 className="mb-1">Text container</h3>
      <div className="grid grid-cols-4">{shapeTypeList.map((item) => getIconElm(item))}</div>
      <h3 className="mb-1">Plain</h3>
      <div className="grid grid-cols-4">{shapeWithoutTextTypeList.map((item) => getIconElm(item))}</div>
    </div>
  );
};

export const LayoutShapeListPanel: React.FC<Props> = ({ onShapeTypeDragStart, onShapeTypeClick }) => {
  const getIconElm = (item: ShapeTypeItem) => (
    <ShapeItemButton key={item.type} item={item} onClick={onShapeTypeClick} onDragStart={onShapeTypeDragStart} />
  );

  return <div className="grid grid-cols-1">{layoutTypeList.map((item) => getIconElm(item))}</div>;
};

interface ShapeItemButtonProps {
  item: ShapeTypeItem;
  onClick?: (type: string) => void;
  onDragStart?: (type: string) => void;
}

const ShapeItemButton: React.FC<ShapeItemButtonProps> = ({ item, onClick, onDragStart }) => {
  const handleClick = useCallback(() => {
    onClick?.(item.type);
  }, [item, onClick]);

  const handleDragStart = useCallback(() => {
    onDragStart?.(item.type);
  }, [item, onDragStart]);

  return (
    <ClickOrDragHandler onClick={handleClick} onDragStart={handleDragStart}>
      <div
        key={item.type}
        className="w-10 h-10 border p-1 rounded last:mb-0 cursor-pointer hover:bg-gray-200"
        data-type={item.type}
      >
        <img src={item.icon} alt={item.type} />
      </div>
    </ClickOrDragHandler>
  );
};
