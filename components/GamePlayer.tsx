
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

  // Init or Reset
  useEffect(() => { resetGame(currentSceneId); }, [currentSceneId]);

  const resetGame = (sceneId: string) => {
    setActiveSceneId(sceneId);
    const scene = gameData.scenes.find(s => s.id === sceneId) || gameData.scenes[0];
    setObjects(scene.objects.map(o => ({ ...o })));
    setStatus('PLAYING');
    setDraggingId(null);
    executingRuleIds.current.clear();
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

  // --- ASYNC RULE EXECUTOR ---
  const executeRuleEffects = async (effects: RuleEffect[], relatedObjId: string, relatedActorId: string) => {
      
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
                  setStatus('LOST'); // If hero dies, we lose generally, or just remove? Let's assume LOST for now if it's hero-like logic
                  // But generic "Die" means remove from objects:
                  // setObjects(prev => prev.filter(o => o.id !== relatedObjId)); // This is tricky in async if state changed
                  break;
               case InteractionType.DESTROY_OBJECT: // The passive object
                  // handled by passing IDs usually, but for simplicity in sequences we handle state effects mainly
                  break;
               case InteractionType.CHANGE_SCENE:
                  setStatus('TRANSITION');
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for visual
                  jumpToScene(effect.targetSceneId);
                  break;
          }
      }
  };

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

          // Execute Immediate Effects (State updates that shouldn't wait)
          // Filter out effects that are "Destroy Self" etc to run immediately visually
          const immediateDestroys = rule.effects.some(e => e.type === InteractionType.DESTROY_SUBJECT || e.type === InteractionType.DESTROY_OBJECT);
          
          if (immediateDestroys) {
             setObjects(prev => prev.filter(o => o.id !== obj.id));
          }

          // Run the Sequence
          await executeRuleEffects(rule.effects, obj.id, obj.actorId);
          executingRuleIds.current.delete(rule.id);
      }

      if (ruleTriggered) return;

      // 2. Start Dragging if NOT locked
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

          const activeRules = getActiveRules();
          const rules = activeRules.filter(r => 
            r.trigger === RuleTrigger.COLLISION &&
            r.subjectId === movingObj.actorId && 
            r.objectId === other.actorId
          );

          for (const rule of rules) {
              // NEGATION LOGIC:
              const shouldTrigger = rule.invert ? !isTouching : isTouching;

              if (shouldTrigger) {
                  
                  // PHYSICS FIRST (Synchronous)
                  // We look for BLOCK or PUSH in the effects list. 
                  // Note: PUSH/BLOCK doesn't make sense with "THEN" (delay), so we apply them if present anywhere or just at start
                  const hasBlock = rule.effects.some(e => e.type === InteractionType.BLOCK);
                  const hasPush = rule.effects.some(e => e.type === InteractionType.PUSH);

                  if (isTouching) {
                      if (hasBlock || hasPush) allowMove = false;
                  }

                  // STATE/SEQUENCE (Asynchronous)
                  if (!executingRuleIds.current.has(rule.id)) {
                      // Check if we have any state changing effects
                      const hasStateEffects = rule.effects.some(e => 
                          e.type === InteractionType.WIN || 
                          e.type === InteractionType.DESTROY_OBJECT ||
                          e.type === InteractionType.DESTROY_SUBJECT ||
                          e.type === InteractionType.CHANGE_SCENE
                      );

                      if (hasStateEffects) {
                          executingRuleIds.current.add(rule.id);
                          
                          // Immediate removals
                          rule.effects.forEach(e => {
                              if(e.type === InteractionType.DESTROY_OBJECT) idsToDestroy.push(other.id);
                              if(e.type === InteractionType.DESTROY_SUBJECT) idsToDestroy.push(movingObj.id);
                          });

                          // Start Sequence
                          executeRuleEffects(rule.effects, movingObj.id, movingObj.actorId)
                              .then(() => {
                                  // Allow re-trigger only after sequence finishes?
                                  // For continuous collision, this might loop. 
                                  // But usually sequence ends in Scene Change or Win, so it's fine.
                                  // If it's just "Play Sound" (future), we might need debounce.
                                  executingRuleIds.current.delete(rule.id);
                              });
                      }
                  }
              }
          }
      }

      if (allowMove) {
          setObjects(prev => prev.map(o => {
              if (o.id === draggingId) return { ...o, x: newX, y: newY };
              return o;
          }).filter(o => !idsToDestroy.includes(o.id)));
      } else {
          // Even if blocked, we might need to remove destroyed objects
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
