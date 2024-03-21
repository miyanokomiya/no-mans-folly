export function getSheetURL(id: string): string {
  const queryParameters = new URLSearchParams(window.location.search);
  queryParameters.set("sheet", id);
  return `?${queryParameters.toString()}`;
}

export function getSheetIdFromQuery(): string {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("sheet") ?? "";
}

export function getCallbackAction(): "" | "auth_error" | "retrieval" | "no_google_drive_scope" {
  const queryParameters = new URLSearchParams(window.location.search);
  return (queryParameters.get("action") as any) ?? "";
}

export function getBackHomeFlag(): boolean {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("back_home") === "1";
}
