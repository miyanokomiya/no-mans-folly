import { Dialog } from "../atoms/Dialog";
import { isFileAccessAvailable } from "../../utils/devices";
import { useCallback, useEffect, useState } from "react";
import { fetchGoogleAuthTokenOrRedirect } from "../../google/utils/auth";
import { useDrivePicker } from "../../google/hooks/drivePicker";
import { GoogleDriveFolder } from "../../google/types";
import googleDriveLogo from "../../assets/externals/google_drive_logo.png";
import folderColoredIcon from "../../assets/icons/folder_colored.svg";
import { newFeatureFlags } from "../../composables/featureFlags";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onGoogleFolderSelect?: (folder: GoogleDriveFolder, token: string) => void;
}

export const EntranceDialog: React.FC<Props> = ({ open, onClose, onOpenWorkspace, onGoogleFolderSelect }) => {
  const fileAccessAvailable = isFileAccessAvailable();

  const [googleToken, setGoogleToken] = useState<string>();
  const [googleMode, setGoogleMode] = useState<"" | "loading" | "ready" | "opening" | "opened">("");
  const { googleAvailable } = newFeatureFlags();

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
    fetchGoogleAuthTokenOrRedirect(() => {
      setGoogleMode("");
    })
      .then((token) => {
        setGoogleToken(token);
        setGoogleMode("opening");
      })
      .catch((e) => {
        console.error(e);
        setGoogleMode("");
      });
  }, [googleMode]);

  useEffect(() => {
    if (!googleToken || googleMode !== "opening") return;

    setGoogleMode("opened");
    openGoogleDrivePicker();
  }, [googleToken, googleMode, openGoogleDrivePicker]);

  if (googleMode === "opened") {
    return <></>;
  }

  const loading = !!googleMode;

  return (
    <Dialog open={open} onClose={onClose} title="Open workspace" hideClose required>
      <div className="w-96">
        <p>
          Select <span className="font-bold">a folder</span> as a workspace, then all updates are automatically saved
          there.
        </p>
        <div className="mt-4 flex flex-col items-center">
          {fileAccessAvailable ? (
            <button
              type="button"
              className="w-52 py-2 px-4 rounded bg-blue-400 text-white flex items-center gap-2"
              onClick={onOpenWorkspace}
              disabled={loading}
            >
              <img src={folderColoredIcon} alt="" className="w-8 h-8 bg-white rounded" />
              <span className="w-full text-center text-lg">Local folder</span>
            </button>
          ) : (
            <p className="text-red-500 font-bold text-center">This device or browser doesn't support local folder.</p>
          )}
        </div>
        {googleAvailable ? (
          <div className="mt-4 flex flex-col items-center">
            <button
              type="button"
              className="w-52 py-2 px-4 rounded bg-blue-400 text-white flex items-center gap-2"
              onClick={handleGoogleClick}
              disabled={loading}
            >
              <img src={googleDriveLogo} alt="" className="w-8 h-8 bg-white rounded" />
              <span className="w-full text-center text-lg">{googleMode ? "Loading..." : "Google Drive"}</span>
            </button>
          </div>
        ) : undefined}
        <p className="mt-4">
          You can start without a workspace, but your data will be gone unless it's saved to a workspace before you
          leave this page.
        </p>
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            className="w-52 p-2 rounded border border-gray-400 flex items-center justify-center gap-2"
            onClick={onClose}
            disabled={loading}
          >
            <span>Start without workspace</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
