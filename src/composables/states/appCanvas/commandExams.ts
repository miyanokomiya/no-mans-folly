import { getAltOrOptionStr, getCtrlOrMetaStr } from "../../../utils/devices";
import { CommandExam } from "../types";

export const COMMAND_EXAM_SRC = {
  PAN_CANVAS: { command: "Space", title: "Pan canvas" },
  DISABLE_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },
  DISABLE_LINE_VERTEX_SNAP: { command: getCtrlOrMetaStr(), title: "Disable snapping" },
  BEZIER_SYMMETRICALLY: { command: "Shift", title: "Symmetrically" },

  LABEL_ALIGN: { command: "Shift", title: "Adjust label align" },
  LABEL_ALIGN_ACTIVATE: { command: "Shift + Drag", title: "Adjust label align" },

  RESIZE_PROPORTIONALLY: { command: "Shift", title: "Proportionally" },
  RESIZE_AT_CENTER: { command: getAltOrOptionStr(), title: "Based on center" },

  PADDING_BOTH_SIDES: { command: "Shift", title: "Both sides" },
  PADDING_ALL_SIDES: { command: getAltOrOptionStr(), title: "All sides" },
  GAP_BOTH: { command: "Shift", title: "Both gaps" },

  DELETE_INER_VERTX: { command: "Shift + Click", title: "Delete inner vertex" },

  TEXT_MOVE_CURSOR: { command: "Ctrl + p, n, b, f", title: "Move cursor" },
  TEXT_BACKSPACE: { command: "Ctrl + h", title: "Backspace" },
  TEXT_DELETE: { command: "Ctrl + d", title: "Delete" },
  TEXT_EMOJI_PICKER: { command: `${getCtrlOrMetaStr()} + ":"`, title: "Emoji picker" },

  TOGGLE_GRID: { command: "g", title: "Grid on/off" },
  RESET_VIEWPORT: { command: "Home, !", title: "Reset viewport" },
  PAN_TO_AREA: { command: "Home, !", title: "Pan to area" },

  NEW_TEXT: { command: "t", title: "New Text" },
  NEW_LINE: { command: "l", title: "New Line" },
  NEW_EMOJI: { command: `${getCtrlOrMetaStr()} + ":"`, title: "New Emoji" },

  GROUP: { command: `${getCtrlOrMetaStr()} + g`, title: "Group" },
  UNGROUP: { command: `${getCtrlOrMetaStr()} + G`, title: "Ungroup" },

  SELECT_PARENT: { command: "p", title: "Select parent" },
  SELECT_CHILD: { command: "c", title: "Select child" },
  KEEP_SELECTION: { command: getCtrlOrMetaStr(), title: "Keep selection" },

  TREE_NEW_CHILD: { command: "Tab", title: "New child" },
  TREE_NEW_SIBLING: { command: "Shift + Enter", title: "New sibling" },
} satisfies { [key: string]: CommandExam };
