const queryParameters = new URLSearchParams(window.location.search);
const indexedDBMode = !!queryParameters.get("indexeddb");
const skipEntrance = !!queryParameters.get("skip_entrance");

export function newFeatureFlags() {
  return {
    indexedDBMode, // This flag is intended only for development porpuses.
    skipEntrance,
  };
}
