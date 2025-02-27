import { IRectangle } from "okageo";
import { BoxPadding } from "../models";

export function createBoxPadding(
  value?: BoxPadding["value"],
  type?: BoxPadding["type"],
  boundsType?: BoxPadding["boundsType"],
): BoxPadding {
  return { type, value: value ?? [0, 0, 0, 0], boundsType };
}

export function isSameBoxPadding(a?: BoxPadding, b?: BoxPadding): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.boundsType === b.boundsType && a.value.every((v, i) => v === b.value[i]);
}

export function getPaddingRect(padding: BoxPadding | undefined, rect: IRectangle): IRectangle {
  if (!padding) return rect;

  if (padding.type === "relative") {
    const left = Math.min(rect.x + rect.width, rect.x + padding.value[3] * rect.width);
    const right = Math.max(left, rect.x + rect.width - padding.value[1] * rect.width);
    const top = Math.min(rect.y + rect.height, rect.y + padding.value[0] * rect.height);
    const bottom = Math.max(top, rect.y + rect.height - padding.value[2] * rect.height);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  } else {
    const left = Math.min(rect.x + rect.width, rect.x + padding.value[3]);
    const right = Math.max(left, rect.x + rect.width - padding.value[1]);
    const top = Math.min(rect.y + rect.height, rect.y + padding.value[0]);
    const bottom = Math.max(top, rect.y + rect.height - padding.value[2]);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }
}

export function getNegativePaddingRect(padding: BoxPadding | undefined, rect: IRectangle): IRectangle {
  if (!padding) return rect;
  return getPaddingRect({ ...padding, value: padding.value.map((v) => -v) } as BoxPadding, rect);
}

export function convertPaddingType(padding: BoxPadding, rect: IRectangle, type?: BoxPadding["type"]): BoxPadding {
  if (padding.type === type) return padding;

  const currentRect = getPaddingRect(padding, rect);
  const absValue: BoxPadding["value"] = [
    currentRect.y - rect.y,
    rect.x + rect.width - (currentRect.x + currentRect.width),
    rect.y + rect.height - (currentRect.y + currentRect.height),
    currentRect.x - rect.x,
  ];

  if (type === "relative") {
    return {
      type,
      value: [
        rect.height === 0 ? 0 : absValue[0] / rect.height,
        rect.width === 0 ? 0 : absValue[1] / rect.width,
        rect.height === 0 ? 0 : absValue[2] / rect.height,
        rect.width === 0 ? 0 : absValue[3] / rect.width,
      ],
    };
  } else {
    return {
      type,
      value: absValue,
    };
  }
}

export function getBoxPaddingValue(padding: BoxPadding | undefined, rect: IRectangle): BoxPadding["value"] {
  if (!padding) return [0, 0, 0, 0];
  if (padding.type !== "relative") return padding.value;

  const prect = getPaddingRect(padding, rect);
  return [
    prect.y - rect.y,
    rect.x + rect.width - prect.x - prect.width,
    rect.y + rect.height - prect.y - prect.height,
    prect.x - rect.x,
  ];
}
