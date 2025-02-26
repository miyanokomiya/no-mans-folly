import { useCallback, useContext, useMemo, useState } from "react";
import { LineHeadItems } from "./LineHeadItems";
import { LineTypeButton } from "./LineTypeButton";
import { useShapeCompositeWithoutTmpInfo, useUserSetting } from "../../hooks/storeHooks";
import { createShape } from "../../shapes";
import { CurveType, LineShape, LineType } from "../../shapes/line";
import { FillStyle, LineHead } from "../../models";
import { PopupButton } from "../atoms/PopupButton";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { rednerRGBA } from "../../utils/color";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { AppStateMachineContext } from "../../contexts/AppContext";

export const FloatMenuSmartBranch: React.FC = () => {
  const { handleEvent } = useContext(AppStateMachineContext);
  const staticShapeComposite = useShapeCompositeWithoutTmpInfo();
  const [userSetting, patchUserSetting] = useUserSetting();
  const [popupKey, setPopupKey] = useState("");
  const onClickPopupButton = useCallback((name: string) => {
    setPopupKey((v) => (v === name ? "" : name));
  }, []);
  const popupButtonCommonProps = {
    popupedKey: popupKey,
    setPopupedKey: onClickPopupButton,
    defaultDirection: "top" as const,
  };

  const indexLineShape = useMemo(() => {
    return createShape<LineShape>(staticShapeComposite.getShapeStruct, "line", userSetting.smartBranchLine ?? {});
  }, [userSetting, staticShapeComposite]);

  const handleLineChange = useCallback(
    (patch: Partial<LineShape>) => {
      patchUserSetting({
        smartBranchLine: { ...userSetting.smartBranchLine, ...patch },
      });
    },
    [patchUserSetting, userSetting],
  );

  const onFillChanged = useCallback(
    (val: Partial<FillStyle>) => {
      handleLineChange({ fill: { ...indexLineShape.fill, ...val } });
    },
    [handleLineChange, indexLineShape],
  );
  const onStrokeChanged = useCallback(
    (val: Partial<FillStyle>) => {
      handleLineChange({ stroke: { ...indexLineShape.stroke, ...val } });
    },
    [handleLineChange, indexLineShape],
  );
  const onLineTypeChanged = useCallback(
    (lineType: LineType, curveType?: CurveType) => {
      handleLineChange({ lineType, curveType });
    },
    [handleLineChange],
  );
  const onLineJumpChanged = useCallback(
    (val: boolean) => {
      handleLineChange({ jump: val });
    },
    [handleLineChange],
  );
  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }) => {
      handleLineChange({ ...val });
    },
    [handleLineChange],
  );

  const handleReset = useCallback(() => {
    patchUserSetting({
      smartBranchLine: undefined,
    });
  }, [patchUserSetting]);

  const highlighShape = useCallback(
    (meta: HighlightShapeMeta) => {
      handleEvent({
        type: "shape-highlight",
        data: { id: "dummy", meta },
      });
    },
    [handleEvent],
  );

  return (
    <div className="p-1">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="mb-1">Smart branch settings</h3>
        <button
          type="button"
          className={"px-2 py-1 border rounded-sm" + (userSetting.smartBranchLine ? "" : " invisible")}
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
      <div className="flex gap-1 items-center">
        <PopupButton
          name="fill"
          opened={popupKey === "fill"}
          popup={<FillPanel fill={indexLineShape.fill} onChanged={onFillChanged} />}
          onClick={onClickPopupButton}
          defaultDirection={popupButtonCommonProps.defaultDirection}
        >
          <div
            className="w-8 h-8 border-2 rounded-full"
            style={{ backgroundColor: rednerRGBA(indexLineShape.fill.color) }}
          ></div>
        </PopupButton>
        <PopupButton
          name="stroke"
          opened={popupKey === "stroke"}
          popup={<StrokePanel stroke={indexLineShape.stroke} onChanged={onStrokeChanged} />}
          onClick={onClickPopupButton}
          defaultDirection={popupButtonCommonProps.defaultDirection}
        >
          <div className="w-8 h-8 flex justify-center items-center">
            <div
              className="w-1.5 h-9 border rounded-xs rotate-45"
              style={{ backgroundColor: rednerRGBA(indexLineShape.stroke.color) }}
            ></div>
          </div>
        </PopupButton>
        <div className="h-8 mx-0.5 border"></div>
        <LineTypeButton
          {...popupButtonCommonProps}
          currentType={indexLineShape.lineType}
          currentCurve={indexLineShape.curveType}
          onChange={onLineTypeChanged}
          jump={indexLineShape.jump}
          onJumpChange={onLineJumpChanged}
        />
        <LineHeadItems
          {...popupButtonCommonProps}
          lineShape={indexLineShape}
          onChange={onLineHeadChanged}
          highlighShape={highlighShape}
        />
      </div>
    </div>
  );
};
