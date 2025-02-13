import { GRID_DEFAULT_COLOR } from "../../composables/grid";

interface Props {
  x: number;
  y: number;
  size: number;
  type?: "dot" | "line" | "dash";
  color?: string;
}

export const GridBackground: React.FC<Props> = ({ x, y, size, type, color }) => {
  color ??= GRID_DEFAULT_COLOR;

  return type === "line" ? (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${-x}px ${-y}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
      }}
    />
  ) : type === "dash" ? (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundRepeat: "repeat",
        backgroundPosition: `${-x}px ${-y}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M 0 0 L 10 0 M 0 0 L 0 10' stroke='${color}' stroke-dasharray='1' stroke-dashoffset='0.5' stroke-width='0.2' /%3E%3C/svg%3E")`,
      }}
    />
  ) : (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${size / 2 - x}px ${size / 2 - y}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `radial-gradient(circle, ${color} 2px, transparent 2px)`,
      }}
    />
  );
};
