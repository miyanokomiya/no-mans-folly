import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDownload from "../../assets/icons/download.svg";
import iconDustbinRed from "../../assets/icons/dustbin_red.svg";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { createShape } from "../../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShape, useSelectedSheet, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { createNewFrameFromSrc, getAllFrameShapes } from "../../composables/frame";
import { FrameShape, isFrameShape } from "../../shapes/frame";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { TextInput } from "../atoms/inputs/TextInput";
import { SortableListV } from "../atoms/SortableListV";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { rednerRGBA } from "../../utils/color";
import { FrameThumbnail } from "./FrameThumbnail";
import { ListButton, ListIconButton } from "../atoms/buttons/ListButton";
import { FrameExportDialog } from "./FrameExportDialog";

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

  const handleAdd = useCallback(() => {
    const ctx = getCtx();
    const selectedShape = lastSelectedId ? ctx.getShapeComposite().shapeMap[lastSelectedId] : undefined;
    if (selectedShape && isFrameShape(selectedShape)) {
      handleInsertBelow(selectedShape.id);
      return;
    }

    const frame = createShape(ctx.getShapeStruct, "frame", { id: ctx.generateUuid(), findex: ctx.createLastIndex() });
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
  }, [getCtx, lastSelectedId, handleInsertBelow]);

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
            scaling: true,
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
          onInsertBelow={handleInsertBelow}
          onDelete={handleDelete}
        >
          <div className="h-32">
            <FrameThumbnail
              shapeComposite={shapeComposite}
              frame={s}
              documentMap={documentMap}
              imageStore={imageStore}
              backgroundColor={backgroundColor}
            />
          </div>
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
    handleInsertBelow,
    handleDelete,
    backgroundColor,
    lastSelectedId,
  ]);

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
    <div className="p-1 h-full">
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
      <div className="my-1 flex flex-col gap-1 overflow-auto" style={{ height: "calc(100% - 4.5rem)" }}>
        <SortableListV
          items={frameItems}
          onClick={handleFrameClick}
          onChange={handleOrderChange}
          anchor="[data-anchor]"
        />
      </div>
      <button type="button" className="w-full h-8 border rounded flex items-center justify-center" onClick={handleAdd}>
        <img src={iconAdd} alt="Add Frame" className="w-4 h-4" />
      </button>
      <FrameExportDialog open={openExportDialog} onClose={handlecloseExportDialog} />
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
  onInsertBelow?: (id: string) => void;
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
  onInsertBelow,
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

  const handleInsertBelow = useCallback(() => {
    onInsertBelow?.(frame.id);
  }, [frame, onInsertBelow]);

  const handleDelete = useCallback(() => {
    onDelete?.(frame.id);
  }, [frame, onDelete]);

  const finishRename = useCallback(() => {
    onNameChange?.(frame.id, draftName);
    setRenaming(false);
  }, [frame, draftName, onNameChange]);

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      finishRename();
    },
    [finishRename],
  );

  const handleMenuClick = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);

  const popupMenu = (
    <div className="w-max flex flex-col bg-white">
      <ListButton onClick={handleRenameClick}>Rename</ListButton>
      <ListButton onClick={handleInsertBelow}>Insert below</ListButton>
      <ListIconButton icon={iconDustbinRed} onClick={handleDelete}>
        <span className="text-red-500 font-semibold">Delete</span>
      </ListIconButton>
    </div>
  );

  const nameElm = renaming ? (
    <form className="w-full h-full flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={finishRename} autofocus keepFocus />
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
          {index + 1}
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
