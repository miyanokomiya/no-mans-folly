import { getRectCenter, IRectangle, IVec2, sub } from "okageo";
import {
  getTableCoordsLocations,
  getTableShapeInfo,
  TableCoords,
  TableShape,
  TableShapeInfo,
} from "../../../../shapes/table/table";
import { getRotateFn } from "../../../../utils/geometry";
import { AppCanvasState } from "../core";
import { handleShapeUpdate } from "../utils/shapeUpdatedEventHandlers";
import { newFuzzyDrag } from "../../../pointer";
import { TableSelectable } from "../../../tableSelectable";
import { renderHighlightCells, TableHandler } from "../../../shapeHandlers/tableHandler";
import { applyLocalSpace, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { generateNKeysBetweenAllowSame } from "../../../../utils/findex";
import { isChangedByMoveIndex } from "../../../../utils/commons";

interface Option {
  tableId: string;
  targetLines: string[];
  indexLine: string;
  tableSelectable: TableSelectable;
  type: "row" | "column";
  tableHandler: TableHandler;
}

export function newMovingTableLineState(option: Option): AppCanvasState {
  const fuzzyDrag = newFuzzyDrag();
  const tableHandler = option.tableHandler;
  const isRow = option.type === "row";
  let table: TableShape;
  let localSpace: [IRectangle, number];
  let moveToIndex: number | undefined;
  let tableInfo: TableShapeInfo;
  let coordsLocations: { rows: number[]; columns: number[] };
  let diff: IVec2 | undefined;
  let completed = false;

  return {
    getLabel: () => "MovingTableLine",
    onStart: (ctx) => {
      ctx.startDragging();
      fuzzyDrag.onDown(Date.now());
      const shapeComposite = ctx.getShapeComposite();
      table = shapeComposite.shapeMap[option.tableId] as TableShape;
      localSpace = shapeComposite.getLocalSpace(table);
      const ti = getTableShapeInfo(table);
      if (!ti) return ctx.states.newSelectionHubState;

      tableInfo = ti;
      coordsLocations = getTableCoordsLocations(tableInfo);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          fuzzyDrag.onMove(Date.now(), event.data);
          if (!fuzzyDrag.isDragging()) return;

          const rotateFn = getRotateFn(localSpace[1], getRectCenter(localSpace[0]));
          const adjustedP = sub(rotateFn(event.data.current, true), table.p);
          const adjustedStart = sub(rotateFn(event.data.start, true), table.p);
          diff = sub(adjustedP, adjustedStart);

          // Pick the line whose area covers the point
          const [value, lines] = isRow ? [adjustedP.y, coordsLocations.rows] : [adjustedP.x, coordsLocations.columns];
          moveToIndex = lines.findIndex((v) => value < v);
          if (moveToIndex < 0) moveToIndex = lines.length - 1;

          // Pick the closer line to the point
          if (1 <= moveToIndex) {
            const from = lines[moveToIndex - 1];
            const to = lines[moveToIndex];
            const c = (to - from) / 2;
            moveToIndex = value - from < c ? moveToIndex - 1 : moveToIndex;
          }

          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (fuzzyDrag.onUp(Date.now())) {
            // Handle selection
            if (isRow) {
              option.tableSelectable.selectRow(option.indexLine, event.data.options.ctrl);
            } else {
              option.tableSelectable.selectColumn(option.indexLine, event.data.options.ctrl);
            }
          } else if (moveToIndex !== undefined) {
            // Move lines
            const lines = isRow ? tableInfo.rows : tableInfo.columns;
            const moveToPrev = moveToIndex <= 0 ? undefined : lines[moveToIndex - 1];
            const moveToNext = lines.length <= moveToIndex ? undefined : lines[moveToIndex];
            const targetSet = new Set(option.targetLines);
            const srcLines = lines.filter((l) => targetSet.has(l.id));
            const srcIndexList: number[] = [];
            lines.forEach((l, i) => {
              if (targetSet.has(l.id)) {
                srcIndexList.push(i);
              }
            });

            if (isChangedByMoveIndex(srcIndexList, moveToIndex)) {
              const findexList = generateNKeysBetweenAllowSame(moveToPrev?.findex, moveToNext?.findex, srcLines.length);
              const patch: Partial<TableShape> = {};
              srcLines.forEach((l: any, i) => {
                patch[l.id] = { ...l, findex: findexList[i] };
              });
              completed = true;
              ctx.updateShapes({ update: { [table.id]: patch } });
            }
          }

          return { type: "break" };
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          // Avoid resetting the selected state after this state updates the target
          if (completed) return;
          return handleShapeUpdate(ctx, event, [option.tableId]);
        }
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      tableHandler.render(renderCtx, style, scale);
      applyLocalSpace(renderCtx, localSpace[0], localSpace[1], () => {
        const targetCells: TableCoords[] = [];
        if (isRow) {
          option.targetLines.forEach((line) => {
            tableInfo.columns.forEach((op) => targetCells.push([line as any, op.id]));
          });
        } else {
          option.targetLines.forEach((line) => {
            tableInfo.rows.forEach((op) => targetCells.push([op.id, line as any]));
          });
        }
        renderHighlightCells(renderCtx, style, tableInfo, targetCells);

        if (moveToIndex !== undefined) {
          const index = moveToIndex;
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 4 * scale });
          renderCtx.beginPath();
          if (isRow) {
            const y = coordsLocations.rows[index];
            renderCtx.moveTo(0, y);
            renderCtx.lineTo(localSpace[0].width, y);
          } else {
            const x = coordsLocations.columns[index];
            renderCtx.moveTo(x, 0);
            renderCtx.lineTo(x, localSpace[0].height);
          }
          renderCtx.stroke();

          const hitResult = tableHandler.retrieveHitResult();
          if (diff && (hitResult?.type === "head-row" || hitResult?.type === "head-column")) {
            const [x, y] = isRow
              ? [hitResult.rect.x, hitResult.rect.y + diff.y]
              : [hitResult.rect.x + diff.x, hitResult.rect.y];
            const { width, height } = hitResult.rect;
            scaleGlobalAlpha(renderCtx, 0.5, () => {
              applyFillStyle(renderCtx, { color: style.selectionSecondaly });
              renderCtx.beginPath();
              renderCtx.rect(x, y, width, height);
              renderCtx.fill();
            });
          }
        }
      });
    },
  };
}
