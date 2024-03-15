import { useCallback, useRef } from "react";
import useGoogleDrivePicker from "react-google-drive-picker";
import { GoogleDriveFolder } from "../types";

interface Props {
  token?: string;
  onFolderPick?: (folder: GoogleDriveFolder) => void;
}

export function useDrivePicker({ token, onFolderPick }: Props) {
  const [_openPicker] = useGoogleDrivePicker();
  const pickerRef = useRef(_openPicker);
  pickerRef.current = _openPicker;

  const openPicker = useCallback(() => {
    if (!token) return;

    pickerRef.current({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      developerKey: process.env.GOOGLE_API_KEY ?? "",
      viewId: "FOLDERS",
      token,
      setSelectFolderEnabled: true,
      callbackFunction: (data) => {
        if (data.action !== "picked" || data.docs?.length === 0) return;

        onFolderPick?.(data.docs[0]);
      },
    });
  }, [token, onFolderPick]);

  return openPicker;
}
