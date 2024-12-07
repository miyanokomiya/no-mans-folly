import { useCallback, useMemo, useRef } from "react";
import { ImageStore, ImageData, newImageStore } from "../../composables/imageStore";
import { isImageShape } from "../../shapes/image";
import { ShapeStore } from "../../stores/shapes";
import { AssetAPI } from "../../hooks/persistence";
import { Shape } from "../../models";
import { AppCanvasStateContext } from "../../composables/states/appCanvas/core";

export function useImageStore(shapeStore: ShapeStore) {
  const imageStoreRef = useRef<ImageStore>(undefined);
  const imageStore = useMemo(() => {
    const prev = imageStoreRef.current;
    if (!prev) return newImageStore();

    const imageDataList: [string, ImageData][] = [];
    shapeStore.shapeComposite.shapes.filter(isImageShape).forEach((s) => {
      if (!s.assetId) return;
      const imageData = prev.getImageData(s.assetId);
      if (!imageData) return;
      imageDataList.push([s.assetId, imageData]);
    });
    return newImageStore({ imageDataList });
  }, [shapeStore]);
  imageStoreRef.current = imageStore;

  return imageStore;
}

export function useLoadShapeAssets(imageStore: ImageStore, assetAPI: AssetAPI, getSmctx: () => AppCanvasStateContext) {
  return useCallback(
    async (shapes: Shape[]) => {
      const errors = await imageStore.batchLoad(
        shapes.filter(isImageShape).map((s) => s.assetId),
        assetAPI,
      );
      if (errors && errors.length > 0) {
        getSmctx().showToastMessage({ text: `Failed to load ${errors.length} asset file(s).`, type: "warn" });
      }
    },
    [getSmctx, assetAPI, imageStore],
  );
}
