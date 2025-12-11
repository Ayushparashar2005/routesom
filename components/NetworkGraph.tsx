import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link, SimulationStep, Packet } from '../types';

interface NetworkGraphProps {
  data: GraphData;
  currentStep?: SimulationStep;
  packets: Packet[];
  width?: number;
  height?: number;
  editMode: boolean;
  startNodeId: string;
  endNodeId: string | null;
  highlightLinks: string[]; // IDs of links in the shortest path
  onNodeClick: (nodeId: string, isShift: boolean) => void;
  onLinkClick: (linkId: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  data, 
  currentStep,
  packets,
  width = 800, 
  height = 600,
  editMode,
  startNodeId,
  endNodeId,
  highlightLinks,
  onNodeClick,
  onLinkClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const [internalData, setInternalData] = useState<GraphData>({ nodes: [], links: [] });

  // Sync internal data with props
  useEffect(() => {
    const newNodes = data.nodes.map(n => {
      const existing = internalData.nodes.find(en => en.id === n.id);
      return existing ? { ...existing, active: n.active } : { ...n, x: width / 2 + Math.random() * 50, y: height / 2 + Math.random() * 50 };
    });
    
    const newLinks = data.links.map(l => ({ ...l }));

    setInternalData({ nodes: newNodes, links: newLinks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Main D3 Rendering
  useEffect(() => {
    if (!svgRef.current || internalData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Definitions
    const defs = svg.append("defs");
    defs.selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    const simulation = d3.forceSimulation<Node, Link>(internalData.nodes)
      .force("link", d3.forceLink<Node, Link>(internalData.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(40));

    simulationRef.current = simulation;

    // Draw Links
    const linkGroup = svg.append("g").attr("class", "links");
    const link = linkGroup.selectAll("g")
      .data(internalData.links)
      .enter().append("g");

    const linkLine = link.append("line")
      .attr("stroke-width", 3)
      .attr("stroke", d => d.active ? "#475569" : "#991b1b")
      .attr("stroke-dasharray", d => d.active ? "none" : "5,5")
      .attr("opacity", d => d.active ? 1 : 0.4);

    const linkClickArea = link.append("line") 
      .attr("stroke-width", 20)
      .attr("stroke", "transparent")
      .attr("cursor", editMode ? "pointer" : "default")
      .on("click", (e, d) => {
        if (editMode) onLinkClick(d.id);
      });

    const linkTextBg = link.append("rect")
      .attr("width", 24)
      .attr("height", 16)
      .attr("rx", 4)
      .attr("fill", "#0f172a")
      .attr("opacity", 0.8);

    const linkText = link.append("text")
      .text(d => d.weight)
      .attr("font-size", "12px")
      .attr("fill", d => d.active ? "#cbd5e1" : "#ef4444")
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("cursor", editMode ? "pointer" : "default")
      .on("click", (e, d) => {
         if (editMode) onLinkClick(d.id);
      });

    // Draw Nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const node = nodeGroup.selectAll("g")
      .data(internalData.nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circle
    const circle = node.append("circle")
      .attr("r", 24)
      .attr("fill", d => {
          if (!d.active) return "#450a0a";
          if (d.id === startNodeId) return "#1e3a8a"; // Dark Blue for Start
          if (d.id === endNodeId) return "#581c87"; // Purple for End
          return "#1e293b";
      }) 
      .attr("stroke", d => {
          if (!d.active) return "#ef4444";
          if (d.id === startNodeId) return "#3b82f6"; // Bright Blue
          if (d.id === endNodeId) return "#a855f7"; // Bright Purple
          return "#64748b";
      })
      .attr("stroke-width", d => (d.id === startNodeId || d.id === endNodeId) ? 4 : 2)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        onNodeClick(d.id, event.shiftKey);
      });

    // Node ID Label
    node.append("text")
      .text(d => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", d => d.active ? "white" : "#fca5a5")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none");

    // Start/End Badges
    node.filter(d => d.id === startNodeId || d.id === endNodeId)
        .append("rect")
        .attr("x", -18)
        .attr("y", -40)
        .attr("width", 36)
        .attr("height", 14)
        .attr("rx", 4)
        .attr("fill", d => d.id === startNodeId ? "#3b82f6" : "#a855f7");
        
    node.filter(d => d.id === startNodeId || d.id === endNodeId)
        .append("text")
        .text(d => d.id === startNodeId ? "START" : "END")
        .attr("text-anchor", "middle")
        .attr("dy", -30)
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("fill", "white");

    // Failure icon overlay if inactive
    node.append("text")
      .text("✕")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "#ef4444")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("opacity", d => d.active ? 0 : 1)
      .attr("pointer-events", "none");

    // Distance Label
    const distanceLabel = node.append("text")
        .attr("class", "dist-label")
        .attr("text-anchor", "middle")
        .attr("dy", 40)
        .attr("fill", "#38bdf8") 
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("");

    // Packet Group (Top Layer)
    const packetGroup = svg.append("g").attr("class", "packets");

    // Simulation Tick
    simulation.on("tick", () => {
      linkLine
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);
      
      linkClickArea
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      const getMidX = (d: Link) => ((d.source as Node).x! + (d.target as Node).x!) / 2;
      const getMidY = (d: Link) => ((d.source as Node).y! + (d.target as Node).y!) / 2;

      linkText
        .attr("x", d => getMidX(d))
        .attr("y", d => getMidY(d));
      
      linkTextBg
        .attr("x", d => getMidX(d) - 12)
        .attr("y", d => getMidY(d) - 8);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [internalData, width, height, editMode, startNodeId, endNodeId]); 

  // --- Effects for Algorithm State Visualization ---

  useEffect(() => {
    if (!svgRef.current || !currentStep) return;
    const svg = d3.select(svgRef.current);

    // Update Distance Labels
    svg.selectAll<SVGTextElement, Node>(".dist-label")
        .text(d => {
            if (!d.active) return "OFF";
            const dist = currentStep.distances[d.id];
            return dist === undefined || dist >= 9999 ? '∞' : dist.toString();
        });

    // Update Nodes Processing Colors (Yellow/Green)
    svg.selectAll<SVGCircleElement, Node>(".nodes circle")
      .transition().duration(200)
      .attr("fill", d => {
        if (!d.active) return "#450a0a";
        if (d.id === startNodeId) return "#1e3a8a";
        if (d.id === endNodeId) return "#581c87";
        if (currentStep.activeNodes.includes(d.id)) return "#eab308"; // Processing
        if (currentStep.visitedNodes.includes(d.id)) return "#064e3b"; // Visited (Dark Green)
        return "#1e293b"; 
      })
      .attr("stroke", d => {
        if (!d.active) return "#ef4444";
        if (currentStep.activeNodes.includes(d.id)) return "#facc15";
        if (currentStep.visitedNodes.includes(d.id)) return "#22c55e";
        if (d.id === startNodeId) return "#3b82f6";
        if (d.id === endNodeId) return "#a855f7";
        return "#64748b";
      });

    // Update Links
    svg.selectAll<SVGLineElement, Link>(".links line")
      .filter(function() { return this.getAttribute("stroke") !== "transparent" })
      .transition().duration(200)
      .attr("stroke", d => {
        if (!d.active) return "#991b1b";
        
        // Priority 1: Highlighting the final calculated shortest path
        if (highlightLinks.includes(d.id)) return "#a855f7"; // Purple/Pink Neon

        // Priority 2: Currently active in algorithm
        if (currentStep.activeLinks.includes(d.id)) return "#facc15"; // Yellow
        
        // Priority 3: Part of the tree discovered so far (algorithm trace)
        const s = (d.source as Node);
        const t = (d.target as Node);
        if ((currentStep.previous[t.id] === s.id) || (currentStep.previous[s.id] === t.id)) {
             return "#3b82f6"; // Blue Tree
        }
        return "#475569";
      })
      .attr("stroke-width", d => {
          if (highlightLinks.includes(d.id)) return 6;
          if (currentStep.activeLinks.includes(d.id)) return 4;
          return 3;
      })
      .attr("opacity", d => {
          if (highlightLinks.includes(d.id)) return 1;
          if (!d.active) return 0.4;
          // Dim other links slightly if we have a specific target path
          if (highlightLinks.length > 0 && !currentStep.activeLinks.includes(d.id)) return 0.2;
          return 1;
      });

  }, [currentStep, internalData, highlightLinks, startNodeId, endNodeId]);

  // --- Effect for Traffic Packets ---
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const packetGroup = svg.select(".packets");

    const packetSelection = packetGroup.selectAll<SVGCircleElement, Packet>("circle")
        .data(packets, d => d.id);

    packetSelection.exit().remove();

    const packetEnter = packetSelection.enter().append("circle")
        .attr("r", 6)
        .attr("fill", "#06b6d4")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    packetSelection.merge(packetEnter as any)
        .attr("cx", d => {
            const link = internalData.links.find(l => l.id === d.currentEdgeId);
            if (!link) return 0;
            const src = link.source as Node;
            const tgt = link.target as Node;
            let x1 = src.x!, x2 = tgt.x!;
            return d.currentNodeId === tgt.id ? x2 + (x1 - x2) * d.progress : x1 + (x2 - x1) * d.progress;
        })
        .attr("cy", d => {
             const link = internalData.links.find(l => l.id === d.currentEdgeId);
            if (!link) return 0;
            const src = link.source as Node;
            const tgt = link.target as Node;
            let y1 = src.y!, y2 = tgt.y!;
            return d.currentNodeId === tgt.id ? y2 + (y1 - y2) * d.progress : y1 + (y2 - y1) * d.progress;
        });
  }, [packets, internalData]);

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative">
        <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur px-3 py-2 rounded-md text-slate-300 text-xs font-mono border border-slate-700 pointer-events-none shadow-lg">
            {editMode ? (
                "EDIT MODE: Click Nodes to Toggle | Click Weights to Edit"
            ) : (
                <>
                <div>Click Node = Set Start <span className="text-blue-400 font-bold">●</span></div>
                <div>Shift + Click = Set End <span className="text-purple-400 font-bold">●</span></div>
                </>
            )}
        </div>
      <svg ref={svgRef} width={width} height={height} className="w-full h-full block" />
    </div>
  );
};

export default NetworkGraph;