import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NetworkGraph from './components/NetworkGraph';
import ControlPanel from './components/ControlPanel';
import RoutingTable from './components/RoutingTable';
import { GraphData, AlgorithmType, SimulationStep, Packet, Node, Link } from './types';
import { INITIAL_GRAPH, INFINITY } from './constants';
import { runAlgorithm } from './utils/algorithms';
import { generateTopology } from './services/geminiService';
import { Terminal, Info, Zap, Timer, Flag } from 'lucide-react';

const App: React.FC = () => {
  // Graph State
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH);
  const [startNode, setStartNode] = useState<string>('A');
  const [endNode, setEndNode] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // Algorithm State
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(AlgorithmType.DIJKSTRA);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  
  // Performance Metrics
  const [computeTime, setComputeTime] = useState<number>(0);
  
  // Traffic State
  const [packets, setPackets] = useState<Packet[]>([]);
  const lastPacketUpdate = useRef<number>(0);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // --- Algorithm Execution ---
  useEffect(() => {
    const start = performance.now();
    const newSteps = runAlgorithm(algorithm, graphData, startNode);
    const end = performance.now();
    
    setComputeTime(end - start);
    setSteps(newSteps);
    
    if (currentStepIndex >= newSteps.length) {
        setCurrentStepIndex(newSteps.length - 1);
    }
  }, [graphData, algorithm, startNode]);

  // --- Derived State: Shortest Path to End Node ---
  const currentStep = steps[currentStepIndex] || null;

  const shortestPathData = useMemo(() => {
    if (!endNode || !currentStep) return { cost: 0, pathIds: [], pathString: '' };

    const cost = currentStep.distances[endNode];
    if (cost === undefined || cost >= INFINITY) {
        return { cost: '∞', pathIds: [], pathString: 'Unreachable' };
    }

    // Reconstruct Path
    const pathIds: string[] = []; // Link IDs
    const nodePath: string[] = [endNode];
    let curr = endNode;
    const prevMap = currentStep.previous;
    
    let safety = 0;
    while (curr !== startNode && safety < graphData.nodes.length) {
        const prev = prevMap[curr];
        if (!prev) break;

        // Find link connecting prev and curr
        const link = graphData.links.find(l => {
            const s = typeof l.source === 'string' ? l.source : l.source.id;
            const t = typeof l.target === 'string' ? l.target : l.target.id;
            return (s === prev && t === curr) || (s === curr && t === prev);
        });

        if (link) pathIds.push(link.id);
        nodePath.unshift(prev);
        curr = prev;
        safety++;
    }

    return { 
        cost, 
        pathIds, 
        pathString: nodePath.join(' → ') 
    };

  }, [currentStep, endNode, graphData, startNode]);


  // --- Playback Timer ---
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, steps.length, playbackSpeed]);


  // --- Packet Simulation Loop ---
  const updatePackets = (timestamp: number) => {
     if (!lastPacketUpdate.current) lastPacketUpdate.current = timestamp;
     const delta = (timestamp - lastPacketUpdate.current) / 1000;
     lastPacketUpdate.current = timestamp;

     setPackets(prevPackets => {
        if (prevPackets.length === 0) return [];
        
        return prevPackets.map((p): Packet => {
             if (p.status !== 'moving') return p;

             let newProgress = p.progress + (p.speed * delta);
             
             if (newProgress >= 1) {
                 const arrivedNodeId = p.nextHopId!;
                 
                 if (arrivedNodeId === p.targetId) {
                     return { ...p, progress: 1, status: 'delivered', currentEdgeId: null, currentNodeId: arrivedNodeId };
                 }

                 // On-demand routing for packet
                 const routeSteps = runAlgorithm(algorithm, graphData, arrivedNodeId);
                 const convergedStep = routeSteps[routeSteps.length - 1];
                 
                 let nextHop = null;
                 let curr: string | null = p.targetId;
                 
                 if (convergedStep.distances[p.targetId] >= INFINITY) {
                     return { ...p, status: 'lost', progress: 1 };
                 }

                 const path = [];
                 while (curr && curr !== arrivedNodeId) {
                     path.push(curr);
                     curr = convergedStep.previous[curr];
                 }
                 
                 if (path.length > 0) {
                     nextHop = path[path.length - 1];
                 } else {
                     return { ...p, status: 'lost' };
                 }

                 const link = graphData.links.find(l => {
                     const s = typeof l.source === 'string' ? l.source : l.source.id;
                     const t = typeof l.target === 'string' ? l.target : l.target.id;
                     return (s === arrivedNodeId && t === nextHop) || (s === nextHop && t === arrivedNodeId);
                 });

                 if (link && link.active) {
                     return {
                         ...p,
                         currentNodeId: arrivedNodeId,
                         nextHopId: nextHop,
                         currentEdgeId: link.id,
                         progress: 0
                     };
                 } else {
                     return { ...p, status: 'lost' };
                 }

             }

             return { ...p, progress: newProgress };
        }).filter(p => p.status === 'moving');
     });

     requestAnimationFrame(updatePackets);
  };

  useEffect(() => {
    const handle = requestAnimationFrame(updatePackets);
    return () => cancelAnimationFrame(handle);
  }, [graphData, algorithm]);

  // --- Handlers ---

  const handleSendTraffic = () => {
    const newPackets: Packet[] = [];
    const activeNodes = graphData.nodes.filter(n => n.active);
    
    if (activeNodes.length < 2) return;

    for (let i = 0; i < 5; i++) {
        const srcIndex = Math.floor(Math.random() * activeNodes.length);
        let tgtIndex = Math.floor(Math.random() * activeNodes.length);
        while (tgtIndex === srcIndex) {
            tgtIndex = Math.floor(Math.random() * activeNodes.length);
        }
        
        const src = activeNodes[srcIndex];
        const tgt = activeNodes[tgtIndex];
        
        const routeSteps = runAlgorithm(algorithm, graphData, src.id);
        const converged = routeSteps[routeSteps.length - 1];
        
        if (converged.distances[tgt.id] >= INFINITY) continue;
        
        let nextHop = null;
        let curr: string | null = tgt.id;
        const path = [];
        while (curr && curr !== src.id) {
            path.push(curr);
            curr = converged.previous[curr];
        }
        if (path.length > 0) nextHop = path[path.length - 1];
        
        const link = graphData.links.find(l => {
            const s = typeof l.source === 'string' ? l.source : l.source.id;
            const t = typeof l.target === 'string' ? l.target : l.target.id;
            return (s === src.id && t === nextHop) || (s === nextHop && t === src.id);
        });

        if (link && nextHop) {
            newPackets.push({
                id: Math.random().toString(36),
                sourceId: src.id,
                targetId: tgt.id,
                currentEdgeId: link.id,
                currentNodeId: src.id,
                nextHopId: nextHop,
                progress: 0,
                speed: 0.5 + Math.random() * 0.5,
                status: 'moving'
            });
        }
    }
    setPackets(prev => [...prev, ...newPackets]);
  };

  const handleNodeClick = (nodeId: string, isShift: boolean) => {
    if (editMode) {
        setGraphData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, active: !n.active } : n),
        }));
    } else {
        if (isShift) {
            setEndNode(prev => prev === nodeId ? null : nodeId); // Toggle if same
        } else {
            setStartNode(nodeId);
            setCurrentStepIndex(0);
            setIsPlaying(false);
            // If new start is same as end, clear end
            if (nodeId === endNode) setEndNode(null);
        }
    }
  };

  const handleLinkClick = (linkId: string) => {
    if (editMode) {
        const link = graphData.links.find(l => l.id === linkId);
        if (!link) return;
        
        const newWeightStr = prompt(`Enter new weight for link (Current: ${link.weight})`, link.weight.toString());
        if (newWeightStr !== null) {
            const newWeight = parseInt(newWeightStr);
            if (!isNaN(newWeight) && newWeight > 0) {
                 setGraphData(prev => ({
                    ...prev,
                    links: prev.links.map(l => l.id === linkId ? { ...l, weight: newWeight } : l)
                 }));
            }
        }
    }
  };

  const handleGenerateTopology = async (prompt: string) => {
    setIsGenerating(true);
    const newGraph = await generateTopology(prompt);
    if (newGraph) {
      newGraph.nodes = newGraph.nodes.map(n => ({ ...n, active: true }));
      newGraph.links = newGraph.links.map(l => ({ ...l, active: true }));
      
      setGraphData(newGraph);
      if (newGraph.nodes.length > 0) {
        setStartNode(newGraph.nodes[0].id);
        setEndNode(null); // Reset target
      }
      setPackets([]);
    } else {
        alert("Could not generate topology. Please try a different prompt.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none z-10 flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-sm">
                RouteSim
                </h1>
                <div className="text-slate-400 text-sm mt-1 flex flex-col gap-1">
                    <div>
                        Interactive simulation of {algorithm}.
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                         <div className="flex items-center gap-1 bg-blue-900/40 px-2 py-1 rounded border border-blue-500/30">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>Start: <span className="font-bold text-white">{startNode}</span></span>
                         </div>
                         {endNode && (
                             <div className="flex items-center gap-1 bg-purple-900/40 px-2 py-1 rounded border border-purple-500/30">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                <span>End: <span className="font-bold text-white">{endNode}</span></span>
                            </div>
                         )}
                    </div>
                </div>
            </div>
            {packets.length > 0 && (
                <div className="bg-cyan-900/50 border border-cyan-500/30 px-3 py-1 rounded text-cyan-200 text-xs flex items-center gap-2">
                    <Zap size={14} />
                    <span>Active Packets: {packets.length}</span>
                </div>
            )}
        </div>

        {/* Graph Visualization */}
        <div className="flex-1 bg-slate-950 relative">
          <NetworkGraph 
            data={graphData} 
            currentStep={currentStep}
            packets={packets}
            width={window.innerWidth - 400} 
            height={window.innerHeight}
            editMode={editMode}
            startNodeId={startNode}
            endNodeId={endNode}
            highlightLinks={shortestPathData.pathIds}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
          />
        </div>
      </div>

      {/* Sidebar / Right Panel */}
      <div className="w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-30">
        
        {/* Metric Dashboard */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <Timer size={18} />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Algorithm Metrics</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Compute Time</div>
                    <div className="text-lg font-mono text-white flex items-baseline gap-1">
                        {computeTime < 0.01 ? '< 0.01' : computeTime.toFixed(3)}
                        <span className="text-xs text-slate-500">ms</span>
                    </div>
                </div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Operations</div>
                    <div className="text-lg font-mono text-white flex items-baseline gap-1">
                        {steps.length}
                        <span className="text-xs text-slate-500">steps</span>
                    </div>
                </div>
            </div>

            {/* Target Specific Metrics */}
            {endNode && (
                <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30 animate-in fade-in duration-300">
                     <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-purple-300 text-xs font-semibold uppercase">
                            <Flag size={12} />
                            Target Path ({endNode})
                        </div>
                        <div className="font-mono font-bold text-white text-lg">
                            {shortestPathData.cost} <span className="text-xs font-normal text-slate-400">cost</span>
                        </div>
                     </div>
                     <div className="text-xs text-purple-200/70 font-mono break-words">
                        {shortestPathData.pathString || "Calculating..."}
                     </div>
                </div>
            )}
        </div>

        {/* Log / Step Description */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
                <Terminal size={18} />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Simulation Log</h2>
            </div>
            <div className="h-20 overflow-y-auto pr-2 text-sm text-slate-300 font-mono leading-relaxed custom-scrollbar">
                {currentStep ? (
                    <p className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-slate-500 mr-2">[{currentStep.stepIndex}]</span>
                        {currentStep.description}
                    </p>
                ) : "Ready to start..."}
            </div>
        </div>

        {/* Routing Table */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
             <div className="flex items-center gap-2 mb-4 text-purple-400">
                <Info size={18} />
                <h2 className="font-semibold text-sm uppercase tracking-wider">
                    {algorithm} Table (From {startNode})
                </h2>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-950 custom-scrollbar">
                <RoutingTable step={currentStep} nodes={graphData.nodes} />
            </div>
        </div>

        {/* Control Panel */}
        <ControlPanel 
          isPlaying={isPlaying}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          algorithm={algorithm}
          playbackSpeed={playbackSpeed}
          editMode={editMode}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={() => currentStepIndex < steps.length - 1 && setCurrentStepIndex(p => p + 1)}
          onPrev={() => currentStepIndex > 0 && setCurrentStepIndex(p => p - 1)}
          onReset={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
          onAlgorithmChange={setAlgorithm}
          onSpeedChange={setPlaybackSpeed}
          onGenerateTopology={handleGenerateTopology}
          onToggleEditMode={() => setEditMode(!editMode)}
          onSendTraffic={handleSendTraffic}
          isGenerating={isGenerating}
          packetCount={packets.length}
        />
      </div>
    </div>
  );
};

export default App;