import { useMemo } from "react";
import { LinkInfo } from "../../composables/states/types";
import { IVec2 } from "okageo";

interface Props {
  canvasState: any;
  focusBack?: () => void;
  canvasToView: (v: IVec2) => IVec2;
  scale: number;
  linkInfo: LinkInfo;
}

export const LinkMenu: React.FC<Props> = ({ canvasToView, scale, linkInfo }) => {
  const rootStyle = useMemo(() => {
    const viewP = canvasToView(linkInfo.bounds);
    const viewWidth = linkInfo.bounds.width / scale;
    const viewHeight = linkInfo.bounds.height / scale;
    return { transform: `translate(calc(${viewP.x + viewWidth / 2}px - 50%), ${viewP.y + viewHeight}px)` };
  }, [canvasToView]);

  return (
    <div className="fixed top-0 left-0 p-4 border bg-white" style={rootStyle}>
      <a href={linkInfo.link} target="_blank" rel="noopener">
        {linkInfo.link}
      </a>
    </div>
  );
};
