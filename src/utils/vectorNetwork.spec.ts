import { describe, test, expect } from "vitest";
import {
  newRawVectorNetwork,
  findClosedVnAreaCoveringPoints,
  RawVnNode,
  RawVnEdge,
  findVnClosedLoops,
} from "./vectorNetwork";

describe("findVnClosedLoops", () => {
  const nodes = new Map<string, RawVnNode>([
    ["1", { id: "1", position: { x: 0, y: 0 } }],
    ["2", { id: "2", position: { x: 1, y: 0 } }],
    ["3", { id: "3", position: { x: 1, y: 1 } }],
    ["4", { id: "4", position: { x: 0, y: 1 } }],
    ["5", { id: "5", position: { x: 2, y: 1 } }],
    ["6", { id: "6", position: { x: 2, y: 2 } }],
  ]);
  const edges = new Map<string, RawVnEdge>([
    ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
    ["2-3", { id: "2-3", nodes: [nodes.get("2")!, nodes.get("3")!] }],
    ["3-4", { id: "3-4", nodes: [nodes.get("3")!, nodes.get("4")!] }],
    ["4-1", { id: "4-1", nodes: [nodes.get("4")!, nodes.get("1")!] }],
    ["4-5", { id: "4-5", nodes: [nodes.get("4")!, nodes.get("5")!] }],
    ["5-6", { id: "5-4", nodes: [nodes.get("5")!, nodes.get("6")!] }],
    ["4-6", { id: "4-6", nodes: [nodes.get("4")!, nodes.get("6")!] }],
  ]);

  test("should return all unique loops", () => {
    const network = newRawVectorNetwork({ nodes, edges });
    expect(findVnClosedLoops(network)).toHaveLength(2);
  });

  test("should reverse each edge when it's used reversely", () => {
    const edges = new Map<string, RawVnEdge>([
      ["1-3", { id: "1-3", nodes: [nodes.get("1")!, nodes.get("3")!] }],
      ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
      [
        "2-3",
        { id: "2-3", nodes: [nodes.get("2")!, nodes.get("3")!], curve: { c1: { x: 1, y: 2 }, c2: { x: 3, y: 4 } } },
      ],
    ]);
    const network = newRawVectorNetwork({ nodes, edges });
    const result0 = findVnClosedLoops(network);
    const target = result0[0].edges.find(({ id }) => id === "2-3")!;
    expect(target.nodes).toEqual([nodes.get("3"), nodes.get("2")]);
    expect(target.curve).toEqual({ c1: { x: 3, y: 4 }, c2: { x: 1, y: 2 } });
  });
});

