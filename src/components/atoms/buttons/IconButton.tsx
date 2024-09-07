import { useCallback } from "react";

interface Props {
  value: string;
  icon: string;
  highlight?: boolean;
  onClick?: (value: string) => void;
}

export const IconButton: React.FC<Props> = ({ value, icon, highlight, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(value);
  }, [value, onClick]);

  return (
    <button
      type="button"
      className={
        "w-10 h-10 border p-1 rounded touch-none hover:bg-gray-200" + (highlight ? " border-2 border-cyan-400" : "")
      }
      onClick={handleClick}
    >
      <img src={icon} alt={value} />
    </button>
  );
};
