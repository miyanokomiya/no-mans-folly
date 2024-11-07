import { Dialog } from "../atoms/Dialog";
import { isFileAccessAvailable } from "../../utils/devices";
import { useCallback, useEffect, useState } from "react";
import { fetchGoogleAuthTokenOrRedirect } from "../../google/utils/auth";
import { useDrivePicker } from "../../google/hooks/drivePicker";
import { GoogleDriveFolder } from "../../google/types";
import googleDriveLogo from "../../assets/externals/google_drive_logo.png";
import folderColoredIcon from "../../assets/icons/folder_colored.svg";
import { usePageShowBackEffect } from "../../hooks/window";
import { useTranslation, Trans } from "react-i18next";
import { LangSelection } from "../molecules/LangSelection";
import { registerSW } from "virtual:pwa-register";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onGoogleFolderSelect?: (folder: GoogleDriveFolder, token: string) => void;
  onRevoke?: () => void;
}

export const EntranceDialog: React.FC<Props> = ({ open, onClose, onOpenWorkspace, onGoogleFolderSelect, onRevoke }) => {
  const { t } = useTranslation();
  const fileAccessAvailable = isFileAccessAvailable();

  const [googleToken, setGoogleToken] = useState<string>();
  const [googleMode, setGoogleMode] = useState<"" | "loading" | "ready" | "opening" | "opened">("");

  const handleGoogleFolderSelect = useCallback(
    (folder: GoogleDriveFolder) => {
      if (!googleToken) return;

      onGoogleFolderSelect?.(folder, googleToken);
      setGoogleMode("ready");
    },
    [onGoogleFolderSelect, googleToken],
  );
  const handleGoogleFolderClose = useCallback(() => {
    setGoogleMode("");
  }, []);

  const openGoogleDrivePicker = useDrivePicker({
    token: googleToken,
    onFolderPick: handleGoogleFolderSelect,
    onClose: handleGoogleFolderClose,
  });

  const handleGoogleClick = useCallback(() => {
    if (googleMode) return;

    setGoogleMode("loading");
    fetchGoogleAuthTokenOrRedirect()
      .then((token) => {
        setGoogleToken(token);
        setGoogleMode("opening");
      })
      .catch((e) => {
        console.error(e);
        setGoogleMode("");
      });
  }, [googleMode]);

  usePageShowBackEffect(
    useCallback(() => {
      setGoogleMode("");
    }, []),
  );

  useEffect(() => {
    if (!googleToken || googleMode !== "opening") return;

    setGoogleMode("opened");
    openGoogleDrivePicker();
  }, [googleToken, googleMode, openGoogleDrivePicker]);

  const [updateSW, setUpdateSW] = useState<ReturnType<typeof registerSW>>();
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdateSW(updateSW);
      },
    });
  }, []);
  const handleClickUpdate = useCallback(() => {
    updateSW?.(true);
  }, [updateSW]);

  if (googleMode === "opened") {
    return <></>;
  }

  const loading = !!googleMode;

  const buttonStyle = "w-60 py-2 px-4 rounded flex items-center justify-center";

  return (
    <Dialog open={open} onClose={onClose} title={t("open_workspace")} hideClose required>
      <div className="w-96">
        {updateSW ? (
          <div className="mt-2 p-2 bg-green-100 border-2 rounded">
            <p>
              <Trans i18nKey="update_sw" />
            </p>
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                className="w-40 py-1 px-2 rounded flex items-center justify-center bg-white border border-gray-500 font-semibold"
                onClick={handleClickUpdate}
                disabled={loading}
              >
                {t("reload")}
              </button>
            </div>
          </div>
        ) : undefined}
        <p className="mt-2">
          <Trans i18nKey="select_workspace" components={{ tag_folder: <span className="font-bold" /> }} />
        </p>
        <div className="mt-4 flex flex-col items-center">
          {fileAccessAvailable ? (
            <button
              type="button"
              className={buttonStyle + " bg-blue-400 text-white gap-2"}
              onClick={onOpenWorkspace}
              disabled={loading}
            >
              <img src={folderColoredIcon} alt="" className="w-8 h-8 bg-white rounded" />
              <span className="w-full text-center text-lg">{t("local_folder")}</span>
            </button>
          ) : (
            <p className="text-red-500 font-bold text-center">{t("local_folder.unsupported")}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            className={buttonStyle + " bg-blue-400 text-white gap-2"}
            onClick={handleGoogleClick}
            disabled={loading}
          >
            <img src={googleDriveLogo} alt="" className="w-8 h-8 bg-white rounded" />
            <span className="w-full text-center text-lg">{t(googleMode ? "loading" : "google_drive")}</span>
          </button>
          <a href="/terms/privacy-policy/" target="_blank" className="mt-2 text-blue-500 underline font-semibold">
            {t("app.privacy_policy")}
          </a>
        </div>
        <p className="mt-4">{t("noworkspace.warning")}</p>
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            className={buttonStyle + " border border-gray-500 font-semibold gap-2"}
            onClick={onClose}
            disabled={loading}
          >
            {t("noworkspace.start")}
          </button>
        </div>
        <p className="mt-4"> {t("exconnection.revoke.description")}</p>
        <p>({t("exconnection.revoke.visibility")})</p>
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            className={buttonStyle + " border border-red-400 text-red-500 font-semibold gap-2"}
            onClick={onRevoke}
            disabled={loading}
          >
            {t("exconnection.revoke")}
          </button>
        </div>
        <div className="mt-2 flex flex-col items-center justify-center">
          <a href={process.env.DOC_PATH!} target="_blank" className="mt-2 text-blue-500 underline font-semibold">
            {t("app.documentation")}
          </a>
          <LangSelection />
        </div>
      </div>
    </Dialog>
  );
};
