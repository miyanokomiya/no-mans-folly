import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { createShape } from "../shapes";
import iconRectangle from "../assets/icons/shape_rectangle.svg";
import iconRhombus from "../assets/icons/shape_rhombus.svg";
import iconEllipse from "../assets/icons/shape_ellipse.svg";
import iconLineStraight from "../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../assets/icons/shape_line_elbow.svg";

const shapeList = [
  { type: "rectangle", icon: iconRectangle },
  { type: "rhombus", icon: iconRhombus },
  { type: "ellipse", icon: iconEllipse },
];

const lineList = [
  { type: "straight", icon: iconLineStraight },
  { type: "elbow", icon: iconLineElbow },
];

function getButtonClass(highlight = false) {
  return "w-10 h-10 p-1 rounded border-2 " + (highlight ? "border-cyan-400" : "");
}

export const AppToolbar: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return smctx.stateMachine.watch(() => {
      setStateLabel(smctx.stateMachine.getStateSummary().label);
    });
  }, [smctx.stateMachine]);

  const onDownShapeElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const ctx = smctx.getCtx();
      const type = e.currentTarget.getAttribute("data-type")!;
      const shape = createShape(ctx.getShapeStruct, type, {
        id: ctx.generateUuid(),
        findex: acctx.shapeStore.createLastIndex(),
      });
      smctx.stateMachine.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: { shape },
        },
      });
      setPopup("");
    },
    [smctx, acctx]
  );

  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      smctx.stateMachine.handleEvent({
        type: "state",
        data: {
          name: "LineReady",
          options: { type },
        },
      });
      setLineType(type);
    },
    [smctx]
  );

  const [popup, setPopup] = useState<"" | "shapes" | "lines">("");
  const [lineType, setLineType] = useState<string>("straight");

  const onClickShapeButton = useCallback(() => {
    setPopup(popup === "shapes" ? "" : "shapes");
  }, [popup]);

  const onClickLineButton = useCallback(() => {
    if (popup === "lines" && stateLabel === "LineReady") {
      smctx.stateMachine.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
      setPopup("");
    } else {
      smctx.stateMachine.handleEvent({
        type: "state",
        data: {
          name: "LineReady",
          options: { type: lineType },
        },
      });
      setPopup("lines");
    }
  }, [stateLabel, popup, lineType, smctx.stateMachine]);

  const onClickTextButton = useCallback(() => {
    setPopup("");
    if (stateLabel === "TextReady") {
      smctx.stateMachine.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
    } else {
      smctx.stateMachine.handleEvent({
        type: "state",
        data: { name: "TextReady" },
      });
    }
  }, [stateLabel, smctx.stateMachine]);

  function renderPopup() {
    switch (popup) {
      case "shapes":
        return (
          <div
            className="bg-white absolute left-0 border p-1 rounded shadow"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {shapeList.map((shape) => (
              <div
                key={shape.type}
                className="w-10 h-10 border p-1 rounded mb-1 last:mb-0 cursor-grab"
                data-type={shape.type}
                onMouseDown={onDownShapeElm}
              >
                <img src={shape.icon} alt={shape.type} />
              </div>
            ))}
          </div>
        );
      case "lines":
        return (
          <div
            className="bg-white absolute left-0 border p-1 rounded shadow"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {lineList.map((shape) => (
              <div
                key={shape.type}
                className={
                  "w-10 h-10 border p-1 rounded mb-1 last:mb-0 cursor-pointer" +
                  (lineType === shape.type ? " border-2 border-cyan-400" : "")
                }
                data-type={shape.type}
                onMouseDown={onDownLineElm}
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
    <div className="bg-white relative border border-1 p-1 rounded shadow flex flex-col">
      <button type="button" className={getButtonClass(popup === "shapes")} onClick={onClickShapeButton}>
        <img src={iconRectangle} alt="shapes" />
      </button>
      <button type="button" className={getButtonClass(popup === "lines")} onClick={onClickLineButton}>
        <img src={iconLineStraight} alt="lines" />
      </button>
      <button type="button" className={getButtonClass(stateLabel === "TextReady")} onClick={onClickTextButton}>
        <span className="text-2xl">T</span>
      </button>
      {renderPopup()}
    </div>
  );
};
