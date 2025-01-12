import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDots from "../../assets/icons/three_dots_v.svg";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { createShape } from "../../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShape, useSelectedSheet, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { getAllFrameShapes } from "../../composables/frame";
import { FrameShape } from "../../shapes/frame";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { TextInput } from "../atoms/inputs/TextInput";
import { SortableListV } from "../atoms/SortableListV";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { rednerRGBA } from "../../utils/color";
import { FrameThumbnail } from "./FrameThumbnail";
import { ListButton } from "../atoms/buttons/ListButton";

export const FramePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const { handleEvent } = useContext(AppStateMachineContext);
  const shapeComposite = useShapeCompositeWithoutTmpInfo();
  const frameShapes = useMemo(() => getAllFrameShapes(shapeComposite), [shapeComposite]);
  const documentMap = getCtx().getDocumentMap();
  const imageStore = getCtx().getImageStore();
  const sheet = useSelectedSheet();
  const backgroundColor = useMemo(() => (sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff"), [sheet]);
  const lastSelectedId = useSelectedShape()?.id;

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

  const handleDelete = useCallback(
    (id: string) => {
      const ctx = getCtx();
      ctx.deleteShapes([id]);
    },
    [getCtx],
  );

  const handleFrameClick = useCallback(
    (id: string) => {
      const ctx = getCtx();
      ctx.selectShape(id);
      handleEvent({
        type: "state",
        data: {
          name: "PanToShape",
          options: {
            ids: [id],
            duration: 150,
          },
        },
      });
    },
    [getCtx, handleEvent],
  );

  const handleNodeHover = useCallback(
    (id: string) => {
      handleEvent({
        type: "shape-highlight",
        data: { id, meta: { type: "outline" } },
      });
    },
    [handleEvent],
  );

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

  const frameItems = useMemo<[string, React.ReactNode][]>(() => {
    return frameShapes.map((s, i) => {
      return [
        s.id,
        <FrameItem
          frame={s}
          index={i}
          onNameChange={handleNameChange}
          onHover={handleNodeHover}
          selected={s.id === lastSelectedId}
          onDelete={handleDelete}
        >
          <FrameThumbnail
            shapeComposite={shapeComposite}
            frame={s}
            documentMap={documentMap}
            imageStore={imageStore}
            backgroundColor={backgroundColor}
          />
        </FrameItem>,
      ];
    });
  }, [
    frameShapes,
    shapeComposite,
    documentMap,
    imageStore,
    handleNameChange,
    handleNodeHover,
    handleDelete,
    backgroundColor,
    lastSelectedId,
  ]);

  return (
    <div>
      <div className="flex flex-col gap-1 p-1">
        <SortableListV
          items={frameItems}
          onClick={handleFrameClick}
          onChange={handleOrderChange}
          anchor="[data-anchor]"
        />
        <button type="button" className="w-full p-2 border rounded flex justify-center" onClick={handleClickAdd}>
          <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
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
  onHover?: (id: string) => void;
  onNameChange?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

const FrameItem: React.FC<FrameItemProps> = ({
  frame,
  onClick,
  selected,
  index,
  children,
  onHover,
  onNameChange,
  onDelete,
}) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const rootClass =
    "min-w-60 border-2 rounded flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

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

  const handlePointerEnter = useCallback(() => {
    onHover?.(frame.id);
  }, [frame, onHover]);

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

  const handleDelete = useCallback(() => {
    onDelete?.(frame.id);
  }, [frame, onDelete]);

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
      <ListButton onClick={handleRenameClick}>Rename</ListButton>
      <ListButton onClick={handleDelete}>
        <span className="text-red-500 font-semibold">Delete</span>
      </ListButton>
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

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
  }, [selected]);

  return (
    <div ref={rootRef} className={rootClass} onPointerEnter={handlePointerEnter}>
      <div className="min-h-8 flex justify-between gap-1">
        <button
          type="button"
          className="flex-none min-w-8 h-8 rounded px-2 bg-white border flex items-center justify-center cursor-grab"
          data-anchor
        >
          {index}
        </button>
        <div className="flex-auto">{nameElm}</div>
        <div className="flex-none w-8 h-8">
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
        </div>
      </div>
      <button type="button" className="mt-1 border whitespace-nowrap hover:opacity-80" data-anchor>
        {children}
      </button>
    </div>
  );
};
