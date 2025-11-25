import { FileAccess } from "../utils/fileAccess";

export type AssetAPI = {
  name: string;
  saveAsset: (assetId: string, blob: Blob | File, ifPossible?: boolean) => Promise<void>;
  loadAsset: (assetId: string, ifPossible?: boolean) => Promise<Blob | File | undefined>;
};

export function newFileAssetAPI(fileAccess: FileAccess): AssetAPI {
  return {
    name: "file",
    saveAsset: fileAccess.saveAsset,
    loadAsset: fileAccess.loadAsset,
  };
}

export type MemoryAssetAPI = AssetAPI & {
  getAssetList: () => [string, Blob | File][];
  clear: () => void;
};

export function newMemoryAssetAPI(): MemoryAssetAPI {
  const fileMap = new Map<string, Blob | File>();

  return {
    name: "memory",
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
