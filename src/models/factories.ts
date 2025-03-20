import { StyleScheme, Color } from ".";

export function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

export function createStyleScheme(): StyleScheme {
  return {
    selectionPrimary: createColor(65, 105, 225),
    selectionSecondaly: createColor(64, 224, 208),
    selectionLineWidth: 3,
    transformAnchor: createColor(250, 250, 55),
    alert: createColor(224, 0, 0),
    locked: createColor(168, 85, 247),
    noExport: createColor(211, 84, 0),
  };
}
