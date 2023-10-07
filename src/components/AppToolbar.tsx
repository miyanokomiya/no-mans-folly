import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import iconShapeSet from "../assets/icons/shape_set.svg";
import iconRectangle from "../assets/icons/shape_rectangle.svg";
import iconRhombus from "../assets/icons/shape_rhombus.svg";
import iconEllipse from "../assets/icons/shape_ellipse.svg";
import iconLineStraight from "../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../assets/icons/shape_line_elbow.svg";

const shapeList = [
  { type: "rectangle", icon: iconRectangle },
  { type: "ellipse", icon: iconEllipse },
  { type: "rhombus", icon: iconRhombus },
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
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);

  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return sm.watch(() => {
      setStateLabel(sm.getStateSummary().label);
    });
  }, [sm]);

  const onDownShapeElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const ctx = smctx;
      const type = e.currentTarget.getAttribute("data-type")!;
      const shape = createShape(ctx.getShapeStruct, type, {
        id: ctx.generateUuid(),
        findex: acctx.shapeStore.createLastIndex(),
      });
      sm.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: { shape },
        },
      });
      setPopup("");
    },
    [sm, smctx, acctx]
  );

  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      sm.handleEvent({
        type: "state",
        data: {
          name: "LineReady",
          options: { type },
        },
      });
      setLineType(type);
    },
    [sm, smctx]
  );

  const [popup, setPopup] = useState<"" | "shapes" | "lines">("");
  const [lineType, setLineType] = useState<string>("straight");

  const onClickShapeButton = useCallback(() => {
    setPopup(popup === "shapes" ? "" : "shapes");
  }, [popup]);

  const onClickLineButton = useCallback(() => {
    if (popup === "lines" && stateLabel === "LineReady") {
      sm.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
      setPopup("");
    } else {
      sm.handleEvent({
        type: "state",
        data: {
          name: "LineReady",
          options: { type: lineType },
        },
      });
      setPopup("lines");
    }
  }, [stateLabel, popup, lineType, sm]);

  const onClickTextButton = useCallback(() => {
    setPopup("");
    if (stateLabel === "TextReady") {
      sm.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
    } else {
      sm.handleEvent({
        type: "state",
        data: { name: "TextReady" },
      });
    }
  }, [stateLabel, sm]);

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
        <img src={iconShapeSet} alt="shapes" />
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
