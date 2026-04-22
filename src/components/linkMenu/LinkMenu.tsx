import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LinkInfo } from "../../composables/states/types";
import { add, IRectangle, IVec2 } from "okageo";
import { LINK_STYLE_ATTRS } from "../../utils/texts/textEditorCore";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { parseShapeLink, ShapeLink } from "../../utils/texts/textLink";
import { FrameThumbnail } from "../framePanel/FrameThumbnail";
import { useDocumentMapWithoutTmpInfo, useSelectedSheet, useStaticShapeComposite } from "../../hooks/storeHooks";
import { AppStateContext } from "../../contexts/AppContext";
import { rednerRGBA, resolveColor } from "../../utils/color";
import { useColorPalette } from "../../hooks/storeHooks";
import { Size } from "../../models";
import { useRefWithDOMRect, useWithinArea } from "../../hooks/domRect";

interface Props {
  focusBack?: () => void;
  canvasToView: (v: IVec2) => IVec2;
  viewSize: Size;
  linkInfo?: LinkInfo;
  delay?: number;
  onJumpToShape?: (shapeLink: ShapeLink) => void;
}

export const LinkMenu: React.FC<Props> = ({ canvasToView, viewSize, linkInfo, delay, onJumpToShape }) => {
  const [localLinkInfo, setLocalLinkInfo] = useState<LinkInfo>();
  const [hasPointer, setHasPointer] = useState(false);
  const gracefulCloseTimer = useRef<any>(undefined);
  const viewTargetBounds = localLinkInfo ? canvasToViewRect(localLinkInfo.bounds, canvasToView) : undefined;
  const [rootRef, panelBounds] = useRefWithDOMRect();
  const basePanelBounds = useMemo<IRectangle | undefined>(() => {
    if (!panelBounds || !viewTargetBounds) return;
    return {
      x: viewTargetBounds.x + viewTargetBounds.width / 2 - panelBounds.width / 2,
      y: viewTargetBounds.y + viewTargetBounds.height,
      width: panelBounds.width,
      height: panelBounds.height,
    };
  }, [panelBounds, viewTargetBounds]);
  const locationDiff = useWithinArea(basePanelBounds, viewSize, viewTargetBounds ? [viewTargetBounds, 0] : undefined);
  const shapeLink = useMemo(() => (localLinkInfo ? parseShapeLink(localLinkInfo.link) : undefined), [localLinkInfo]);

  const rootStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!basePanelBounds || !locationDiff) return;

    const viewP = locationDiff ? add(basePanelBounds, locationDiff) : basePanelBounds;
    return { transform: `translate(${viewP.x}px, ${viewP.y}px)` };
  }, [locationDiff, basePanelBounds]);

  const cancelGracefulClose = useCallback(() => {
    if (gracefulCloseTimer.current) {
      clearTimeout(gracefulCloseTimer.current);
      gracefulCloseTimer.current = undefined;
    }
  }, []);

  const gracefulClose = useCallback(
    (closeDelay: number) => {
      cancelGracefulClose();
      gracefulCloseTimer.current = setTimeout(() => {
        setLocalLinkInfo((val) => {
          return val === localLinkInfo ? undefined : val;
        });
      }, closeDelay);
    },
    [localLinkInfo, cancelGracefulClose],
  );

  const handlePointerEnter = useCallback(() => {
    setHasPointer(true);
    cancelGracefulClose();
  }, [cancelGracefulClose]);

  const handlePointerLeave = useCallback(() => {
    setHasPointer(false);
  }, []);

  useEffect(() => {
    if (hasPointer || localLinkInfo === linkInfo) {
      cancelGracefulClose();
      return;
    }

    if (!linkInfo) {
      gracefulClose(1000);
      return;
    }

    const timer = setTimeout(
      () => {
        setLocalLinkInfo(linkInfo);
      },
      localLinkInfo ? 0 : delay,
    );
    cancelGracefulClose();
    return () => clearTimeout(timer);
  }, [delay, hasPointer, gracefulClose, cancelGracefulClose, linkInfo, localLinkInfo]);

  const handleGlobalClick = useCallback(() => {
    cancelGracefulClose();
    setLocalLinkInfo(linkInfo);
  }, [linkInfo, cancelGracefulClose]);

  const handleShapeLinkClick = useCallback(() => {
    if (!shapeLink) return;

    cancelGracefulClose();
    setLocalLinkInfo(undefined);
    setHasPointer(false);
    onJumpToShape?.(shapeLink);
  }, [shapeLink, onJumpToShape, cancelGracefulClose]);

  const { getImageStore } = useContext(AppStateContext);
  const shapeComposite = useStaticShapeComposite();
  const documentMap = useDocumentMapWithoutTmpInfo();
  const imageStore = getImageStore();
  const sheet = useSelectedSheet();
  const palette = useColorPalette();
  const shapeLinkThumbnail = useMemo(() => {
    if (!shapeLink) return;

    const shapes = shapeLink.shapeIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => s);
    if (shapes.length === 0) return;

    const bounds = shapeComposite.getWrapperRectForShapes(shapes, true);
    const mockFrame = shapeComposite
      .getShapeStruct("frame")
      .create({ p: bounds, width: bounds.width, height: bounds.height });
    const sheetColor = sheet?.bgcolor ? rednerRGBA(resolveColor(sheet.bgcolor, palette)) : "#fff";
    return (
      <div className="w-60 h-40">
        <FrameThumbnail
          frame={mockFrame}
          shapeComposite={shapeComposite}
          documentMap={documentMap}
          imageStore={imageStore}
          backgroundColor={sheetColor}
          noCrop
          colorPalette={palette}
        />
      </div>
    );
  }, [shapeComposite, documentMap, imageStore, sheet, shapeLink, palette]);

  return (
    <OutsideObserver onClick={handleGlobalClick}>
      {localLinkInfo ? (
        <div
          ref={rootRef}
          className={
            "fixed top-0 left-0 p-1 border bg-white max-w-96 truncate rounded-xs shadow-xs" +
            (rootStyle ? "" : " invisible")
          }
          style={rootStyle}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {shapeLink ? (
            <button
              type="button"
              className="cursor-pointer underline flex items-center justify-center"
              style={{ color: LINK_STYLE_ATTRS.color ?? undefined }}
              onClick={handleShapeLinkClick}
            >
              {shapeLinkThumbnail ?? "Jump to Shape"}
            </button>
          ) : (
            <a
              href={localLinkInfo.link}
              target="_blank"
              rel="noopener"
              className="underline"
              style={{ color: LINK_STYLE_ATTRS.color ?? undefined }}
            >
              {localLinkInfo.link}
            </a>
          )}
        </div>
      ) : undefined}
    </OutsideObserver>
  );
};

function canvasToViewRect(src: IRectangle, canvasToView: (v: IVec2) => IVec2): IRectangle {
  const { x, y } = canvasToView(src);
  const { x: right, y: bottom } = canvasToView({ x: src.x + src.width, y: src.y + src.height });
  return { x, y, width: right - x, height: bottom - y };
}
