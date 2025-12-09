import { useCallback, useLayoutEffect, useRef } from "react";
import useGoogleDrivePicker from "react-google-drive-picker";
import { GoogleDriveFolder } from "../types";

interface Props {
  token?: string;
  onFolderPick?: (folder: GoogleDriveFolder) => void;
  onClose?: () => void;
}

export function useDrivePicker({ token, onFolderPick, onClose }: Props) {
  const [_openPicker] = useGoogleDrivePicker();
  const pickerRef = useRef(_openPicker);
  useLayoutEffect(() => {
    pickerRef.current = _openPicker;
  }, [_openPicker]);

  const openPicker = useCallback(() => {
    if (!token) return;

    pickerRef.current({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      developerKey: process.env.GOOGLE_API_KEY ?? "",
      viewId: "FOLDERS",
      token,
      setIncludeFolders: true,
      setSelectFolderEnabled: true,
      callbackFunction: (data) => {
        if (data.action === "loaded") return;

        if (data.action === "picked" && data.docs?.length > 0 && data.docs[0].type === "folder") {
          onFolderPick?.(data.docs[0]);
        }

        onClose?.();
      },
    });
  }, [token, onFolderPick, onClose]);

  return openPicker;
}
