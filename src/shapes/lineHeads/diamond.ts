import { defineLineHeadPolygon, getHeadBaseHeight } from "./core";

export const LineHeadDiamondFilled = defineLineHeadPolygon({
  label: "DiamondFilled",
  create(arg = {}) {
    return { ...arg, type: "diamond_filled" };
  },
  getSrcPath,
  filled: true,
});

export const LineHeadDiamondBlank = defineLineHeadPolygon({
  label: "DiamondFilled",
  create(arg = {}) {
    return { ...arg, type: "diamond_filled" };
  },
  getSrcPath,
});

function getSrcPath(lineWidth: number) {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: 0, y: 0 },
    { x: -height / 2, y: -width / 2 },
    { x: -height, y: 0 },
    { x: -height / 2, y: width / 2 },
  ];
}
