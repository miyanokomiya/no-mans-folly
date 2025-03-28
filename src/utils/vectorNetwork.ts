import { getArea, isOnPolygon, IVec2 } from "okageo";
import { CurveControl } from "../models";
import { getApproxCurvePoints } from "./geometry";
import { reverseCurveControl } from "./path";
import { pickMinItem } from "./commons";

export interface RawVnNode {
  id: string;
  position: IVec2;
}

export interface RawVnEdge {
  id: string;
  nodes: [RawVnNode, RawVnNode];
  curve?: CurveControl;
}

/**
 * The path is always manually closed: i.e. nodes.at(0) === nodes.at(-1)
 */
export interface RawVnLoop {
  id: string;
  nodes: RawVnNode[];
  edges: RawVnEdge[];
}

type VectorNetworkOption = {
  nodes: Map<string, RawVnNode>;
  edges: Map<string, RawVnEdge>;
};

export function newRawVectorNetwork(option: VectorNetworkOption) {
  const nodes = option.nodes;
  const edges = option.edges;

  return {
    nodes,
    edges,
    getNode(id: string): RawVnNode | undefined {
      return nodes.get(id);
    },
    getEdge(id: string): RawVnEdge | undefined {
      return edges.get(id);
    },
    getEdgesForNode(node: RawVnNode): RawVnEdge[] {
      return Array.from(edges.values()).filter((edge) => edge.nodes.includes(node));
    },
    getEdgeForNodes(node1: RawVnNode, node2: RawVnNode): RawVnEdge | undefined {
      return Array.from(edges.values()).find((edge) => edge.nodes.includes(node1) && edge.nodes.includes(node2));
    },
  };
}
export type RawVectorNetwork = ReturnType<typeof newRawVectorNetwork>;

export function findVnClosedLoops(network: RawVectorNetwork): RawVnLoop[] {
  const exhausted = new Set<string>();
  const visited = new Set<string>();
  const loops: RawVnLoop[] = [];
  const uniqueLoops = new Set<string>();

  function dfs(
    node: RawVnNode,
    nodePath: RawVnNode[],
    // Edges in this array arean't always the same instances as the original ones.
    // When the edge is used reversely, new instance is created to present the reversed edge.
    edgePath: RawVnEdge[],
    // Original instance of the previous edge.
    prevEdgeSrc: RawVnEdge | undefined,
    startNode: RawVnNode,
  ): void {
    if (visited.has(node.id)) {
      if (node !== startNode) return;
      // When there's a curve, the number of nodes in the loop can be less than 3.
      if (nodePath.length < 3 && !edgePath.some((edge) => edge.curve)) return;

      const loopId = edgePath
        .map((n) => n.id)
        .sort()
        .join(",");
      // This check is essential to omit the same loop with different direction.
      if (uniqueLoops.has(loopId)) return;

      uniqueLoops.add(loopId);
      loops.push({ id: loopId, nodes: [...nodePath, node], edges: edgePath.concat() });
      return;
    }

    visited.add(node.id);
    nodePath.push(node);

    const edges = network.getEdgesForNode(node);
    for (const edge of edges) {
      // Avoid returning to the previous edge
      if (edge === prevEdgeSrc) continue;

      const nextNode = edge.nodes[0] === node ? edge.nodes[1] : edge.nodes[0];
      if (exhausted.has(nextNode.id)) continue;

      const nextEdge =
        edge.nodes[0] === node
          ? edge
          : ({ id: edge.id, nodes: edge.nodes.toReversed(), curve: reverseCurveControl(edge.curve) } as RawVnEdge);
      edgePath.push(nextEdge);
      dfs(nextNode, nodePath, edgePath, edge, startNode);
      edgePath.pop();
    }

    nodePath.pop();
    visited.delete(node.id);
  }

  for (const node of network.nodes.values()) {
    dfs(node, [], [], undefined, node);
    exhausted.add(node.id);
  }

  return loops;
}

export function findClosedVnAreaCoveringPoints(
  network: RawVectorNetwork,
  points: IVec2[],
  largest = false,
): RawVnLoop | undefined {
  const loops = findVnClosedLoops(network);
  return (largest ? findLargestLoopCoveringPoints : findSmallestLoopCoveringPoints)(loops, points);
}

export function findSmallestLoopCoveringPoints(loops: RawVnLoop[], points: IVec2[]): RawVnLoop | undefined {
  return pickMinItem(findLoopsCoveringPoints(loops, points), ([, area]) => area)?.[0];
}

export function findLargestLoopCoveringPoints(loops: RawVnLoop[], points: IVec2[]): RawVnLoop | undefined {
  return pickMinItem(findLoopsCoveringPoints(loops, points), ([, area]) => -area)?.[0];
}

function findLoopsCoveringPoints(loops: RawVnLoop[], points: IVec2[]): [RawVnLoop, area: number][] {
  if (loops.length === 0 || points.length === 0) return [];

  const candidates: [RawVnLoop, area: number][] = [];
  for (const loop of loops) {
    const polygon = getApproxCurvePoints(
      loop.nodes.map((node) => node.position),
      loop.edges.map((edge) => edge.curve),
    );
    if (points.every((point) => isOnPolygon(point, polygon))) {
      const area = getArea(polygon);
      if (area > 0) {
        candidates.push([loop, area]);
      }
    }
  }
  return candidates;
}
