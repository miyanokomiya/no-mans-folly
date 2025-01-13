import { useTranslation } from "react-i18next";
import { createZip } from "littlezipper";
import { Dialog, DialogButtonPrimary } from "../atoms/Dialog";
import { useCallback, useContext, useMemo, useState } from "react";
import { SelectInput } from "../atoms/inputs/SelectInput";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import { InlineField } from "../atoms/InlineField";
import { GetAppStateContext } from "../../contexts/AppContext";
import { getAllFrameShapes } from "../../composables/frame";
import { escapeFilename, getExportParamsForSelectedRange, saveFileInWeb } from "../../composables/shapeExport";
import { newShapeRenderer } from "../../composables/shapeRenderer";
import { newImageBuilder, newSVGImageBuilder } from "../../composables/imageBuilder";
import { AppCanvasStateContext } from "../../composables/states/appCanvas/core";
import { LoadingDialog } from "../navigations/LoadingDialog";
import { newShapeSVGRenderer } from "../../composables/shapeSVGRenderer";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface ExportOptions {
  imageType: "png" | "svg" | "folly-svg";
  hideFrame: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const FrameExportDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const getCtx = useContext(GetAppStateContext);

  const [exportOptions, setExportOptions] = useLocalStorageAdopter<ExportOptions>({
    key: "frame-export-options",
    version: "2",
    initialValue: { imageType: "png", hideFrame: false },
    duration: 1000,
  });

  const [progress, setProgress] = useState<number>();

  const handleExport = useCallback(async () => {
    const ctx = getCtx();
    setProgress(0);
    try {
      switch (exportOptions.imageType) {
        case "png":
          await exportAsPNG(ctx, setProgress, exportOptions.hideFrame);
          break;
        case "svg":
          await exportAsSVG(ctx, setProgress, false, exportOptions.hideFrame);
          break;
        case "folly-svg":
          await exportAsSVG(ctx, setProgress, true, exportOptions.hideFrame);
          break;
      }
      onClose();
    } catch (e) {
      ctx.showToastMessage({
        text: "Failed to create image",
        type: "error",
      });
      console.error(e);
    } finally {
      setProgress(undefined);
    }
  }, [exportOptions, onClose, getCtx]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleExport();
    },
    [handleExport],
  );

  const actions = (
    <>
      <DialogButtonPrimary onClick={handleExport}>{t("export.title")}</DialogButtonPrimary>
    </>
  );

  const handleFileTypeChange = useCallback(
    (val: string) => {
      setExportOptions((src) => ({ ...src, imageType: val as ExportOptions["imageType"] }));
    },
    [setExportOptions],
  );

  const handleHideFrameChange = useCallback(
    (val: boolean) => {
      setExportOptions((src) => ({ ...src, hideFrame: val }));
    },
    [setExportOptions],
  );

  const fileOptions = useMemo(
    () => [
      { value: "png", label: "PNG" },
      { value: "svg", label: "SVG" },
      { value: "folly-svg", label: "Folly SVG" },
    ],
    [],
  );

  return progress === undefined ? (
    <Dialog open={open} onClose={onClose} title={t("export.frames_as_zip")} actions={actions}>
      <div className="w-80">
        <form onSubmit={handleSubmit}>
          <InlineField label={t("export.options.hideframe")}>
            <ToggleInput value={exportOptions.hideFrame} onChange={handleHideFrameChange} />
          </InlineField>
          <InlineField label={t("export.options.imagetype")}>
            <SelectInput value={exportOptions.imageType} options={fileOptions} onChange={handleFileTypeChange} />
          </InlineField>
        </form>
      </div>
    </Dialog>
  ) : (
    <LoadingDialog open={open} progress={progress} />
  );
};

async function exportAsPNG(ctx: AppCanvasStateContext, onProgress: (progress: number) => void, hideFrame: boolean) {
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);
  if (frames.length === 0) return;

  onProgress(0);
  const excludeIdSet = new Set(hideFrame ? frames.map((f) => f.id) : []);
  const items: [string, Uint8Array][] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet);
    const renderer = newShapeRenderer({
      shapeComposite: info.targetShapeComposite,
      getDocumentMap: ctx.getDocumentMap,
      imageStore: ctx.getImageStore(),
    });
    const builder = newImageBuilder({ render: renderer.render, range: info.range });
    const blob = await builder.toBlob();
    items.push([`${i + 1}_${escapeFilename(frame.name)}.png`, new Uint8Array(await blob.arrayBuffer())]);
    onProgress(items.length / frames.length);
  }

  const zip = await createZip(
    items.map((item) => ({ path: item[0], data: item[1] })),
    true,
  );
  const blob = new Blob([zip], { type: "application/x-zip" });
  const url = URL.createObjectURL(blob);
  saveFileInWeb(url, "frames-png.zip");
  URL.revokeObjectURL(url);
}

async function exportAsSVG(
  ctx: AppCanvasStateContext,
  onProgress: (progress: number) => void,
  withMeta = false,
  hideFrame: boolean,
) {
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);
  if (frames.length === 0) return;

  onProgress(0);
  const excludeIdSet = new Set(hideFrame ? frames.map((f) => f.id) : []);
  const items: [string, Uint8Array][] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet);
    const renderer = newShapeSVGRenderer({
      shapeComposite: info.targetShapeComposite,
      getDocumentMap: ctx.getDocumentMap,
      imageStore: ctx.getImageStore(),
      assetAPI: ctx.assetAPI,
    });
    const builder = newSVGImageBuilder({
      render: withMeta ? renderer.renderWithMeta : renderer.render,
      range: info.range,
    });
    const blob = await builder.toBlob();
    items.push([
      `${i + 1}_${escapeFilename(frame.name)}${withMeta ? ".folly" : ""}.svg`,
      new Uint8Array(await blob.arrayBuffer()),
    ]);
    onProgress(items.length / frames.length);
  }

  const zip = await createZip(
    items.map((item) => ({ path: item[0], data: item[1] })),
    true,
  );
  const blob = new Blob([zip], { type: "application/x-zip" });
  const url = URL.createObjectURL(blob);
  saveFileInWeb(url, withMeta ? "frames-folly-svg.zip" : "frames-svg.zip");
  URL.revokeObjectURL(url);
}
