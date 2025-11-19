
import React, { useState, useEffect, useRef } from 'react';
import ForceGraph from './components/ForceGraph';
import { DetailPanel } from './components/DetailPanel';
import { analyzeStoryBlock, generateSystemPrompt } from './services/geminiService';
import { GraphData, CharacterNode, RelationshipLink } from './types';

const INITIAL_GRAPH: GraphData = {
  nodes: [
    { id: 'user', name: 'User', archetype: 'Protagonist', currentMood: 'Neutral', group: 1 }
  ],
  links: []
};

export default function App() {
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CharacterNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<RelationshipLink | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [godModeText, setGodModeText] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const bufferRef = useRef<HTMLDivElement>(null);

  // Handle resizing
  useEffect(() => {
    const updateDim = () => {
      const container = document.getElementById('graph-container');
      if (container) {
        setDimensions({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    window.addEventListener('resize', updateDim);
    updateDim();
    return () => window.removeEventListener('resize', updateDim);
  }, []);

  // Handle SillyTavern Messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      if (type === 'NEW_CONTEXT') {
        const newMsg = `[${new Date(payload.timestamp).toLocaleTimeString()}] ${payload.text}`;
        setMessageBuffer(prev => [...prev, newMsg]);
      } else if (type === 'RESET_GRAPH') {
        setGraphData(INITIAL_GRAPH);
        setMessageBuffer([]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Scroll buffer to bottom
  useEffect(() => {
    if(bufferRef.current) {
        bufferRef.current.scrollTop = bufferRef.current.scrollHeight;
    }
  }, [messageBuffer]);

  const processBlock = async () => {
     if (messageBuffer.length === 0 && !godModeText) return;
     
     setIsLoading(true);
     const textBlock = messageBuffer.join('\n');
     
     try {
       // Send the entire accumulated block + god mode instructions
       const newData = await analyzeStoryBlock(textBlock, graphData, godModeText);
       setGraphData(newData);
       setMessageBuffer([]); // Clear buffer on success
       setGodModeText('');   // Clear cheat code
     } catch (e) {
       console.error("Block Analysis failed", e);
       alert("Analysis failed. Check console.");
     } finally {
       setIsLoading(false);
     }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateSystemPrompt(graphData);
      setGeneratedPrompt(prompt);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Updates from DetailPanel
  const handleLinkUpdate = (updatedLink: RelationshipLink) => {
    setGraphData(prev => ({
        ...prev,
        links: prev.links.map(l => 
            (l.source === updatedLink.source && l.target === updatedLink.target) ? updatedLink : l
        )
    }));
    setSelectedLink(updatedLink); // Refresh the panel view
  };

  const handleNodeUpdate = (updatedNode: CharacterNode) => {
    setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    }));
    setSelectedNode(updatedNode);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-200 font-sans">
      {/* Left Sidebar: Context & God Mode */}
      <div className="w-1/3 min-w-[350px] flex flex-col border-r border-slate-800 bg-slate-900 z-10 shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-slate-900">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            LoreGraph <span className="text-xs text-slate-500 font-mono ml-2">v2.5</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">9-Axis Psychological Matrix</p>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex justify-between items-end mb-2">
             <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current Scene Buffer ({messageBuffer.length})
             </label>
             {messageBuffer.length > 0 && (
                 <span className="text-[10px] text-amber-400 animate-pulse">● Unprocessed Data</span>
             )}
          </div>
          
          <div 
            ref={bufferRef}
            className="flex-1 bg-black/40 rounded-lg border border-slate-800 p-3 overflow-y-auto font-mono text-xs space-y-2 scrollbar-thin min-h-[100px]"
          >
            {messageBuffer.length === 0 ? (
                <div className="text-slate-600 italic text-center mt-10">
                    Waiting for chat logs...<br/>
                    Connect to SillyTavern
                </div>
            ) : (
                messageBuffer.map((msg, i) => (
                    <div key={i} className="p-2 bg-slate-800/30 rounded border-l-2 border-cyan-900">
                        {msg}
                    </div>
                ))
            )}
          </div>

          {/* God Mode / Cheat Zone */}
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
               Director's Override (God Mode)
            </label>
            <textarea
                value={godModeText}
                onChange={(e) => setGodModeText(e.target.value)}
                placeholder="Inject forced instructions... (e.g., 'Characters MUST fall in love now', 'Ignore previous conflict')"
                className="w-full h-20 bg-red-950/20 border border-red-900/50 rounded mt-1 p-2 text-xs text-red-200 focus:border-red-500 focus:outline-none"
            />
          </div>

          <button
              onClick={processBlock}
              disabled={isLoading || (messageBuffer.length === 0 && !godModeText)}
              className={`mt-4 w-full py-4 rounded-md font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isLoading 
                  ? 'bg-slate-800 text-slate-500 cursor-wait' 
                  : (messageBuffer.length > 0 || godModeText)
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-blue-900/20'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              {isLoading ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzying...
                </>
              ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    Process {godModeText ? '& Override' : 'Block'}
                </>
              )}
            </button>
        </div>

        {/* Bottom: Export */}
        <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleExport}
              className="w-full py-2 border border-slate-700 hover:border-purple-500 hover:text-purple-300 text-slate-400 rounded text-xs font-mono transition-colors"
            >
              Export Memory Block
            </button>
            {generatedPrompt && (
                 <div className="mt-2 relative">
                    <textarea 
                        readOnly 
                        value={generatedPrompt} 
                        className="w-full h-20 bg-black/50 text-[10px] text-purple-200 p-2 rounded border border-purple-900/30"
                    />
                 </div>
            )}
        </div>
      </div>

      {/* Middle: Visualization */}
      <div id="graph-container" className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
         {/* Legend */}
         <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur p-3 rounded border border-slate-800 text-[9px] space-y-1 pointer-events-none">
            <div className="font-bold text-slate-400 mb-1 uppercase">Dominant Axis</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Love</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Friend</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Family</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Trust</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-700"></span> Lust</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Respect</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Power</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Duty</div>
            </div>
         </div>

        <ForceGraph 
          data={graphData} 
          width={dimensions.width} 
          height={dimensions.height}
          onNodeClick={(node) => { setSelectedNode(node); setSelectedLink(null); }}
          onLinkClick={(link) => { setSelectedLink(link); setSelectedNode(null); }}
        />
      </div>

      {/* Right: Details */}
      <div className="w-1/4 min-w-[320px] bg-slate-900 z-10 shadow-2xl">
        <DetailPanel 
          selectedNode={selectedNode} 
          selectedLink={selectedLink}
          onClose={() => { setSelectedNode(null); setSelectedLink(null); }}
          onUpdateLink={handleLinkUpdate}
          onUpdateNode={handleNodeUpdate}
        />
      </div>
    </div>
  );
}
