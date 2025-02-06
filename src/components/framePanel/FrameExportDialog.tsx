import { useTranslation } from "react-i18next";
import { Dialog, DialogButtonPlain, DialogButtonPrimary } from "../atoms/Dialog";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SelectInput } from "../atoms/inputs/SelectInput";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import { InlineField } from "../atoms/InlineField";
import { GetAppStateContext } from "../../contexts/AppContext";
import { getAllFrameShapes, getFrameTree } from "../../composables/frame";
import { LoadingDialog } from "../navigations/LoadingDialog";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { FrameThumbnail } from "./FrameThumbnail";
import { useSelectedSheet } from "../../hooks/storeHooks";
import { rednerRGBA } from "../../utils/color";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { FrameShape, isFrameShape } from "../../shapes/frame";
import { isFrameAlignGroupShape } from "../../shapes/frameGroups/frameAlignGroup";
import {
  exportFrameAsPNG,
  exportFrameAsSVG,
  ExportFrameOptions,
  printFrameAsDocument,
} from "../../composables/states/appCanvas/utils/shapeExport";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const FrameExportDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const getCtx = useContext(GetAppStateContext);

  const [exportOptions, setExportOptions] = useLocalStorageAdopter<ExportFrameOptions>({
    key: "frame-export-options",
    version: "4",
    initialValue: { imageType: "png" },
    duration: 1000,
  });

  const shapeComposite = getCtx().getShapeComposite();
  const frames = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);
  const [frameIdSet, setFrameIdSet] = useState(() => new Set(frames.map((f) => f.id)));
  const [progress, setProgress] = useState<number>();

  const frameTree = useMemo(() => {
    return getFrameTree(shapeComposite);
  }, [shapeComposite]);

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
          await exportFrameAsPNG(ctx, frameIdSet, setProgress, exportOptions);
          break;
        case "svg":
          await exportFrameAsSVG(ctx, frameIdSet, setProgress, false, exportOptions);
          break;
        case "folly-svg":
          await exportFrameAsSVG(ctx, frameIdSet, setProgress, true, exportOptions);
          break;
        case "print":
          await printFrameAsDocument(ctx, frameIdSet, setProgress, exportOptions);
          break;
      }
    } catch (e) {
      ctx.showToastMessage({
        text: "Failed to create image",
        type: "error",
      });
      console.error(e);
    } finally {
      setProgress(undefined);
    }
  }, [frameIdSet, exportOptions, getCtx]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleExport();
    },
    [handleExport],
  );

  const actions = (
    <>
      <DialogButtonPlain onClick={onClose}>{t("cancel")}</DialogButtonPlain>
      <DialogButtonPrimary onClick={handleExport}>{t("export.title")}</DialogButtonPrimary>
    </>
  );

  const handleFileTypeChange = useCallback(
    (val: string) => {
      setExportOptions((src) => ({ ...src, imageType: val as ExportFrameOptions["imageType"] }));
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
      setExportOptions((src) => ({ ...src, sequencePrefix: val }));
    },
    [setExportOptions],
  );

  const handleHideNameOnPrintChange = useCallback(
    (val: boolean) => {
      setExportOptions((src) => ({ ...src, hideNameOnPrint: val }));
    },
    [setExportOptions],
  );

  const fileOptions = useMemo(
    () => [
      { value: "png", label: "PNG" },
      { value: "svg", label: "SVG" },
      { value: "folly-svg", label: "Folly SVG" },
      { value: "print", label: t("export.imagetypes.print") },
    ],
    [t],
  );

  const documentMap = getCtx().getDocumentMap();
  const imageStore = getCtx().getImageStore();
  const sheet = useSelectedSheet();
  const backgroundColor = useMemo(() => (sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff"), [sheet]);

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

  const getThumbnail = useCallback(
    (frame: FrameShape) => {
      return (
        <FrameThumbnail
          shapeComposite={shapeComposite}
          documentMap={documentMap}
          imageStore={imageStore}
          backgroundColor={backgroundColor}
          frame={frame}
        />
      );
    },
    [shapeComposite, documentMap, imageStore, backgroundColor],
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} title={t("export.export_frames")} actions={actions}>
        <div className="flex gap-4">
          <div className="w-60">
            <div className="mb-1 flex items-center gap-2 font-medium text-md">
              <span>{t("export.target_frames")}</span>
              <span>
                ({frameIdSet.size}/{frames.length})
              </span>
            </div>
            <div className="px-1">
              <ToggleInput value={frameIdSet.size === frames.length} onChange={handleAllFramesClick}>
                {t("export.options.all_frames")}
              </ToggleInput>
            </div>
            <div className="max-h-[50vh] overflow-auto flex flex-col gap-2 border p-1">
              {frameTree.map((tree, i) => {
                const shapeMap = shapeComposite.shapeMap;
                const shape = shapeMap[tree.id];
                if (isFrameAlignGroupShape(shape)) {
                  return (
                    <FrameGroupList
                      key={shape.id}
                      index={i}
                      label={shape.name}
                      frames={tree.children.map((c) => shapeMap[c.id] as FrameShape)}
                      getThumbnail={getThumbnail}
                      selectedSet={frameIdSet}
                      onChange={setFrameIdSet}
                    />
                  );
                } else if (isFrameShape(shape)) {
                  return (
                    <FrameItem
                      key={shape.id}
                      index={i}
                      frame={shape}
                      getThumbnail={getThumbnail}
                      selectedSet={frameIdSet}
                      onChange={setFrameIdSet}
                    />
                  );
                }
              })}
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <p className="mb-1 text-md font-medium">{t("options")}</p>
            <InlineField label={t("export.options.hideframe")}>
              <ToggleInput value={!!exportOptions.hideFrame} onChange={handleHideFrameChange} />
            </InlineField>
            <InlineField label={t("export.options.sequence_prefix")}>
              <ToggleInput value={!!exportOptions.sequencePrefix} onChange={handleFilenamePrefixChange} />
            </InlineField>
            <div className="my-1">
              <InlineField label={t("export.options.imagetype")}>
                <SelectInput value={exportOptions.imageType} options={fileOptions} onChange={handleFileTypeChange} />
              </InlineField>
            </div>
            {exportOptions.imageType === "print" ? (
              <BlockGroupField label={t("export.options.print_options")}>
                <InlineField label={t("export.options.hidename_onprint")}>
                  <ToggleInput value={!!exportOptions.hideNameOnPrint} onChange={handleHideNameOnPrintChange} />
                </InlineField>
              </BlockGroupField>
            ) : undefined}
          </form>
        </div>
      </Dialog>
      <LoadingDialog open={progress !== undefined} progress={progress} />
    </>
  );
};

