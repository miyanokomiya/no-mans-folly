const queryParameters = new URLSearchParams(window.location.search);

export function newFeatureFlags() {
  return {
    indexedDBMode: import.meta.env.DEV && !!queryParameters.get("indexeddb"), // This flag is intended only for development porpuses.
  };
}
