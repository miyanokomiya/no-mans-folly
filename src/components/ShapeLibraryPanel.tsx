import { useCallback, useState } from "react";
import { ShapeLibraryGroup } from "./molecules/ShapeLibraryGroup";

interface Props {}

export const ShapeLibraryPanel: React.FC<Props> = () => {
  const [selected, setSelected] = useState<"" | "aws">("");

  const handleClickAws = useCallback(() => {
    setSelected("aws");
  }, []);

  const handleIconDown = useCallback((url: string, id: string) => {
    console.log(url, id);
  }, []);

  return (
    <div className="bg-white p-2">
      <div>
        <button type="button" onClick={handleClickAws} className="border rounded p-2 w-full text-left">
          AWS
        </button>
        {selected ? (
          <div className="pl-2 w-60 h-96 overflow-auto">
            <ShapeLibraryGroup name="aws" onIconDown={handleIconDown} />
          </div>
        ) : undefined}
      </div>
    </div>
  );
};
