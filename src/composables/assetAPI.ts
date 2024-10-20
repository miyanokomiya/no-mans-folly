import { AssetAPI, AssetAPIEnabled } from "../hooks/persistence";
import { FileAccess } from "../utils/fileAccess";

export function newFileAssetAPI(fileAccess: FileAccess): AssetAPI {
  return {
    enabled: fileAccess.hasHnadle(),
    saveAsset: fileAccess.saveAsset,
    loadAsset: fileAccess.loadAsset,
  };
}

export type MemoryAssetAPI = AssetAPIEnabled & {
  getAssetList: () => [string, Blob | File][];
  clear: () => void;
};

export function newMemoryAssetAPI(): MemoryAssetAPI {
  const fileMap = new Map<string, Blob | File>();

  return {
    enabled: true,
    saveAsset: (assetId, blob) => {
      fileMap.set(assetId, blob);
      return Promise.resolve();
    },
    loadAsset: (assetId) => {
      return Promise.resolve(fileMap.get(assetId));
    },
    getAssetList: () => Array.from(fileMap),
    clear: () => fileMap.clear(),
  };
}

export function isMemoryAssetAPI(target: AssetAPI): target is MemoryAssetAPI {
  return "getAssetList" in target;
}
