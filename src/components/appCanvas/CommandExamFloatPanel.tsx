import { CommandExam } from "../../composables/states/types";
import { CommandExamPanel } from "../molecules/CommandExamPanel";
import iconDropdown from "../../assets/icons/dropdown.svg";
import { useCallback } from "react";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

interface Props {
  commandExams: CommandExam[];
}

export const CommandExamFloatPanel: React.FC<Props> = ({ commandExams }) => {
  const [visible, setVisible] = useLocalStorageAdopter({
    key: "command-exam-float-panel",
    version: "1",
    initialValue: true,
    duration: 100,
  });

  const handleButtonClick = useCallback(() => setVisible((v) => !v), [setVisible]);

  return (
    <div className="relative pl-2 pb-2">
      {visible ? (
        <div className="flex flex-col pointer-events-none">
          <CommandExamPanel commandExams={commandExams} />
        </div>
      ) : undefined}
      <button
        type="button"
        className={
          "absolute bottom-0 left-0 w-5 h-5 pt-1 pr-1 bg-gray-300 transition " +
          (visible ? "rounded-tr-xl" : "-scale-100")
        }
        onClick={handleButtonClick}
      >
        <img src={iconDropdown} alt="Toggle panel" className="rotate-45" />
      </button>
    </div>
  );
};
