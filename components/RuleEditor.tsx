
import React, { useState } from 'react';
import { GameData, Rule, InteractionType, RuleTrigger, Sound } from '../types';
import { TRIGGER_MAGNETS, EFFECT_MAGNETS, SCENE_WIDTH, SCENE_HEIGHT } from '../constants';
import { Trash2, Square, ArrowRight, Trophy, HelpCircle, Hand, Eye, DoorOpen, Utensils, Skull, Puzzle, Ban, RotateCw, Globe, MapPin, X, Timer, ChevronsRight, Flag, Hourglass, Sparkles, Crosshair, Volume2, VolumeX } from 'lucide-react';
import { SoundRecorder } from './SoundRecorder';

interface RuleEditorProps {
  gameData: GameData;
  onUpdateRules: (rules: Rule[]) => void;
  onUpdateSounds: (sounds: Sound[]) => void; // NEW
  currentSceneId: string;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ gameData, onUpdateRules, onUpdateSounds, currentSceneId }) => {
  const [isDraggingOverBoard, setIsDraggingOverBoard] = useState(false);
  const [viewScope, setViewScope] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');
  
  // State for Position Picker Modal
  const [pickingLocationFor, setPickingLocationFor] = useState<{ruleId: string, effectIndex: number} | null>(null);
  
  // State for Sound Modal
  const [recordingForRuleId, setRecordingForRuleId] = useState<string | null>(null);

  const activeScopeId = viewScope === 'GLOBAL' ? 'GLOBAL' : currentSceneId;
  const filteredRules = gameData.rules.filter(r => r.scope === activeScopeId);
  const currentScene = gameData.scenes.find(s => s.id === currentSceneId) || gameData.scenes[0];

  // --- HELPER: Get Icon Component ---
  const getIcon = (name: string) => {
      switch(name) {
          case 'eye': return <Eye size={20} strokeWidth={3} />;
          case 'hand': return <Hand size={20} strokeWidth={3} />;
          case 'flag': return <Flag size={20} strokeWidth={3} />;
          case 'hourglass': return <Hourglass size={20} strokeWidth={3} />;
          case 'square': return <Square size={20} strokeWidth={3} />;
          case 'utensils': return <Utensils size={20} strokeWidth={3} />;
          case 'arrow-right': return <ArrowRight size={20} strokeWidth={3} />;
          case 'trophy': return <Trophy size={20} strokeWidth={3} />;
          case 'door-open': return <DoorOpen size={20} strokeWidth={3} />;
          case 'skull': return <Skull size={20} strokeWidth={3} />;
          case 'ban': return <Ban size={32} strokeWidth={4} />;
          case 'timer': return <Timer size={20} strokeWidth={3} />;
          case 'sparkles': return <Sparkles size={20} strokeWidth={3} />;
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

  const handleSlotDrop = (e: React.DragEvent, ruleId: string, slot: 'subject' | 'object' | 'effects' | 'trigger_modifier', effectIndex?: number) => {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData("type");
      
      if (type === "NEW_FROM_BAR" || type === "ACTOR_SELECT") {
          // Dragging an Actor into Subject or Object slot
          const actorId = e.dataTransfer.getData("actorId");
          if (actorId) {
              if (slot === 'subject' || slot === 'object') {
                onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, [slot === 'subject' ? 'subjectId' : 'objectId']: actorId } : r));
              }
              // Handle SPAWN actor slot
              if (slot === 'effects' && typeof effectIndex === 'number') {
                  onUpdateRules(gameData.rules.map(r => {
                      if (r.id === ruleId) {
                          const newEffects = [...r.effects];
                          if (newEffects[effectIndex].type === InteractionType.SPAWN) {
                              newEffects[effectIndex] = { ...newEffects[effectIndex], spawnActorId: actorId };
                          }
                          return { ...r, effects: newEffects };
                      }
                      return r;
                  }));
              }
          }
      }
      else if (type === "NEW_EFFECT_MAGNET") {
          const interaction = e.dataTransfer.getData("interaction") as InteractionType;
          if (slot === 'effects') {
             onUpdateRules(gameData.rules.map(r => {
                 if (r.id === ruleId) {
                     return { ...r, effects: [...r.effects, { type: interaction }] };
                 }
                 return r;
             }));
          }
      }
      else if (type === "NOT_STICKER" && slot === 'trigger_modifier') {
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

  const setSpawnLocation = (x: number, y: number) => {
      if (!pickingLocationFor) return;
      const { ruleId, effectIndex } = pickingLocationFor;

      onUpdateRules(gameData.rules.map(r => {
          if (r.id === ruleId) {
              const newEffects = [...r.effects];
              newEffects[effectIndex] = { ...newEffects[effectIndex], spawnX: x, spawnY: y };
              return { ...r, effects: newEffects };
          }
          return r;
      }));
      setPickingLocationFor(null);
  };

  const handleSoundSave = (base64: string) => {
      if (!recordingForRuleId) return;
      
      const soundId = Math.random().toString(36).substr(2, 9);
      const newSound: Sound = {
          id: soundId,
          name: `Sound ${gameData.sounds.length + 1}`,
          data: base64
      };
      
      // Add Sound to Library
      onUpdateSounds([...(gameData.sounds || []), newSound]);

      // Attach Sound to Rule
      onUpdateRules(gameData.rules.map(r => r.id === recordingForRuleId ? { ...r, soundId } : r));
      
      setRecordingForRuleId(null);
  };

  const getTriggerLabel = (trigger: RuleTrigger, invert?: boolean) => {
      if (trigger === RuleTrigger.START) return "GAME STARTS";
      if (trigger === RuleTrigger.TIMER) return "EVERY 2 SEC";
      if (trigger === RuleTrigger.COLLISION) return invert ? "TOUCHING" : "TOUCHES";
      return "IS CLICKED";
  };

  return (
    <div className="w-full h-full flex flex-row p-4 gap-4 relative">
      
      {/* --- MODAL: SOUND RECORDER --- */}
      {recordingForRuleId && (
          <SoundRecorder 
              onSave={handleSoundSave}
              onClose={() => setRecordingForRuleId(null)}
          />
      )}

      {/* --- MODAL: POSITION PICKER --- */}
      {pickingLocationFor && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
              <div className="bg-white p-4 border-4 border-black rounded-xl shadow-2xl flex flex-col items-center gap-4 sketch-box">
                  <h3 className="font-bold text-xl">CLICK WHERE TO SPAWN!</h3>
                  <div 
                    className="relative bg-gray-100 cursor-crosshair border-2 border-black overflow-hidden"
                    style={{ width: '400px', height: '300px' }}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = SCENE_WIDTH / 400;
                        const x = (e.clientX - rect.left) * ratio;
                        const y = (e.clientY - rect.top) * ratio;
                        setSpawnLocation(x - 40, y - 40);
                    }}
                  >
                      {currentScene.objects.map(obj => (
                          <img key={obj.id} src={getActorImage(obj.actorId)} className="absolute opacity-50 grayscale" style={{ left: obj.x / 2, top: obj.y / 2, width: 40, height: 40 }}/>
                      ))}
                  </div>
                  <button onClick={() => setPickingLocationFor(null)} className="sketch-btn px-6 py-2 bg-red-100 font-bold">CANCEL</button>
              </div>
          </div>
      )}

      {/* --- LEFT: TRIGGERS (WHEN) --- */}
      <div className="w-44 bg-yellow-100 border-[3px] border-black/10 p-4 flex flex-col gap-6 items-center shadow-inner rounded-l-lg overflow-y-auto">
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
                    <div className="w-10 h-10 rounded flex items-center justify-center text-black border border-black" style={{ backgroundColor: mag.color }}>
                        {getIcon(mag.icon)}
                    </div>
                    <span className="font-bold text-md text-center leading-none">{mag.label}</span>
                </div>
            ))}
          </div>
          <div className="w-full h-[2px] bg-black/10 my-2"></div>
          <div className="w-full flex flex-col items-center gap-4">
              <h3 className="font-bold text-lg text-red-800 flex items-center gap-2">MODIFIERS</h3>
              <div draggable="true" onDragStart={(e) => e.dataTransfer.setData("type", "NOT_STICKER")} className="w-20 h-20 bg-white border-2 border-red-500 rounded-full flex items-center justify-center shadow-md cursor-grab hover:scale-110 transition-transform">
                  <Ban size={48} strokeWidth={3} className="text-red-500" />
              </div>
              <div className="text-xs text-center text-gray-500">Drag on a "WHEN" icon to reverse it!</div>
          </div>
      </div>

      {/* --- CENTER: THE STORY BOARD --- */}
      <div className="flex-1 flex flex-col bg-white border-[8px] border-[#d4a373] rounded-xl shadow-2xl relative overflow-hidden">
          <div className="h-16 bg-[#f3e5f5] border-b-[3px] border-[#d4a373] flex items-center justify-center gap-4 shrink-0">
              <button onClick={() => setViewScope('GLOBAL')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'GLOBAL' ? 'bg-blue-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}>
                  <Globe size={20} /> WORLD RULES
              </button>
              <button onClick={() => setViewScope('LOCAL')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'LOCAL' ? 'bg-orange-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}>
                  <MapPin size={20} /> THIS SCENE RULES
              </button>
          </div>

          <div 
            className={`flex-1 overflow-y-auto p-8 flex flex-col items-center gap-6 transition-colors ${isDraggingOverBoard ? 'bg-blue-50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOverBoard(true); }}
            onDragLeave={() => setIsDraggingOverBoard(false)}
            onDrop={handleBoardDrop}
          >
             {filteredRules.length === 0 && (
                 <div className="text-gray-300 text-2xl font-bold text-center mt-20 border-4 border-dashed border-gray-200 p-8 rounded-xl rotate-[-2deg] select-none">
                     No rules yet.<br/><br/>Drag a "STARTER" here to begin!
                 </div>
             )}

             {filteredRules.map((rule) => (
                 <div key={rule.id} className="relative w-full max-w-5xl bg-white/90 border-[3px] border-black rounded-full pl-4 pr-12 py-3 flex items-center justify-between shadow-[4px_4px_0px_rgba(0,0,0,0.2)] animate-[wiggle_1s_ease-in-out_infinite]">
                     <button onClick={() => removeRule(rule.id)} className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-2 border-2 border-black hover:scale-110 transition-transform shadow-sm z-20">
                        <Trash2 size={18} />
                     </button>

                     <div className="flex items-center gap-2 w-full justify-between">
                        {/* --- LEFT SIDE: THE TRIGGER --- */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-2 relative group">
                                <div className="font-['Space_Mono'] font-bold text-sm text-gray-400">WHEN</div>
                                <div 
                                    className="relative group"
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                                    onDrop={(e) => { e.currentTarget.classList.remove('scale-110'); handleSlotDrop(e, rule.id, 'trigger_modifier'); }}
                                >
                                    <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center" style={{ backgroundColor: TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.color || '#fff' }}>
                                        {getIcon(TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.icon || 'help')}
                                    </div>
                                    {rule.invert && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Ban size={48} className="text-red-500 drop-shadow-md opacity-80" strokeWidth={3}/></div>}
                                    
                                    {/* --- SOUND BUTTON HOVER --- */}
                                    <button 
                                        onClick={() => setRecordingForRuleId(rule.id)}
                                        className={`absolute -bottom-2 -left-2 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-20 ${rule.soundId ? 'bg-green-400' : 'bg-gray-200 hover:bg-green-200'}`}
                                        title={rule.soundId ? "Change Sound" : "Add Sound Effect"}
                                    >
                                        {rule.soundId ? <Volume2 size={16} /> : <VolumeX size={16} className="text-gray-500" />}
                                    </button>

                                </div>
                            </div>

                            {rule.trigger !== RuleTrigger.START && (
                                <div className={`w-16 h-16 border-2 border-dashed ${rule.subjectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`} onDragOver={(e) => {e.preventDefault(); e.currentTarget.classList.add('bg-blue-100')}} onDragLeave={(e)=>e.currentTarget.classList.remove('bg-blue-100')} onDrop={(e)=>{e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'subject')}}>
                                    {rule.subjectId ? <img src={getActorImage(rule.subjectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                </div>
                            )}

                            <div className="font-['Space_Mono'] font-bold text-sm text-gray-400 flex flex-col items-center px-2">
                                {rule.invert && <span className="text-red-500 font-bold text-lg animate-pulse">IS NOT</span>}
                                <span>{getTriggerLabel(rule.trigger, rule.invert)}</span>
                            </div>

                            {rule.trigger === RuleTrigger.COLLISION && (
                                <div className={`w-16 h-16 border-2 border-dashed ${rule.objectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`} onDragOver={(e) => {e.preventDefault(); e.currentTarget.classList.add('bg-blue-100')}} onDragLeave={(e)=>e.currentTarget.classList.remove('bg-blue-100')} onDrop={(e)=>{e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'object')}}>
                                    {rule.objectId ? <img src={getActorImage(rule.objectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                </div>
                            )}
                        </div>

                        <ArrowRight size={24} className="text-black/20 shrink-0 mx-2" />

                        {/* --- RIGHT SIDE: MULTIPLE EFFECTS --- */}
                        <div className={`flex-1 min-h-[80px] border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex items-center gap-2 relative p-2 overflow-x-auto`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-green-50'); }} onDragLeave={(e) => { e.currentTarget.classList.remove('bg-green-50'); }} onDrop={(e) => { e.currentTarget.classList.remove('bg-green-50'); handleSlotDrop(e, rule.id, 'effects'); }}>
                            {rule.effects.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-xs text-gray-400 font-bold animate-pulse">DRAG EFFECTS HERE</span></div>}

                            {rule.effects.map((effect, idx) => {
                                if (effect.type === InteractionType.THEN) {
                                    return (
                                        <div key={idx} className="relative group shrink-0 flex items-center justify-center w-10">
                                             <ChevronsRight size={32} className="text-gray-400" />
                                             <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center hover:scale-110"><X size={10} /></button>
                                        </div>
                                    );
                                }
                                return (
                                <div key={idx} className="relative group shrink-0">
                                    <div className="flex flex-col items-center bg-white border-2 border-green-500 rounded-lg p-1 shadow-sm min-w-[80px]">
                                        <div className="w-8 h-8 rounded bg-green-100 border border-black flex items-center justify-center mb-1">{getIcon(EFFECT_MAGNETS.find(m => m.type === effect.type)?.icon || '')}</div>
                                        <span className="font-bold text-[10px]">{EFFECT_MAGNETS.find(m => m.type === effect.type)?.label}</span>
                                        
                                        {effect.type === InteractionType.CHANGE_SCENE && (
                                            <button onClick={() => cycleSceneTarget(rule.id, idx, effect.targetSceneId)} className="mt-1 bg-purple-100 border border-black px-1 rounded text-[10px] font-bold hover:bg-purple-200 flex items-center gap-1">SCENE {gameData.scenes.findIndex(s => s.id === effect.targetSceneId) + 1 || '?'} <RotateCw size={8}/></button>
                                        )}
                                        {effect.type === InteractionType.SPAWN && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <div className="w-6 h-6 border border-dashed border-black bg-gray-100 rounded overflow-hidden" onDragOver={(e) => {e.preventDefault(); e.currentTarget.classList.add('bg-purple-200')}} onDragLeave={(e) => e.currentTarget.classList.remove('bg-purple-200')} onDrop={(e) => {e.currentTarget.classList.remove('bg-purple-200'); handleSlotDrop(e, rule.id, 'effects', idx)}} title="Drag Actor to Spawn">
                                                    {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <span className="text-[8px] flex items-center justify-center h-full">?</span>}
                                                </div>
                                                <button onClick={() => setPickingLocationFor({ruleId: rule.id, effectIndex: idx})} className={`w-6 h-6 rounded border border-black flex items-center justify-center hover:bg-purple-200 ${effect.spawnX ? 'bg-purple-300' : 'bg-white'}`} title="Set Spawn Location"><Crosshair size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center hover:scale-110"><X size={12} /></button>
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
              <div key={mag.type} draggable="true" onDragStart={(e) => {e.dataTransfer.setData("type", "NEW_EFFECT_MAGNET"); e.dataTransfer.setData("interaction", mag.type);}} className="w-full bg-white border-2 border-green-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group">
                  <div className="font-bold text-sm text-green-600">THEN...</div>
                  <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm" style={{ backgroundColor: mag.color }}>{getIcon(mag.icon)}</div>
                  <span className="font-bold text-md text-center leading-none">{mag.label}</span>
              </div>
          ))}
      </div>

    </div>
  );
};
