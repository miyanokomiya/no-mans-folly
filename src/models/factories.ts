import { StyleScheme, Color } from ".";

export function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

export function createStyleScheme(): StyleScheme {
  return {
    selectionPrimary: createColor(65, 105, 225),
    selectionSecondaly: createColor(64, 224, 208),
    alert: createColor(224, 0, 0),
  };
}
