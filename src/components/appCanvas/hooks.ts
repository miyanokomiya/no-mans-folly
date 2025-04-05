import { useCallback, useEffect, useState } from "react";
import { ImageStore, ImageData, newImageStore } from "../../composables/imageStore";
import { isImageShape } from "../../shapes/image";
import { ShapeStore } from "../../stores/shapes";
import { AssetAPI } from "../../hooks/persistence";
import { Shape, Sheet } from "../../models";
import { AppCanvasStateContext } from "../../composables/states/appCanvas/core";
import { getSheetThumbnailFileName } from "../../utils/fileAccess";

export function useImageStore(shapeStore: ShapeStore, sheets: Sheet[]) {
  // Use the same store for all sheets to handle asyncronous processes properly.
  // => If we use different stores, old image data can remain in the new one if sheet switching happens while loading new data.
  const [imageStore] = useState(() => newImageStore());

  useEffect(() => {
    const imageDataList: [string, ImageData][] = [];
    // Conserve images that are already loaded.
    shapeStore.shapeComposite.shapes.filter(isImageShape).forEach((s) => {
      if (!s.assetId) return;
      const imageData = imageStore.getImageData(s.assetId);
      if (!imageData) return;
      imageDataList.push([s.assetId, imageData]);
    });
    // Conserve sheet thumbnails.
    sheets.forEach((sheet) => {
      const assetId = getSheetThumbnailFileName(sheet.id);
      const imageData = imageStore.getImageData(assetId);
      if (!imageData) return;
      imageDataList.push([assetId, imageData]);
    });
    imageStore.replaceImageData(imageDataList);
  }, [shapeStore, sheets, imageStore]);

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
        shapes.filter(isImageShape).map((s) => s.assetId),
        assetAPI,
      );
      if (errors && errors.length > 0) {
        getSmctx().showToastMessage({ text: `Failed to load ${errors.length} asset file(s).`, type: "warn" });
      }
      // Load sheet thumbnails. These don't always exist, so we ignore errors.
      await imageStore.batchLoad(
        sheets.map<string | undefined>((sheet) => getSheetThumbnailFileName(sheet.id)),
        assetAPI,
        true,
      );
    },
    [getSmctx, assetAPI, imageStore, sheets],
  );
}
