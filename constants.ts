import { GraphData } from "./types";

export const INITIAL_GRAPH: GraphData = {
  nodes: [
    { id: 'A', active: true }, 
    { id: 'B', active: true }, 
    { id: 'C', active: true }, 
    { id: 'D', active: true }, 
    { id: 'E', active: true }, 
    { id: 'F', active: true }
  ],
  links: [
    { id: 'AB', source: 'A', target: 'B', weight: 4, active: true },
    { id: 'AC', source: 'A', target: 'C', weight: 2, active: true },
    { id: 'BC', source: 'B', target: 'C', weight: 1, active: true },
    { id: 'BD', source: 'B', target: 'D', weight: 5, active: true },
    { id: 'CE', source: 'C', target: 'E', weight: 8, active: true },
    { id: 'CD', source: 'C', target: 'D', weight: 10, active: true },
    { id: 'DE', source: 'D', target: 'E', weight: 2, active: true },
    { id: 'DF', source: 'D', target: 'F', weight: 6, active: true },
    { id: 'EF', source: 'E', target: 'F', weight: 3, active: true },
  ]
};

export const INFINITY = 9999;
