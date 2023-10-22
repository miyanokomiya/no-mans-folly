import { getAltOrOptionStr, getCtrlOrMetaStr } from "../../../utils/devices";
import { CommandExam } from "../types";

export const COMMAND_EXAM_SRC = {
  PAN_CANVAS: { command: "Space", title: "Pan canvas" },
  DISABLE_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },
  DISABLE_LINE_VERTEX_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },

  RESIZE_PROPORTIONALLY: { command: "Shift", title: "Proportionally" },
  RESIZE_AT_CENTER: { command: getAltOrOptionStr(), title: "Based on center" },

  DELETE_INER_VERTX: { command: "Shift + Click", title: "Delete inner vertex" },

  TEXT_MOVE_CURSOR: { command: "Ctrl + p, n, b, f", title: "Move cursor" },
  TEXT_BACKSPACE: { command: "Ctrl + h", title: "Backspace" },
  TEXT_DELETE: { command: "Ctrl + d", title: "Delete" },
  TEXT_EMOJI_PICKER: { command: `${getCtrlOrMetaStr()} + ":"`, title: "Emoji picker" },

  TOGGLE_GRID: { command: "g", title: "Grid on/off" },
  RESET_VIEWPORT: { command: "Home, !", title: "Reset viewport" },
  NEW_TEXT: { command: "t", title: "New Text" },
  NEW_LINE: { command: "l", title: "New Line" },
  NEW_EMOJI: { command: `${getCtrlOrMetaStr()} + ":"`, title: "New Emoji" },

  GROUP: { command: `${getCtrlOrMetaStr()} + g`, title: "Group" },
  UNGROUP: { command: `${getCtrlOrMetaStr()} + G`, title: "Ungroup" },
} satisfies { [key: string]: CommandExam };
