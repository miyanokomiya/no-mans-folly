import { useCallback, useContext, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { PopupButton } from "../atoms/PopupButton";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { COLORS, rednerRGBA } from "../../utils/color";
import { Color } from "../../models";
import { useSelectedSheet, useSelectedTmpSheet } from "../../hooks/storeHooks";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { InlineField } from "../atoms/InlineField";

export const SheetInspectorPanel: React.FC = () => {
  const { sheetStore } = useContext(AppCanvasContext);
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
  const bgColor = useMemo<Color>(() => {
    return tmpSheet?.bgcolor ?? COLORS.WHITE;
  }, [tmpSheet?.bgcolor]);

  const onColorClick = useCallback(
    (color: Color, draft = false) => {
      if (!sheet) return;

      const patch = { bgcolor: { ...color, a: sheet.bgcolor?.a ?? 1 } };
      if (draft) {
        sheetStore.setTmpSheetMap({ [sheet.id]: patch });
      } else {
        sheetStore.patchEntity(sheet.id, patch);
        sheetStore.setTmpSheetMap({});
      }
    },
    [sheet, sheetStore],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      if (!sheet) return;

      const patch = { bgcolor: { ...bgColor, a: val } };
      if (draft) {
        sheetStore.setTmpSheetMap({ [sheet.id]: patch });
      } else {
        sheetStore.patchEntity(sheet.id, patch);
        sheetStore.setTmpSheetMap({});
      }
    },
    [sheetStore, sheet, bgColor],
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
  }, [bgColor, sheet, onAlphaChanged, onColorClick]);

  if (!sheet) return undefined;

  return (
    <div>
      <InlineField label="Sheet name">
        <span>{sheet.name}</span>
      </InlineField>
      <InlineField label="Background color">
        <OutsideObserver onClick={onClickOutside}>
          <PopupButton
            name="bgColor"
            opened={popupedKey === "bgColor"}
            popup={bgColorPanel}
            onClick={onClickPopupButton}
            popupPosition="left"
          >
            <div className="w-6 h-6 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(bgColor) }}></div>
          </PopupButton>
        </OutsideObserver>
      </InlineField>
    </div>
  );
};
