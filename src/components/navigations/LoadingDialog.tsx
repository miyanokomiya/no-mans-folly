import { Dialog } from "../atoms/Dialog";

interface Props {
  open: boolean;
}

export const LoadingDialog: React.FC<Props> = ({ open }) => {
  return (
    <Dialog open={open} hideClose required className="bg-transparent">
      <div>
        <p>Loading...</p>
      </div>
    </Dialog>
  );
};
