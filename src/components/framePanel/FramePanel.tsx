import { useCallback, useContext, useMemo, useRef, useState } from "react";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDownload from "../../assets/icons/download.svg";
import iconSlideshow from "../../assets/icons/slideshow.svg";
import { GetAppStateContext } from "../../contexts/AppContext";
import { createShape } from "../../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../../composables/shapeComposite";
import { useStaticShapeComposite } from "../../hooks/storeHooks";
import { getAllFrameShapes } from "../../composables/frame";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { ListButton, ListIconButton } from "../atoms/buttons/ListButton";
import { FrameExportDialog } from "./FrameExportDialog";
import { FrameTreePanel } from "./FrameTreePanel";
import { FrameToolPanel } from "./FrameToolPanel";
import { Slideshow, SlideshowHandle } from "./Slideshow";

export const FramePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useStaticShapeComposite();

  const frameShapes = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);

  const handleAdd = useCallback(
    (type: string) => {
      const ctx = getCtx();
      const shape = createShape(ctx.getShapeStruct, type, { id: ctx.generateUuid(), findex: ctx.createLastIndex() });
      const minShapeComposite = newShapeComposite({
        getStruct: ctx.getShapeStruct,
        shapes: [shape],
      });
      const wrapperCenter = getRectCenter(minShapeComposite.getWrapperRect(shape));
      const viewCenter = getRectCenter(ctx.getViewRect());
      const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];
      const adjusted = { ...shape, ...minShapeComposite.transformShape(shape, affine) };
      ctx.updateShapes({ add: [adjusted] });
      ctx.selectShape(shape.id);
    },
    [getCtx],
  );

  const [popupOpen, setPopupOpen] = useState("");
  const handleMenuClick = useCallback((key: string) => {
    setPopupOpen((v) => (v === key ? "" : key));
  }, []);
  const closePopup = useCallback(() => {
    setPopupOpen("");
  }, []);

  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportTargetId, setExportTargetId] = useState<string>();
  const handlecloseExportDialog = useCallback(() => {
    setExportTargetId(undefined);
    setOpenExportDialog(false);
  }, []);

  const handleExport = useCallback(() => {
    setPopupOpen("");
    setOpenExportDialog(true);
  }, []);

  const handleExportByFrame = useCallback((id: string) => {
    setExportTargetId(id);
    setOpenExportDialog(true);
  }, []);

  const slideshowRef = useRef<SlideshowHandle>(null);
  const handleSlideshowPlay = useCallback(() => {
    setPopupOpen("");
    slideshowRef.current?.play();
  }, []);

  const popupMenu = (
    <div className="w-max flex flex-col bg-white">
      {document.fullscreenEnabled ? (
        <ListIconButton icon={iconSlideshow} onClick={handleSlideshowPlay} disabled={frameShapes.length === 0}>
          Slideshow
        </ListIconButton>
      ) : undefined}
      <ListIconButton icon={iconDownload} onClick={handleExport} disabled={frameShapes.length === 0}>
        Export
      </ListIconButton>
    </div>
  );

  return (
    <div className="p-1 h-full grid grid-cols-1 grid-rows-[max-content_1fr_max-content] gap-1">
      <div className="h-8 flex items-center justify-between gap-1">
        <span>Frames</span>
        <OutsideObserver onClick={closePopup}>
          <div className="flex gap-1">
            <FrameAddButton opened={popupOpen === "add"} onClick={handleMenuClick} onAdd={handleAdd} />
            <FixedPopupButton
              name="frame"
              popupPosition="left"
              popup={popupMenu}
              opened={popupOpen === "frame"}
              onClick={handleMenuClick}
            >
              <img src={iconDots} alt="Menu" className="w-5 h-5" />
            </FixedPopupButton>
          </div>
        </OutsideObserver>
      </div>
      <div className="overflow-hidden">
        <FrameTreePanel onFrameExport={handleExportByFrame} />
      </div>
      <FrameToolPanel />
      <FrameExportDialog open={openExportDialog} targetId={exportTargetId} onClose={handlecloseExportDialog} />
      <Slideshow ref={slideshowRef} />
    </div>
  );
};

interface FrameAddButtonProps {
  opened: boolean;
  onClick: (key: string) => void;
  onAdd?: (type: string) => void;
}

const FrameAddButton: React.FC<FrameAddButtonProps> = ({ opened, onClick, onAdd }) => {
  const handleFrameAdd = useCallback(() => {
    onAdd?.("frame");
  }, [onAdd]);

  const handleFrameGroupAdd = useCallback(() => {
    onAdd?.("frame_align_group");
  }, [onAdd]);

  const popupMenuAdd = (
    <div className="w-max flex flex-col bg-white">
      <ListButton onClick={handleFrameAdd}>Frame</ListButton>
      <ListButton onClick={handleFrameGroupAdd}>Frame group</ListButton>
    </div>
  );

  return (
    <FixedPopupButton name="add" popupPosition="left" popup={popupMenuAdd} opened={opened} onClick={onClick}>
      <div className="w-5 h-5 flex items-center justify-center">
        <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
      </div>
    </FixedPopupButton>
  );
};
