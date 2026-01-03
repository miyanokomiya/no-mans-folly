import { useCallback } from "react";
import iconDropdown from "../../assets/icons/dropdown.svg";
import iconCustom from "../../assets/icons/custom.svg";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

type Props = {
  onAllFoldedChange?: (val: boolean) => void;
};

export const ShapeTreeToolPanel: React.FC<Props> = ({ onAllFoldedChange }) => {
  const [open, setOpen] = useLocalStorageAdopter({
    key: "shape-tree-tool-panel",
    version: "1",
    initialValue: false,
    duration: 0,
  });
  const handleOpenClick = useCallback(() => {
    setOpen((v) => !v);
  }, [setOpen]);

  const handleExpandAllClick = useCallback(() => {
    onAllFoldedChange?.(true);
  }, [onAllFoldedChange]);
  const handleCollapseAllClick = useCallback(() => {
    onAllFoldedChange?.(false);
  }, [onAllFoldedChange]);

  const buttonClass = "px-2 py-1 rounded border hover:bg-gray-200";

  return (
    <div>
      <button
        type="button"
        onClick={handleOpenClick}
        className="w-full h-6 flex items-center justify-center border rounded-sm hover:bg-gray-200"
      >
        {open ? (
          <img src={iconDropdown} alt="Close tool panel" className="w-4 h-4" />
        ) : (
          <img src={iconCustom} alt="Open tool panel" className="w-4 h-4" />
        )}
      </button>
      {open ? (
        <div className="py-2 flex gap-2 justify-center">
          <button type="button" onClick={handleExpandAllClick} className={buttonClass}>
            Expand All
          </button>
          <button type="button" onClick={handleCollapseAllClick} className={buttonClass}>
            Collapse All
          </button>
        </div>
      ) : undefined}
    </div>
  );
};
