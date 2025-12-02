import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Brain, Check, Loader2, Settings, Send } from 'lucide-react';
import { AlgorithmType } from '../types';

interface ControlPanelProps {
  isPlaying: boolean;
  currentStepIndex: number;
  totalSteps: number;
  algorithm: AlgorithmType;
  playbackSpeed: number;
  editMode: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onAlgorithmChange: (algo: AlgorithmType) => void;
  onSpeedChange: (speed: number) => void;
  onGenerateTopology: (prompt: string) => void;
  onToggleEditMode: () => void;
  onSendTraffic: () => void;
  isGenerating: boolean;
  packetCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  currentStepIndex,
  totalSteps,
  algorithm,
  playbackSpeed,
  editMode,
  onPlayPause,
  onNext,
  onPrev,
  onReset,
  onAlgorithmChange,
  onSpeedChange,
  onGenerateTopology,
  onToggleEditMode,
  onSendTraffic,
  isGenerating,
  packetCount
}) => {
  const [prompt, setPrompt] = useState('');
  const [showGenInput, setShowGenInput] = useState(false);

  const handleSubmitGen = (e: React.FormEvent) => {
    e.preventDefault();
    if(prompt.trim()) {
        onGenerateTopology(prompt);
        setShowGenInput(false);
        setPrompt('');
    }
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-4 flex flex-col gap-4 shadow-lg z-20">
      
      {/* Top Row: Algorithm & GenAI & Edit Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button
                    onClick={() => onAlgorithmChange(AlgorithmType.DIJKSTRA)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        algorithm === AlgorithmType.DIJKSTRA 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Dijkstra
                </button>
                <button
                    onClick={() => onAlgorithmChange(AlgorithmType.BELLMAN_FORD)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        algorithm === AlgorithmType.BELLMAN_FORD 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    B-Ford
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
             <button
                onClick={onToggleEditMode}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    editMode 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' 
                    : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
                }`}
             >
                <Settings size={14} />
                <span>{editMode ? 'Done Editing' : 'Edit Graph'}</span>
             </button>

             <button
                onClick={onSendTraffic}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/40 rounded-md text-xs transition-colors"
             >
                <Send size={14} />
                <span>Send Traffic ({packetCount})</span>
             </button>
        </div>
      </div>

      {/* Middle Row: GenAI */}
      <div className="relative w-full">
            {showGenInput ? (
                <form onSubmit={handleSubmitGen} className="flex items-center gap-2 w-full">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. 10 nodes, mesh topology..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                    <button type="submit" className="p-1.5 bg-blue-600 rounded-md text-white hover:bg-blue-500">
                        <Check size={14} />
                    </button>
                </form>
            ) : (
                 <button 
                    onClick={() => setShowGenInput(true)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-md text-xs transition-colors"
                >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                    <span>Generate New Topology with AI</span>
                </button>
            )}
        </div>

      {/* Bottom Row: Playback Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} disabled={currentStepIndex <= 0} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-700 rounded-full transition-colors">
            <SkipBack size={18} />
          </button>
          
          <button onClick={onPlayPause} className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 transition-transform active:scale-95">
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>

          <button onClick={onNext} disabled={currentStepIndex >= totalSteps - 1} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-700 rounded-full transition-colors">
            <SkipForward size={18} />
          </button>

          <button onClick={onReset} className="ml-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full transition-colors" title="Reset Simulation">
             <RotateCcw size={16} />
          </button>
        </div>

        <div className="flex flex-col items-end gap-1 min-w-[100px]">
             <div className="flex justify-between w-full text-[10px] text-slate-500 font-mono uppercase">
                <span>Speed</span>
             </div>
             <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100" 
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
      </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0}%` }}
            />
        </div>
    </div>
  );
};

export default ControlPanel;
