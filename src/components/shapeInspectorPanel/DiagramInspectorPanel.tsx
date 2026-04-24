import { useCallback, useContext, useMemo, useState } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { isPartialRGBA } from "../../utils/color";
import { Color, RGBA } from "../../models";
import { useColorPalette } from "../../hooks/storeHooks";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { IndexedColors } from "../molecules/IndexedColors";
import { generatePaletteKey } from "../../utils/palette";
import { InlineField } from "../atoms/InlineField";
import { SelectInput } from "../atoms/inputs/SelectInput";

export const DiagramInspectorPanel: React.FC = () => {
  const { paletteStore } = useContext(AppCanvasContext);
  const palette = useColorPalette();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const draftColor = useMemo(
    () => (selectedIndex !== undefined ? palette[selectedIndex] : undefined),
    [palette, selectedIndex],
  );

  const handleClickIndex = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? undefined : index));
  }, []);

  const patchColor = useCallback(
    (color: Partial<RGBA>, draft = false) => {
      const selectedPalette = paletteStore.getSelectedPalette();
      if (!selectedPalette || selectedIndex === undefined) return;

      const next = { ...draftColor, ...color };
      const patch = { [generatePaletteKey(selectedIndex)]: next };
      if (draft) {
        paletteStore.setTmpPaletteMap({ [selectedPalette.id]: patch });
      } else {
        paletteStore.setTmpPaletteMap({});
        paletteStore.patchEntity(selectedPalette.id, patch);
      }
    },
    [paletteStore, selectedIndex, draftColor],
  );

  const handleColorClick = useCallback(
    (color: Partial<Color>, draft = false) => {
      if (isPartialRGBA(color)) {
        patchColor(color, draft);
      }
    },
    [patchColor],
  );

  const paletteOptions = useMemo(
    () => paletteStore.getEntities().map((p, i) => ({ value: p.id, label: `${i}`.padStart(2, "0") })),
    [paletteStore],
  );

  const handlePaletteChange = useCallback(
    (id: string) => {
      paletteStore.selectPalette(id);
    },
    [paletteStore],
  );

  return (
    <div>
      <InlineField label="Indexed color">
        <SelectInput
          options={paletteOptions}
          value={paletteStore.getSelectedPalette()?.id ?? ""}
          onChange={handlePaletteChange}
        />
      </InlineField>
      <div className="mt-1 flex flex-col items-end">
        <IndexedColors palette={palette} selected={selectedIndex} onClick={handleClickIndex} />
        {draftColor ? (
          <ColorPickerPanel color={draftColor} onChange={handleColorClick} indexedColorDisabled />
        ) : undefined}
      </div>
    </div>
  );
};
