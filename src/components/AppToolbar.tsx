import { useCallback, useContext, useState } from "react";
import { AppStateMachineContext } from "../contexts/AppCanvasContext";
import { createShape } from "../shapes";
import iconRectangle from "../assets/icons/shape_rectangle.svg";
import iconEllipse from "../assets/icons/shape_ellipse.svg";

const shapeList = [
  { type: "rectangle", icon: iconRectangle },
  { type: "ellipse", icon: iconEllipse },
];

function getButtonClass(highlight = false) {
  return "w-10 h-10 p-1 rounded border-2 " + (highlight ? "border-cyan-400" : "");
}

export const AppToolbar: React.FC = () => {
  const smctx = useContext(AppStateMachineContext);

  const onDownShapeElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const ctx = smctx.getCtx();
      const type = e.currentTarget.getAttribute("data-type")!;
      const shape = createShape(ctx.getShapeStruct, type, { id: ctx.generateUuid() });
      smctx.stateMachine.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: { shape },
        },
      });
    },
    [smctx]
  );

  const [popup, setPopup] = useState<"" | "shapes">("");

  const onClickShapeButton = useCallback(() => {
    setPopup(popup === "shapes" ? "" : "shapes");
  }, [popup]);

  function renderPopup() {
    switch (popup) {
      case "shapes":
        return (
          <div
            className="absolute left-0 border border-1 p-1 rounded"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {shapeList.map((shape) => (
              <div
                className="w-10 h-10 border border-1 p-1 rounded"
                data-type={shape.type}
                onMouseDown={onDownShapeElm}
              >
                <img src={shape.icon} alt={shape.type} />
              </div>
            ))}
          </div>
        );
      default:
        return;
    }
  }

  return (
    <div className="relative border border-1 p-1 rounded">
      <button type="button" className={getButtonClass(popup === "shapes")} onClick={onClickShapeButton}>
        <img src={iconRectangle} alt="shapes" />
      </button>
      {renderPopup()}
    </div>
  );
};
