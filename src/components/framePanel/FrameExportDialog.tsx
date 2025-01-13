import { useTranslation } from "react-i18next";
import { ShapeComposite } from "../../composables/shapeComposite";
import { Dialog, DialogButtonPrimary } from "../atoms/Dialog";
import { useCallback, useMemo } from "react";
import { SelectInput } from "../atoms/inputs/SelectInput";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import { InlineField } from "../atoms/InlineField";

interface ExportOptions {
  fileType: "png" | "svg" | "folly-svg";
}

interface Props {
  shapeComposite: ShapeComposite;
  open: boolean;
  onClose: () => void;
}

export const FrameExportDialog: React.FC<Props> = ({ shapeComposite, open, onClose }) => {
  const { t } = useTranslation();

  const [exportOptions, setExportOptions] = useLocalStorageAdopter<ExportOptions>({
    key: "frame-export",
    version: "1",
    initialValue: { fileType: "png" },
    duration: 1000,
  });

  const handleExport = useCallback(() => {
    console.log(exportOptions);
    onClose();
  }, [exportOptions, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleExport();
    },
    [handleExport],
  );

  const actions = (
    <>
      <DialogButtonPrimary onClick={handleExport}>{t("export")}</DialogButtonPrimary>
    </>
  );

  const handleFileTypeChange = useCallback(
    (val: string) => {
      setExportOptions((src) => ({ ...src, fileType: val as ExportOptions["fileType"] }));
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

  return (
    <Dialog open={open} onClose={onClose} title={t("export")} actions={actions}>
      <div className="w-80">
        <form onSubmit={handleSubmit}>
          <InlineField label={t("export.options.filetype")}>
            <SelectInput value={exportOptions.fileType} options={fileOptions} onChange={handleFileTypeChange} />
          </InlineField>
        </form>
      </div>
    </Dialog>
  );
};
