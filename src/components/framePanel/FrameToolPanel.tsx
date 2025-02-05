import { useCallback } from "react";
import iconAdd from "../../assets/icons/add_filled.svg";

interface Props {
  onShapeAdd?: (type: string) => void;
}

export const FrameToolPanel: React.FC<Props> = ({ onShapeAdd }) => {
  const handleFrameAdd = useCallback(() => {
    onShapeAdd?.("frame");
  }, [onShapeAdd]);

  return (
    <div>
      <button
        type="button"
        className="w-full h-8 border rounded-xs flex items-center justify-center"
        onClick={handleFrameAdd}
      >
        <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
      </button>
      <FrameGroupButton type="frame_align_group" onClick={onShapeAdd} />
    </div>
  );
};

const FrameGroupButton: React.FC<{ type: string; onClick?: (type: string) => void }> = ({ type, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(type);
  }, [type, onClick]);

  return (
    <button
      type="button"
      className="w-full h-8 border rounded-xs flex items-center justify-center"
      onClick={handleClick}
    >
      <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
      <span>Group {type}</span>
    </button>
  );
};
