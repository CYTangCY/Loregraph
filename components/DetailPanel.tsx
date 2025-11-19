
import React, { useState, useEffect } from 'react';
import { CharacterNode, RelationshipLink, EmotionalAxes } from '../types';

interface DetailPanelProps {
  selectedNode: CharacterNode | null;
  selectedLink: RelationshipLink | null;
  onClose: () => void;
  onUpdateLink: (updatedLink: RelationshipLink) => void;
  onUpdateNode: (updatedNode: CharacterNode) => void;
}

const AxisSlider = ({ 
    label, 
    value, 
    colorClass, 
    isEditing, 
    onChange 
}: { 
    label: string, 
    value: number, 
    colorClass: string, 
    isEditing: boolean, 
    onChange: (val: number) => void 
}) => (
  <div className="mb-2">
    <div className="flex justify-between text-[9px] uppercase tracking-wider text-slate-400 mb-1">
      <span>{label}</span>
      <span className={isEditing ? "text-white font-bold" : ""}>{value}</span>
    </div>
    
    {isEditing ? (
        <div className="relative w-full h-4 flex items-center">
            <input 
                type="range" 
                min="-100" 
                max="100" 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
        </div>
    ) : (
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex items-center relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/50"></div>
            <div 
                className={`h-full transition-all duration-500 ${colorClass}`}
                style={{ 
                width: `${Math.abs(value) / 2}%`, 
                marginLeft: value >= 0 ? '50%' : `${50 - (Math.abs(value) / 2)}%`
                }}
            />
        </div>
    )}
  </div>
);

