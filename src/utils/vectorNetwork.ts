import { isOnPolygon, IVec2 } from "okageo";
import { CurveControl } from "../models";
import { getApproxCurvePoints } from "./geometry";

export interface RawVnNode {
  id: string;
  position: IVec2;
}

export interface RawFnEdge {
  id: string;
  nodes: [RawVnNode, RawVnNode];
  curve?: CurveControl;
}

/**
 * The path is always manually closed: i.e. nodes.at(0) === nodes.at(-1)
 */
export interface RawVnLoop {
  nodes: RawVnNode[];
  edges: RawFnEdge[];
}

type VectorNetworkOption = {
  nodes: Map<string, RawVnNode>;
  edges: Map<string, RawFnEdge>;
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
    getEdge(id: string): RawFnEdge | undefined {
      return edges.get(id);
    },
    getEdgesForNode(node: RawVnNode): RawFnEdge[] {
      return Array.from(edges.values()).filter((edge) => edge.nodes.includes(node));
    },
    getEdgeForNodes(node1: RawVnNode, node2: RawVnNode): RawFnEdge | undefined {
      return Array.from(edges.values()).find((edge) => edge.nodes.includes(node1) && edge.nodes.includes(node2));
    },
  };
}
export type RawVectorNetwork = ReturnType<typeof newRawVectorNetwork>;

function findClosedLoops(network: RawVectorNetwork): RawVnLoop[] {
  const visited = new Set<string>();
  const loops: RawVnLoop[] = [];

  function dfs(node: RawVnNode, nodePath: RawVnNode[], edgePath: RawFnEdge[], startNode: RawVnNode): void {
    if (visited.has(node.id)) {
      if (node === startNode) {
        loops.push({ nodes: [...nodePath, node], edges: edgePath.concat() });
      }
      return;
    }

    visited.add(node.id);
    nodePath.push(node);

    const edges = network.getEdgesForNode(node);
    for (const edge of edges) {
      const nextNode = edge.nodes[0] === node ? edge.nodes[1] : edge.nodes[0];
      edgePath.push(edge);
      dfs(nextNode, nodePath, edgePath, startNode);
      edgePath.pop();
    }

    nodePath.pop();
    visited.delete(node.id);
  }

  for (const node of network.nodes.values()) {
    dfs(node, [], [], node);
  }

  return loops;
}

export function findClosedVnAreaCoveringPoint(network: RawVectorNetwork, point: IVec2): RawVnLoop | undefined {
  const loops = findClosedLoops(network);
  for (const loop of loops) {
    const points = getApproxCurvePoints(
      loop.nodes.map((node) => node.position),
      loop.edges.map((edge) => edge.curve),
    );
    if (isOnPolygon(point, points)) {
      return loop;
    }
  }
  return undefined;
}
