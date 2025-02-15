import { GRID_DEFAULT_COLOR } from "../../composables/grid";

interface Props {
  x: number;
  y: number;
  size: number;
  type?: "dot" | "line" | "dash";
  color?: string;
}

export const GridBackground: React.FC<Props> = ({ x, y, size, type, color }) => {
  if (size <= 0) return undefined;

  const ncolor = color ?? GRID_DEFAULT_COLOR;
  const nx = x % size;
  const ny = y % size;

  return type === "line" ? (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${-nx}px ${-ny}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `linear-gradient(to right, ${ncolor} 1px, transparent 1px), linear-gradient(to bottom, ${ncolor} 1px, transparent 1px)`,
      }}
    />
  ) : type === "dash" ? (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${-nx - size / 2}px ${-ny - size / 2}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M 0 5 L 10 5 M 5 0 L 5 10' stroke='${ncolor}' stroke-dasharray='1' stroke-dashoffset='-0.5' stroke-width='${20 / size}' /%3E%3C/svg%3E")`,
      }}
    />
  ) : (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${size / 2 - nx}px ${size / 2 - ny}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: `radial-gradient(circle, ${ncolor} 2.5px, transparent 2.5px)`,
      }}
    />
  );
};
