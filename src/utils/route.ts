export function getSheetURL(id: string): string {
  const queryParameters = new URLSearchParams(window.location.search);
  queryParameters.set("sheet", id);
  return `?${queryParameters.toString()}`;
}

export function getSheetIdFromQuery(): string {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("sheet") ?? "";
}

export type AuthCallbackAction = "" | "auth_error" | "retrieval" | "no_google_drive_scope";

export function getCallbackAction(): AuthCallbackAction {
  const queryParameters = new URLSearchParams(window.location.search);
  return (queryParameters.get("action") as any) ?? "";
}

export function getBackHomeFlag(): boolean {
  const queryParameters = new URLSearchParams(window.location.search);
  return queryParameters.get("back_home") === "1";
}

/**
 * URL example: https://example.com/type/category/dir/image.svg
 * => Returns "dir image"
 */
export function getAssetSearchTag(url: string): string {
  const urlObj = new URL(url);
  const split = urlObj.pathname.split(/\//);
  const body = split.slice(3).join(" ");
  return body.toLowerCase().replace(/.folly.svg|.svg/g, "");
}
