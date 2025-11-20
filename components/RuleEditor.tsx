
import React, { useState } from 'react';
import { GameData, Rule, InteractionType, RuleTrigger } from '../types';
import { TRIGGER_MAGNETS, EFFECT_MAGNETS } from '../constants';
import { Trash2, Square, ArrowRight, Trophy, HelpCircle, Hand, Eye, DoorOpen, Utensils, Skull, Puzzle, Ban, RotateCw, Globe, MapPin, X, Timer, ChevronsRight } from 'lucide-react';

interface RuleEditorProps {
  gameData: GameData;
  onUpdateRules: (rules: Rule[]) => void;
  currentSceneId: string;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ gameData, onUpdateRules, currentSceneId }) => {
  const [isDraggingOverBoard, setIsDraggingOverBoard] = useState(false);
  const [viewScope, setViewScope] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');

  const activeScopeId = viewScope === 'GLOBAL' ? 'GLOBAL' : currentSceneId;

  // Filter rules based on selected scope
  const filteredRules = gameData.rules.filter(r => r.scope === activeScopeId);

  // --- HELPER: Get Icon Component ---
  const getIcon = (name: string) => {
      switch(name) {
          case 'eye': return <Eye size={20} strokeWidth={3} />;
          case 'hand': return <Hand size={20} strokeWidth={3} />;
          case 'square': return <Square size={20} strokeWidth={3} />;
          case 'utensils': return <Utensils size={20} strokeWidth={3} />;
          case 'arrow-right': return <ArrowRight size={20} strokeWidth={3} />;
          case 'trophy': return <Trophy size={20} strokeWidth={3} />;
          case 'door-open': return <DoorOpen size={20} strokeWidth={3} />;
          case 'skull': return <Skull size={20} strokeWidth={3} />;
          case 'ban': return <Ban size={32} strokeWidth={4} />;
          case 'timer': return <Timer size={20} strokeWidth={3} />;
          default: return <HelpCircle size={20} />;
      }
  };

  // --- ACTIONS ---

  const handleBoardDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOverBoard(false);
      const type = e.dataTransfer.getData("type");

      if (type === "NEW_TRIGGER_MAGNET") {
          const trigger = e.dataTransfer.getData("trigger") as RuleTrigger;
          
          const newRule: Rule = {
              id: Math.random().toString(36).substr(2, 9),
              scope: activeScopeId,
              trigger: trigger,
              subjectId: '', 
              objectId: '', 
              effects: [] // Start empty
          };
          onUpdateRules([...gameData.rules, newRule]);
      }
  };

  const handleSlotDrop = (e: React.DragEvent, ruleId: string, slot: 'subject' | 'object' | 'effects' | 'trigger_modifier') => {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData("type");
      
      if (type === "NEW_FROM_BAR" || type === "ACTOR_SELECT") {
          // Dragging an Actor into Subject or Object slot
          const actorId = e.dataTransfer.getData("actorId");
          if (actorId && (slot === 'subject' || slot === 'object')) {
              onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, [slot === 'subject' ? 'subjectId' : 'objectId']: actorId } : r));
          }
      }
      else if (type === "NEW_EFFECT_MAGNET") {
          // Dragging an Effect into Effects List
          const interaction = e.dataTransfer.getData("interaction") as InteractionType;
          if (slot === 'effects') {
             onUpdateRules(gameData.rules.map(r => {
                 if (r.id === ruleId) {
                     // Append new effect
                     return { ...r, effects: [...r.effects, { type: interaction }] };
                 }
                 return r;
             }));
          }
      }
      else if (type === "NOT_STICKER" && slot === 'trigger_modifier') {
          // Applying NOT logic
          onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, invert: !r.invert } : r));
      }
  };

  const removeRule = (ruleId: string) => {
      onUpdateRules(gameData.rules.filter(r => r.id !== ruleId));
  };

  const removeEffect = (ruleId: string, effectIndex: number) => {
      onUpdateRules(gameData.rules.map(r => {
          if (r.id === ruleId) {
              const newEffects = [...r.effects];
              newEffects.splice(effectIndex, 1);
              return { ...r, effects: newEffects };
          }
          return r;
      }));
  };

  const getActorImage = (id: string) => {
      return gameData.actors.find(a => a.id === id)?.imageData;
  };

  const cycleSceneTarget = (ruleId: string, effectIndex: number, currentTarget?: string) => {
      const sceneIds = gameData.scenes.map(s => s.id);
      const currentIdx = currentTarget ? sceneIds.indexOf(currentTarget) : -1;
      const nextIdx = (currentIdx + 1) % sceneIds.length;
      const nextId = sceneIds[nextIdx];
      
      onUpdateRules(gameData.rules.map(r => {
          if (r.id === ruleId) {
              const newEffects = [...r.effects];
              newEffects[effectIndex] = { ...newEffects[effectIndex], targetSceneId: nextId };
              return { ...r, effects: newEffects };
          }
          return r;
      }));
  };

  return (
    <div className="w-full h-full flex flex-row p-4 gap-4">
      
      {/* --- LEFT: TRIGGERS (WHEN) --- */}
      <div className="w-44 bg-yellow-100 border-[3px] border-black/10 p-4 flex flex-col gap-6 items-center shadow-inner rounded-l-lg overflow-y-auto">
          
          {/* STARTERS */}
          <div className="w-full flex flex-col items-center gap-4">
            <h3 className="font-bold text-xl text-yellow-800 flex items-center gap-2"><Puzzle size={20} /> STARTERS</h3>
            {TRIGGER_MAGNETS.map((mag) => (
                <div 
                    key={mag.type}
                    draggable="true"
                    onDragStart={(e) => {
                        e.dataTransfer.setData("type", "NEW_TRIGGER_MAGNET");
                        e.dataTransfer.setData("trigger", mag.type);
                    }}
                    className="w-full bg-white border-2 border-yellow-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1"
                >
                    <div className="font-bold text-sm">WHEN...</div>
                    <div className="w-10 h-10 rounded bg-yellow-300 flex items-center justify-center text-black border border-black">{getIcon(mag.icon)}</div>
                    <span className="font-bold text-md text-center leading-none">{mag.label}</span>
                </div>
            ))}
          </div>

          <div className="w-full h-[2px] bg-black/10 my-2"></div>

          {/* MODIFIERS */}
          <div className="w-full flex flex-col items-center gap-4">
              <h3 className="font-bold text-lg text-red-800 flex items-center gap-2">MODIFIERS</h3>
              <div 
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData("type", "NOT_STICKER")}
                className="w-20 h-20 bg-white border-2 border-red-500 rounded-full flex items-center justify-center shadow-md cursor-grab hover:scale-110 transition-transform"
              >
                  <Ban size={48} strokeWidth={3} className="text-red-500" />
              </div>
              <div className="text-xs text-center text-gray-500">Drag on a "WHEN" icon to reverse it!</div>
          </div>

      </div>

      {/* --- CENTER: THE STORY BOARD --- */}
      <div className="flex-1 flex flex-col bg-white border-[8px] border-[#d4a373] rounded-xl shadow-2xl relative overflow-hidden">
          
          {/* SCOPE SWITCHER HEADER */}
          <div className="h-16 bg-[#f3e5f5] border-b-[3px] border-[#d4a373] flex items-center justify-center gap-4 shrink-0">
              <button 
                onClick={() => setViewScope('GLOBAL')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'GLOBAL' ? 'bg-blue-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}
              >
                  <Globe size={20} /> WORLD RULES
              </button>
              <button 
                onClick={() => setViewScope('LOCAL')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'LOCAL' ? 'bg-orange-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}
              >
                  <MapPin size={20} /> THIS SCENE RULES
              </button>
          </div>

          {/* RULES LIST AREA */}
          <div 
            className={`flex-1 overflow-y-auto p-8 flex flex-col items-center gap-6 transition-colors ${isDraggingOverBoard ? 'bg-blue-50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOverBoard(true); }}
            onDragLeave={() => setIsDraggingOverBoard(false)}
            onDrop={handleBoardDrop}
          >
             {/* Empty State */}
             {filteredRules.length === 0 && (
                 <div className="text-gray-300 text-2xl font-bold text-center mt-20 border-4 border-dashed border-gray-200 p-8 rounded-xl rotate-[-2deg] select-none">
                     No rules for {viewScope === 'GLOBAL' ? 'the whole world' : 'this scene'} yet.<br/><br/>
                     Drag a "STARTER" here to begin!
                 </div>
             )}

             {filteredRules.map((rule) => (
                 <div key={rule.id} className="relative w-full max-w-5xl bg-white/90 border-[3px] border-black rounded-full pl-4 pr-12 py-3 flex items-center justify-between shadow-[4px_4px_0px_rgba(0,0,0,0.2)] animate-[wiggle_1s_ease-in-out_infinite]">
                     
                     {/* DELETE BTN */}
                     <button 
                        onClick={() => removeRule(rule.id)}
                        className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-2 border-2 border-black hover:scale-110 transition-transform shadow-sm z-20"
                     >
                        <Trash2 size={18} />
                     </button>

                     {/* SENTENCE CONSTRUCTION */}
                     <div className="flex items-center gap-2 w-full justify-between">
                        
                        {/* --- LEFT SIDE: THE TRIGGER --- */}
                        <div className="flex items-center gap-2 shrink-0">
                            
                            {/* WHEN + ICON */}
                            <div className="flex items-center gap-2 relative group">
                                <div className="font-['Space_Mono'] font-bold text-sm text-gray-400">WHEN</div>
                                <div 
                                    className="relative"
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                                    onDrop={(e) => { e.currentTarget.classList.remove('scale-110'); handleSlotDrop(e, rule.id, 'trigger_modifier'); }}
                                >
                                    <div className="w-12 h-12 bg-yellow-300 border-2 border-black rounded-full flex items-center justify-center" title={rule.trigger}>
                                        {rule.trigger === RuleTrigger.COLLISION ? <Eye /> : <Hand />}
                                    </div>
                                    {rule.invert && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <Ban size={48} className="text-red-500 drop-shadow-md opacity-80" strokeWidth={3}/>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SUBJECT */}
                            <div 
                                className={`w-16 h-16 border-2 border-dashed ${rule.subjectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-100'); }}
                                onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'subject'); }}
                            >
                                {rule.subjectId ? <img src={getActorImage(rule.subjectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                            </div>

                            {/* CONNECTING TEXT */}
                            <div className="font-['Space_Mono'] font-bold text-sm text-gray-400 flex flex-col items-center px-2">
                                {rule.invert && <span className="text-red-500 font-bold text-lg animate-pulse">IS NOT</span>}
                                <span>
                                    {rule.trigger === RuleTrigger.COLLISION ? (rule.invert ? 'TOUCHING' : 'TOUCHES') : 'IS CLICKED'}
                                </span>
                            </div>

                            {/* OBJECT (If Collision) */}
                            {rule.trigger === RuleTrigger.COLLISION && (
                                <div 
                                    className={`w-16 h-16 border-2 border-dashed ${rule.objectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-100'); }}
                                    onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'object'); }}
                                >
                                    {rule.objectId ? <img src={getActorImage(rule.objectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                </div>
                            )}

                        </div>

                        {/* ARROW */}
                        <ArrowRight size={24} className="text-black/20 shrink-0 mx-2" />

                        {/* --- RIGHT SIDE: MULTIPLE EFFECTS --- */}
                        <div 
                             className={`flex-1 min-h-[80px] border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex items-center gap-2 relative p-2 overflow-x-auto`}
                             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-green-50'); }}
                             onDragLeave={(e) => { e.currentTarget.classList.remove('bg-green-50'); }}
                             onDrop={(e) => { e.currentTarget.classList.remove('bg-green-50'); handleSlotDrop(e, rule.id, 'effects'); }}
                        >
                            {rule.effects.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs text-gray-400 font-bold animate-pulse">DRAG EFFECTS HERE</span>
                                </div>
                            )}

                            {rule.effects.map((effect, idx) => {
                                // RENDER THEN (ARROW) differently
                                if (effect.type === InteractionType.THEN) {
                                    return (
                                        <div key={idx} className="relative group shrink-0 flex items-center justify-center w-10">
                                             <ChevronsRight size={32} className="text-gray-400" />
                                             {/* REMOVE EFFECT BTN */}
                                            <button 
                                                onClick={() => removeEffect(rule.id, idx)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center hover:scale-110"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                <div key={idx} className="relative group shrink-0">
                                    <div className="flex flex-col items-center bg-white border-2 border-green-500 rounded-lg p-1 shadow-sm min-w-[80px]">
                                        <div className="w-8 h-8 rounded bg-green-100 border border-black flex items-center justify-center mb-1">
                                            {getIcon(EFFECT_MAGNETS.find(m => m.type === effect.type)?.icon || '')}
                                        </div>
                                        <span className="font-bold text-[10px]">{EFFECT_MAGNETS.find(m => m.type === effect.type)?.label}</span>
                                        
                                        {/* SCENE SELECTOR */}
                                        {effect.type === InteractionType.CHANGE_SCENE && (
                                            <button 
                                                onClick={() => cycleSceneTarget(rule.id, idx, effect.targetSceneId)}
                                                className="mt-1 bg-purple-100 border border-black px-1 rounded text-[10px] font-bold hover:bg-purple-200 flex items-center gap-1"
                                            >
                                                SCENE {gameData.scenes.findIndex(s => s.id === effect.targetSceneId) + 1 || '?'}
                                                <RotateCw size={8}/>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* REMOVE EFFECT BTN */}
                                    <button 
                                        onClick={() => removeEffect(rule.id, idx)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center hover:scale-110"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                );
                            })}
                        </div>

                     </div>
                 </div>
             ))}
          </div>
      </div>

      {/* --- RIGHT: EFFECTS (DO) --- */}
      <div className="w-40 bg-green-100 border-[3px] border-black/10 p-4 flex flex-col gap-4 items-center shadow-inner rounded-r-lg overflow-y-auto">
          <h3 className="font-bold text-xl text-green-800 flex items-center gap-2">EFFECTS <Puzzle size={20} /></h3>
          {EFFECT_MAGNETS.map((mag) => (
              <div 
                key={mag.type}
                draggable="true"
                onDragStart={(e) => {
                    e.dataTransfer.setData("type", "NEW_EFFECT_MAGNET");
                    e.dataTransfer.setData("interaction", mag.type);
                }}
                className="w-full bg-white border-2 border-green-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group"
              >
                  <div className="font-bold text-sm text-green-600">THEN...</div>
                  <div 
                    className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm"
                    style={{ backgroundColor: mag.color }}
                  >
                      {getIcon(mag.icon)}
                  </div>
                  <span className="font-bold text-md text-center leading-none">{mag.label}</span>
              </div>
          ))}
      </div>

    </div>
  );
};
