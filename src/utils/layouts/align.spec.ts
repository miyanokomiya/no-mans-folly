import { describe, test, expect } from "vitest";
import { AlignLayoutNode, getAlignRectMap, getAlignRelativeRectMap } from "./align";
import { getTree } from "../tree";

const box0: AlignLayoutNode = {
  id: "box0",
  findex: "a",
  parentId: "",
  rect: { x: 0, y: 0, width: 10, height: 200 },
  type: "box",
  direction: 0,
  gap: 10,
};
const entity0: AlignLayoutNode = {
  id: "entity0",
  findex: "a",
  parentId: "box0",
  rect: { x: 0, y: 10, width: 20, height: 30 },
  type: "entity",
};
const entity1: AlignLayoutNode = {
  id: "entity1",
  findex: "b",
  parentId: "box0",
  rect: { x: 0, y: 0, width: 20, height: 30 },
  type: "entity",
};

const box10: AlignLayoutNode = {
  id: "box10",
  findex: "a10",
  parentId: "",
  rect: { x: 0, y: 0, width: 10, height: 100 },
  type: "box",
  direction: 0,
  gap: 10,
};
const entity10: AlignLayoutNode = {
  id: "entity10",
  findex: "a",
  parentId: box10.id,
  rect: { x: 0, y: 10, width: 20, height: 30 },
  type: "entity",
};
const entity11: AlignLayoutNode = {
  id: "entity11",
  findex: "b",
  parentId: box10.id,
  rect: { x: 0, y: 0, width: 20, height: 30 },
  type: "entity",
};

describe("getAlignRectMap", () => {
  test("should return absolete aligned rects: vertical & nested box", () => {
    const nodes = [box0, entity0, { ...box10, parentId: box0.id }, entity10, entity11, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["box10", { x: 0, y: 40, width: 20, height: 100 }],
        ["entity10", { x: 0, y: 40, width: 20, height: 30 }],
        ["entity11", { x: 0, y: 80, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 150, width: 20, height: 30 }],
      ]),
    );
  });
});

describe("getAlignRelativeRectMap", () => {
  test("should return relative aligned rects: vertical", () => {
    const nodes = [box0, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 40, width: 20, height: 30 }],
      ]),
    );
  });

  test("should return relative aligned rects: vertical & line break", () => {
    const nodes = [{ ...box0, rect: { x: 0, y: 0, width: 10, height: 50 } }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 50 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should return relative aligned rects: vertical & nested box", () => {
    const nodes = [box0, entity0, { ...box10, parentId: box0.id }, entity10, entity11, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["box10", { x: 0, y: 40, width: 20, height: 100 }],
        ["entity10", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity11", { x: 0, y: 40, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 150, width: 20, height: 30 }],
      ]),
    );
  });
});