describe("findClosedVnAreaCoveringPoint", () => {
  const nodes = new Map<string, RawVnNode>([
    ["1", { id: "1", position: { x: 0, y: 0 } }],
    ["2", { id: "2", position: { x: 1, y: 0 } }],
    ["3", { id: "3", position: { x: 1, y: 1 } }],
    ["4", { id: "4", position: { x: 0, y: 1 } }],
    ["5", { id: "5", position: { x: 2, y: 1 } }],
    ["6", { id: "6", position: { x: 2, y: 2 } }],
  ]);
  const edges = new Map<string, RawVnEdge>([
    ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
    ["2-3", { id: "2-3", nodes: [nodes.get("2")!, nodes.get("3")!] }],
    ["3-4", { id: "3-4", nodes: [nodes.get("3")!, nodes.get("4")!] }],
    ["4-1", { id: "4-1", nodes: [nodes.get("4")!, nodes.get("1")!] }],
    ["4-5", { id: "4-5", nodes: [nodes.get("4")!, nodes.get("5")!] }],
    ["5-6", { id: "5-4", nodes: [nodes.get("5")!, nodes.get("6")!] }],
    ["4-6", { id: "4-6", nodes: [nodes.get("4")!, nodes.get("6")!] }],
  ]);

  test("should return undefined if no loops cover the point", () => {
    const network = newRawVectorNetwork({ nodes, edges });
    expect(findClosedVnAreaCoveringPoints(network, [{ x: 2, y: 3 }])).toBeUndefined();
  });

  test("should return the loop covering the point", () => {
    const network = newRawVectorNetwork({ nodes, edges });
    const result1 = findClosedVnAreaCoveringPoints(network, [{ x: 0.5, y: 0.5 }]);
    expect(result1?.nodes.length).toBe(5);
    expect(result1?.edges.length).toBe(4);
    const result2 = findClosedVnAreaCoveringPoints(network, [{ x: 1.5, y: 1.2 }]);
    expect(result2?.nodes.length).toBe(4);
    expect(result2?.edges.length).toBe(3);
  });

  test("should return the smallest one when there're multiple candidates", () => {
    const nodes = new Map<string, RawVnNode>([
      ["2.1", { id: "2.1", position: { x: 3, y: 0 } }],
      ["3.1", { id: "3.1", position: { x: 3, y: 3 } }],
      ["4.1", { id: "4.1", position: { x: 0, y: 3 } }],
      ["1", { id: "1", position: { x: 0, y: 0 } }],
      ["2", { id: "2", position: { x: 1, y: 0 } }],
      ["3", { id: "3", position: { x: 1, y: 1 } }],
      ["4", { id: "4", position: { x: 0, y: 1 } }],
      ["2.2", { id: "2.2", position: { x: 2, y: 0 } }],
      ["3.2", { id: "3.2", position: { x: 2, y: 2 } }],
      ["4.2", { id: "4.2", position: { x: 0, y: 2 } }],
    ]);
    const edges = new Map<string, RawVnEdge>([
      ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
      ["2-3", { id: "2-3", nodes: [nodes.get("2")!, nodes.get("3")!] }],
      ["3-4", { id: "3-4", nodes: [nodes.get("3")!, nodes.get("4")!] }],
      ["4-1", { id: "4-1", nodes: [nodes.get("4")!, nodes.get("1")!] }],
      ["1-2.1", { id: "1-2.1", nodes: [nodes.get("1")!, nodes.get("2.1")!] }],
      ["2.1-3.1", { id: "2.1-3.1", nodes: [nodes.get("2.1")!, nodes.get("3.1")!] }],
      ["3.1-4.1", { id: "3.1-4.1", nodes: [nodes.get("3.1")!, nodes.get("4.1")!] }],
      ["4.1-1", { id: "4.1-1", nodes: [nodes.get("4.1")!, nodes.get("1")!] }],
      ["1-2.2", { id: "1-2.2", nodes: [nodes.get("1")!, nodes.get("2.2")!] }],
      ["2.2-3.2", { id: "2.2-3.2", nodes: [nodes.get("2.2")!, nodes.get("3.2")!] }],
      ["3.2-4.2", { id: "3.2-4.2", nodes: [nodes.get("3.2")!, nodes.get("4.2")!] }],
      ["4.2-1", { id: "4.2-1", nodes: [nodes.get("4.2")!, nodes.get("1")!] }],
    ]);

    const network = newRawVectorNetwork({ nodes, edges });
    const result1 = findClosedVnAreaCoveringPoints(network, [{ x: 0.5, y: 0.5 }]);
    expect(result1?.id).toBe("1,2,3,4");
  });

  test("should return the smallest one convering all points", () => {
    const nodes = new Map<string, RawVnNode>([
      ["1", { id: "1", position: { x: 0, y: 0 } }],
      ["2", { id: "2", position: { x: 1, y: 0 } }],
      ["3", { id: "3", position: { x: 1, y: 1 } }],
      ["4", { id: "4", position: { x: 0, y: 1 } }],
      ["5", { id: "5", position: { x: 2, y: 1 } }],
      ["6", { id: "6", position: { x: 2, y: 0 } }],
    ]);
    const edges = new Map<string, RawVnEdge>([
      ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
      ["2-3", { id: "2-3", nodes: [nodes.get("2")!, nodes.get("3")!] }],
      ["3-4", { id: "3-4", nodes: [nodes.get("3")!, nodes.get("4")!] }],
      ["4-1", { id: "4-1", nodes: [nodes.get("4")!, nodes.get("1")!] }],
      ["3-5", { id: "3-5", nodes: [nodes.get("3")!, nodes.get("5")!] }],
      ["5-6", { id: "5-6", nodes: [nodes.get("5")!, nodes.get("6")!] }],
      ["6-2", { id: "6-2", nodes: [nodes.get("6")!, nodes.get("2")!] }],
    ]);
    const network = newRawVectorNetwork({ nodes, edges });
    const result1 = findClosedVnAreaCoveringPoints(network, [{ x: 0.5, y: 0.5 }]);
    expect(result1?.id).toBe("1,2,3,4");
    const result2 = findClosedVnAreaCoveringPoints(network, [
      { x: 0.5, y: 0.5 },
      { x: 1.5, y: 0.5 },
    ]);
    expect(result2?.id).toBe("1,2,3,4,5,6");
    const result3 = findClosedVnAreaCoveringPoints(network, []);
    expect(result3?.id).toBe(undefined);
  });

  test("should accept area consists of two nodes when any edge is curved", () => {
    const nodes = new Map<string, RawVnNode>([
      ["1", { id: "1", position: { x: 0, y: 0 } }],
      ["2", { id: "2", position: { x: 1, y: 0 } }],
      ["3", { id: "3", position: { x: 0, y: 1 } }],
    ]);
    const edges = new Map<string, RawVnEdge>([
      ["1-2", { id: "1-2", nodes: [nodes.get("1")!, nodes.get("2")!] }],
      ["2-1", { id: "2-1", nodes: [nodes.get("2")!, nodes.get("1")!] }],
      ["1-3", { id: "1-3", nodes: [nodes.get("1")!, nodes.get("3")!], curve: { d: { x: 0, y: 1 } } }],
      ["3-1", { id: "3-1", nodes: [nodes.get("3")!, nodes.get("1")!] }],
    ]);

    const network = newRawVectorNetwork({ nodes, edges });
    const result1 = findClosedVnAreaCoveringPoints(network, [{ x: 0.5, y: 0 }]);
    expect(result1).toBe(undefined);
    const result2 = findClosedVnAreaCoveringPoints(network, [{ x: -0.1, y: 0.5 }]);
    expect(result2?.id).toBe("1,3");
  });
});
