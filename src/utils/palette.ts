import { clamp } from "okageo";
import { ColorFieldKey, Palette, PaletteColors, RGBA } from "../models";
import { COLORS } from "./color";
import { fillArray } from "./commons";

export function getPaletteColors(palette?: Palette): RGBA[] {
  const colors = fillArray(30, COLORS.BLACK);
  if (!palette) return colors;

  Object.entries(palette).forEach(([key, value]) => {
    if (!value || !/^c_/.test(key)) return;

    const i = parseInt(key.slice(2), 10);
    colors[i] = value;
  });
  return colors;
}

export function generateDefaultPaletteColors(): PaletteColors {
  return {
    c_00: { r: 0, g: 0, b: 0, a: 1 },
    c_01: { r: 255, g: 255, b: 255, a: 1 },
    c_02: { r: 255, g: 0, b: 0, a: 1 },
    c_03: { r: 255, g: 255, b: 0, a: 1 },
    c_04: { r: 0, g: 255, b: 0, a: 1 },
    c_05: { r: 0, g: 255, b: 255, a: 1 },
    c_06: { r: 0, g: 0, b: 255, a: 1 },
    c_07: { r: 255, g: 0, b: 255, a: 1 },
    c_08: { r: 192, g: 192, b: 192, a: 1 },
    c_09: { r: 128, g: 0, b: 0, a: 1 },
    c_10: { r: 128, g: 128, b: 0, a: 1 },
    c_11: { r: 0, g: 128, b: 0, a: 1 },
    c_12: { r: 128, g: 0, b: 128, a: 1 },
    c_13: { r: 0, g: 128, b: 128, a: 1 },
    c_14: { r: 0, g: 0, b: 128, a: 1 },
    c_15: { r: 255, g: 165, b: 0, a: 1 },
    c_16: { r: 255, g: 192, b: 203, a: 1 },
    c_17: { r: 165, g: 42, b: 42, a: 1 },
    c_18: { r: 75, g: 0, b: 130, a: 1 },
    c_19: { r: 255, g: 127, b: 80, a: 1 },
  };
}

export function generatePaletteKey(index: number): ColorFieldKey {
  return `c_${index.toString().padStart(2, "0")}` as ColorFieldKey;
}

const getV = (i: number) => clamp(0, 255, 51 * i);
const base = [...Array(5)].map((_, i) => i - 2);
export const COLOR_TABLE: RGBA[][] = [
  [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 64, g: 64, b: 64, a: 1 },
    { r: 127, g: 127, b: 127, a: 1 },
    { r: 191, g: 191, b: 191, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
  ],
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i + 2.5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i + 2.5), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i + 2.5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 5), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i + 2.5), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 2.5), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i + 5), a: 1 })),
  base.map((i) => ({ r: getV(i + 5), g: getV(i), b: getV(i + 2.5), a: 1 })),
];
