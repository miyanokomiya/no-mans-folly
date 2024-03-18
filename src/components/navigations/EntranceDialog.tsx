import { Dialog } from "../atoms/Dialog";
import folderIcon from "../../assets/icons/folder.svg";
import { isFileAccessAvailable } from "../../utils/devices";
import { useCallback, useEffect, useState } from "react";
import { fetchGoogleAuthTokenOrRedirect } from "../../google/utils/auth";
import { useDrivePicker } from "../../google/hooks/drivePicker";
import { GoogleDriveFolder } from "../../google/types";
import googleDriveLogo from "../../assets/externals/google_drive_logo.png";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onGoogleFolderSelect?: (folder: GoogleDriveFolder, token: string) => void;
  googleAvailable?: boolean;
}

export const EntranceDialog: React.FC<Props> = ({
  open,
  onClose,
  onOpenWorkspace,
  onGoogleFolderSelect,
  googleAvailable,
}) => {
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

  return (
    <Dialog open={open} onClose={onClose} title="All you need to know befoer diagramming" hideClose required>
      <div className="w-96">
        <p>Your diagram data is saved as files to your folder so you have full responsibility to them.</p>
        <p className="mt-2">Select a folder as a workspace, then all updates are automatically saved there.</p>
        <div className="mt-4 flex flex-col items-center">
          {fileAccessAvailable ? (
            <button
              type="button"
              className="w-52 py-2 px-4 rounded bg-blue-400 text-white flex items-center gap-2"
              onClick={onOpenWorkspace}
            >
              <img src={folderIcon} alt="" className="w-8 h-8 bg-white rounded" />
              <span className="w-full text-center text-lg">Local folder</span>
            </button>
          ) : (
            <p className="text-red-500 font-bold text-center">This device or browser doesn't support local folder.</p>
          )}
        </div>
        {googleAvailable ? (
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
                className="w-52 py-2 px-4 rounded bg-blue-400 text-white flex items-center gap-2"
                onClick={handleGoogleClick}
              >
                <img src={googleDriveLogo} alt="" className="w-8 h-8 bg-white rounded" />
                <span className="w-full text-center text-lg">Google Drive</span>
              </button>
            )}
          </div>
        ) : undefined}
        <p className="mt-4">You can start without a workspace, but your data will be gone when you leave this page.</p>
        {fileAccessAvailable ? <p>You can save this data afterwards only to local folder.</p> : undefined}
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
