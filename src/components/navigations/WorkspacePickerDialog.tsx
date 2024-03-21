import { Dialog } from "../atoms/Dialog";
import { isFileAccessAvailable } from "../../utils/devices";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GOOGLE_AUTH_INITIATE_URL, fetchGoogleAuthToken } from "../../google/utils/auth";
import { useDrivePicker } from "../../google/hooks/drivePicker";
import { GoogleDriveFolder } from "../../google/types";
import googleDriveLogo from "../../assets/externals/google_drive_logo.png";
import folderColoredIcon from "../../assets/icons/folder_colored.svg";
import linkIcon from "../../assets/icons/link.svg";
import googleSignInButton from "../../assets/externals/google_sign_in_light.svg";
import { newFeatureFlags } from "../../composables/featureFlags";

interface Props {
  open: boolean;
  onClose: () => void;
  onLocalFolderSelect?: () => void;
  onGoogleFolderSelect?: (folder: GoogleDriveFolder, token: string) => void;
  actionType?: "open" | "save";
  hasTemporaryDiagram?: boolean;
}

export const WorkspacePickerDialog: React.FC<Props> = ({
  open,
  onClose,
  onLocalFolderSelect,
  onGoogleFolderSelect,
  actionType,
  hasTemporaryDiagram,
}) => {
  const fileAccessAvailable = isFileAccessAvailable();

  const [googleToken, setGoogleToken] = useState<string>();
  const [googleMode, setGoogleMode] = useState<"" | "loading" | "ready" | "opening" | "opened">("");
  const [error, setError] = useState<"google_401" | "google_unknown">();
  const { googleAvailable } = newFeatureFlags();

  const title = useMemo(() => {
    switch (actionType) {
      case "save":
        return "Save and open workspace";
      default:
        return "Open workspace";
    }
  }, [actionType]);

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

    setError(undefined);
    setGoogleMode("loading");
    fetchGoogleAuthToken()
      .then(([status, token]) => {
        if (token) {
          setGoogleToken(token);
          setGoogleMode("opening");
        } else if (status === 401) {
          setError("google_401");
          setGoogleMode("");
        } else {
          setError("google_unknown");
          setGoogleMode("");
        }
      })
      .catch((e) => {
        console.error(e);
        setError("google_unknown");
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
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="w-96">
        <p>
          Select <span className="font-bold">a folder</span> as a workspace, then all updates are automatically saved
          there.
        </p>
        {hasTemporaryDiagram && actionType === "open" ? (
          <p className="text-red-500 font-semibold">
            Current diagram will be cleared by this action and it cannot be undone.
          </p>
        ) : undefined}
        {actionType === "save" ? (
          <p>When a diagram exists in selected workspace, this diagram will be merged to it.</p>
        ) : undefined}
        <div className="mt-4 flex flex-col items-center">
          {fileAccessAvailable ? (
            <button
              type="button"
              className="w-52 py-2 px-4 rounded bg-blue-400 text-white flex items-center gap-2"
              onClick={onLocalFolderSelect}
              disabled={loading}
            >
              <img src={folderColoredIcon} alt="" className="w-8 h-8 bg-white rounded" />
              <span className="w-full text-center text-lg">Local folder</span>
            </button>
          ) : (
            <p className="text-red-500 font-semibold">This browser doesn't support local folder.</p>
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
        {error === "google_401" ? (
          <div className="mt-4 flex flex-col items-center gap-4">
            <p className="text-red-500 font-semibold">
              Google Drive is yet to be connected. Click below button to sing in with Google and connect Google Drive,
              then try again.
            </p>
            <a href={GOOGLE_AUTH_INITIATE_URL} target="_blank" rel="noopener" className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <img src={googleSignInButton} alt="Sign in with Google" className="" />
              <img src={linkIcon} className="w-4 h-4" />
            </a>
          </div>
        ) : error === "google_unknown" ? (
          <p className="mt-4 text-red-500 font-semibold text-center">Failed to get connection to Google Drive.</p>
        ) : undefined}
      </div>
    </Dialog>
  );
};
