import { useCallback, useContext, useState } from "react";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { PopupButton } from "./atoms/PopupButton";
import { ListLink } from "./atoms/buttons/ListButton";
import { OutsideObserver } from "./atoms/OutsideObserver";
import iconRedo from "../assets/icons/redo.svg";
import iconHelp from "../assets/icons/help.svg";
import iconBMC from "../assets/externals/bmc-logo.svg";
import { ZoomField } from "./molecules/ZoomField";
import { getAllShapeRangeWithinComposite } from "../composables/shapeComposite";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { IconButton } from "./atoms/buttons/IconButton";
import { useCanUndoRedo } from "../hooks/undoManager";

export const AppFootbar: React.FC = () => {
  const sm = useContext(AppStateMachineContext);
  const { setZoom, getScale, getShapeComposite, setViewport } = useContext(AppStateContext);
  const [popupKey, setPopupKey] = useState("");
  const { undoManager } = useContext(AppCanvasContext);
  const [canUndo, canRedo] = useCanUndoRedo(undoManager);

  const handleScaleFit = useCallback(() => {
    setPopupKey("");
    const shapeComposite = getShapeComposite();
    if (shapeComposite.shapes.length === 0) return;

    const rect = getAllShapeRangeWithinComposite(shapeComposite, true);
    setViewport(rect);
  }, [getShapeComposite, setViewport]);

  const handlePopupClick = useCallback(
    (value: string) => {
      setPopupKey((key) => (key === value ? "" : value));
    },
    [setPopupKey],
  );
  const handleHelpClose = useCallback(() => {
    setPopupKey((key) => (key === "help" ? "" : key));
  }, []);

  const onUndo = useCallback(() => {
    sm.handleEvent({
      type: "history",
      data: "undo",
    });
  }, [sm]);

  const onRedo = useCallback(() => {
    sm.handleEvent({
      type: "history",
      data: "redo",
    });
  }, [sm]);

  const borderElm = <div className="h-6 border" />;

  return (
    <div className="p-1 border rounded-xs bg-white flex gap-2 items-center select-none">
      <ZoomField
        scale={getScale()}
        onScaleChange={setZoom}
        onScaleFit={handleScaleFit}
        popupedKey={popupKey}
        onClickPopupButton={handlePopupClick}
      />
      {borderElm}
      <div className="flex gap-1 items-center">
        <IconButton icon={iconRedo} size={8} onClick={onUndo} disabled={!canUndo} flipH />
        <IconButton icon={iconRedo} size={8} onClick={onRedo} disabled={!canRedo} />
      </div>
      {borderElm}
      <a href={process.env.BUYMEACOFFEE_URL} target="_blank" rel="noopener" className="p-1">
        <img src={iconBMC} alt="Buy me a coffee" className="w-6 h-6" />
      </a>
      <OutsideObserver onClick={handleHelpClose}>
        <PopupButton
          name="help"
          opened={popupKey === "help"}
          popup={
            <div className="flex flex-col items-center w-max">
              <ListLink href={process.env.DOC_PATH!} external>
                Documentation
              </ListLink>
              <ListLink href={process.env.CONTACT_FORM_URL!} external>
                Contact
              </ListLink>
              <ListLink href="/terms/privacy-policy/" external>
                Privacy Policy
              </ListLink>
            </div>
          }
          onClick={handlePopupClick}
          popupPosition="left"
        >
          <div className="w-6 h-6 flex justify-center items-center">
            <img src={iconHelp} alt="Help" />
          </div>
        </PopupButton>
      </OutsideObserver>
    </div>
  );
};
