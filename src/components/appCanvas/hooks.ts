import { useCallback, useMemo, useRef } from "react";
import { ImageStore, ImageData, newImageStore } from "../../composables/imageStore";
import { isImageShape } from "../../shapes/image";
import { ShapeStore } from "../../stores/shapes";
import { AssetAPI } from "../../hooks/persistence";
import { Shape, Sheet } from "../../models";
import { AppCanvasStateContext } from "../../composables/states/appCanvas/core";
import { getSheetThumbnailFileName } from "../../utils/fileAccess";

export function useImageStore(shapeStore: ShapeStore, sheets: Sheet[]) {
  const imageStoreRef = useRef<ImageStore>(undefined);
  const imageStore = useMemo(() => {
    const prev = imageStoreRef.current;
    if (!prev) return newImageStore();

    const imageDataList: [string, ImageData][] = [];
    // Conserve images that are already loaded.
    shapeStore.shapeComposite.shapes.filter(isImageShape).forEach((s) => {
      if (!s.assetId) return;
      const imageData = prev.getImageData(s.assetId);
      if (!imageData) return;
      imageDataList.push([s.assetId, imageData]);
    });
    // Conserve sheet thumbnails.
    sheets.forEach((sheet) => {
      const assetId = getSheetThumbnailFileName(sheet.id);
      const imageData = prev.getImageData(assetId);
      if (!imageData) return;
      imageDataList.push([assetId, imageData]);
    });
    return newImageStore({ imageDataList });
  }, [shapeStore, sheets]);
  imageStoreRef.current = imageStore;

  return imageStore;
}

export function useLoadShapeAssets(
  imageStore: ImageStore,
  assetAPI: AssetAPI,
  getSmctx: () => AppCanvasStateContext,
  sheets: Sheet[],
) {
  return useCallback(
    async (shapes: Shape[]) => {
      const errors = await imageStore.batchLoad(
        sheets
          .map<string | undefined>((sheet) => getSheetThumbnailFileName(sheet.id))
          .concat(shapes.filter(isImageShape).map((s) => s.assetId)),
        assetAPI,
      );
      if (errors && errors.length > 0) {
        getSmctx().showToastMessage({ text: `Failed to load ${errors.length} asset file(s).`, type: "warn" });
      }
    },
    [getSmctx, assetAPI, imageStore, sheets],
  );
}
