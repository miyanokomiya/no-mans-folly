import { useTranslation } from "react-i18next";
import { createZip } from "littlezipper";
import { Dialog, DialogButtonPrimary } from "../atoms/Dialog";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { FrameThumbnail } from "./FrameThumbnail";
import { useSelectedSheet } from "../../hooks/storeHooks";
import { rednerRGBA } from "../../utils/color";
import { addSuffixToAvoidDuplication } from "../../utils/text";

interface ExportOptions {
  imageType: "png" | "svg" | "folly-svg";
  hideFrame: boolean;
  filenamePrefix: boolean;
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
    version: "3",
    initialValue: { imageType: "png", hideFrame: false, filenamePrefix: false },
    duration: 1000,
  });

  const shapeComposite = getCtx().getShapeComposite();
  const frames = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);
  const [frameIdSet, setFrameIdSet] = useState(() => new Set(frames.map((f) => f.id)));
  const [progress, setProgress] = useState<number>();

  useEffect(() => {
    if (!open) return;

    setFrameIdSet((src) => {
      // Preserve previous selections if possible, or select all.
      const nextAllSet = new Set(frames.map((f) => f.id));
      const preservedSet = new Set(Array.from(src).filter((id) => nextAllSet.has(id)));

      if (preservedSet.size === 0) {
        return nextAllSet;
      } else {
        return preservedSet;
      }
    });
  }, [open, frames]);

  const handleExport = useCallback(async () => {
    const ctx = getCtx();
    setProgress(0);
    try {
      switch (exportOptions.imageType) {
        case "png":
          await exportAsPNG(ctx, frameIdSet, setProgress, exportOptions.hideFrame, exportOptions.filenamePrefix);
          break;
        case "svg":
          await exportAsSVG(ctx, frameIdSet, setProgress, false, exportOptions.hideFrame, exportOptions.filenamePrefix);
          break;
        case "folly-svg":
          await exportAsSVG(ctx, frameIdSet, setProgress, true, exportOptions.hideFrame, exportOptions.filenamePrefix);
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
  }, [frameIdSet, exportOptions, onClose, getCtx]);

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

  const handleFilenamePrefixChange = useCallback(
    (val: boolean) => {
      setExportOptions((src) => ({ ...src, filenamePrefix: val }));
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

  const documentMap = getCtx().getDocumentMap();
  const imageStore = getCtx().getImageStore();
  const sheet = useSelectedSheet();
  const backgroundColor = useMemo(() => (sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff"), [sheet]);

  const handleFrameClick = useCallback((val: boolean, name: string) => {
    setFrameIdSet((src) => {
      const ret = new Set(src);
      if (val) {
        ret.add(name);
        return ret;
      } else {
        ret.delete(name);
        return ret;
      }
    });
  }, []);
  const handleAllFramesClick = useCallback(
    (val: boolean) => {
      if (val) {
        setFrameIdSet(new Set(frames.map((f) => f.id)));
      } else {
        setFrameIdSet(new Set());
      }
    },
    [frames],
  );

  return progress === undefined ? (
    <Dialog open={open} onClose={onClose} title={t("export.frames_as_zip")} actions={actions}>
      <div className="w-80">
        <div className="px-1">
          <ToggleInput value={frameIdSet.size === frames.length} onChange={handleAllFramesClick}>
            {t("export.options.all_frames")}
          </ToggleInput>
        </div>
        <div className="mt-1 max-h-[50vh] border overflow-auto flex flex-col items-center gap-1">
          {frames.map((f, i) => (
            <div key={f.id} className="w-full">
              <div className="px-1">
                <ToggleInput value={frameIdSet.has(f.id)} name={f.id} onChange={handleFrameClick}>
                  {i + 1}. {f.name}
                </ToggleInput>
              </div>
              <div className="w-full h-20">
                <FrameThumbnail
                  shapeComposite={shapeComposite}
                  documentMap={documentMap}
                  imageStore={imageStore}
                  backgroundColor={backgroundColor}
                  frame={f}
                />
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="mt-2">
          <InlineField label={t("export.options.hideframe")}>
            <ToggleInput value={exportOptions.hideFrame} onChange={handleHideFrameChange} />
          </InlineField>
          <InlineField label={t("export.options.filename_prefix")}>
            <ToggleInput value={exportOptions.filenamePrefix} onChange={handleFilenamePrefixChange} />
          </InlineField>
          <div className="my-1">
            <InlineField label={t("export.options.imagetype")}>
              <SelectInput value={exportOptions.imageType} options={fileOptions} onChange={handleFileTypeChange} />
            </InlineField>
          </div>
        </form>
      </div>
    </Dialog>
  ) : (
    <LoadingDialog open={open} progress={progress} />
  );
};

type ZipItem = [name: string, ext: string, Uint8Array];

async function exportAsPNG(
  ctx: AppCanvasStateContext,
  frameIdSet: Set<string>,
  onProgress: (progress: number) => void,
  hideFrame: boolean,
  filenamePrefix: boolean,
) {
  if (frameIdSet.size === 0) return;

  onProgress(0);
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);
  const excludeIdSet = new Set(hideFrame ? frames.map((f) => f.id) : []);
  const items: ZipItem[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frameIdSet.has(frame.id)) continue;

    const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet);
    const renderer = newShapeRenderer({
      shapeComposite: info.targetShapeComposite,
      getDocumentMap: ctx.getDocumentMap,
      imageStore: ctx.getImageStore(),
    });
    const builder = newImageBuilder({ render: renderer.render, range: info.range });
    const blob = await builder.toBlob();
    const buffer = await blob.arrayBuffer();
    const prefix = filenamePrefix ? `${i + 1}_` : "";
    items.push([`${prefix}${escapeFilename(frame.name)}`, "png", new Uint8Array(buffer)]);
    onProgress(items.length / frameIdSet.size);
  }

  await saveZipAsFile("frames-png.zip", items);
}

async function exportAsSVG(
  ctx: AppCanvasStateContext,
  frameIdSet: Set<string>,
  onProgress: (progress: number) => void,
  withMeta = false,
  hideFrame: boolean,
  filenamePrefix: boolean,
) {
  if (frameIdSet.size === 0) return;

  onProgress(0);
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);
  const excludeIdSet = new Set(hideFrame ? frames.map((f) => f.id) : []);
  const items: ZipItem[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frameIdSet.has(frame.id)) continue;

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
    const buffer = await blob.arrayBuffer();
    const prefix = filenamePrefix ? `${i + 1}_` : "";
    const suffix = withMeta ? "folly." : "";
    items.push([`${prefix}${escapeFilename(frame.name)}`, `${suffix}svg`, new Uint8Array(buffer)]);
    onProgress(items.length / frameIdSet.size);
  }

  await saveZipAsFile(withMeta ? "frames-folly-svg.zip" : "frames-svg.zip", items);
}

async function saveZipAsFile(name: string, items: ZipItem[]) {
  const names = addSuffixToAvoidDuplication(items.map(([name]) => name));
  const zip = await createZip(
    items.map(([, ext, data], i) => ({ path: `${names[i]}.${ext}`, data })),
    true,
  );
  const blob = new Blob([zip], { type: "application/x-zip" });
  const url = URL.createObjectURL(blob);
  saveFileInWeb(url, name);
  URL.revokeObjectURL(url);
}
