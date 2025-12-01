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
import iconAdd from "../assets/icons/add_filled.svg";
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

  const [latest, ...others] = viewportHistory;

  return (
    <div className="h-full grid grid-cols-1 grid-rows-[max-content_max-content_1fr]">
      <div>
        <h3>Latest</h3>
        <PanelItem
          index={0}
          viewport={latest}
          shapeComposite={shapeComposite}
          documentMap={documentMap}
          imageStore={imageStore}
          backgroundColor={sheetColor}
          onClick={handleJump}
          onDelete={handleDelete}
        />
      </div>
      <div className="mt-1 h-8 flex items-center justify-between gap-1">
        <span>Saved</span>
        <button
          type="button"
          className="w-12 h-8 border rounded-xs flex items-center justify-center"
          title="Save viewport"
          onClick={handleAdd}
        >
          <img className="w-4 h-4" src={iconAdd} alt="Add viewport" />
        </button>
      </div>
      <ul className="overflow-auto">
        {others.map((v, i) => (
          <li key={i + 1}>
            <PanelItem
              index={i + 1}
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
    <div className="relative w-full h-24 border rounded-xs bg-gray-300 flex items-center justify-center">
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
            <button
              className="absolute top-0 right-0 p-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-red-300 hover:bg-red-400"
              onClick={handleDelete}
            >
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
