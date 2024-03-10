import { Dialog } from "../atoms/Dialog";
import folderIcon from "../../assets/icons/folder.svg";
import { isFileAccessAvailable } from "../../utils/devices";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
}

export const EntranceDialog: React.FC<Props> = ({ open, onClose, onOpenWorkspace }) => {
  const fileAccessAvailable = isFileAccessAvailable();

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
