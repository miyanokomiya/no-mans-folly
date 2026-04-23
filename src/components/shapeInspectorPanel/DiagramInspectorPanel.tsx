import { useCallback, useContext, useMemo, useState } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { isPartialRGBA } from "../../utils/color";
import { Color, RGBA } from "../../models";
import { useColorPalette } from "../../hooks/storeHooks";
import { BlockField } from "../atoms/BlockField";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { IndexedColors } from "../molecules/IndexedColors";

export const DiagramInspectorPanel: React.FC = () => {
  const { diagramStore } = useContext(AppCanvasContext);
  const palette = useColorPalette();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draftColor, setDraftColor] = useState<RGBA>(palette[selectedIndex]);

  const draftPalette = useMemo(() => {
    return palette.map((p, i) => (i === selectedIndex ? draftColor : p));
  }, [palette, selectedIndex, draftColor]);

  const handleClickIndex = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setDraftColor(palette[index]);
    },
    [palette],
  );

  const patchColor = useCallback(
    (color: Partial<RGBA>, draft = false) => {
      const next = { ...draftColor, ...color };
      setDraftColor(next);
      if (!draft) {
        const nextPalette = palette.slice();
        nextPalette[selectedIndex] = next;
        diagramStore.patchEntity({ colorPalette: nextPalette });
      }
    },
    [diagramStore, selectedIndex, palette, draftColor],
  );

  const handleColorClick = useCallback(
    (color: Partial<Color>, draft = false) => {
      if (isPartialRGBA(color)) {
        patchColor(color, draft);
      }
    },
    [patchColor],
  );

  return (
    <div>
      <BlockField label="Indexed color">
        <div className="mb-1">
          <IndexedColors palette={draftPalette} selected={selectedIndex} onClick={handleClickIndex} />
        </div>
        <ColorPickerPanel color={draftColor} onChange={handleColorClick} indexedColorDisabled />
      </BlockField>
    </div>
  );
};
