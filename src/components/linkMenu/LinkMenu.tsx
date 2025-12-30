import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinkInfo } from "../../composables/states/types";
import { IVec2 } from "okageo";
import { LINK_STYLE_ATTRS } from "../../utils/texts/textEditorCore";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { parseShapeLink, ShapeLink } from "../../utils/texts/textLink";

interface Props {
  canvasState: any;
  focusBack?: () => void;
  canvasToView: (v: IVec2) => IVec2;
  scale: number;
  linkInfo?: LinkInfo;
  delay?: number;
  onJumpToShape?: (shapeLink: ShapeLink) => void;
}

export const LinkMenu: React.FC<Props> = ({ canvasToView, scale, linkInfo, delay, onJumpToShape }) => {
  const [localLinkInfo, setLocalLinkInfo] = useState<LinkInfo>();
  const [hasPointer, setHasPointer] = useState(false);
  const gracefulCloseTimer = useRef<any>(undefined);

  const shapeLink = useMemo(() => (localLinkInfo ? parseShapeLink(localLinkInfo.link) : undefined), [localLinkInfo]);

  const rootStyle = useMemo(() => {
    if (!localLinkInfo) return;

    const viewP = canvasToView(localLinkInfo.bounds);
    const viewWidth = localLinkInfo.bounds.width / scale;
    const viewHeight = localLinkInfo.bounds.height / scale;
    return { transform: `translate(calc(${viewP.x + viewWidth / 2}px - 50%), ${viewP.y + viewHeight}px)` };
  }, [canvasToView, scale, localLinkInfo]);

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
    onJumpToShape?.(shapeLink);
  }, [shapeLink, onJumpToShape]);

  return (
    <OutsideObserver onClick={handleGlobalClick}>
      {localLinkInfo ? (
        <div
          className="fixed top-0 left-0 p-2 border bg-white max-w-96 truncate rounded-xs shadow-xs"
          style={rootStyle}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {shapeLink ? (
            <button
              type="button"
              className="cursor-pointer underline"
              style={{ color: LINK_STYLE_ATTRS.color ?? undefined }}
              onClick={handleShapeLinkClick}
            >
              Jump to Shape
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
