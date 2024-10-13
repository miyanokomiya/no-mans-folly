import { useCallback, useContext, useState } from "react";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { PopupButton } from "./atoms/PopupButton";
import { getWrapperRect } from "../utils/geometry";
import { ListLink } from "./atoms/buttons/ListButton";
import { OutsideObserver } from "./atoms/OutsideObserver";
import iconRedo from "../assets/icons/redo.svg";
import iconHelp from "../assets/icons/help.svg";
import iconBMC from "../assets/externals/bmc-logo.svg";
import { ZoomField } from "./molecules/ZoomField";

export const AppFootbar: React.FC = () => {
  const sm = useContext(AppStateMachineContext);
  const { setZoom, getScale, getShapeComposite, setViewport } = useContext(AppStateContext);
  const [popupedKey, setPopupedKey] = useState("");

  const handleScaleFit = useCallback(() => {
    const shapeComposite = getShapeComposite();
    const rects = shapeComposite.shapes.map((s) => shapeComposite.getWrapperRect(s));
    if (rects.length === 0) return;

    setViewport(getWrapperRect(rects), 80);
  }, [getShapeComposite, setViewport]);

  const onClickPopupButton = useCallback((value: string) => {
    setPopupedKey((key) => (key === value ? "" : value));
  }, []);
  const handleCloseHelpPopup = useCallback(() => {
    setPopupedKey((key) => (key === "help" ? "" : key));
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
    <div className="p-1 border rounded bg-white flex gap-2 items-center select-none">
      <ZoomField
        scale={getScale()}
        onScaleChange={setZoom}
        onScaleFit={handleScaleFit}
        popupedKey={popupedKey}
        onClickPopupButton={onClickPopupButton}
      />
      {borderElm}
      <div className="flex gap-1 items-center">
        <button type="button" className="w-8 h-8 border rounded flex items-center justify-center" onClick={onUndo}>
          <img src={iconRedo} alt="Undo" className="w-6 h-6 -scale-x-100" />
        </button>
        <button type="button" className="w-8 h-8 border rounded flex items-center justify-center" onClick={onRedo}>
          <img src={iconRedo} alt="Redo" className="w-6 h-6" />
        </button>
      </div>
      {borderElm}
      <a href={process.env.BUYMEACOFFEE_URL} target="_blank" rel="noopener" className="p-1">
        <img src={iconBMC} alt="Buy me a coffee" className="w-6 h-6" />
      </a>
      <OutsideObserver onClick={handleCloseHelpPopup}>
        <PopupButton
          name="help"
          opened={popupedKey === "help"}
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
          onClick={onClickPopupButton}
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
