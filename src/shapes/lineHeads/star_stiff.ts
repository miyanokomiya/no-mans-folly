import { IVec2 } from "okageo";
import { defineLineHeadStiffPolygon, getHeadBaseHeight } from "./core";

export const LineHeadStarStiffFilled = defineLineHeadStiffPolygon({
  label: "StartStiffFilled",
  create(arg = {}) {
    return { ...arg, type: "star_stiff_filled" };
  },
  getSrcPath,
  filled: true,
});

export const LineHeadStarStiffBlank = defineLineHeadStiffPolygon({
  label: "StarStiffBlank",
  create(arg = {}) {
    return { ...arg, type: "star_stiff_blank" };
  },
  getSrcPath,
});

function getSrcPath(lineWidth: number, size?: number) {
  const height = getHeadBaseHeight(lineWidth, size);
  const unitR = (Math.PI * 2) / 5;

  const outerRadius = height / 2;
  const ops = [0, 1, 2, 3, 4].map<IVec2>((i) => {
    const r = unitR * i - Math.PI / 2;
    return { x: Math.cos(r) * outerRadius, y: Math.sin(r) * outerRadius };
  });

  const innerRadius = outerRadius * 0.5;
  const ips = [0, 1, 2, 3, 4].map<IVec2>((i) => {
    const r = unitR * i + Math.PI / 2;
    return { x: Math.cos(r) * innerRadius, y: Math.sin(r) * innerRadius };
  });

  return [ops[0], ips[3], ops[1], ips[4], ops[2], ips[0], ops[3], ips[1], ops[4], ips[2]];
}
