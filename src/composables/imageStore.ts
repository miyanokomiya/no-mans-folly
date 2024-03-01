import { AssetAPI } from "../hooks/persistence";
import { newCallback } from "./reactives";

interface ImageData {
  img: HTMLImageElement;
}

export function newImageStore() {
  const imageMap = new Map<string, ImageData>();
  const callback = newCallback<[string, HTMLImageElement]>();
  const processing = new Set<string>();

  function clear() {
    imageMap.clear();
  }

  /**
   * When SVG doesn't have "xmlns:xlink" attribute, it can't be drawn by Canvas API's "drawImage".
   * Doing "document.body.appendChild(img)" can be a workaround though, not sure if it's worth doing.
   */
  function loadFromFile(assetId: string, file: File | Blob): Promise<HTMLImageElement> {
    const objectURL = URL.createObjectURL(file);
    const img = new Image();

    processing.add(assetId);
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(objectURL);
        processing.delete(assetId);
        imageMap.set(assetId, { img });
        resolve(img);
        callback.dispatch([assetId, img]);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(objectURL);
        processing.delete(assetId);
        reject(e);
      };
      img.src = objectURL;
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
    return imageMap.get(assetId)?.img;
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
