import { useCallback, useContext, useMemo, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { PopupButton } from "./atoms/PopupButton";
import { ColorPickerPanel } from "./molecules/ColorPickerPanel";
import { COLORS, rednerRGBA } from "../utils/color";
import { Color } from "../models";
import { useOutsideClickCallback } from "../hooks/window";
import { useSelectedSheet, useSelectedTmpSheet } from "../hooks/storeHooks";
import { SliderInput } from "./atoms/inputs/SliderInput";

export const SheetConfigPanel: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const sheet = useSelectedSheet();
  const tmpSheet = useSelectedTmpSheet();

  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }
    },
    [popupedKey],
  );

  const onClickOutside = useCallback(() => {
    setPopupedKey("");
  }, []);
  const outside = useOutsideClickCallback<HTMLDivElement>(onClickOutside);

  const bgColor = useMemo<Color>(() => {
    return tmpSheet?.bgcolor ?? COLORS.WHITE;
  }, [tmpSheet?.bgcolor]);

  const onColorClick = useCallback(
    (color: Color, draft = false) => {
      if (!sheet) return;

      const patch = { bgcolor: { ...color, a: sheet.bgcolor?.a ?? 1 } };
      if (draft) {
        acctx.sheetStore.setTmpSheetMap({ [sheet.id]: patch });
      } else {
        acctx.sheetStore.patchEntity(sheet.id, patch);
        acctx.sheetStore.setTmpSheetMap({});
      }
    },
    [sheet],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      if (!sheet) return;

      const patch = { bgcolor: { ...bgColor, a: val } };
      if (draft) {
        acctx.sheetStore.setTmpSheetMap({ [sheet.id]: patch });
      } else {
        acctx.sheetStore.patchEntity(sheet.id, patch);
        acctx.sheetStore.setTmpSheetMap({});
      }
    },
    [sheet, bgColor],
  );

  const bgColorPanel = useMemo(() => {
    if (!sheet) return;

    return (
      <div className="p-2">
        <div className="mb-2">
          <SliderInput min={0} max={1} value={bgColor.a} onChanged={onAlphaChanged} />
        </div>
        <ColorPickerPanel color={bgColor} onChange={onColorClick} />
      </div>
    );
  }, [bgColor, sheet]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <p className="text-lg">Background color</p>
        <div ref={outside.ref}>
          <PopupButton
            name="bgColor"
            opened={popupedKey === "bgColor"}
            popup={bgColorPanel}
            onClick={onClickPopupButton}
            popupPosition="left"
          >
            <div className="w-8 h-8 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(bgColor) }}></div>
          </PopupButton>
        </div>
      </div>
    </div>
  );
};
