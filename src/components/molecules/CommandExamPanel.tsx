import { CommandExam } from "../../composables/states/types";

interface Props {
  commandExams: CommandExam[];
}

export const CommandExamPanel: React.FC<Props> = ({ commandExams }) => {
  return (
    <div>
      {commandExams.map((c) => (
        <div key={c.title} className="flex">
          {c.command ? <div className="mr-2">{c.command}:</div> : undefined}
          <div>{c.title}</div>
        </div>
      ))}
    </div>
  );
};
