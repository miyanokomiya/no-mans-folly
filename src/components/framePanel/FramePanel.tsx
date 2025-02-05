import { useCallback, useContext, useMemo, useState } from "react";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDownload from "../../assets/icons/download.svg";
import { GetAppStateContext } from "../../contexts/AppContext";
import { createShape } from "../../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShape, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { createNewFrameFromSrc, getAllFrameShapes } from "../../composables/frame";
import { FrameShape, isFrameShape } from "../../shapes/frame";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { ListIconButton } from "../atoms/buttons/ListButton";
import { FrameExportDialog } from "./FrameExportDialog";
import { FrameToolPanel } from "./FrameToolPanel";
import { FrameTreePanel } from "./FrameTreePanel";

export const FramePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useShapeCompositeWithoutTmpInfo();
  const lastSelectedId = useSelectedShape()?.id;

  const frameShapes = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);

  const handleInsertBelow = useCallback(
    (id: string) => {
      const ctx = getCtx();
      const src = ctx.getShapeComposite().shapeMap[id] as FrameShape;
      const srcIndex = frameShapes.findIndex((f) => f.id === src.id);
      const nextFrame = frameShapes.at(srcIndex + 1);
      const shape = createNewFrameFromSrc(
        ctx.getShapeStruct,
        src,
        ctx.generateUuid(),
        generateKeyBetweenAllowSame(src.findex, nextFrame?.findex),
      );

      ctx.addShapes([shape]);
      ctx.selectShape(shape.id);
    },
    [getCtx, frameShapes],
  );

  const handleAdd = useCallback(
    (type: string) => {
      const ctx = getCtx();
      const selectedShape = lastSelectedId ? ctx.getShapeComposite().shapeMap[lastSelectedId] : undefined;
      if (selectedShape && isFrameShape(selectedShape)) {
        handleInsertBelow(selectedShape.id);
        return;
      }

      const frame = createShape(ctx.getShapeStruct, type, { id: ctx.generateUuid(), findex: ctx.createLastIndex() });
      const minShapeComposite = newShapeComposite({
        getStruct: ctx.getShapeStruct,
        shapes: [frame],
      });
      const wrapperCenter = getRectCenter(minShapeComposite.getWrapperRect(frame));
      const viewCenter = getRectCenter(ctx.getViewRect());
      const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];
      const shape = { ...frame, ...minShapeComposite.transformShape(frame, affine) };

      ctx.addShapes([shape]);
      ctx.selectShape(shape.id);
    },
    [getCtx, lastSelectedId, handleInsertBelow],
  );

  const [popupOpen, setPopupOpen] = useState(false);
  const handleMenuClick = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);
  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const [openExportDialog, setOpenExportDialog] = useState(false);
  const handlecloseExportDialog = useCallback(() => {
    setOpenExportDialog(false);
  }, []);

  const handleExport = useCallback(() => {
    setPopupOpen(!popupOpen);
    setOpenExportDialog(true);
  }, [popupOpen]);

  const popupMenu = (
    <div className="w-max flex flex-col bg-white">
      <ListIconButton icon={iconDownload} onClick={handleExport}>
        Export
      </ListIconButton>
    </div>
  );

  return (
    <div className="p-1 h-full grid grid-cols-1 grid-rows-[max-content_1fr_max-content] gap-1">
      <div className="h-8 flex items-center justify-between sticky">
        <span>Frames</span>
        {frameShapes.length > 0 ? (
          <OutsideObserver onClick={closePopup}>
            <FixedPopupButton
              name="frame"
              popupPosition="left"
              popup={popupMenu}
              opened={popupOpen}
              onClick={handleMenuClick}
            >
              <img src={iconDots} alt="Menu" className="w-5 h-5" />
            </FixedPopupButton>
          </OutsideObserver>
        ) : undefined}
      </div>
      <div className="overflow-auto flex flex-col gap-2">
        <FrameTreePanel />
      </div>
      <div>
        <FrameToolPanel onShapeAdd={handleAdd} />
      </div>
      <FrameExportDialog open={openExportDialog} onClose={handlecloseExportDialog} />
    </div>
  );
};
