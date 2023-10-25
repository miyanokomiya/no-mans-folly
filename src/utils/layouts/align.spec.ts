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
  gapC: 10,
  gapR: 10,
  baseHeight: 200,
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
  gapC: 10,
  gapR: 10,
  baseHeight: 100,
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
    const nodes = [
      { ...box0, rect: { ...box0.rect, x: 1, y: 2 } },
      entity0,
      { ...box10, parentId: box0.id },
      entity10,
      entity11,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 1, y: 2, width: 20, height: 200 }],
        ["entity0", { x: 1, y: 2, width: 20, height: 30 }],
        ["box10", { x: 1, y: 42, width: 20, height: 100 }],
        ["entity10", { x: 1, y: 42, width: 20, height: 30 }],
        ["entity11", { x: 1, y: 82, width: 20, height: 30 }],
        ["entity1", { x: 1, y: 152, width: 20, height: 30 }],
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
    const nodes = [{ ...box0, rect: { x: 0, y: 0, width: 10, height: 50 }, baseHeight: 50 }, entity0, entity1];
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

  test("should return relative aligned rects: vertical & line break & oversized node", () => {
    const nodes = [{ ...box0, rect: { x: 0, y: 0, width: 10, height: 20 }, baseHeight: 20 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 30 }],
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

  test("should return relative aligned rects: vertical & line break & nested box", () => {
    const nodes = [
      { ...box0, rect: { x: 0, y: 0, width: 10, height: 100 }, baseHeight: 100 },
      entity0,
      entity1,
      { ...box10, parentId: box0.id, rect: { x: 0, y: 0, width: 10, height: 50 }, baseHeight: 50 },
      entity10,
      entity11,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 80, height: 100 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 40, width: 20, height: 30 }],
        ["box10", { x: 30, y: 0, width: 50, height: 50 }],
        ["entity10", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity11", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should return relative aligned rects: vertical & line break & nested box 2", () => {
    const nodes = [
      { ...box0, rect: { x: 0, y: 0, width: 10, height: 50 }, baseHeight: 50 },
      entity0,
      entity1,
      { ...box10, parentId: box0.id, rect: { x: 0, y: 0, width: 10, height: 50 }, baseHeight: 50 },
      entity10,
      entity11,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 110, height: 50 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
        ["box10", { x: 60, y: 0, width: 50, height: 50 }],
        ["entity10", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity11", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should return relative aligned rects: horizontal & line break & nested box 2", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, rect: { x: 0, y: 0, width: 50, height: 10 }, baseWidth: 50, baseHeight: 10, direction: 1 },
      { ...entity0, rect: { x: 10, y: 0, width: 30, height: 20 } },
      { ...entity1, rect: { x: 0, y: 0, width: 30, height: 20 } },
      {
        ...box10,
        parentId: box0.id,
        rect: { x: 0, y: 0, width: 50, height: 10 },
        baseWidth: 50,
        baseHeight: 10,
        direction: 1,
      },
      { ...entity10, rect: { x: 10, y: 0, width: 30, height: 20 } },
      { ...entity11, rect: { x: 0, y: 0, width: 30, height: 20 } },
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 110 }],
        ["entity0", { x: 0, y: 0, width: 30, height: 20 }],
        ["entity1", { x: 0, y: 30, width: 30, height: 20 }],
        ["box10", { x: 0, y: 60, width: 50, height: 50 }],
        ["entity10", { x: 0, y: 0, width: 30, height: 20 }],
        ["entity11", { x: 0, y: 30, width: 30, height: 20 }],
      ]),
    );
  });

  test("should take care of baseWidth: vertical & small baseWidth => should expand up to the content", () => {
    const nodes = [{ ...box0, baseWidth: 10 }, entity0, entity1];
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

  test("should take care of baseWidth: vertical & big baseWidth => should not shrink down from the size", () => {
    const nodes = [{ ...box0, baseWidth: 100 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 100, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 40, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseHeight: vertical & small baseHeight => should expand up to the size", () => {
    const nodes = [{ ...box0, baseHeight: 10 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 70 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 40, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseHeight: vertical & big baseHeight => should not shrink down from the size", () => {
    const nodes = [{ ...box0, baseHeight: 100 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 100 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 40, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseHeight: horizontal & small baseHeight => should expand up to the content", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, direction: 1, rect: { x: 0, y: 0, width: 100, height: 10 }, baseHeight: 10 },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 30 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseHeight: horizontal & big baseHeight => should not shrink down from the size", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, direction: 1, rect: { x: 0, y: 0, width: 100, height: 10 }, baseHeight: 100 },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 100 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseWidth: horizontal & small baseWidth => should expand up to the content", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, direction: 1, rect: { x: 0, y: 0, width: 100, height: 10 }, baseWidth: 10 },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of baseWidth: horizontal & big baseWidth => should not shrink down from the content", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, direction: 1, rect: { x: 0, y: 0, width: 100, height: 10 }, baseWidth: 100 },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 100, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 30, y: 0, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of padding: vertical", () => {
    const nodes: AlignLayoutNode[] = [{ ...box0, padding: [1, 2, 3, 4] }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 26, height: 200 }],
        ["entity0", { x: 4, y: 1, width: 20, height: 30 }],
        ["entity1", { x: 4, y: 41, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of padding: vertical & line break", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, rect: { x: 0, y: 0, width: 10, height: 50 }, baseHeight: 50, padding: [1, 2, 3, 4] },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 56, height: 50 }],
        ["entity0", { x: 4, y: 1, width: 20, height: 30 }],
        ["entity1", { x: 34, y: 1, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of padding: horizontal", () => {
    const nodes: AlignLayoutNode[] = [
      { ...box0, direction: 1, baseHeight: undefined, padding: [1, 2, 3, 4] },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 56, height: 34 }],
        ["entity0", { x: 4, y: 1, width: 20, height: 30 }],
        ["entity1", { x: 34, y: 1, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of padding: horizontal & line break", () => {
    const nodes: AlignLayoutNode[] = [
      {
        ...box0,
        rect: { x: 0, y: 0, width: 50, height: 10 },
        baseWidth: 50,
        direction: 1,
        baseHeight: undefined,
        padding: [1, 2, 3, 4],
      },
      entity0,
      entity1,
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 50, height: 74 }],
        ["entity0", { x: 4, y: 1, width: 20, height: 30 }],
        ["entity1", { x: 4, y: 41, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of gapR: vertical", () => {
    const nodes: AlignLayoutNode[] = [{ ...box0, gapR: 1 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 20, height: 200 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 0, y: 31, width: 20, height: 30 }],
      ]),
    );
  });

  test("should take care of gapC: horizontal", () => {
    const nodes: AlignLayoutNode[] = [{ ...box0, direction: 1, baseHeight: undefined, gapC: 1 }, entity0, entity1];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result0 = getAlignRelativeRectMap(nodeMap, getTree(nodes));
    expect(result0).toEqual(
      new Map([
        ["box0", { x: 0, y: 0, width: 41, height: 30 }],
        ["entity0", { x: 0, y: 0, width: 20, height: 30 }],
        ["entity1", { x: 21, y: 0, width: 20, height: 30 }],
      ]),
    );
  });
});
