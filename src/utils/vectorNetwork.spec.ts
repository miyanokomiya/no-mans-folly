import { describe, test, expect } from "vitest";
import {
  newRawVectorNetwork,
  findClosedVnAreaCoveringPoint,
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
    expect(findClosedVnAreaCoveringPoint(network, { x: 2, y: 3 })).toBeUndefined();
  });

  test("should return the loop covering the point", () => {
    const network = newRawVectorNetwork({ nodes, edges });
    const result1 = findClosedVnAreaCoveringPoint(network, { x: 0.5, y: 0.5 });
    expect(result1?.nodes.length).toBe(5);
    expect(result1?.edges.length).toBe(4);
    const result2 = findClosedVnAreaCoveringPoint(network, { x: 1.5, y: 1.2 });
    expect(result2?.nodes.length).toBe(4);
    expect(result2?.edges.length).toBe(3);
  });
});
