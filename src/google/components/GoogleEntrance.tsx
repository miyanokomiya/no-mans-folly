import { useEffect } from "react";
import { useGoogleAuth } from "../hooks/auth";
import { GoogleDrivePicker } from "./GoogleDrivePicker";

interface Props {
  onTokenLoad?: (token: string) => void;
}

export const GoogleEntrance: React.FC<Props> = ({ onTokenLoad }) => {
  const token = useGoogleAuth();

  useEffect(() => {
    if (token) {
      onTokenLoad?.(token);
    }
  }, [token, onTokenLoad]);

  return token ? <GoogleDrivePicker token={token} /> : <div>Loading...</div>;
};