interface FrameGroupListProps {
  index: number;
  label: string;
  frames: FrameShape[];
  getThumbnail: (frame: FrameShape) => React.ReactNode;
  selectedSet: Set<string>;
  onChange: (fn: (prev: Set<string>) => Set<string>) => void;
}

const FrameGroupList: React.FC<FrameGroupListProps> = ({
  index,
  label,
  frames,
  getThumbnail,
  selectedSet,
  onChange,
}) => {
  const handleFrameClick = useCallback(
    (val: boolean, id: string) => {
      onChange((prev) => {
        const ret = new Set(prev);
        if (val) {
          ret.add(id);
        } else {
          ret.delete(id);
        }
        return ret;
      });
    },
    [onChange],
  );
  const handleAllFramesClick = useCallback(
    (val: boolean) => {
      onChange((prev) => {
        const ret = new Set(prev);
        if (val && frames.some((f) => !prev.has(f.id))) {
          frames.forEach((f) => ret.add(f.id));
        } else {
          frames.forEach((f) => ret.delete(f.id));
        }
        return ret;
      });
    },
    [frames, onChange],
  );

  return (
    <div>
      <div className="px-1">
        <ToggleInput value={frames.every((f) => selectedSet.has(f.id))} onChange={handleAllFramesClick}>
          <span className="font-bold">
            {index + 1}: {label}
          </span>
        </ToggleInput>
      </div>
      <div className="ml-2 py-1 pl-1 border-l border-b border-gray-500">
        <div className="border flex flex-col items-center gap-1">
          {frames.map((f, i) => (
            <div key={f.id} className="w-full">
              <div className="px-1 text-ellipsis">
                <ToggleInput value={selectedSet.has(f.id)} name={f.id} onChange={handleFrameClick}>
                  {i + 1}. {f.name}
                </ToggleInput>
              </div>
              <div className="w-full h-16">{getThumbnail(f)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FrameItemProps {
  index: number;
  frame: FrameShape;
  getThumbnail: (frame: FrameShape) => React.ReactNode;
  selectedSet: Set<string>;
  onChange: (fn: (prev: Set<string>) => Set<string>) => void;
}

const FrameItem: React.FC<FrameItemProps> = ({ index, frame, getThumbnail, selectedSet, onChange }) => {
  const handleFrameClick = useCallback(
    (val: boolean, id: string) => {
      onChange((prev) => {
        const ret = new Set(prev);
        if (val) {
          ret.add(id);
        } else {
          ret.delete(id);
        }
        return ret;
      });
    },
    [onChange],
  );

  return (
    <div className="border">
      <div className="px-1 text-ellipsis">
        <ToggleInput value={selectedSet.has(frame.id)} name={frame.id} onChange={handleFrameClick}>
          {index + 1}. {frame.name}
        </ToggleInput>
      </div>
      <div className="w-full h-16">{getThumbnail(frame)}</div>
    </div>
  );
};