export const DetailPanel: React.FC<DetailPanelProps> = ({ selectedNode, selectedLink, onClose, onUpdateLink, onUpdateNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLink, setEditLink] = useState<RelationshipLink | null>(null);
  const [editNode, setEditNode] = useState<CharacterNode | null>(null);

  useEffect(() => {
    setIsEditing(false);
    if (selectedLink) setEditLink({...selectedLink});
    if (selectedNode) setEditNode({...selectedNode});
  }, [selectedLink, selectedNode]);

  const handleSave = () => {
    if (selectedLink && editLink) {
        let maxVal = -1;
        let dom = editLink.dominantEmotion;
        const axes: (keyof EmotionalAxes)[] = [
            'love', 'friendship', 'kinship', 'trust', 'fear', 'respect', 
            'desire', 'discipline', 'power'
        ];
        axes.forEach(key => {
             if (Math.abs(editLink.emotions[key]) > maxVal) {
                 maxVal = Math.abs(editLink.emotions[key]);
                 dom = key;
             }
        });
        onUpdateLink({ ...editLink, dominantEmotion: dom });
    }
    if (selectedNode && editNode) {
        onUpdateNode(editNode);
    }
    setIsEditing(false);
  };

  if (!selectedNode && !selectedLink) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center border-l border-slate-800 bg-slate-900/80">
        <p className="text-sm">Select a node or link.</p>
      </div>
    );
  }

  return (
    <div className="h-full p-6 border-l border-slate-800 bg-slate-900/95 overflow-y-auto scrollbar-thin">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-cyan-400">
          {selectedNode ? 'Entity Profile' : '9-Axis Analysis'}
        </h2>
        <div className="flex gap-2">
             <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                className={`text-[10px] px-2 py-1 rounded border ${isEditing ? 'bg-green-900/50 border-green-600 text-green-400 hover:bg-green-900' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:border-white'}`}
             >
                {isEditing ? 'Save' : 'Edit'}
             </button>
             <button onClick={onClose} className="text-slate-400 hover:text-white ml-2">✖</button>
        </div>
      </div>

      {/* NODE EDITING */}
      {selectedNode && editNode && (
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500">Name</label>
            {isEditing ? (
                <input 
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white mt-1"
                    value={editNode.name}
                    onChange={(e) => setEditNode({...editNode, name: e.target.value})}
                />
            ) : (
                <div className="text-2xl font-mono text-white">{selectedNode.name}</div>
            )}
          </div>
          <div>
             <span className="inline-block px-2 py-1 rounded bg-purple-900/30 border border-purple-500/50 text-purple-300 text-xs">
              {selectedNode.archetype}
            </span>
          </div>
          <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
            <label className="text-xs text-slate-500 block mb-1">Current Mood</label>
             {isEditing ? (
                <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm"
                    value={editNode.currentMood}
                    onChange={(e) => setEditNode({...editNode, currentMood: e.target.value})}
                />
            ) : (
                <div className="text-slate-200">{selectedNode.currentMood}</div>
            )}
          </div>
        </div>
      )}

      {/* LINK EDITING */}
      {selectedLink && editLink && (
        <div className="space-y-6">
           {/* Header */}
           <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700">
              <div className="text-center">
                <div className="text-[9px] text-slate-500">Subject</div>
                <div className="font-bold text-xs text-slate-300">{editLink.source}</div>
              </div>
              <div className="text-slate-500">➔</div>
              <div className="text-center">
                <div className="text-[9px] text-slate-500">Target</div>
                <div className="font-bold text-xs text-slate-300">{editLink.target}</div>
              </div>
           </div>

           {/* 9-Axis Spectrum Grid */}
           <div className="pt-2">
             <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-2">Emotional Matrix</label>
             
             <div className="grid grid-cols-3 gap-x-3 gap-y-3 bg-slate-950/30 p-3 rounded border border-slate-800">
                <AxisSlider 
                    label="Love" value={editLink.emotions.love} 
                    colorClass="bg-pink-500" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, love: val}})}
                />
                <AxisSlider 
                    label="Friendship" value={editLink.emotions.friendship} 
                    colorClass="bg-green-500" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, friendship: val}})}
                />
                <AxisSlider 
                    label="Kinship" value={editLink.emotions.kinship} 
                    colorClass="bg-teal-500" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, kinship: val}})}
                />
                <AxisSlider 
                    label="Trust" value={editLink.emotions.trust} 
                    colorClass="bg-blue-500" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, trust: val}})}
                />
                <AxisSlider 
                    label="Respect" value={editLink.emotions.respect} 
                    colorClass="bg-amber-500" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, respect: val}})}
                />
                <AxisSlider 
                    label="Desire" value={editLink.emotions.desire} 
                    colorClass="bg-rose-700" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, desire: val}})}
                />
                 <AxisSlider 
                    label="Fear" value={editLink.emotions.fear} 
                    colorClass="bg-purple-600" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, fear: val}})}
                />
                <AxisSlider 
                    label="Discipline" value={editLink.emotions.discipline} 
                    colorClass="bg-slate-400" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, discipline: val}})}
                />
                <AxisSlider 
                    label="Power" value={editLink.emotions.power} 
                    colorClass="bg-red-800" isEditing={isEditing}
                    onChange={(val) => setEditLink({...editLink, emotions: {...editLink.emotions, power: val}})}
                />
             </div>
           </div>

           {/* Decision Matrix */}
           {!isEditing && editLink.potentialActions && (
             <div>
                <label className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold mb-2 block mt-4">
                  Projected Decision Matrix
                </label>
                <div className="space-y-3">
                    {editLink.potentialActions.map((act, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                                <span className="font-bold">{act.action}</span>
                                <span>{act.probability}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-600 to-blue-500" 
                                    style={{width: `${act.probability}%`}}
                                ></div>
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5 italic truncate">{act.formula}</div>
                        </div>
                    ))}
                </div>
             </div>
           )}

           {/* History Log */}
           {!isEditing && (
               <div>
                 <label className="text-[9px] uppercase tracking-wider text-slate-500 mb-2 block mt-6">History</label>
                 <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedLink.history.slice(-5).reverse().map((event, idx) => (
                      <div key={idx} className="p-2 rounded-md bg-slate-800/30 border border-slate-700 text-[10px]">
                        <div className="flex justify-between mb-1 text-slate-500 font-mono">
                          <span>{event.timestamp || 'Rec'}</span>
                        </div>
                        <p className="text-slate-300 mb-1 leading-tight">{event.description}</p>
                        
                        {event.affectedAxes && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(event.affectedAxes).map(([key, val]) => (
                              val !== 0 && (
                                <span key={key} className={`px-1 rounded text-[9px] border ${val > 0 ? 'border-green-800 bg-green-900/20 text-green-400' : 'border-red-800 bg-red-900/20 text-red-400'}`}>
                                  {key.slice(0,3).toUpperCase()} {val > 0 ? '+' : ''}{val}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                 </div>
               </div>
           )}
        </div>
      )}
    </div>
  );
};
