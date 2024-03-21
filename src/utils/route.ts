export function getSheetURL(id: string): string {
  const queryParameters = new URLSearchParams(window.location.search);
  queryParameters.set("sheet", id);
  return `?${queryParameters.toString()}`;
}

export function getSheetIdFromQuery(): string {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("sheet") ?? "";
}

export function getCallbackAction(): string {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("action") ?? "";
}

export function getBackHomeFlag(): boolean {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("back_home") === "1";
}
