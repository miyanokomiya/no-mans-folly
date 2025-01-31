import iconAdd from "../../assets/icons/add_filled.svg";

interface Props {
  onFrameAdd?: () => void;
}

export const FrameToolPanel: React.FC<Props> = ({ onFrameAdd }) => {
  return (
    <div>
      <button type="button" className="w-full h-8 border rounded-xs flex items-center justify-center" onClick={onFrameAdd}>
        <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
      </button>
    </div>
  );
};
