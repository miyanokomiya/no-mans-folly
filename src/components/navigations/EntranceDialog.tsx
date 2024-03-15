import { Dialog } from "../atoms/Dialog";
import folderIcon from "../../assets/icons/folder.svg";
import { isFileAccessAvailable } from "../../utils/devices";
import { useCallback, useEffect, useState } from "react";
import { fetchGoogleAuthTokenOrRedirect } from "../../google/hooks/auth";
import { useDrivePicker } from "../../google/hooks/drivePicker";
import { GoogleDriveFolder } from "../../google/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onGoogleFolderSelect?: (folder: GoogleDriveFolder) => void;
}

export const EntranceDialog: React.FC<Props> = ({ open, onClose, onOpenWorkspace, onGoogleFolderSelect }) => {
  const fileAccessAvailable = isFileAccessAvailable();

  const [googleToken, setGoogleToken] = useState<string>();
  const [googleMode, setGoogleMode] = useState<"" | "loading" | "ready" | "opened">("");

  const handleGoogleFolderSelect = useCallback(
    (folder: GoogleDriveFolder) => {
      onGoogleFolderSelect?.(folder);
    },
    [onGoogleFolderSelect],
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
        setGoogleMode("ready");
      })
      .catch((e) => {
        console.error(e);
        setGoogleMode("");
      });
  }, [googleMode]);

  useEffect(() => {
    if (!googleToken) return;

    setGoogleMode("opened");
    openGoogleDrivePicker();
  }, [googleToken, openGoogleDrivePicker]);

  if (googleMode === "opened") {
    return <></>;
  }

  return (
    <Dialog open={open} onClose={onClose} title="All you need to know befoer diagramming" hideClose required>
      <div className="w-96">
        <p>All project data are saved as local files and you have full responsibility to them.</p>
        <p className="mt-2">
          Select a folder and allow to edit it as a workspace, then all updates are automatically saved there.
        </p>
        <div className="mt-4 flex flex-col items-center">
          {fileAccessAvailable ? (
            <button
              type="button"
              className="w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center gap-2"
              onClick={onOpenWorkspace}
            >
              <img src={folderIcon} alt="" className="w-8 h-8" />
              <span>Open workspace</span>
            </button>
          ) : (
            <p className="text-red-500 font-bold text-center">This device or browser doesn't support this feature.</p>
          )}
        </div>
        {fileAccessAvailable ? (
          <p className="mt-4">
            You can also start without a workspace, but your data will be gone unless you save them into a workspace
            afterwards.
          </p>
        ) : (
          <p className="mt-4">
            You can start without a workspace, but your data will be gone when you leave this page.
          </p>
        )}
        <div className="mt-4 flex flex-col items-center">
          {googleMode ? (
            <button
              type="button"
              className="h-12 w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center"
              disabled
            >
              <span>Loading...</span>
            </button>
          ) : (
            <button
              type="button"
              className="w-52 p-2 rounded bg-blue-400 text-white flex items-center justify-center gap-2"
              onClick={handleGoogleClick}
            >
              <img src={folderIcon} alt="" className="w-8 h-8" />
              <span>Google Drive</span>
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            className="w-52 p-2 rounded border flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <span>Start without workspace</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
