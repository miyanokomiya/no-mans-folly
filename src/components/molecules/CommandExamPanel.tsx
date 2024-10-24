import { useEffect, useLayoutEffect, useState } from "react";
import { CommandExam } from "../../composables/states/types";

interface Props {
  commandExams: CommandExam[];
}

export const CommandExamPanel: React.FC<Props> = ({ commandExams }) => {
  const [opacity, setOpacity] = useState(0);

  useLayoutEffect(() => {
    setOpacity(0);
  }, [commandExams]);

  useEffect(() => {
    if (commandExams.length > 0) setOpacity(1);
  }, [commandExams]);

  return (
    <div className="transition-opacity duration-500 bg-gray-300 bg-opacity-80 px-2 rounded" style={{ opacity }}>
      {commandExams.map((c) => (
        <div key={c.title} className="flex">
          {c.command ? <div className="mr-2 font-semibold">{c.command}:</div> : undefined}
          <div>{c.title}</div>
        </div>
      ))}
    </div>
  );
};
