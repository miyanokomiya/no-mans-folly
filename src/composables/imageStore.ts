import { AssetAPI } from "./persistence";
import { newCallback } from "./reactives";

export function newImageStore() {
  const imageMap = new Map<string, HTMLImageElement>();
  const callback = newCallback<[string, HTMLImageElement]>();
  const processing = new Set<string>();

  function clear() {
    imageMap.clear();
  }

  function loadFromFile(assetId: string, file: File | Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(file);
    const img = new Image();

    processing.add(assetId);
    return new Promise((resolve, reject) => {
      img.onload = () => {
        processing.delete(assetId);
        imageMap.set(assetId, img);
        resolve(img);
        callback.dispatch([assetId, img]);
      };
      img.onerror = (e) => {
        processing.delete(assetId);
        reject(e);
      };
      img.src = url;
    });
  }

  async function batchLoad(assetIds: (string | undefined)[], assetAPI: AssetAPI): Promise<void> {
    if (!assetAPI.enabled) return;

    for (const assetId of assetIds) {
      if (assetId && !processing.has(assetId)) {
        try {
          const file = await assetAPI.loadAsset(assetId);
          if (file) {
            await loadFromFile(assetId, file);
          }
        } catch (e) {
          // Ignore individual error
          console.warn(`Not found asset: ${assetId}`);
        }
      }
    }
  }

  function getImage(assetId: string): HTMLImageElement | undefined {
    return imageMap.get(assetId);
  }

  return {
    loadFromFile,
    batchLoad,
    getImage,
    clear,
    watch: callback.bind,
  };
}
export type ImageStore = ReturnType<typeof newImageStore>;
