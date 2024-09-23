import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export const LangSelection: React.FC = () => {
  const { i18n } = useTranslation();
  const handleChange = useCallback(
    (val: string) => {
      i18n.changeLanguage(val);
    },
    [i18n],
  );

  return (
    <div className="flex items-center- justify-center">
      {["en", "ja"].map((value, i) => (
        <div key={value} className={i > 0 ? "border-l" : ""}>
          <LangOption value={value} currentValue={i18n.language} onChange={handleChange} />
        </div>
      ))}
    </div>
  );
};

interface LangOptionProps {
  value: string;
  currentValue: string;
  onChange?: (val: string) => void;
}

export const LangOption: React.FC<LangOptionProps> = ({ value, currentValue, onChange }) => {
  const selected = value === currentValue;
  const handleClick = useCallback(() => onChange?.(value), [value, onChange]);

  return (
    <button
      type="button"
      className={"px-2 py-1 " + (selected ? "" : "text-blue-500")}
      disabled={selected}
      onClick={handleClick}
    >
      {value.toUpperCase()}
    </button>
  );
};
