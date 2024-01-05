interface Props {
  x: number;
  y: number;
  size: number;
}

export const GridBackground: React.FC<Props> = ({ x, y, size }) => {
  return (
    <div
      className="w-full h-full bg-repeat"
      style={{
        backgroundPosition: `${size / 2 - x}px ${size / 2 - y}px`,
        backgroundSize: `${size}px ${size}px`,
        backgroundImage: "radial-gradient(circle, #000 2px, rgba(255, 255, 255, 0) 2px)",
      }}
    />
  );
};
