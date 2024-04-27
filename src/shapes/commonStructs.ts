import { ShapeStruct } from "./core";
import { struct as rectangle } from "./rectangle";
import { struct as ellipse } from "./ellipse";
import { struct as arc } from "./arc";
import { struct as text } from "./text";
import { struct as line } from "./line";
import { struct as image } from "./image";
import { struct as emoji } from "./emoji";
import { struct as group } from "./group";

import { struct as rhombus } from "./rhombus";
import { struct as hexagon } from "./polygons/hexagon";
import { struct as rounded_rectangle } from "./polygons/roundedRectangle";
import { struct as triangle } from "./polygons/triangle";
import { struct as trapezoid } from "./polygons/trapezoid";
import { struct as parallelogram } from "./polygons/parallelogram";
import { struct as capsule } from "./polygons/capsule";
import { struct as cylinder } from "./polygons/cylinder";
import { struct as document_symbol } from "./polygons/documentSymbol";
import { struct as star } from "./polygons/star";
import { struct as bubble } from "./polygons/bubble";
import { struct as one_sided_arrow } from "./oneSidedArrow";
import { struct as two_sided_arrow } from "./twoSidedArrow";
import { struct as cross } from "./polygons/cross";
import { struct as diagonal_cross } from "./polygons/diagonalCross";
import { struct as wave } from "./polygons/wave";

import { struct as tree_root } from "./tree/treeRoot";
import { struct as tree_node } from "./tree/treeNode";
import { struct as board_root } from "./board/boardRoot";
import { struct as board_column } from "./board/boardColumn";
import { struct as board_lane } from "./board/boardLane";
import { struct as board_card } from "./board/boardCard";
import { struct as align_box } from "./align/alignBox";

export const SHAPE_COMMON_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle,
  ellipse,
  arc,
  text,
  line,
  image,
  emoji,
  group,

  rhombus,
  hexagon,
  rounded_rectangle,
  triangle,
  trapezoid,
  parallelogram,
  capsule,
  cylinder,
  document_symbol,
  star,
  bubble,
  one_sided_arrow,
  two_sided_arrow,
  cross,
  diagonal_cross,
  wave,

  tree_root,
  tree_node,
  board_root,
  board_column,
  board_lane,
  board_card,
  align_box,
};
