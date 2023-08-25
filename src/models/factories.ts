import { StyleScheme, Color } from ".";

export function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

export function createStyleScheme(): StyleScheme {
  return {
    selectionPrimary: createColor(200, 0, 0),
    selectionSecondaly: createColor(0, 0, 200),
  };
}
