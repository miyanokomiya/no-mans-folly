import { ShapeStruct } from "./core";
import { struct as rectangle } from "./rectangle";
import { struct as ellipse } from "./ellipse";
import { struct as donut } from "./donut";
import { struct as arc } from "./arc";
import { struct as moon } from "./moon";
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
import { struct as spiky_rectangle } from "./polygons/spikyRectangle";
import { struct as bubble } from "./polygons/bubble";
import { struct as one_sided_arrow } from "./oneSidedArrow";
import { struct as two_sided_arrow } from "./twoSidedArrow";
import { struct as cross } from "./polygons/cross";
import { struct as diagonal_cross } from "./polygons/diagonalCross";
import { struct as wave } from "./polygons/wave";
import { struct as curly_bracket } from "./polygons/curlyBracket";
import { struct as line_polygon } from "./polygons/linePolygon";

import { struct as tree_root } from "./tree/treeRoot";
import { struct as tree_node } from "./tree/treeNode";
import { struct as board_root } from "./board/boardRoot";
import { struct as board_column } from "./board/boardColumn";
import { struct as board_lane } from "./board/boardLane";
import { struct as board_card } from "./board/boardCard";
import { struct as align_box } from "./align/alignBox";

import { struct as frame } from "./frame";

export const SHAPE_COMMON_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  group,
  text,
  line,
  image,
  emoji,

  rectangle,
  ellipse,

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
  spiky_rectangle,
  bubble,
  one_sided_arrow,
  two_sided_arrow,

  donut,
  arc,
  moon,
  cross,
  diagonal_cross,
  wave,
  curly_bracket,
  line_polygon,

  tree_root,
  tree_node,
  board_root,
  board_column,
  board_lane,
  board_card,
  align_box,

  frame,
};
