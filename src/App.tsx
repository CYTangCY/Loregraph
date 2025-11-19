
import React, { useState, useEffect, useRef } from 'react';
import ForceGraph from './components/ForceGraph';
import { DetailPanel } from './components/DetailPanel';
import { analyzeStoryBlock, generateSystemPrompt } from './services/geminiService';
import { GraphData, CharacterNode, RelationshipLink } from './types';

const INITIAL_GRAPH: GraphData = { nodes: [{ id: 'user', name: 'User', archetype: 'Protagonist', currentMood: 'Neutral', group: 1 }], links: [] };

export default function App() {
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CharacterNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<RelationshipLink | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [godModeText, setGodModeText] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [autoProcess, setAutoProcess] = useState(true); // Dev mode defaults to true
  const bufferRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDim = () => { const c = document.getElementById('graph-container'); if (c) setDimensions({ width: c.clientWidth, height: c.clientHeight }); };
    window.addEventListener('resize', updateDim); updateDim(); return () => window.removeEventListener('resize', updateDim);
  }, []);

  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (e.data.type === 'NEW_CONTEXT') setMessageBuffer(p => [...p, `[${new Date(e.data.payload.timestamp).toLocaleTimeString()}] ${e.data.payload.text}`]);
      if (e.data.type === 'RESET_GRAPH') { setGraphData(INITIAL_GRAPH); setMessageBuffer([]); }
      if (e.data.type === 'CONFIG_UPDATE') { 
          if (e.data.payload.autoProcess !== undefined) setAutoProcess(e.data.payload.autoProcess);
      }
    };
    window.addEventListener('message', handle); return () => window.removeEventListener('message', handle);
  }, []);

  useEffect(() => { if(bufferRef.current) bufferRef.current.scrollTop = bufferRef.current.scrollHeight; }, [messageBuffer]);

  // Auto Process logic
  useEffect(() => {
    if (autoProcess && messageBuffer.length > 0 && !isLoading) {
        const timer = setTimeout(() => {
            processBlock();
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [messageBuffer, autoProcess, isLoading]);

  const processBlock = async () => {
     if (!messageBuffer.length && !godModeText) return;
     setIsLoading(true);
     try {
       const newData = await analyzeStoryBlock(messageBuffer.join('\n'), graphData, godModeText);
       setGraphData(newData); setMessageBuffer([]); setGodModeText('');
     } catch (e) { console.error(e); alert("Analysis failed. Check console."); }
     setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-200 font-sans">
      <div className="w-1/3 min-w-[350px] flex flex-col border-r border-slate-800 bg-slate-900 z-10">
        <div className="p-5 border-b border-slate-800"><h1 className="text-2xl font-bold text-cyan-400">LoreGraph <span className="text-xs text-slate-500">v3.0</span></h1></div>
        <div className="flex-1 flex flex-col p-4">
          <div ref={bufferRef} className="flex-1 bg-black/40 rounded border border-slate-800 p-3 overflow-y-auto font-mono text-xs space-y-2">{messageBuffer.length ? messageBuffer.map((m, i) => <div key={i} className="p-2 bg-slate-800/30 border-l-2 border-cyan-900">{m}</div>) : <div className="text-center text-slate-600 mt-10">Waiting for data...</div>}</div>
          <div className="mt-4"><label className="text-xs font-bold text-red-400">Director Override</label><textarea value={godModeText} onChange={e => setGodModeText(e.target.value)} placeholder="Force event..." className="w-full h-20 bg-red-950/20 border border-red-900/50 rounded mt-1 p-2 text-xs text-red-200" /></div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={autoProcess} onChange={e => setAutoProcess(e.target.checked)} /> Auto-Process
          </div>
          <button onClick={processBlock} disabled={isLoading} className="mt-2 w-full py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold disabled:opacity-50">{isLoading ? 'Analyzing...' : 'Process Block'}</button>
        </div>
        <div className="p-4 border-t border-slate-800"><button onClick={async () => setGeneratedPrompt(await generateSystemPrompt(graphData))} className="w-full py-2 border border-slate-700 text-slate-400 text-xs">Export Memory</button>{generatedPrompt && <textarea readOnly value={generatedPrompt} className="w-full h-20 bg-black/50 text-[10px] mt-2 text-purple-200 p-2" />}</div>
      </div>
      <div id="graph-container" className="flex-1 relative bg-slate-950"><ForceGraph data={graphData} width={dimensions.width} height={dimensions.height} onNodeClick={setSelectedNode} onLinkClick={setSelectedLink} /></div>
      { (selectedNode || selectedLink) && <div className="w-1/4 min-w-[320px] bg-slate-900 border-l border-slate-800"><DetailPanel selectedNode={selectedNode} selectedLink={selectedLink} onClose={() => {setSelectedNode(null); setSelectedLink(null)}} onUpdateLink={l => {setGraphData(p => ({...p, links: p.links.map(lnk => lnk.source === l.source && lnk.target === l.target ? l : lnk)})); setSelectedLink(l);}} onUpdateNode={n => {setGraphData(p => ({...p, nodes: p.nodes.map(node => node.id === n.id ? n : node)})); setSelectedNode(n);}} /></div> }
    </div>
  );
}
