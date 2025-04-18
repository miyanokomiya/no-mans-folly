import { useCallback, useContext, useEffect, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { applyScaleToShape, createShape } from "../../shapes";
import iconShapeSet from "../../assets/icons/shape_set.svg";
import iconLineStraight from "../../assets/icons/shape_line_straight.svg";
import iconText from "../../assets/icons/text.svg";
import iconLayout from "../../assets/icons/layout.svg";
import iconSelectArea from "../../assets/icons/select_area.svg";
import iconLineTangent from "../../assets/icons/line_tangent.svg";
import iconLineNormal from "../../assets/icons/line_normal.svg";
import iconVnNode from "../../assets/icons/vnnode.svg";
import iconVnPolygon from "../../assets/icons/vn_polygon.svg";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { Shape } from "../../models";
import { generateBoardTemplate } from "../../composables/boardHandler";
import { DocOutput } from "../../models/document";
import { generateAlignTemplate } from "../../composables/alignHandler";
import { CurveType, LineType } from "../../shapes/line";
import { lineTypeList } from "../../composables/shapeTypes";
import { LayoutShapeListPanel, ShapeListPanel } from "./ShapeListPanel";
import { newShapeComposite } from "../../composables/shapeComposite";
import { AffineMatrix, getRectCenter, IRectangle } from "okageo";
import { useUserSetting } from "../../hooks/storeHooks";

type PopupKey = "" | "shapes" | "lines" | "layouts";

function getButtonClass(highlight = false) {
  return "w-10 h-10 p-1 rounded-xs border-2 " + (highlight ? "border-cyan-400" : "");
}

const lineButtonTypeList = lineTypeList.concat([
  { type: "tangent", icon: iconLineTangent },
  { type: "normal", icon: iconLineNormal },
  { type: "vn_node_insert", icon: iconVnNode },
  { type: "vn_create_polygon", icon: iconVnPolygon },
]);

export const AppToolbar: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const sm = useContext(AppStateMachineContext);
  const getCtx = useContext(GetAppStateContext);
  const [userSetting] = useUserSetting();

  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return sm.watch(() => {
      setStateLabel(sm.getStateSummary().label);
    });
  }, [sm]);

  const [popup, setPopup] = useState<PopupKey>("");
  const [lineType, setLineType] = useState<string>("straight");

  const handleClosePopup = useCallback(() => {
    setPopup("");
  }, []);

  const createShapeTemplate = useCallback(
    (type: string) => {
      const ctx = getCtx();
      let template: { shapes: Shape[]; docMap?: { [id: string]: DocOutput } };
      if (type === "board_root") {
        template = generateBoardTemplate(ctx);
      } else if (type === "align_box") {
        template = generateAlignTemplate(ctx);
      } else {
        const shape = createShape(ctx.getShapeStruct, type, {
          id: ctx.generateUuid(),
          findex: acctx.shapeStore.createLastIndex(),
        });
        const minShapeComposite = newShapeComposite({
          getStruct: ctx.getShapeStruct,
          shapes: [shape],
        });
        const size = getBetterShapeSizeForViewport(ctx.getViewRect());
        const shapeRect = minShapeComposite.getWrapperRect(shape);
        const shapeMaxSize = Math.max(shapeRect.width, shapeRect.height);
        if (size !== shapeMaxSize) {
          // Adjust the shape size to fit the viewport.
          const scale = size / shapeMaxSize;
          const patch = applyScaleToShape(minShapeComposite.getShapeStruct, shape, { x: scale, y: scale });
          template = { shapes: [{ ...shape, ...patch }] };
        } else {
          template = { shapes: [shape] };
        }
      }

      return template;
    },
    [getCtx, acctx],
  );

  const handleShapeTypeClick = useCallback(
    (type: string) => {
      const template = createShapeTemplate(type);
      if (template.shapes.length === 0) return;

      const ctx = getCtx();
      const minShapeComposite = newShapeComposite({
        getStruct: ctx.getShapeStruct,
        shapes: template.shapes,
      });
      const wrapper = minShapeComposite.getWrapperRectForShapes(template.shapes);
      const wrapperCenter = getRectCenter(wrapper);
      const viewCenter = getRectCenter(ctx.getViewRect());
      const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];

      ctx.addShapes(
        template.shapes.map((s) => ({ ...s, ...minShapeComposite.transformShape(s, affine) })),
        template.docMap,
      );
      ctx.multiSelectShapes(template.shapes.map((s) => s.id));
    },
    [getCtx, createShapeTemplate],
  );

  const handleShapeTypeDragStart = useCallback(
    (type: string) => {
      const template = createShapeTemplate(type);
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
    [sm, createShapeTemplate],
  );

  const startLineState = useCallback(
    (type: string) => {
      setLineType(type);
      switch (type) {
        case "tangent":
          sm.handleEvent({
            type: "state",
            data: { name: "LineTangentReady" },
          });
          break;
        case "normal":
          sm.handleEvent({
            type: "state",
            data: { name: "LineNormalReady" },
          });
          break;
        case "vn_node_insert":
          sm.handleEvent({
            type: "state",
            data: { name: "VnNodeInsertReady" },
          });
          break;
        case "vn_create_polygon":
          sm.handleEvent({
            type: "state",
            data: { name: "VnCreatePolygon" },
          });
          break;
        default:
          sm.handleEvent({
            type: "state",
            data: { name: "LineReady", options: getLineOptions(type) },
          });
          break;
      }
    },
    [sm],
  );

  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      startLineState(type);
    },
    [startLineState],
  );

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
    if (popup === "lines") {
      sm.handleEvent({
        type: "state",
        data: { name: "Break" },
      });
      setPopup("");
    } else {
      startLineState(lineType);
      setPopup("lines");
    }
  }, [popup, lineType, sm, startLineState]);

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
            className="bg-white absolute left-0 border p-1 rounded-xs shadow-xs w-max"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            <ShapeListPanel onShapeTypeClick={handleShapeTypeClick} onShapeTypeDragStart={handleShapeTypeDragStart} />
          </div>
        );
      case "lines":
        return (
          <div
            className="bg-white absolute left-0 border p-1 rounded-xs shadow-xs"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            {lineButtonTypeList.map((shape) => (
              <div
                key={shape.type}
                className={
                  "w-10 h-10 border p-1 rounded-xs mb-1 last:mb-0 cursor-pointer touch-none" +
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
            className="bg-white absolute left-0 border p-1 rounded-xs shadow-xs w-max"
            style={{ top: "50%", transform: "translate(-100%, -50%)" }}
          >
            <LayoutShapeListPanel
              onShapeTypeClick={handleShapeTypeClick}
              onShapeTypeDragStart={handleShapeTypeDragStart}
            />
          </div>
        );
      default:
        return;
    }
  }

  const lineIcon = lineButtonTypeList.find((shape) => shape.type === lineType)?.icon ?? iconLineStraight;

  return userSetting.displayMode === "no-hud" ? undefined : (
    <OutsideObserver onClick={handleClosePopup}>
      <div className="bg-white relative border border-1 p-1 rounded-xs shadow-xs flex flex-col">
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
          <img src={lineIcon} alt="lines" />
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

function getBetterShapeSizeForViewport(viewRect: IRectangle): number {
  // 25 would be the minimum size for most of shapes without breaking their default appearances.
  const sizeList = [100, 50, 25];
  const minViewSize = Math.min(viewRect.width, viewRect.height);
  return sizeList.find((s) => s < minViewSize / 2) ?? 100;
}
