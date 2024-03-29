import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { AppStateMachineContext, GetAppStateContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import iconShapeSet from "../assets/icons/shape_set.svg";
import iconRectangle from "../assets/icons/shape_rectangle.svg";
import iconRhombus from "../assets/icons/shape_rhombus.svg";
import iconTrapezoid from "../assets/icons/shape_trapezoid.svg";
import iconCylinder from "../assets/icons/shape_cylinder.svg";
import iconBubble from "../assets/icons/shape_bubble.svg";
import iconOneSidedArrow from "../assets/icons/shape_one_sided_arrow.svg";
import iconTwoSidedArrow from "../assets/icons/shape_two_sided_arrow.svg";
import iconEllipse from "../assets/icons/shape_ellipse.svg";
import iconLineStraight from "../assets/icons/shape_line_straight.svg";
import iconLineCurve from "../assets/icons/shape_line_curve.svg";
import iconLineElbow from "../assets/icons/shape_line_elbow.svg";
import iconLineElbowCurve from "../assets/icons/shape_line_elbow_curve.svg";
import iconText from "../assets/icons/text.svg";
import iconLayoutBranch from "../assets/icons/layout_branch.svg";
import iconLayoutBoard from "../assets/icons/layout_board.svg";
import iconLayout from "../assets/icons/layout.svg";
import iconLayoutAlignBox from "../assets/icons/layout_align_box.svg";
import iconSelectArea from "../assets/icons/select_area.svg";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { Shape } from "../models";
import { generateBoardTemplate } from "../composables/boardHandler";
import { DocOutput } from "../models/document";
import { generateAlignTemplate } from "../composables/alignHandler";
import { CurveType, LineType } from "../shapes/line";

const shapeList = [
  { type: "rectangle", icon: iconRectangle },
  { type: "ellipse", icon: iconEllipse },
  { type: "rhombus", icon: iconRhombus },
  { type: "trapezoid", icon: iconTrapezoid },
  { type: "cylinder", icon: iconCylinder },
  { type: "bubble", icon: iconBubble },
  { type: "one_sided_arrow", icon: iconOneSidedArrow },
  { type: "two_sided_arrow", icon: iconTwoSidedArrow },
];

const lineList = [
  { type: "straight", icon: iconLineStraight },
  { type: "curve", icon: iconLineCurve },
  { type: "elbow", icon: iconLineElbow },
  { type: "elbow_curve", icon: iconLineElbowCurve },
];

const layoutList = [
  { type: "align_box", icon: iconLayoutAlignBox },
  { type: "tree_root", icon: iconLayoutBranch },
  { type: "board_root", icon: iconLayoutBoard },
];

function getButtonClass(highlight = false) {
  return "w-10 h-10 p-1 rounded border-2 " + (highlight ? "border-cyan-400" : "");
}

export const AppToolbar: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const sm = useContext(AppStateMachineContext);
  const getCtx = useContext(GetAppStateContext);

  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return sm.watch(() => {
      setStateLabel(sm.getStateSummary().label);
    });
  }, [sm]);

  const onDownShapeElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const ctx = getCtx();
      const type = e.currentTarget.getAttribute("data-type")!;

      let template: { shapes: Shape[]; docMap?: { [id: string]: DocOutput } };
      if (type === "board_root") {
        template = generateBoardTemplate(ctx);
      } else if (type === "align_box") {
        template = generateAlignTemplate(ctx);
      } else {
        template = {
          shapes: [
            createShape(ctx.getShapeStruct, type, {
              id: ctx.generateUuid(),
              findex: acctx.shapeStore.createLastIndex(),
            }),
          ],
        };
      }
      if (template.shapes.length === 0) return;

      sm.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: template,
        },
      });
      setPopup("");
    },
    [sm, getCtx, acctx],
  );

  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      sm.handleEvent({
        type: "state",
        data: { name: "LineReady", options: getLineOptions(type) },
      });
      setLineType(type);
    },
    [sm],
  );

  const [popup, setPopup] = useState<"" | "shapes" | "lines" | "layouts">("");
  const [lineType, setLineType] = useState<string>("straight");

  const handleClosePopup = useCallback(() => {
    setPopup("");
  }, []);

  const handleDownAreaSelect = useCallback(() => {
    if (stateLabel === "RectangleSelectingReady") {
      sm.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
    } else {
      sm.handleEvent({
        type: "state",
        data: { name: "RectSelectReady" },
      });
    }

    setPopup("");
  }, [sm, stateLabel]);

  const onClickShapeButton = useCallback(() => {
    sm.handleEvent({
      type: "state",
      data: { name: "Break" },
    });
    setPopup(popup === "shapes" ? "" : "shapes");
  }, [sm, popup]);

  const onClickLayoutButton = useCallback(() => {
    sm.handleEvent({
      type: "state",
      data: { name: "Break" },
    });
    setPopup(popup === "layouts" ? "" : "layouts");
  }, [sm, popup]);

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
          options: getLineOptions(lineType),
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
            className="bg-white absolute left-0 border p-1 rounded shadow w-max grid grid-cols-2"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {shapeList.map((shape) => (
              <div
                key={shape.type}
                className="w-10 h-10 border p-1 rounded last:mb-0 cursor-grab touch-none"
                data-type={shape.type}
                onPointerDown={onDownShapeElm}
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
                  "w-10 h-10 border p-1 rounded mb-1 last:mb-0 cursor-pointer touch-none" +
                  (lineType === shape.type ? " border-2 border-cyan-400" : "")
                }
                data-type={shape.type}
                onPointerDown={onDownLineElm}
              >
                <img src={shape.icon} alt={shape.type} />
              </div>
            ))}
          </div>
        );
      case "layouts":
        return (
          <div
            className="bg-white absolute left-0 border p-1 rounded shadow"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {layoutList.map((shape) => (
              <div
                key={shape.type}
                className="w-10 h-10 border p-1 rounded mb-1 last:mb-0 cursor-grab touch-none"
                data-type={shape.type}
                onPointerDown={onDownShapeElm}
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
    <OutsideObserver onClick={handleClosePopup}>
      <div className="bg-white relative border border-1 p-1 rounded shadow flex flex-col">
        <button
          type="button"
          className={getButtonClass(stateLabel === "RectangleSelectingReady")}
          onClick={handleDownAreaSelect}
        >
          <img src={iconSelectArea} alt="Select area" />
        </button>
        <button type="button" className={getButtonClass(popup === "shapes")} onClick={onClickShapeButton}>
          <img src={iconShapeSet} alt="shapes" />
        </button>
        <button type="button" className={getButtonClass(popup === "lines")} onClick={onClickLineButton}>
          <img src={iconLineStraight} alt="lines" />
        </button>
        <button type="button" className={getButtonClass(stateLabel === "TextReady")} onClick={onClickTextButton}>
          <img src={iconText} alt="text" />
        </button>
        <button type="button" className={getButtonClass(popup === "layouts")} onClick={onClickLayoutButton}>
          <img src={iconLayout} alt="layouts" />
        </button>
        {renderPopup()}
      </div>
    </OutsideObserver>
  );
};

function getLineOptions(type: string): { type?: LineType; curveType?: CurveType } {
  switch (type) {
    case "curve":
      return { curveType: "auto" };
    case "elbow":
      return { type: "elbow" };
    case "elbow_curve":
      return { type: "elbow", curveType: "auto" };
    default:
      return {};
  }
}
