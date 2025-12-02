import React, { useState, useEffect, useCallback, useRef } from 'react';
import NetworkGraph from './components/NetworkGraph';
import ControlPanel from './components/ControlPanel';
import RoutingTable from './components/RoutingTable';
import { GraphData, AlgorithmType, SimulationStep, Packet, Node, Link } from './types';
import { INITIAL_GRAPH } from './constants';
import { runAlgorithm } from './utils/algorithms';
import { generateTopology } from './services/geminiService';
import { Terminal, Info, Zap } from 'lucide-react';

const App: React.FC = () => {
  // Graph State
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH);
  const [startNode, setStartNode] = useState<string>('A');
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // Algorithm State
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(AlgorithmType.DIJKSTRA);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  
  // Traffic State
  const [packets, setPackets] = useState<Packet[]>([]);
  const lastPacketUpdate = useRef<number>(0);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // --- Algorithm Execution ---
  // Re-run algorithm whenever graph, algorithm type, or start node changes
  useEffect(() => {
    const newSteps = runAlgorithm(algorithm, graphData, startNode);
    setSteps(newSteps);
    // If graph changed structurally, reset index, otherwise try to keep it if valid
    // For simplicity, reset on major changes
    if (currentStepIndex >= newSteps.length) {
        setCurrentStepIndex(newSteps.length - 1);
    }
  }, [graphData, algorithm, startNode]);

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
     const delta = (timestamp - lastPacketUpdate.current) / 1000; // seconds
     lastPacketUpdate.current = timestamp;

     setPackets(prevPackets => {
        if (prevPackets.length === 0) return [];
        
        // We need the routing table to know where to go. 
        // We use the *final* result of the routing algorithm for the current graph state
        // To allow packets to react to the *current* simulation step, we could use steps[currentStepIndex]
        // But in reality, packets route based on the router's current table.
        // Let's use the Routing Table from the calculated steps.
        // Since steps are re-calc'd on graph change, 'steps[steps.length-1]' is the converged table.
        // However, we need the table for *every* node as a source, not just 'startNode' state variable.
        // This is expensive to calc every frame.
        
        // OPTIMIZATION: Calc next hop only when reaching a node.
        
        return prevPackets.map(p => {
             if (p.status !== 'moving') return p;

             let newProgress = p.progress + (p.speed * delta);
             
             if (newProgress >= 1) {
                 // Packet reached the end of the edge (reached nextHop)
                 const arrivedNodeId = p.nextHopId!;
                 
                 if (arrivedNodeId === p.targetId) {
                     return { ...p, progress: 1, status: 'delivered', currentEdgeId: null, currentNodeId: arrivedNodeId };
                 }

                 // Route from arrivedNodeId to targetId
                 // We need to know which neighbor is the next best hop.
                 // We can run a quick Dijkstra from arrivedNodeId OR use the existing table if we treated startNode dynamic.
                 // For true routing, every node needs a table.
                 // Let's run a single-source dijkstra for this packet's current location *on demand*.
                 // This is okay for a few packets.
                 
                 // Run algorithm from current location
                 const routeSteps = runAlgorithm(algorithm, graphData, arrivedNodeId);
                 const convergedStep = routeSteps[routeSteps.length - 1];
                 
                 // Backtrack from target to find the first hop from source
                 let nextHop = null;
                 let curr: string | null = p.targetId;
                 
                 // Safety check: is target reachable?
                 if (convergedStep.distances[p.targetId] >= 9999) {
                     return { ...p, status: 'lost', progress: 1 };
                 }

                 // Trace back: Target <- Prev <- ... <- NextHop <- CurrentNode
                 const path = [];
                 while (curr && curr !== arrivedNodeId) {
                     path.push(curr);
                     curr = convergedStep.previous[curr];
                 }
                 
                 // If path has items, the last item is the immediate neighbor of arrivedNodeId
                 if (path.length > 0) {
                     nextHop = path[path.length - 1];
                 } else {
                     // Should not happen if reachable and not same node
                     return { ...p, status: 'lost' };
                 }

                 // Find link
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
  }, [graphData, algorithm]); // Re-bind when graph changes to use fresh graphData in closure

  // --- Handlers ---

  const handleSendTraffic = () => {
    // Generate 5 random packets
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
        
        // Initial Routing Calculation
        const routeSteps = runAlgorithm(algorithm, graphData, src.id);
        const converged = routeSteps[routeSteps.length - 1];
        
        if (converged.distances[tgt.id] >= 9999) continue; // Unreachable
        
        // Find first hop
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
                speed: 0.5 + Math.random() * 0.5, // Random speed
                status: 'moving'
            });
        }
    }
    setPackets(prev => [...prev, ...newPackets]);
  };

  const handleNodeClick = (nodeId: string) => {
    if (editMode) {
        // Toggle Active Status
        setGraphData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, active: !n.active } : n),
            // Optionally deactivate connected links if node dies? 
            // The algorithm handles it, but visually cleaner if links stay but node is X'd
        }));
    } else {
        setStartNode(nodeId);
        setCurrentStepIndex(0);
        setIsPlaying(false);
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
      // Ensure active flags are set
      newGraph.nodes = newGraph.nodes.map(n => ({ ...n, active: true }));
      newGraph.links = newGraph.links.map(l => ({ ...l, active: true }));
      
      setGraphData(newGraph);
      if (newGraph.nodes.length > 0) {
        setStartNode(newGraph.nodes[0].id);
      }
      setPackets([]); // Clear packets on new graph
    } else {
        alert("Could not generate topology. Please try a different prompt or check API Key.");
    }
    setIsGenerating(false);
  };

  const currentStep = steps[currentStepIndex] || null;

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
                <p className="text-slate-400 text-sm mt-1 max-w-md">
                Interactive simulation of {algorithm}. <br/>
                Current Start Node: <span className="text-white font-bold">{startNode}</span>
                </p>
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
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
          />
        </div>
      </div>

      {/* Sidebar / Right Panel */}
      <div className="w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-30">
        
        {/* Log / Step Description */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
                <Terminal size={18} />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Simulation Log</h2>
            </div>
            <div className="h-24 overflow-y-auto pr-2 text-sm text-slate-300 font-mono leading-relaxed custom-scrollbar">
                {currentStep ? (
                    <p className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-slate-500 mr-2">[{currentStep.stepIndex}]</span>
                        {currentStep.description}
                    </p>
                ) : "Ready to start..."}
            </div>
        </div>

        {/* Routing Table */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
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