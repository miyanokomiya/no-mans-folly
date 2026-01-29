import { describe, test, expect } from "vitest";
import { getPatchInfoByDuplicateColumns, getPatchInfoByDuplicateRows } from "./tableDuplicator";
import { generateTable } from "../../shapes/table/table";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { generateTableMeta } from "./tableHandler";

describe("getPatchInfoByDuplicateRows", () => {
  test("should duplicate rows: with children", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 }, { id: "table", findex: "a0" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: table.id,
      parentMeta: generateTableMeta(["r_0", "c_0"]),
      findex: "a1",
    });
    const shapeComposite = newShapeComposite({
      shapes: [table, child0],
      getStruct: getCommonStruct,
    });
    let count = 0;
    const generateUuid = () => `id_${count++}`;
    const result = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_0", "r_1"]);
    expect(result?.patch).toEqual({
      add: [{ ...child0, id: "id_2", findex: "a2", parentMeta: generateTableMeta(["r_id_0", "c_0"]) }],
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a1F",
            id: "r_id_0",
            size: 10,
          },
          r_id_1: {
            findex: "a1V",
            id: "r_id_1",
            size: 10,
          },
        },
      },
    });
  });

  test("should duplicate rows: with style", () => {
    const table = generateTable(6, 3, { width: 20, height: 10 }, { id: "table", findex: "a0" });
    table.r_0!.size = 10;
    table.r_1!.size = 11;
    table.r_2!.size = 12;
    table.r_3!.size = 13;
    table.r_4!.size = 14;
    table.r_5!.size = 15;
    table.s_0 = { id: "s_0", a: ["r_2", "c_0"], b: ["r_3", "c_0"] };
    const shapeComposite = newShapeComposite({
      shapes: [table],
      getStruct: getCommonStruct,
    });
    let count = 0;
    const generateUuid = () => `id_${count++}`;
    const result01 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_0", "r_1"]);
    expect(result01?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a1F",
            id: "r_id_0",
            size: 10,
          },
          r_id_1: {
            findex: "a1V",
            id: "r_id_1",
            size: 11,
          },
        },
      },
    });

    count = 0;
    const result12 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_1", "r_2"]);
    expect(result12?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a2F",
            id: "r_id_0",
            size: 11,
          },
          r_id_1: {
            findex: "a2V",
            id: "r_id_1",
            size: 12,
          },
          s_id_2: {
            a: ["r_id_1", "c_0"],
            b: ["r_id_1", "c_0"],
            id: "s_id_2",
          },
        },
      },
    });

    count = 0;
    const result23 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_2", "r_3"]);
    expect(result23?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a3F",
            id: "r_id_0",
            size: 12,
          },
          r_id_1: {
            findex: "a3V",
            id: "r_id_1",
            size: 13,
          },
          s_id_2: {
            a: ["r_id_0", "c_0"],
            b: ["r_id_1", "c_0"],
            id: "s_id_2",
          },
        },
      },
    });

    count = 0;
    const result34 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_3", "r_4"]);
    expect(result34?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a4F",
            id: "r_id_0",
            size: 13,
          },
          r_id_1: {
            findex: "a4V",
            id: "r_id_1",
            size: 14,
          },
          s_id_2: {
            a: ["r_id_0", "c_0"],
            b: ["r_id_0", "c_0"],
            id: "s_id_2",
          },
        },
      },
    });

    count = 0;
    const result45 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_4", "r_5"]);
    expect(result45?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a6",
            id: "r_id_0",
            size: 14,
          },
          r_id_1: {
            findex: "a7",
            id: "r_id_1",
            size: 15,
          },
        },
      },
    });
  });

  test("should duplicate rows: with merge", () => {
    const table = generateTable(6, 3, { width: 20, height: 10 }, { id: "table", findex: "a0" });
    table.r_0!.size = 10;
    table.r_1!.size = 11;
    table.r_2!.size = 12;
    table.r_3!.size = 13;
    table.r_4!.size = 14;
    table.r_5!.size = 15;
    table.m_0 = { id: "m_0", a: ["r_2", "c_0"], b: ["r_3", "c_0"] };
    const shapeComposite = newShapeComposite({
      shapes: [table],
      getStruct: getCommonStruct,
    });
    let count = 0;
    const generateUuid = () => `id_${count++}`;
    const result01 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_0", "r_1"]);
    expect(result01?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a1F",
            id: "r_id_0",
            size: 10,
          },
          r_id_1: {
            findex: "a1V",
            id: "r_id_1",
            size: 11,
          },
        },
      },
    });

    count = 0;
    const result12 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_1", "r_2"]);
    expect(result12?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a2F",
            id: "r_id_0",
            size: 11,
          },
          r_id_1: {
            findex: "a2V",
            id: "r_id_1",
            size: 12,
          },
        },
      },
    });

    count = 0;
    const result23 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_2", "r_3"]);
    expect(result23?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a3F",
            id: "r_id_0",
            size: 12,
          },
          r_id_1: {
            findex: "a3V",
            id: "r_id_1",
            size: 13,
          },
          m_id_2: {
            a: ["r_id_0", "c_0"],
            b: ["r_id_1", "c_0"],
            id: "m_id_2",
          },
        },
      },
    });

    count = 0;
    const result34 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_3", "r_4"]);
    expect(result34?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a4F",
            id: "r_id_0",
            size: 13,
          },
          r_id_1: {
            findex: "a4V",
            id: "r_id_1",
            size: 14,
          },
        },
      },
    });

    count = 0;
    const result45 = getPatchInfoByDuplicateRows(shapeComposite, [], generateUuid, table, ["r_4", "r_5"]);
    expect(result45?.patch).toEqual({
      update: {
        [table.id]: {
          r_id_0: {
            findex: "a6",
            id: "r_id_0",
            size: 14,
          },
          r_id_1: {
            findex: "a7",
            id: "r_id_1",
            size: 15,
          },
        },
      },
    });
  });
});

describe("getPatchInfoByDuplicateColumns", () => {
  test("should duplicate rows: with children", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 }, { id: "table", findex: "a0" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: table.id,
      parentMeta: generateTableMeta(["r_0", "c_0"]),
      findex: "a1",
    });
    const shapeComposite = newShapeComposite({
      shapes: [table, child0],
      getStruct: getCommonStruct,
    });
    let count = 0;
    const generateUuid = () => `id_${count++}`;
    const result = getPatchInfoByDuplicateColumns(shapeComposite, [], generateUuid, table, ["c_0", "c_1"]);
    expect(result?.patch).toEqual({
      add: [{ ...child0, id: "id_2", findex: "a2", parentMeta: generateTableMeta(["r_0", "c_id_0"]) }],
      update: {
        [table.id]: {
          c_id_0: {
            findex: "a1F",
            id: "c_id_0",
            size: 20,
          },
          c_id_1: {
            findex: "a1V",
            id: "c_id_1",
            size: 20,
          },
        },
      },
    });
  });
});
