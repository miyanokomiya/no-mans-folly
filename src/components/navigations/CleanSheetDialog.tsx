import { Dialog, DialogButtonAlert, DialogButtonPlain } from "../atoms/Dialog";

interface Props {
  open: boolean;
  onClose?: () => void;
  onClickOK?: () => void;
}

export const CleanSheetDialog: React.FC<Props> = ({ open, onClose, onClickOK }) => {
  const actions = (
    <>
      <DialogButtonPlain onClick={onClose}>Cancel</DialogButtonPlain>
      <DialogButtonAlert onClick={onClickOK}>Clean sheet</DialogButtonAlert>
    </>
  );

  return (
    <Dialog open={open} title="Clean sheet" onClose={onClose} actions={actions}>
      <div className="w-96">
        <p className="mb-2">This operation reduces the file size of current sheet by deleting CRDT meta data.</p>
        <p className="mb-2">
          It may cause data inconsistency when this sheet is merged with variant sheet in the future.
        </p>
        <p>If there's no variant of this sheet, this operation does no harm but reducing the file size.</p>
      </div>
    </Dialog>
  );
};
