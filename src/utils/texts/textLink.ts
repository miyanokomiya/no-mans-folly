export function generateShapeLink(sheetId: string, shapeId: string): string {
  return `[FOLLY]:[${sheetId}]:[${shapeId}]`;
}

export function parseShapeLink(link: string): { sheetId: string; shapeId: string } | undefined {
  const match = link.match(/^\[FOLLY\]:\[([^\]]+)\]:\[([^\]]+)\]$/);
  if (!match) return;

  const sheetId = match[1];
  const shapeId = match[2];
  return { sheetId, shapeId };
}
