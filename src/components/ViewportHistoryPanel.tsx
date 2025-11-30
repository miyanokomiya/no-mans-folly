import { useCallback, useContext, useMemo } from "react";
import { AppStateContext } from "../contexts/AppContext";
import { IRectangle } from "okageo";
import { FrameThumbnail } from "./framePanel/FrameThumbnail";
import { ShapeComposite } from "../composables/shapeComposite";
import { ImageStore } from "../composables/imageStore";
import { DocOutput } from "../models/document";
import { useDocumentMapWithoutTmpInfo, useSelectedSheet, useStaticShapeComposite } from "../hooks/storeHooks";
import { FrameShape } from "../shapes/frame";
import { rednerRGBA } from "../utils/color";
import emptyIcon from "../assets/icons/empty.svg";
import plusIcon from "../assets/icons/plus.svg";
import deleteIcon from "../assets/icons/delete_filled.svg";

export const ViewportHistoryPanel: React.FC = () => {
  const { addViewportHistory, deleteViewportHistory, getViewportHistory, getImageStore, getViewRect, setViewport } =
    useContext(AppStateContext);
  const viewportHistory = getViewportHistory();
  const shapeComposite = useStaticShapeComposite();
  const documentMap = useDocumentMapWithoutTmpInfo();
  const imageStore = getImageStore();
  const sheet = useSelectedSheet();
  const sheetColor = sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff";

  const handleAdd = useCallback(() => {
    addViewportHistory(getViewRect());
  }, [addViewportHistory, getViewRect]);

  const handleDelete = useCallback(
    (index: number) => {
      deleteViewportHistory(index);
    },
    [deleteViewportHistory],
  );

  const handleJump = useCallback(
    (viewport: IRectangle) => {
      setViewport(viewport);
    },
    [setViewport],
  );

  return (
    <div className="flex items-center">
      <ul className="flex flex-row-reverse overflow-x-auto border-l" style={{ maxWidth: "calc(100vw - 340px)" }}>
        {viewportHistory.map((v, i) => (
          <li key={i}>
            <PanelItem
              index={i}
              viewport={v}
              shapeComposite={shapeComposite}
              documentMap={documentMap}
              imageStore={imageStore}
              backgroundColor={sheetColor}
              onClick={handleJump}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="self-stretch border rounded-xs bg-white"
        title="Save viewport"
        onClick={handleAdd}
      >
        <img className="w-4 h-4" src={plusIcon} alt="Add viewport history" />
      </button>
    </div>
  );
};

interface PanelItemProps {
  index: number;
  viewport?: IRectangle;
  shapeComposite: ShapeComposite;
  documentMap: { [id: string]: DocOutput };
  imageStore: ImageStore;
  backgroundColor: string;
  onClick?: (viewport: IRectangle) => void;
  onDelete?: (index: number) => void;
}

const PanelItem: React.FC<PanelItemProps> = ({
  index,
  viewport,
  shapeComposite,
  documentMap,
  imageStore,
  backgroundColor,
  onClick,
  onDelete,
}) => {
  const mockFrame = useMemo<FrameShape | undefined>(() => {
    return viewport
      ? shapeComposite.getShapeStruct("frame").create({ p: viewport, width: viewport.width, height: viewport.height })
      : undefined;
  }, [viewport, shapeComposite]);

  const handleClick = useCallback(() => {
    if (viewport) onClick?.(viewport);
  }, [viewport, onClick]);

  const handleDelete = useCallback(() => {
    onDelete?.(index);
  }, [index, onDelete]);

  return (
    <div className="relative w-18 h-14 border-2 rounded-xs bg-gray-300 flex items-center justify-center">
      {mockFrame ? (
        <>
          <button
            className="w-full h-full hover:opacity-50"
            type="button"
            title={index === 0 ? "Latest viewport" : ""}
            onClick={handleClick}
          >
            <FrameThumbnail
              frame={mockFrame}
              shapeComposite={shapeComposite}
              documentMap={documentMap}
              imageStore={imageStore}
              backgroundColor={backgroundColor}
            />
          </button>
          {index > 0 ? (
            <button className="absolute top-0 right-0 p-0.5 rounded hover:bg-gray-200" onClick={handleDelete}>
              <img className="w-4 h-4" src={deleteIcon} alt="Delete viewport history" />
            </button>
          ) : undefined}
        </>
      ) : (
        <img className="w-10 h-10" src={emptyIcon} alt="Empty" />
      )}
    </div>
  );
};
