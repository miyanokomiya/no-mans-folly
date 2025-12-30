export function generateShapeLink(sheetId: string, shapeIds: string[]): string {
  return `[FOLLY]:[${sheetId}]:[${shapeIds.join(",")}]`;
}

export type ShapeLink = { sheetId: string; shapeIds: string[] };

export function parseShapeLink(link: string): ShapeLink | undefined {
  const match = link.match(/^\[FOLLY\]:\[([^\]]+)\]:\[([^\]]+)\]$/);
  if (!match) return;

  const sheetId = match[1];
  const shapeIds = match[2].split(/,/);
  return { sheetId, shapeIds };
}
