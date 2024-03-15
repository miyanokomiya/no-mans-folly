import { useDrivePicker } from "../hooks/drivePicker";

interface Props {
  token: string;
}

export const GoogleDrivePicker: React.FC<Props> = ({ token }) => {
  useDrivePicker({ token });

  return <></>;
};
export default GoogleDrivePicker;
