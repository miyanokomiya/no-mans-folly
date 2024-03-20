export function getSheetURL(id: string): string {
  const queryParameters = new URLSearchParams(window.location.search);
  queryParameters.set("sheet", id);
  return `?${queryParameters.toString()}`;
}

export function getSheetIdFromQuery(): string {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("sheet") ?? "";
}
