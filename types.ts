import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface Node extends SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  active: boolean; // For failure simulation
}

export interface Link extends SimulationLinkDatum<Node> {
  id: string;
  source: string | Node;
  target: string | Node;
  weight: number;
  active: boolean; // For failure simulation
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export enum AlgorithmType {
  DIJKSTRA = 'Dijkstra',
  BELLMAN_FORD = 'Bellman-Ford',
}

export interface RoutingTableEntry {
  nodeId: string;
  distance: number;
  previous: string | null;
}

export interface SimulationStep {
  stepIndex: number;
  description: string;
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  activeNodes: string[]; // Nodes currently being processed
  activeLinks: string[]; // Links currently being relaxed/checked
  visitedNodes: string[]; // Nodes that are finalized (Dijkstra)
  path?: string[]; // The resulting path if simulation is done
}

export interface Packet {
  id: string;
  sourceId: string;
  targetId: string;
  currentEdgeId: string | null; // The link ID the packet is currently traveling on
  currentNodeId: string; // The node the packet is currently at (or just left)
  nextHopId: string | null; // Where it wants to go
  progress: number; // 0.0 to 1.0 along the edge
  speed: number;
  status: 'moving' | 'delivered' | 'lost';
}
