export function generateShapeLink(sheetId: string, shapeIds: string[]): string {
  return `[FOLLY]:[${sheetId}]:[${shapeIds.join(",")}]`;
}

export function parseShapeLink(link: string): { sheetId: string; shapeIds: string[] } | undefined {
  const match = link.match(/^\[FOLLY\]:\[([^\]]+)\]:\[([^\]]+)\]$/);
  if (!match) return;

  const sheetId = match[1];
  const shapeIds = match[2].split(/,/);
  return { sheetId, shapeIds };
}
