import { AssetAPI } from "../hooks/persistence";
import { newCallback } from "../utils/stateful/reactives";

export interface ImageData {
  img: HTMLImageElement;
  type: "image/png" | "image/svg+xml" | string;
}

type Option = {
  imageDataList?: [string, ImageData][];
};

export function newImageStore(option?: Option) {
  const imageMap = new Map<string, ImageData>(option?.imageDataList ?? []);
  const callback = newCallback<[string, HTMLImageElement]>();
  const processing = new Set<string>();

  function clear() {
    imageMap.clear();
  }

  function replaceImageData(imageDataList: [string, ImageData][]) {
    clear();
    imageDataList.forEach(([assetId, imageData]) => {
      imageMap.set(assetId, imageData);
    });
  }

  function getImageStoreCache(): ImageStore {
    return newImageStore({ imageDataList: Array.from(imageMap.entries()) });
  }

  /**
   * When SVG doesn't have "xmlns:xlink" attribute, it can't be drawn by Canvas API's "drawImage".
   * Doing "document.body.appendChild(img)" can be a workaround though, not sure if it's worth doing.
   */
  function loadFromFile(assetId: string, file: File | Blob): Promise<HTMLImageElement> {
    const type = file.type;
    const objectURL = URL.createObjectURL(file);
    const img = new Image();

    processing.add(assetId);
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(objectURL);
        processing.delete(assetId);
        imageMap.set(assetId, { img, type });
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

  async function lazyLoadFromFile<T extends File | Blob>(assetId: string, loadFn: () => Promise<T>): Promise<T> {
    processing.add(assetId);
    const file = await loadFn();
    await loadFromFile(assetId, file);
    return file;
  }

  /**
   * Returns error id list when there is any.
   */
  async function batchLoad(
    assetIds: (string | undefined)[],
    assetAPI: AssetAPI,
    ignoreError = false,
  ): Promise<string[] | undefined> {
    if (!assetAPI.enabled) return;

    const errors: string[] = [];

    for (const assetId of assetIds) {
      if (assetId && !processing.has(assetId) && !imageMap.has(assetId)) {
        try {
          processing.add(assetId);
          const file = await assetAPI.loadAsset(assetId);
          if (file) {
            await loadFromFile(assetId, file);
          }
        } catch (e) {
          if (!ignoreError) {
            console.error(e);
            errors.push(assetId);
          }
        } finally {
          processing.delete(assetId);
        }
      }
    }

    return errors;
  }

  function getImage(assetId: string): HTMLImageElement | undefined {
    return getImageData(assetId)?.img;
  }

  function getImageData(assetId: string): ImageData | undefined {
    return imageMap.get(assetId);
  }

  function removeImage(assetId: string) {
    return imageMap.delete(assetId);
  }

  return {
    loadFromFile,
    lazyLoadFromFile,
    batchLoad,
    getImage,
    getImageData,
    removeImage,
    clear,
    replaceImageData,
    getImageStoreCache,
    watch: callback.bind,
  };
}
export type ImageStore = ReturnType<typeof newImageStore>;
