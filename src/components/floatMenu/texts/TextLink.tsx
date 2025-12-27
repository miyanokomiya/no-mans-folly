import { useCallback, useEffect, useState } from "react";
import { PopupButton, PopupDirection } from "../../atoms/PopupButton";
import { TextInput } from "../../atoms/inputs/TextInput";
import iconLink from "../../../assets/icons/link.svg";
import iconLinkOn from "../../../assets/icons/link_on.svg";
import iconDelete from "../../../assets/icons/delete_filled.svg";
import iconAdd from "../../../assets/icons/add_filled.svg";
import { DocAttributes } from "../../../models/document";
import { clearLinkRelatedAttrubites } from "../../../utils/textEditor";
import { LINK_STYLE_ATTRS } from "../../../utils/textEditorCore";

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  value?: DocAttributes;
  onChange?: (val: DocAttributes) => void;
}

export const TextLink: React.FC<Props> = ({ popupedKey, setPopupedKey, defaultDirection, value, onChange }) => {
  const handleLinkChange = useCallback(
    (val: string) => {
      if (val) {
        onChange?.({ ...value, ...LINK_STYLE_ATTRS, link: val });
      } else {
        // Need to clear all related attributes in case both link and not link are mixed in the selection.
        onChange?.(clearLinkRelatedAttrubites(value));
      }
    },
    [value, onChange],
  );

  return (
    <PopupButton
      name="text-link"
      opened={popupedKey === "text-link"}
      popup={<TextLinkPanel value={value?.link ?? ""} onChange={handleLinkChange} />}
      onClick={setPopupedKey}
      defaultDirection={defaultDirection}
    >
      <div className="w-8 h-8 p-1">
        <img src={value?.link ? iconLinkOn : iconLink} alt="Link" />
      </div>
    </PopupButton>
  );
};

interface TextLinkPanelProps {
  value: string;
  onChange?: (val: string) => void;
}

export const TextLinkPanel: React.FC<TextLinkPanelProps> = ({ value, onChange }) => {
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onChange?.(draftValue);
    },
    [draftValue, onChange],
  );

  const handleChange = useCallback((val: string) => {
    setDraftValue(val);
  }, []);

  const handleDelete = useCallback(() => {
    onChange?.("");
  }, [onChange]);

  return (
    <div className="p-1">
      <form className="flex gap-1 items-center" onSubmit={handleSubmit}>
        <div className="w-80">
          <TextInput
            value={draftValue}
            onChange={handleChange}
            autofocus={true}
            keepFocus={true}
            placeholder="Attach a link"
          />
        </div>
        <button type="submit" className="w-8 h-8 p-1 border rounded-xs">
          <img src={iconAdd} alt="Add" />
        </button>
        <button type="button" className="w-8 h-8 p-1 border rounded-xs" onClick={handleDelete}>
          <img src={iconDelete} alt="Delete" />
        </button>
      </form>
    </div>
  );
};
