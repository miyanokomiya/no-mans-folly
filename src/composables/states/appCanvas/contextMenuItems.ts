import { ContextMenuItem } from "../types";

export const CONTEXT_MENU_ITEM_SRC = {
  EXPORT_AS_PNG: {
    label: "Export as PNG",
    key: "EXPORT_AS_PNG",
  },
  COPY_AS_PNG: {
    label: "Copy as PNG",
    key: "COPY_AS_PNG",
  },
} satisfies { [key: string]: ContextMenuItem };
