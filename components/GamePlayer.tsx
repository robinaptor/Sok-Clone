
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GameData, InteractionType, LevelObject, RuleTrigger, RuleEffect } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trophy, Skull, MousePointer, DoorOpen } from 'lucide-react';

interface GamePlayerProps {
  gameData: GameData;
  currentSceneId: string;
  onExit: () => void;
  onNextScene: () => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ gameData, currentSceneId, onExit, onNextScene }) => {
  // State to override the scene ID locally if we jump scenes
  const [activeSceneId, setActiveSceneId] = useState(currentSceneId);
  const [objects, setObjects] = useState<LevelObject[]>([]);
  const [status, setStatus] = useState<'PLAYING' | 'WON' | 'LOST' | 'TRANSITION'>('PLAYING');
  
  // Dragging State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Keep track of executing rules to prevent double-triggering same sequence instantly
  const executingRuleIds = useRef<Set<string>>(new Set());

  // NEW: Keep track of active physical collisions to trigger rules only ON ENTER
  const activeCollisions = useRef<Set<string>>(new Set());

  // Init or Reset
  useEffect(() => { resetGame(currentSceneId); }, [currentSceneId]);

  const resetGame = (sceneId: string) => {
    setActiveSceneId(sceneId);
    const scene = gameData.scenes.find(s => s.id === sceneId) || gameData.scenes[0];
    setObjects(scene.objects.map(o => ({ ...o })));
    setStatus('PLAYING');
    setDraggingId(null);
    executingRuleIds.current.clear();
    activeCollisions.current.clear();
  };

  // Internal helper to switch scenes during play
  const jumpToScene = (targetId?: string) => {
      let nextId = targetId;
      if (!nextId) {
          // Default Next Logic
          const idx = gameData.scenes.findIndex(s => s.id === activeSceneId);
          if (idx >= 0 && idx < gameData.scenes.length - 1) {
              nextId = gameData.scenes[idx+1].id;
          } else {
              nextId = gameData.scenes[0].id; // Loop
          }
      }
      // Check if scene exists
      if (gameData.scenes.find(s => s.id === nextId)) {
          resetGame(nextId!);
      }
  };

  const getActor = useCallback((id: string) => gameData.actors.find(a => a.id === id), [gameData]);

  // Scope Filter: Get rules that apply to THIS scene OR are GLOBAL
  const getActiveRules = () => {
      return gameData.rules.filter(r => r.scope === 'GLOBAL' || r.scope === activeSceneId);
  };

  // --- HELPER: SOUND ---
  const playSound = (soundId: string) => {
      const sound = gameData.sounds?.find(s => s.id === soundId);
      if (sound) {
          try {
              const audio = new Audio(sound.data);
              audio.play();
          } catch (e) { console.error("Audio play failed", e); }
      }
  };

  // --- ASYNC RULE EXECUTOR ---
  const executeRuleEffects = async (ruleId: string, effects: RuleEffect[], relatedObjId: string, relatedActorId: string, soundId?: string) => {
      
      // Play Sound Immediately if exists
      if (soundId) playSound(soundId);

      for (const effect of effects) {
          // Sequence Delay
          if (effect.type === InteractionType.THEN) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              continue;
          }

          // State Changes (Can be async or instant)
          switch (effect.type) {
              case InteractionType.WIN:
                  setStatus('WON');
                  break;
              case InteractionType.DESTROY_SUBJECT: // The one who triggered it
                  setStatus('LOST'); 
                  break;
               case InteractionType.DESTROY_OBJECT: 
                  // Handled in collision logic mostly
                  break;
               case InteractionType.CHANGE_SCENE:
                  setStatus('TRANSITION');
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for visual
                  jumpToScene(effect.targetSceneId);
                  break;
               case InteractionType.SPAWN:
                   if (effect.spawnActorId && effect.spawnX !== undefined && effect.spawnY !== undefined) {
                       const newObj: LevelObject = {
                           id: Math.random().toString(36).substr(2, 9),
                           actorId: effect.spawnActorId,
                           x: effect.spawnX,
                           y: effect.spawnY,
                           isLocked: false // Spawns are generally interactive
                       };
                       setObjects(prev => [...prev, newObj]);
                   }
                   break;
               case InteractionType.PUSH:
                  // "Random Push" for automated things (Timer/Start)
                  setObjects(prev => prev.map(o => {
                      if (o.id === relatedObjId) {
                          const angle = Math.random() * Math.PI * 2;
                          const dist = 50;
                          let nx = o.x + Math.cos(angle) * dist;
                          let ny = o.y + Math.sin(angle) * dist;
                          nx = Math.max(0, Math.min(nx, SCENE_WIDTH - ACTOR_SIZE));
                          ny = Math.max(0, Math.min(ny, SCENE_HEIGHT - ACTOR_SIZE));
                          return { ...o, x: nx, y: ny };
                      }
                      return o;
                  }));
                  break;
          }
      }
  };

  // --- TRIGGER: START & TIMER ---
  useEffect(() => {
      if (status !== 'PLAYING') return; 

      const activeRules = getActiveRules();

      // 1. START TRIGGER (Runs once per scene reset)
      const startRules = activeRules.filter(r => r.trigger === RuleTrigger.START);
      
      startRules.forEach(rule => {
          // We ensure START rules run exactly once per reset by using the ref
          if (!executingRuleIds.current.has(rule.id)) {
               executingRuleIds.current.add(rule.id); 
               executeRuleEffects(rule.id, rule.effects, 'GLOBAL', 'GLOBAL', rule.soundId);
          }
      });

      // 2. TIMER TRIGGER (Runs interval)
      const timerRules = activeRules.filter(r => r.trigger === RuleTrigger.TIMER);

      const interval = setInterval(() => {
          if (status !== 'PLAYING') return;
          
          timerRules.forEach(rule => {
               const targets = objects.filter(o => o.actorId === rule.subjectId);
               if (targets.length > 0) {
                   targets.forEach(t => {
                        executeRuleEffects(rule.id, rule.effects, t.id, t.actorId, rule.soundId);
                   });
               } else if (!rule.subjectId) {
                   // Allow global timers (rare case but possible)
                   // executeRuleEffects(rule.id, rule.effects, 'GLOBAL', 'GLOBAL', rule.soundId);
               }
          });
      }, 2000); // Every 2 seconds

      return () => clearInterval(interval);
  }, [activeSceneId, status, objects.length]); 

  // AABB Collision
  const checkCollision = (rect1: {x: number, y: number}, rect2: {x: number, y: number}) => {
      const size = ACTOR_SIZE; 
      return (
          rect1.x < rect2.x + size &&
          rect1.x + size > rect2.x &&
          rect1.y < rect2.y + size &&
          rect1.y + size > rect2.y
      );
  };

  // --- TRIGGER: CLICK ---
  const handleMouseDown = async (e: React.MouseEvent, obj: LevelObject) => {
      if (status !== 'PLAYING') return;
      e.stopPropagation();

      // 1. Check Click Rules
      const activeRules = getActiveRules();
      const clickRules = activeRules.filter(r => r.trigger === RuleTrigger.CLICK && r.subjectId === obj.actorId);
      
      let ruleTriggered = false;
      for (const rule of clickRules) {
          if (executingRuleIds.current.has(rule.id)) continue; // Don't re-trigger if running

          ruleTriggered = true;
          executingRuleIds.current.add(rule.id);

          const immediateDestroys = rule.effects.some(e => e.type === InteractionType.DESTROY_SUBJECT || e.type === InteractionType.DESTROY_OBJECT);
          if (immediateDestroys) {
             setObjects(prev => prev.filter(o => o.id !== obj.id));
          }

          await executeRuleEffects(rule.id, rule.effects, obj.id, obj.actorId, rule.soundId);
          executingRuleIds.current.delete(rule.id);
      }

      if (ruleTriggered) return;

      if (!obj.isLocked) {
        dragOffset.current = {
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY
        };
        setDraggingId(obj.id);
      }
  };

  // --- TRIGGER: MOVE & COLLISION ---
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggingId || status !== 'PLAYING') return;

      const container = e.currentTarget.getBoundingClientRect();
      const scaleX = SCENE_WIDTH / container.width;
      const scaleY = SCENE_HEIGHT / container.height;

      let newX = (e.clientX - container.left) * scaleX - dragOffset.current.x;
      let newY = (e.clientY - container.top) * scaleY - dragOffset.current.y;

      newX = Math.max(0, Math.min(newX, SCENE_WIDTH - ACTOR_SIZE));
      newY = Math.max(0, Math.min(newY, SCENE_HEIGHT - ACTOR_SIZE));

      const movingObj = objects.find(o => o.id === draggingId);
      if (!movingObj) return;

      let allowMove = true;
      let idsToDestroy: string[] = [];

      // Check against all other objects
      for (const other of objects) {
          if (other.id === draggingId) continue;

          const isTouching = checkCollision({x: newX, y: newY}, other);
          
          // Collision Pair Key (Order independent)
          const pairKey = [movingObj.id, other.id].sort().join(':');

          if (isTouching) {
              
              // ONLY TRIGGER if not already colliding (ON ENTER)
              if (!activeCollisions.current.has(pairKey)) {
                  activeCollisions.current.add(pairKey);

                  // --- FIRE COLLISION RULES ---
                  const activeRules = getActiveRules();
                  const rules = activeRules.filter(r => 
                    r.trigger === RuleTrigger.COLLISION &&
                    r.subjectId === movingObj.actorId && 
                    r.objectId === other.actorId
                  );

                  for (const rule of rules) {
                      const shouldTrigger = rule.invert ? false : true; // Normal collision
                      
                      if (shouldTrigger) {
                          // ... Logic ...
                          const hasBlock = rule.effects.some(e => e.type === InteractionType.BLOCK);
                          const hasPush = rule.effects.some(e => e.type === InteractionType.PUSH);

                          if (hasBlock || hasPush) allowMove = false;

                          if (!executingRuleIds.current.has(rule.id)) {
                              const hasStateEffects = rule.effects.some(e => 
                                  e.type === InteractionType.WIN || 
                                  e.type === InteractionType.DESTROY_OBJECT ||
                                  e.type === InteractionType.DESTROY_SUBJECT ||
                                  e.type === InteractionType.CHANGE_SCENE ||
                                  e.type === InteractionType.SPAWN
                              );

                              // Always try to play sound on collision
                              if (rule.soundId && !executingRuleIds.current.has(rule.id)) {
                                   playSound(rule.soundId);
                              }

                              if (hasStateEffects) {
                                  executingRuleIds.current.add(rule.id);
                                  
                                  rule.effects.forEach(e => {
                                      if(e.type === InteractionType.DESTROY_OBJECT) idsToDestroy.push(other.id);
                                      if(e.type === InteractionType.DESTROY_SUBJECT) idsToDestroy.push(movingObj.id);
                                  });

                                  executeRuleEffects(rule.id, rule.effects, movingObj.id, movingObj.actorId, rule.soundId)
                                      .then(() => {
                                          executingRuleIds.current.delete(rule.id);
                                      });
                              }
                          }
                      }
                  }
              } 
              
          } else {
              // Not touching
              if (activeCollisions.current.has(pairKey)) {
                  activeCollisions.current.delete(pairKey); // ON EXIT
              }
          }
      }

      if (allowMove) {
          setObjects(prev => prev.map(o => {
              if (o.id === draggingId) return { ...o, x: newX, y: newY };
              return o;
          }).filter(o => !idsToDestroy.includes(o.id)));
      } else {
          if(idsToDestroy.length > 0) {
              setObjects(prev => prev.filter(o => !idsToDestroy.includes(o.id)));
          }
      }
  };

  const handleMouseUp = () => {
      setDraggingId(null);
  };

  return (
    <div className="fixed inset-0 bg-[#facc15] z-50 flex items-center justify-center font-['Gochi_Hand'] overflow-hidden">
        
        <div className="bg-[#333] p-4 md:p-8 rounded-[2.5rem] shadow-[15px_20px_0px_rgba(0,0,0,0.8)] relative flex flex-col items-center border-4 border-black max-h-screen scale-90 md:scale-100">
             
            {/* SCREEN */}
            <div className="bg-[#88919d] p-3 rounded-xl border-4 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-6">
                <div 
                    className="bg-white relative overflow-hidden border-2 border-black/80 shadow-inner cursor-none"
                    style={{
                        width: '800px', 
                        height: '600px',
                        maxWidth: '80vw',
                        maxHeight: '60vh',
                        backgroundColor: gameData.backgroundColor,
                        cursor: 'default'
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* SCENE CONTENT */}
                    <div className="w-full h-full relative" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
                        {objects.map(obj => {
                            const actor = getActor(obj.actorId);
                            if (!actor) return null;
                            const isDragging = draggingId === obj.id;

                            return (
                                <div
                                    key={obj.id}
                                    onMouseDown={(e) => handleMouseDown(e, obj)}
                                    className={`absolute flex items-center justify-center select-none ${!obj.isLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    style={{ 
                                        left: obj.x, 
                                        top: obj.y, 
                                        width: ACTOR_SIZE, 
                                        height: ACTOR_SIZE,
                                        zIndex: isDragging ? 50 : 10,
                                        transition: isDragging ? 'none' : 'transform 0.1s',
                                        transform: isDragging ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                >
                                    <img 
                                        src={actor.imageData} 
                                        alt={actor.name} 
                                        className="w-full h-full object-contain drop-shadow-sm pointer-events-none" 
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* OVERLAYS */}
                    {status !== 'PLAYING' && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300 p-4 z-50">
                            {status === 'WON' && (
                                <div className="text-yellow-400 text-center">
                                    <Trophy size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" />
                                    <h2 className="text-6xl font-bold stroke-black drop-shadow-md">YOU WIN!</h2>
                                </div>
                            )}
                            {status === 'LOST' && (
                                <div className="text-red-400 text-center">
                                    <Skull size={80} strokeWidth={2} className="mx-auto mb-4 animate-pulse" />
                                    <h2 className="text-6xl font-bold">GAME OVER</h2>
                                </div>
                            )}
                            {status === 'TRANSITION' && (
                                <div className="text-purple-400 text-center">
                                    <DoorOpen size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" />
                                    <h2 className="text-4xl font-bold">NEXT SCENE...</h2>
                                </div>
                            )}

                            {(status === 'WON' || status === 'LOST') && (
                                <button onClick={() => resetGame(activeSceneId)} className="mt-8 sketch-btn bg-white text-black px-8 py-2 text-2xl font-bold hover:scale-110 transition-transform">
                                    TRY AGAIN
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CONTROLS */}
            <div className="w-full flex justify-center items-center px-8 text-gray-500 gap-8">
                 <div className="flex items-center gap-2 text-white/50">
                     <MousePointer className="animate-bounce"/>
                     <span>Use mouse to drag & click!</span>
                 </div>
                 <div className="flex gap-4">
                     <button onClick={() => resetGame(activeSceneId)} className="w-16 h-16 bg-red-500 rounded-full border-b-[6px] border-red-900 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-white font-bold text-xs">RESET</button>
                     <button onClick={onExit} className="w-16 h-16 bg-yellow-400 rounded-full border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-yellow-900 font-bold text-xs">EXIT</button>
                 </div>
            </div>
        </div>
    </div>
  );
};
