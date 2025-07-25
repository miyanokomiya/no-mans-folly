import iconRectangle from "../assets/icons/shape_rectangle.svg";
import iconRoundedRectangle from "../assets/icons/shape_rounded_rectangle.svg";
import iconRhombus from "../assets/icons/shape_rhombus.svg";
import iconHexagon from "../assets/icons/shape_hexagon.svg";
import iconTriangle from "../assets/icons/shape_triangle.svg";
import iconTrapezoid from "../assets/icons/shape_trapezoid.svg";
import iconParallelogram from "../assets/icons/shape_parallelogram.svg";
import iconCapsule from "../assets/icons/shape_capsule.svg";
import iconChevron from "../assets/icons/shape_chevron.svg";
import iconRibbon from "../assets/icons/shape_ribbon.svg";
import iconCylinder from "../assets/icons/shape_cylinder.svg";
import iconDocumentSymbol from "../assets/icons/shape_document_symbol.svg";
import iconStar from "../assets/icons/shape_star.svg";
import iconGear from "../assets/icons/shape_gear.svg";
import iconSpikyRectangle from "../assets/icons/shape_spiky_rectangle.svg";
import iconBubble from "../assets/icons/shape_bubble.svg";
import iconOneSidedArrow from "../assets/icons/shape_one_sided_arrow.svg";
import iconTwoSidedArrow from "../assets/icons/shape_two_sided_arrow.svg";
import iconEllipse from "../assets/icons/shape_ellipse.svg";
import iconDonut from "../assets/icons/shape_donut.svg";
import iconDonutArc from "../assets/icons/shape_donut_arc.svg";
import iconMoon from "../assets/icons/shape_moon.svg";
import iconCross from "../assets/icons/shape_cross.svg";
import iconDiagonalCross from "../assets/icons/shape_diagonal_cross.svg";
import iconWave from "../assets/icons/shape_wave.svg";
import iconBracket from "../assets/icons/shape_bracket.svg";
import iconRoundBracket from "../assets/icons/shape_round_bracket.svg";
import iconCurlyBracket from "../assets/icons/shape_curly_bracket.svg";
import iconAngleBracket from "../assets/icons/shape_angle_bracket.svg";

import iconLineStraight from "../assets/icons/shape_line_straight.svg";
import iconLineCurve from "../assets/icons/shape_line_curve.svg";
import iconLineElbow from "../assets/icons/shape_line_elbow.svg";
import iconLineElbowCurve from "../assets/icons/shape_line_elbow_curve.svg";

import iconLayoutBranch from "../assets/icons/layout_branch.svg";
import iconLayoutBoard from "../assets/icons/layout_board.svg";
import iconLayoutAlignBox from "../assets/icons/layout_align_box.svg";

import { newLineSelectedState } from "./states/appCanvas/lines/lineSelectedState";
import { newRoundedRectangleSelectedState } from "./states/appCanvas/roundedRectangle/roundedRectangleSelectedState";
import { newArrowSelectedState } from "./states/appCanvas/arrow/arrowSelectedState";
import { newArrowTwoSelectedState } from "./states/appCanvas/arrow/arrowTwoSelectedState";
import { newTrapezoidSelectedState } from "./states/appCanvas/trapezoid/trapezoidSelectedState";
import { newDocumentSymbolSelectedState } from "./states/appCanvas/documentSymbol/documentSymbolSelectedState";
import { newWaveSelectedState } from "./states/appCanvas/wave/waveSelectedState";
import { newParallelogramSelectedState } from "./states/appCanvas/parallelogram/parallelogramSelectedState";
import { newDiagonalCrossSelectedState } from "./states/appCanvas/cross/diagonalCrossSelectedState";
import { newCylinderSelectedState } from "./states/appCanvas/cylinder/cylinderSelectedState";
import { newBubbleSelectedState } from "./states/appCanvas/bubble/bubbleSelectedState";
import { newTreeRootSelectedState } from "./states/appCanvas/tree/treeRootSelectedState";
import { newTreeNodeSelectedState } from "./states/appCanvas/tree/treeNodeSelectedState";
import { newBoardEntitySelectedState } from "./states/appCanvas/board/boardEntitySelectedState";
import { newAlignBoxSelectedState } from "./states/appCanvas/align/alignBoxSelectedState";
import { newSingleSelectedState } from "./states/appCanvas/singleSelectedState";
import { newHexagonSelectedState } from "./states/appCanvas/hexagon/hexagonSelectedState";
import { newCapsuleSelectedState } from "./states/appCanvas/capsule/capsuleSelectedState";
import { newTriangleSelectedState } from "./states/appCanvas/triangle/triangleSelectedState";
import { newStarSelectedState } from "./states/appCanvas/star/starSelectedState";
import { newArcSelectedState } from "./states/appCanvas/arc/arcSelectedState";
import { newDonutSelectedState } from "./states/appCanvas/donut/donutSelectedState";
import { newMoonSelectedState } from "./states/appCanvas/moon/moonSelectedState";
import { newGroupSelectedState } from "./states/appCanvas/group/groupSelectedState";
import { newSpikyRectangleSelectedState } from "./states/appCanvas/spikyRectangle/spikyRectangleSelectedState";
import { newFrameSelectedState } from "./states/appCanvas/frame/frameSelectedState";
import { newCurlyBracketSelectedState } from "./states/appCanvas/brackets/curlyBracketSelectedState";
import { newBracketSelectedState } from "./states/appCanvas/brackets/bracketSelectedState";
import { newAngleBracketSelectedState } from "./states/appCanvas/brackets/angleBracketSelectedState";
import { newFrameAlignGroupSelectedState } from "./states/appCanvas/frameAlign/frameAlignGroupSelectedState";
import { newChevronSelectedState } from "./states/appCanvas/chevron/chevronSelectedState";
import { newRibbonSelectedState } from "./states/appCanvas/ribbon/ribbonSelectedState";
import { newVNNodeSelectedState } from "./states/appCanvas/vectorNetworks/vnNodeSelectedState";
import { newSheetImageSelectedState } from "./states/appCanvas/sheetImage/sheetImageSelectedState";
import { newGearSelectedState } from "./states/appCanvas/gear/gearSelectedState";

