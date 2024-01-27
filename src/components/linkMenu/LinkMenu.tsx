import { useMemo } from "react";
import { LinkInfo } from "../../composables/states/types";
import { IVec2 } from "okageo";

interface Props {
  canvasState: any;
  focusBack?: () => void;
  canvasToView: (v: IVec2) => IVec2;
  linkInfo: LinkInfo;
}

export const LinkMenu: React.FC<Props> = ({ canvasToView, linkInfo }) => {
  const rootStyle = useMemo(() => {
    const viewP = canvasToView(linkInfo.p);
    return { transform: `translate(${viewP.x}px, ${viewP.y}px)` };
  }, [canvasToView]);

  return (
    <div className="fixed top-0 left-0 p-4 border bg-white" style={rootStyle}>
      <a href={linkInfo.link} target="_blank" rel="noopener">
        {linkInfo.link}
      </a>
    </div>
  );
};
