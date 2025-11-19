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
  const [godModeText, setGodModeText] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const bufferRef = useRef<HTMLDivElement>(null);

  // Resize Listener
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

  // Message Handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'NEW_CONTEXT') {
        setMessageBuffer(prev => [...prev, payload.text]);
      } else if (type === 'RESET_GRAPH') {
        setGraphData(INITIAL_GRAPH);
        setMessageBuffer([]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-Process Logic
  useEffect(() => {
    if(messageBuffer.length === 0 || isLoading) return;
    
    const timer = setTimeout(() => {
        processBlock();
    }, 2000); // 2s debounce
    
    return () => clearTimeout(timer);
  }, [messageBuffer]);

  const processBlock = async () => {
     if (messageBuffer.length === 0 && !godModeText) return;
     setIsLoading(true);
     const textBlock = messageBuffer.join('\n');
     
     try {
       const newData = await analyzeStoryBlock(textBlock, graphData, godModeText);
       setGraphData(newData);
       setMessageBuffer([]);
       setGodModeText('');
       
       // Auto-Export back to ST
       const summary = await generateSystemPrompt(newData);
       window.parent.postMessage({ type: 'LOREGRAPH_EXPORT', summary }, '*');
       
     } catch (e) {
       console.error(e);
     } finally {
       setIsLoading(false);
     }
  };

  const handleLinkUpdate = (updatedLink: RelationshipLink) => {
    setGraphData(prev => ({
        ...prev,
        links: prev.links.map(l => 
            (l.source === updatedLink.source && l.target === updatedLink.target) ? updatedLink : l
        )
    }));
    setSelectedLink(updatedLink);
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
      <div className="w-1/3 min-w-[350px] flex flex-col border-r border-slate-800 bg-slate-900 z-10">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-cyan-400">LoreGraph Dev</h1>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
             <div className="text-xs text-slate-400 mb-2">Buffer: {messageBuffer.length} items</div>
             <div className="bg-black/30 p-2 rounded text-[10px] font-mono h-32 overflow-auto">
                {messageBuffer.map((m,i) => <div key={i}>{m}</div>)}
             </div>
             <div className="mt-4">
                <label className="text-xs font-bold text-red-400">God Mode</label>
                <textarea 
                    className="w-full h-20 bg-red-900/10 border border-red-900/30 text-xs p-2 mt-1"
                    value={godModeText} onChange={e=>setGodModeText(e.target.value)}
                />
             </div>
             <button 
                onClick={processBlock}
                disabled={isLoading}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold"
             >
                {isLoading ? 'Analyzing...' : 'Force Process'}
             </button>
        </div>
      </div>

      <div id="graph-container" className="flex-1 relative">
        <ForceGraph 
          data={graphData} 
          width={dimensions.width} height={dimensions.height}
          onNodeClick={(n) => { setSelectedNode(n); setSelectedLink(null); }}
          onLinkClick={(l) => { setSelectedLink(l); setSelectedNode(null); }}
        />
      </div>

      <div className="w-1/4 min-w-[320px] bg-slate-900 z-10 border-l border-slate-800">
        <DetailPanel 
          selectedNode={selectedNode} selectedLink={selectedLink}
          onClose={() => { setSelectedNode(null); setSelectedLink(null); }}
          onUpdateLink={handleLinkUpdate} onUpdateNode={handleNodeUpdate}
        />
      </div>
    </div>
  );
}