export type ShapeTypeItem = { type: string; icon: string };

export const shapeTypeList: ShapeTypeItem[] = [
  { type: "rectangle", icon: iconRectangle },
  { type: "rounded_rectangle", icon: iconRoundedRectangle },
  { type: "ellipse", icon: iconEllipse },
  { type: "triangle", icon: iconTriangle },
  { type: "trapezoid", icon: iconTrapezoid },
  { type: "parallelogram", icon: iconParallelogram },
  { type: "rhombus", icon: iconRhombus },
  { type: "hexagon", icon: iconHexagon },
  { type: "chevron", icon: iconChevron },
  { type: "ribbon", icon: iconRibbon },
  { type: "capsule", icon: iconCapsule },
  { type: "cylinder", icon: iconCylinder },
  { type: "document_symbol", icon: iconDocumentSymbol },
  { type: "star", icon: iconStar },
  { type: "gear", icon: iconGear },
  { type: "spiky_rectangle", icon: iconSpikyRectangle },
  { type: "bubble", icon: iconBubble },
  { type: "one_sided_arrow", icon: iconOneSidedArrow },
  { type: "two_sided_arrow", icon: iconTwoSidedArrow },
];

export const shapeWithoutTextTypeList: ShapeTypeItem[] = [
  { type: "cross", icon: iconCross },
  { type: "diagonal_cross", icon: iconDiagonalCross },
  { type: "donut", icon: iconDonut },
  { type: "arc", icon: iconDonutArc },
  { type: "bracket", icon: iconBracket },
  { type: "round_bracket", icon: iconRoundBracket },
  { type: "curly_bracket", icon: iconCurlyBracket },
  { type: "angle_bracket", icon: iconAngleBracket },
  { type: "moon", icon: iconMoon },
  { type: "wave", icon: iconWave },
];

export const lineTypeList: ShapeTypeItem[] = [
  { type: "straight", icon: iconLineStraight },
  { type: "curve", icon: iconLineCurve },
  { type: "elbow", icon: iconLineElbow },
  { type: "elbow_curve", icon: iconLineElbowCurve },
];

export const layoutTypeList: ShapeTypeItem[] = [
  { type: "align_box", icon: iconLayoutAlignBox },
  { type: "tree_root", icon: iconLayoutBranch },
  { type: "board_root", icon: iconLayoutBoard },
];

export function getSingleShapeSelectedStateFn(type: string) {
  switch (type) {
    case "group":
      return newGroupSelectedState;
    case "line":
      return newLineSelectedState;
    case "rounded_rectangle":
      return newRoundedRectangleSelectedState;
    case "arc":
      return newArcSelectedState;
    case "moon":
      return newMoonSelectedState;
    case "donut":
      return newDonutSelectedState;
    case "one_sided_arrow":
      return newArrowSelectedState;
    case "two_sided_arrow":
      return newArrowTwoSelectedState;
    case "trapezoid":
      return newTrapezoidSelectedState;
    case "hexagon":
      return newHexagonSelectedState;
    case "star":
      return newStarSelectedState;
    case "gear":
      return newGearSelectedState;
    case "spiky_rectangle":
      return newSpikyRectangleSelectedState;
    case "document_symbol":
      return newDocumentSymbolSelectedState;
    case "wave":
      return newWaveSelectedState;
    case "bracket":
    case "round_bracket":
      return newBracketSelectedState;
    case "angle_bracket":
      return newAngleBracketSelectedState;
    case "curly_bracket":
      return newCurlyBracketSelectedState;
    case "triangle":
      return newTriangleSelectedState;
    case "parallelogram":
      return newParallelogramSelectedState;
    case "capsule":
      return newCapsuleSelectedState;
    case "chevron":
      return newChevronSelectedState;
    case "ribbon":
      return newRibbonSelectedState;
    case "cross":
    case "diagonal_cross":
      return newDiagonalCrossSelectedState;
    case "cylinder":
      return newCylinderSelectedState;
    case "bubble":
      return newBubbleSelectedState;
    case "sheet_image":
      return newSheetImageSelectedState;
    case "tree_root":
      return newTreeRootSelectedState;
    case "tree_node":
      return newTreeNodeSelectedState;
    case "board_root":
    case "board_column":
    case "board_lane":
    case "board_card":
      return newBoardEntitySelectedState;
    case "align_box":
      return newAlignBoxSelectedState;
    case "vn_node":
      return newVNNodeSelectedState;
    case "frame":
      return newFrameSelectedState;
    case "frame_align_group":
      return newFrameAlignGroupSelectedState;
    default:
      return newSingleSelectedState;
  }
}

export function getShapeTypeList(type: string): ShapeTypeItem[] | undefined {
  if (shapeWithoutTextTypeList.find((t) => t.type === type)) return shapeWithoutTextTypeList;
  if (shapeTypeList.find((t) => t.type === type)) return shapeTypeList;
}
