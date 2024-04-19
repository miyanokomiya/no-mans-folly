import { defineLineHeadPolygon, getHeadBaseHeight } from "./core";

export const LineHeadClosedFilledStruct = defineLineHeadPolygon({
  label: "ClosedFilled",
  create(arg = {}) {
    return { ...arg, type: "closed_filled" };
  },
  getSrcPath,
  filled: true,
});

export const LineHeadClosedBlankStruct = defineLineHeadPolygon({
  label: "ClosedBlank",
  create(arg = {}) {
    return { ...arg, type: "closed_blank" };
  },
  getSrcPath,
});

function getSrcPath(lineWidth: number) {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: 0, y: 0 },
    { x: -height, y: -width / 2 },
    { x: -height, y: width / 2 },
  ];
}
