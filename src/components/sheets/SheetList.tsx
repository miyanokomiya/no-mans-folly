import { useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";

export const SheetList: React.FC = () => {
  const acctx = useContext(AppCanvasContext);

  const [sheetState, setSheetState] = useState<any>({});

  useEffect(() => {
    return acctx.sheetStore.watch(() => {
      setSheetState({});
    });
  }, []);

  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      setSheetState({});
    });
  }, []);

  const selectedSheet = useMemo(() => {
    return acctx.sheetStore.getSelectedSheet();
  }, [acctx, sheetState]);

  const sheetPanels = useMemo(() => {
    const sheets = acctx.sheetStore.getEntities();
    return sheets.map((s) => {
      return (
        <div key={s.id} className="">
          <SheetPanel sheet={s} selected={s.id === selectedSheet?.id} />{" "}
        </div>
      );
    });
  }, [acctx, sheetState]);

  return (
    <div className="p-1 border rounded">
      <div className="flex flex-col items-center gap-1">{sheetPanels}</div>
    </div>
  );
};
