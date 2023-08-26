import { snapAngle } from "./geometry";

export function getResizingCursorStyle(rotation: number): string | undefined {
  const r = rotation < 0 ? rotation + 2 * Math.PI : rotation;
  const list = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];
  const angle = Math.abs(snapAngle((r / Math.PI) * 180, 45)) % 180;
  return list[Math.floor(angle / 45)];
}
