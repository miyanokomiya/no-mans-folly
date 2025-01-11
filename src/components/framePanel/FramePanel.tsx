import { useCallback, useContext, useMemo, useState } from "react";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDots from "../../assets/icons/three_dots_v.svg";
import { GetAppStateContext } from "../../contexts/AppContext";
import { createShape } from "../../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../../composables/shapeComposite";
import { useSelectedSheet, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { getAllFrameShapes } from "../../composables/frame";
import { FrameShape } from "../../shapes/frame";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { PopupButton } from "../atoms/PopupButton";
import { TextInput } from "../atoms/inputs/TextInput";
import { SortableListV } from "../atoms/SortableListV";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { rednerRGBA } from "../../utils/color";
import { FrameThumbnail } from "./FrameThumbnail";

export const FramePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useShapeCompositeWithoutTmpInfo();
  const frameShapes = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);
  const documentMap = getCtx().getDocumentMap();
  const imageStore = getCtx().getImageStore();
  const sheet = useSelectedSheet();
  const backgroundColor = useMemo(() => (sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff"), [sheet]);

  const handleClickAdd = useCallback(() => {
    const ctx = getCtx();
    const shapes = [
      createShape(ctx.getShapeStruct, "frame", { id: ctx.generateUuid(), findex: ctx.createLastIndex() }),
    ];
    const minShapeComposite = newShapeComposite({
      getStruct: ctx.getShapeStruct,
      shapes,
    });
    const wrapper = minShapeComposite.getWrapperRectForShapes(shapes);
    const wrapperCenter = getRectCenter(wrapper);
    const viewCenter = getRectCenter(ctx.getViewRect());
    const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];

    ctx.addShapes(shapes.map((s) => ({ ...s, ...minShapeComposite.transformShape(s, affine) })));
    ctx.multiSelectShapes(shapes.map((s) => s.id));
  }, [getCtx]);

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      const ctx = getCtx();
      ctx.patchShapes({ [id]: { name } as Partial<FrameShape> });
    },
    [getCtx],
  );

  const frameItems = useMemo<[string, React.ReactNode][]>(() => {
    return frameShapes.map((s, i) => {
      return [
        s.id,
        <div>
          <FrameItem frame={s} index={i} onNameChange={handleNameChange}>
            <FrameThumbnail
              shapeComposite={shapeComposite}
              frame={s}
              documentMap={documentMap}
              imageStore={imageStore}
              backgroundColor={backgroundColor}
            />
          </FrameItem>
        </div>,
      ];
    });
  }, [frameShapes, shapeComposite, documentMap, imageStore, handleNameChange, backgroundColor]);

  const handleSheetClick = useCallback((id: string) => {
    console.log(id);
  }, []);

  const handleOrderChange = useCallback(
    ([from, to]: [number, number]) => {
      const ctx = getCtx();
      const target = frameShapes[from];
      const beforeFindex = frameShapes[to - 1]?.findex ?? null;
      const nextFindex = frameShapes[to]?.findex ?? null;

      ctx.patchShapes({
        [target.id]: {
          findex: generateKeyBetweenAllowSame(beforeFindex, nextFindex),
        },
      });
    },
    [frameShapes, getCtx],
  );

  return (
    <div>
      <div className="flex flex-col gap-1 p-1">
        <SortableListV
          items={frameItems}
          onClick={handleSheetClick}
          onChange={handleOrderChange}
          anchor="[data-anchor]"
        />
        <button type="button" className="w-full p-2 border rounded flex justify-center" onClick={handleClickAdd}>
          <img src={iconAdd} alt="Add Sheet" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface FrameItemProps {
  frame: FrameShape;
  index: number;
  children: React.ReactNode;
  selected?: boolean;
  onClick?: (id: string) => void;
  onNameChange?: (id: string, name: string) => void;
}

const FrameItem: React.FC<FrameItemProps> = ({ frame, onClick, selected, index, children, onNameChange }) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const rootClass = "border rounded flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const handleRenameClick = useCallback(() => {
    setPopupOpen(false);
    setDraftName(frame.name);
    setRenaming(true);
  }, [frame.name]);

  const handleNameChange = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      if (e.detail === 2) {
        handleRenameClick();
      } else {
        onClick?.(frame.id);
      }
    },
    [frame, onClick, handleRenameClick],
  );

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onNameChange?.(frame.id, draftName);
      setRenaming(false);
    },
    [frame, draftName, onNameChange],
  );

  const cancelRename = useCallback(() => {
    setRenaming(false);
  }, []);

  const handleMenuClick = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);

  const popupMenu = (
    <div className="flex flex-col bg-white">
      <button type="button" className="hover:bg-gray-200 p-1" onClick={handleRenameClick}>
        Rename
      </button>
    </div>
  );

  const nameElm = renaming ? (
    <form className="w-full h-full flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={cancelRename} autofocus keepFocus />
    </form>
  ) : (
    <div onClick={handleNameClick} className="w-full h-full px-1 flex items-center hover:bg-gray-200">
      {frame.name}
    </div>
  );

  return (
    <div className={rootClass}>
      <div className="min-h-8 flex justify-between gap-1">
        <div
          className="min-w-8 h-8 rounded px-2 bg-white border flex items-center justify-center cursor-grab"
          data-anchor
        >
          {index}
        </div>
        <div className="flex-1">{nameElm}</div>
        <OutsideObserver onClick={closePopup}>
          <PopupButton name="frame" popupPosition="left" popup={popupMenu} opened={popupOpen} onClick={handleMenuClick}>
            <img src={iconDots} alt="Menu" className="w-5 h-5" />
          </PopupButton>
        </OutsideObserver>
      </div>
      <div className="mt-1 border whitespace-nowrap" data-anchor>
        {children}
      </div>
    </div>
  );
};
