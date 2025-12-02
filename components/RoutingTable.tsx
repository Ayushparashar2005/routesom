import React from 'react';
import { SimulationStep } from '../types';
import { INFINITY } from '../constants';

interface RoutingTableProps {
  step: SimulationStep | null;
  nodes: { id: string }[];
}

const RoutingTable: React.FC<RoutingTableProps> = ({ step, nodes }) => {
  if (!step) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 italic">
        Simulation not started
      </div>
    );
  }

  // Sort nodes alphabetically for consistent table
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
          <tr>
            <th scope="col" className="px-6 py-3">Node</th>
            <th scope="col" className="px-6 py-3">Distance</th>
            <th scope="col" className="px-6 py-3">Prev</th>
          </tr>
        </thead>
        <tbody>
          {sortedNodes.map((node) => {
            const dist = step.distances[node.id];
            const displayDist = dist >= INFINITY ? '∞' : dist;
            const prev = step.previous[node.id] || '-';
            const isActive = step.activeNodes.includes(node.id);
            const isVisited = step.visitedNodes.includes(node.id);

            return (
              <tr 
                key={node.id} 
                className={`border-b border-slate-800 transition-colors duration-300 ${
                    isActive ? 'bg-yellow-900/20' : isVisited ? 'bg-green-900/10' : 'bg-transparent'
                }`}
              >
                <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                  {node.id}
                </th>
                <td className={`px-6 py-4 font-mono ${isActive ? 'text-yellow-400 font-bold' : ''}`}>
                  {displayDist}
                </td>
                <td className="px-6 py-4 font-mono text-slate-400">
                  {prev}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RoutingTable;
