import { GraphData, Node, Link, SimulationStep, AlgorithmType } from '../types';
import { INFINITY } from '../constants';

export const runAlgorithm = (
  type: AlgorithmType,
  data: GraphData,
  startNodeId: string
): SimulationStep[] => {
  if (type === AlgorithmType.DIJKSTRA) {
    return runDijkstra(data, startNodeId);
  } else {
    return runBellmanFord(data, startNodeId);
  }
};

const runDijkstra = (data: GraphData, startNodeId: string): SimulationStep[] => {
  const steps: SimulationStep[] = [];
  const nodes = data.nodes.filter(n => n.active); // Only active nodes
  const links = data.links.filter(l => l.active); // Only active links

  // Initialize
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const unvisited: Set<string> = new Set();
  
  // Need a quick lookup for node activity to prevent traversing to dead nodes
  const activeNodeIds = new Set(nodes.map(n => n.id));

  // Initialize all known nodes in data (even inactive ones) to Infinity for display purposes
  data.nodes.forEach(node => {
    distances[node.id] = (node.id === startNodeId && node.active) ? 0 : INFINITY;
    previous[node.id] = null;
    if (node.active) {
      unvisited.add(node.id);
    }
  });

  if (!activeNodeIds.has(startNodeId)) {
     steps.push({
      stepIndex: 0,
      description: `Start node ${startNodeId} is inactive/failed. Cannot route.`,
      distances, previous, activeNodes: [], activeLinks: [], visitedNodes: []
     });
     return steps;
  }

  steps.push({
    stepIndex: 0,
    description: `Initialized distances. Start node ${startNodeId} is 0.`,
    distances: { ...distances },
    previous: { ...previous },
    activeNodes: [startNodeId],
    activeLinks: [],
    visitedNodes: [],
  });

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDist = INFINITY;

    unvisited.forEach(id => {
      if (distances[id] < minDist) {
        minDist = distances[id];
        currentId = id;
      }
    });

    // If we can't reach any more nodes
    if (currentId === null || distances[currentId] === INFINITY) {
      break;
    }

    unvisited.delete(currentId);
    visited.add(currentId);

    steps.push({
      stepIndex: steps.length,
      description: `Selected node ${currentId} with minimum distance ${minDist}.`,
      distances: { ...distances },
      previous: { ...previous },
      activeNodes: [currentId],
      activeLinks: [],
      visitedNodes: Array.from(visited),
    });

    // Get neighbors
    const neighbors = links.filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return s === currentId || t === currentId;
    });

    for (const link of neighbors) {
      const sId = typeof link.source === 'string' ? link.source : link.source.id;
      const tId = typeof link.target === 'string' ? link.target : link.target.id;
      const neighborId = sId === currentId ? tId : sId;

      if (!activeNodeIds.has(neighborId)) continue; // Skip dead nodes
      if (visited.has(neighborId)) continue;

      const alt = distances[currentId] + link.weight;
      
      const currentDist = distances[neighborId];
      const linkId = link.id;

      if (alt < currentDist) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
        steps.push({
          stepIndex: steps.length,
          description: `Relaxing edge ${currentId}-${neighborId}: Updated distance to ${neighborId} to ${alt}.`,
          distances: { ...distances },
          previous: { ...previous },
          activeNodes: [currentId, neighborId],
          activeLinks: [linkId],
          visitedNodes: Array.from(visited),
        });
      }
    }
  }

  steps.push({
    stepIndex: steps.length,
    description: `Dijkstra Algorithm complete.`,
    distances: { ...distances },
    previous: { ...previous },
    activeNodes: [],
    activeLinks: [],
    visitedNodes: Array.from(visited),
  });

  return steps;
};


const runBellmanFord = (data: GraphData, startNodeId: string): SimulationStep[] => {
  const steps: SimulationStep[] = [];
  const nodes = data.nodes.filter(n => n.active);
  const links = data.links.filter(l => l.active);
  const activeNodeIds = new Set(nodes.map(n => n.id));
  
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};

  data.nodes.forEach(node => {
    distances[node.id] = (node.id === startNodeId && node.active) ? 0 : INFINITY;
    previous[node.id] = null;
  });
  
  if (!activeNodeIds.has(startNodeId)) {
    return [{
     stepIndex: 0,
     description: `Start node ${startNodeId} is inactive.`,
     distances, previous, activeNodes: [], activeLinks: [], visitedNodes: []
    }];
 }

  steps.push({
    stepIndex: 0,
    description: `Initialized distances.`,
    distances: { ...distances },
    previous: { ...previous },
    activeNodes: [startNodeId],
    activeLinks: [],
    visitedNodes: [],
  });

  // Relax edges |V| - 1 times
  const V = nodes.length;
  let somethingChanged = false;

  for (let i = 0; i < V - 1; i++) {
    somethingChanged = false;
    
    for (const link of links) {
      const u = typeof link.source === 'string' ? link.source : link.source.id;
      const v = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!activeNodeIds.has(u) || !activeNodeIds.has(v)) continue;

      const edgesToCheck = [
          { from: u, to: v },
          { from: v, to: u }
      ];

      for (const edge of edgesToCheck) {
        if (distances[edge.from] !== INFINITY && distances[edge.from] + link.weight < distances[edge.to]) {
            const oldDist = distances[edge.to];
            distances[edge.to] = distances[edge.from] + link.weight;
            previous[edge.to] = edge.from;
            somethingChanged = true;
            
            steps.push({
                stepIndex: steps.length,
                description: `Iteration ${i + 1}: Relaxing ${edge.from}->${edge.to}. New dist: ${distances[edge.to]}.`,
                distances: {...distances},
                previous: {...previous},
                activeNodes: [edge.from, edge.to],
                activeLinks: [link.id],
                visitedNodes: []
            });
        }
      }
    }
    
    if (!somethingChanged) {
        steps.push({
            stepIndex: steps.length,
            description: `Iteration ${i + 1}: No changes. Converged.`,
            distances: {...distances},
            previous: {...previous},
            activeNodes: [],
            activeLinks: [],
            visitedNodes: []
        });
        break;
    }
  }

  steps.push({
    stepIndex: steps.length,
    description: `Bellman-Ford Algorithm complete.`,
    distances: { ...distances },
    previous: { ...previous },
    activeNodes: [],
    activeLinks: [],
    visitedNodes: [],
  });

  return steps;
};
