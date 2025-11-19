import React, { useState, useEffect } from 'react';
import { CharacterNode, RelationshipLink, EmotionalAxes } from '../types';

interface DetailPanelProps {
  selectedNode: CharacterNode | null;
  selectedLink: RelationshipLink | null;
  onClose: () => void;
  onUpdateLink: (updatedLink: RelationshipLink) => void;
  onUpdateNode: (updatedNode: CharacterNode) => void;
}

const AxisSlider = ({ label, value, colorClass, isEditing, onChange }: { label: string, value: number, colorClass: string, isEditing: boolean, onChange: (val: number) => void }) => (
  <div className="mb-2">
    <div className="flex justify-between text-[9px] uppercase tracking-wider text-slate-400 mb-1"><span>{label}</span><span className={isEditing ? "text-white font-bold" : ""}>{value}</span></div>
    {isEditing ? ( <input type="range" min="-100" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" /> ) : ( <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex items-center relative"><div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/50"></div><div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.abs(value) / 2}%`, marginLeft: value >= 0 ? '50%' : `${50 - (Math.abs(value) / 2)}%` }} /></div> )}
  </div>
);

export const DetailPanel: React.FC<DetailPanelProps> = ({ selectedNode, selectedLink, onClose, onUpdateLink, onUpdateNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLink, setEditLink] = useState<RelationshipLink | null>(null);
  const [editNode, setEditNode] = useState<CharacterNode | null>(null);

  useEffect(() => { setIsEditing(false); if (selectedLink) setEditLink({...selectedLink}); if (selectedNode) setEditNode({...selectedNode}); }, [selectedLink, selectedNode]);

  const handleSave = () => {
    if (selectedLink && editLink) {
        let maxVal = -1, dom = editLink.dominantEmotion;
        (Object.keys(editLink.emotions) as (keyof EmotionalAxes)[]).forEach(key => { if (Math.abs(editLink.emotions[key]) > maxVal) { maxVal = Math.abs(editLink.emotions[key]); dom = key; }});
        onUpdateLink({ ...editLink, dominantEmotion: dom });
    }
    if (selectedNode && editNode) onUpdateNode(editNode);
    setIsEditing(false);
  };

  if (!selectedNode && !selectedLink) return <div className="h-full flex items-center justify-center text-slate-500">Select a node or link.</div>;

  const axisConfig: {key: keyof EmotionalAxes, color: string}[] = [
      {key: 'love', color: 'bg-pink-500'}, {key: 'friendship', color: 'bg-green-500'}, {key: 'kinship', color: 'bg-teal-500'},
      {key: 'trust', color: 'bg-blue-500'}, {key: 'respect', color: 'bg-amber-500'}, {key: 'desire', color: 'bg-rose-700'},
      {key: 'fear', color: 'bg-purple-600'}, {key: 'discipline', color: 'bg-slate-400'}, {key: 'power', color: 'bg-red-800'}
  ];

  return (
    <div className="h-full p-6 border-l border-slate-800 bg-slate-900/95 overflow-y-auto">
      <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-cyan-400">{selectedNode ? 'Entity Profile' : '9-Axis Analysis'}</h2><div><button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white">{isEditing ? 'Save' : 'Edit'}</button><button onClick={onClose} className="text-slate-400 hover:text-white ml-2">✖</button></div></div>
      
      {selectedNode && editNode && (
        <div className="space-y-4">
          <div><label className="text-xs text-slate-500">Name</label>{isEditing ? <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" value={editNode.name} onChange={e => setEditNode({...editNode, name: e.target.value})} /> : <div className="text-2xl font-mono text-white">{selectedNode.name}</div>}</div>
          <div className="p-3 bg-slate-800/50 rounded"><label className="text-xs text-slate-500">Mood</label>{isEditing ? <input className="w-full bg-slate-900 text-slate-200" value={editNode.currentMood} onChange={e => setEditNode({...editNode, currentMood: e.target.value})} /> : <div className="text-slate-200">{selectedNode.currentMood}</div>}</div>
        </div>
      )}

      {selectedLink && editLink && (
        <div className="space-y-6">
           <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700">
              <div className="text-center"><div className="font-bold text-xs text-slate-300">{editLink.source}</div></div><div className="text-slate-500">➔</div><div className="text-center"><div className="font-bold text-xs text-slate-300">{editLink.target}</div></div>
           </div>
           <div className="grid grid-cols-3 gap-3 bg-slate-950/30 p-3 rounded border border-slate-800">
                {axisConfig.map(ax => (
                    <AxisSlider key={ax.key} label={ax.key} value={editLink.emotions[ax.key]} colorClass={ax.color} isEditing={isEditing} onChange={val => setEditLink({...editLink, emotions: {...editLink.emotions, [ax.key]: val}})} />
                ))}
           </div>
           {!isEditing && editLink.potentialActions && (
             <div className="space-y-2">
                <label className="text-[9px] text-cyan-400 font-bold">Forecast</label>
                {editLink.potentialActions.map((act, i) => (
                    <div key={i}><div className="flex justify-between text-[10px] text-slate-300"><span>{act.action}</span><span>{act.probability}%</span></div><div className="w-full h-1 bg-slate-800 rounded"><div className="h-full bg-cyan-600" style={{width: `${act.probability}%`}}></div></div></div>
                ))}
             </div>
           )}
           {!isEditing && (
               <div className="space-y-2 max-h-40 overflow-y-auto"><label className="text-[9px] text-slate-500">History</label>{selectedLink.history.slice(-5).reverse().map((ev, i) => <div key={i} className="text-[10px] p-2 bg-slate-800/30 rounded border border-slate-700 text-slate-300"><div>{ev.timestamp}</div><div>{ev.description}</div></div>)}</div>
           )}
        </div>
      )}
    </div>
  );
};