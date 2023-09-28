import { getAltOrOptionStr, getCtrlOrMetaStr } from "../../../utils/devices";
import { CommandExam } from "../types";

export const COMMAND_EXAM_SRC = {
  DISABLE_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },
  DISABLE_LINE_VERTEX_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },

  RESIZE_PROPORTIONALLY: { command: "Shift", title: "Proportionally" },
  RESIZE_AT_CENTER: { command: getAltOrOptionStr(), title: "Based on center" },

  DELETE_INER_VERTX: { command: "Shift + Click", title: "Delete inner vertex" },

  TEXT_MOVE_CURSOR: { command: "Ctrl + p, n, b, f", title: "Move cursor" },
  TEXT_BACKSPACE: { command: "Ctrl + h", title: "Backspace" },
  TEXT_DELETE: { command: "Ctrl + d", title: "Delete" },

  RESET_VIEWPORT: { command: "Home / !", title: "Reset viewport" },
  NEW_TEXT: { command: "t", title: "New Text" },
  NEW_LINE: { command: "l", title: "New Line" },
} satisfies { [key: string]: CommandExam };
