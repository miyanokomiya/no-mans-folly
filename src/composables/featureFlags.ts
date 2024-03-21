const queryParameters = new URLSearchParams(window.location.search);
const indexedDBMode = !!queryParameters.get("indexeddb");

export function newFeatureFlags() {
  return {
    indexedDBMode, // This flag is intended only for development porpuses.
  };
}
