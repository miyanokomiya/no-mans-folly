import { useCallback } from "react";
import { ShapeTypeItem, shapeTypeList, shapeWithoutTextTypeList } from "../../composables/shapeTypes";

interface Props {
  onDownShapeType: (type: string) => void;
}

export const ShapeListPanel: React.FC<Props> = ({ onDownShapeType }) => {
  const onDownShapeElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      if (type) {
        onDownShapeType(type);
      }
    },
    [onDownShapeType],
  );

  const getIconElm = (item: ShapeTypeItem) => (
    <div
      key={item.type}
      className="w-10 h-10 border p-1 rounded last:mb-0 cursor-grab touch-none"
      data-type={item.type}
      onPointerDown={onDownShapeElm}
    >
      <img src={item.icon} alt={item.type} />
    </div>
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
