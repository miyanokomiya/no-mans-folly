import { useCallback } from "react";

interface Props {
  value?: string;
  icon: string;
  size: 8 | 10;
  highlight?: boolean;
  disabled?: boolean;
  flipH?: boolean;
  onClick?: (value: string) => void;
}

export const IconButton: React.FC<Props> = ({ value, icon, size, highlight, flipH, disabled, onClick }) => {
  const className = [
    ...[{ 8: "w-8 h-8", 10: "w-10 h-10" }[size]],
    ...[flipH ? "-scale-x-100" : ""],
    ...[disabled ? "opacity-50" : "hover:bg-gray-200"],
  ].join(" ");

  const handleClick = useCallback(() => {
    onClick?.(value ?? "");
  }, [value, onClick]);

  return (
    <button
      type="button"
      className={className + " border p-1 rounded touch-none" + (highlight ? " border-2 border-cyan-400" : "")}
      disabled={disabled}
      onClick={handleClick}
    >
      <img src={icon} alt={value} />
    </button>
  );
};
