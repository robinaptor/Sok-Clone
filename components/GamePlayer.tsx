import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GameData, InteractionType, LevelObject, RuleTrigger, RuleEffect, Actor } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trophy, Skull, MousePointer, DoorOpen } from 'lucide-react';

interface GamePlayerProps {
  gameData: GameData;
  currentSceneId: string;
  onExit: () => void;
  onNextScene: () => void;
}

// --- ANIMATED SPRITE COMPONENT ---
const AnimatedSprite = ({ 
    baseActor, 
    playingActor, 
    isLooping, 
    isEphemeral,
    onFinish,
    triggerTime 
}: { 
    baseActor: Actor, 
    playingActor?: Actor, 
    isLooping?: boolean, 
    isEphemeral?: boolean,
    onFinish: () => void,
    triggerTime?: number
}) => {
    const [frameIdx, setFrameIdx] = useState(0);
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // If an animation is active, use its frames. Otherwise use baseActor's first frame.
    const activeFrames = playingActor?.frames && playingActor.frames.length > 0 ? playingActor.frames : [baseActor.imageData];
    const isPlaying = !!playingActor;

    // Reset on new animation trigger (based on timestamp change)
    useEffect(() => {
        setFrameIdx(0);
        lastTimeRef.current = 0; 
    }, [playingActor?.id, triggerTime]);

    // Animation Loop
    useEffect(() => {
        if (!isPlaying || activeFrames.length <= 1) return;
        
        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const deltaTime = time - lastTimeRef.current;
            
            // 100ms per frame (~10 FPS)
            if (deltaTime > 100) {
                setFrameIdx(curr => {
                    const next = curr + 1;
                    if (next >= activeFrames.length) {
                        if (isLooping) {
                            return 0; 
                        } else {
                            // STAY ON LAST FRAME
                            return curr; 
                        }
                    }
                    return next;
                });
                lastTimeRef.current = time;
            }
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [activeFrames.length, isPlaying, isLooping]);

    const displayImage = isPlaying ? activeFrames[frameIdx] : (baseActor.frames?.[0] || baseActor.imageData);

    return (
        <img 
            src={displayImage} 
            alt={baseActor.name} 
            className={`w-full h-full object-contain drop-shadow-sm pointer-events-none ${isEphemeral ? '' : ''}`} 
        />
    );
};

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

  // Keep track of active physical collisions to trigger rules only ON ENTER
  const activeCollisions = useRef<Set<string>>(new Set());

  // Init or Reset
  useEffect(() => { resetGame(currentSceneId); }, [currentSceneId]);

  const resetGame = (sceneId: string) => {
    setActiveSceneId(sceneId);
    const scene = gameData.scenes.find(s => s.id === sceneId) || gameData.scenes[0];
    setObjects(scene.objects.map(o => ({ ...o, activeAnimation: undefined })));
    setStatus('PLAYING');
    setDraggingId(null);
    executingRuleIds.current.clear();
    activeCollisions.current.clear();
  };

  // Clean up ephemeral objects (visual effects) automatically
  useEffect(() => {
      const ephemeralObjs = objects.filter(o => o.isEphemeral);
      if (ephemeralObjs.length > 0) {
          const timer = setTimeout(() => {
              setObjects(prev => prev.filter(o => !o.isEphemeral));
          }, 1000); 
          return () => clearTimeout(timer);
      }
  }, [objects.length]); 

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

  // Callback to stop animation on an object
  const handleAnimationFinish = (objId: string) => {
      setObjects(prev => prev.map(o => {
          if (o.id === objId) {
              return { ...o, activeAnimation: undefined };
          }
          return o;
      }));
  };

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
  const executeRuleEffects = async (ruleId: string, effects: RuleEffect[], subjectObjId: string, objectObjId: string | null, soundId?: string) => {
      
      if (soundId) playSound(soundId);

      let previousActionDuration = 0;

      for (const effect of effects) {
          // Sequence Delay: Wait for previous action (anim) to complete
          if (effect.type === InteractionType.THEN) {
              if (previousActionDuration > 0) {
                  await new Promise(resolve => setTimeout(resolve, previousActionDuration));
              }
              previousActionDuration = 0; // Reset after waiting
              continue;
          }

          // Determine Target ID for SWAP/ANIM based on effect configuration
          const targetObjId = effect.target === 'OBJECT' && objectObjId ? objectObjId : subjectObjId;

          // State Changes
          switch (effect.type) {
              case InteractionType.WIN:
                  setStatus('WON');
                  previousActionDuration = 0;
                  break;
                  
              case InteractionType.DESTROY_SUBJECT:
                  // Async destruction of Subject
                  setObjects(prev => prev.filter(o => o.id !== subjectObjId));
                  if (subjectObjId === draggingId) setDraggingId(null);
                  // Check if hero died
                  const subjectActor = objects.find(o => o.id === subjectObjId);
                  if (subjectActor && getActor(subjectActor.actorId)?.id === 'hero') {
                      setStatus('LOST');
                  }
                  previousActionDuration = 0;
                  break;

               case InteractionType.DESTROY_OBJECT: 
                  // Async destruction of Object (Collision target)
                  if (objectObjId) {
                      setObjects(prev => prev.filter(o => o.id !== objectObjId));
                  }
                  previousActionDuration = 0;
                  break;

               case InteractionType.CHANGE_SCENE:
                  setStatus('TRANSITION');
                  await new Promise(resolve => setTimeout(resolve, 1000)); 
                  jumpToScene(effect.targetSceneId);
                  previousActionDuration = 0;
                  break;
               
               // --- SPAWN ---
               case InteractionType.SPAWN:
                   if (effect.spawnActorId && effect.spawnX !== undefined && effect.spawnY !== undefined) {
                       const newObj: LevelObject = {
                           id: Math.random().toString(36).substr(2, 9),
                           actorId: effect.spawnActorId,
                           x: effect.spawnX,
                           y: effect.spawnY,
                           scale: 1.0,
                           isLocked: false 
                       };
                       setObjects(prev => [...prev, newObj]);
                   }
                   previousActionDuration = 0;
                   break;
               
               // --- SWAP ---
               case InteractionType.SWAP:
                    if (effect.spawnActorId) {
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetObjId) {
                                return { ...o, actorId: effect.spawnActorId!, activeAnimation: undefined };
                            }
                            return o;
                        }));
                    }
                    previousActionDuration = 0;
                    break;

               // --- ANIM (Play Visual IN PLACE) ---
               case InteractionType.PLAY_ANIM:
                   if (effect.spawnActorId) {
                       // Calculate duration for THEN to wait
                       const actor = getActor(effect.spawnActorId);
                       if (actor && actor.frames && actor.frames.length > 1) {
                           // 100ms per frame. Add buffer to ensure visual completion.
                           previousActionDuration = (actor.frames.length * 100) + 100; 
                       } else {
                           previousActionDuration = 0;
                       }

                       setObjects(prev => prev.map(o => {
                           if (o.id === targetObjId) {
                               return { 
                                   ...o, 
                                   activeAnimation: {
                                       playingActorId: effect.spawnActorId!,
                                       isLoop: !!effect.isLoop,
                                       startTime: Date.now()
                                   }
                               };
                           }
                           return o;
                       }));
                   } else {
                       previousActionDuration = 0;
                   }
                   break;

               case InteractionType.PUSH:
                  setObjects(prev => prev.map(o => {
                      if (o.id === targetObjId) {
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
                  previousActionDuration = 0;
                  break;
                
               default:
                  previousActionDuration = 0;
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
          if (!executingRuleIds.current.has(rule.id)) {
               executingRuleIds.current.add(rule.id); 
               executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null, rule.soundId);
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
                        executeRuleEffects(rule.id, rule.effects, t.id, null, rule.soundId);
                   });
               } else if (!rule.subjectId) {
                   // Allow global timers
               }
          });
      }, 2000);

      return () => clearInterval(interval);
  }, [activeSceneId, status, objects.length]); 

  // AABB Collision with Buffer (Hysteresis) and Scale Support
  const checkCollision = (
      rect1: {x: number, y: number, scale?: number}, 
      rect2: {x: number, y: number, scale?: number}, 
      buffer = 0
  ) => {
      const size1 = ACTOR_SIZE * (rect1.scale || 1);
      const size2 = ACTOR_SIZE * (rect2.scale || 1);
      
      return (
          rect1.x < rect2.x + size2 + buffer &&
          rect1.x + size1 + buffer > rect2.x &&
          rect1.y < rect2.y + size2 + buffer &&
          rect1.y + size1 + buffer > rect2.y
      );
  };

  // --- TRIGGER: CLICK ---
  const handleMouseDown = async (e: React.MouseEvent, obj: LevelObject) => {
      if (status !== 'PLAYING') return;
      e.stopPropagation();

      const activeRules = getActiveRules();
      const clickRules = activeRules.filter(r => r.trigger === RuleTrigger.CLICK && r.subjectId === obj.actorId);
      
      let ruleTriggered = false;
      for (const rule of clickRules) {
          if (executingRuleIds.current.has(rule.id)) continue; 

          ruleTriggered = true;
          executingRuleIds.current.add(rule.id);

          // Removed synchronous destruction check here.
          // Now handled fully in executeRuleEffects.

          await executeRuleEffects(rule.id, rule.effects, obj.id, null, rule.soundId);
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

      const movingObj = objects.find(o => o.id === draggingId);
      if (!movingObj) return;

      const mySize = ACTOR_SIZE * (movingObj.scale || 1);

      // Bound Check with Size
      newX = Math.max(0, Math.min(newX, SCENE_WIDTH - mySize));
      newY = Math.max(0, Math.min(newY, SCENE_HEIGHT - mySize));

      let allowMove = true;
      // idsToDestroy is now unused for immediate removal, handled async in executeRuleEffects.
      // However, we might still want to block movement if needed.

      for (const other of objects) {
          if (other.id === draggingId) continue;

          const isTouching = checkCollision(
              {x: newX, y: newY, scale: movingObj.scale}, 
              {x: other.x, y: other.y, scale: other.scale}
          );
          
          const pairKey = [movingObj.id, other.id].sort().join(':');

          if (isTouching) {
              
              if (!activeCollisions.current.has(pairKey)) {
                  activeCollisions.current.add(pairKey);

                  const activeRules = getActiveRules();
                  const rules = activeRules.filter(r => 
                    r.trigger === RuleTrigger.COLLISION &&
                    r.subjectId === movingObj.actorId && 
                    r.objectId === other.actorId
                  );

                  for (const rule of rules) {
                      const shouldTrigger = rule.invert ? false : true; 
                      
                      if (shouldTrigger) {
                          const hasBlock = rule.effects.some(e => e.type === InteractionType.BLOCK);
                          const hasPush = rule.effects.some(e => e.type === InteractionType.PUSH);

                          if (hasBlock || hasPush) allowMove = false;

                          if (!executingRuleIds.current.has(rule.id)) {
                              // Removed synchronous destruction check here.
                              
                              if (rule.soundId && !executingRuleIds.current.has(rule.id)) {
                                   playSound(rule.soundId);
                              }

                              // Check if effects exist to trigger async execution
                              if (rule.effects.length > 0) {
                                  executingRuleIds.current.add(rule.id);
                                  
                                  executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id, rule.soundId)
                                      .then(() => {
                                          executingRuleIds.current.delete(rule.id);
                                      });
                              }
                          }
                      }
                  }
              } 
              
          } else {
              const isStillClose = checkCollision(
                  {x: newX, y: newY, scale: movingObj.scale}, 
                  {x: other.x, y: other.y, scale: other.scale},
                  5
              );

              if (!isStillClose && activeCollisions.current.has(pairKey)) {
                  activeCollisions.current.delete(pairKey); 
              }
          }
      }

      if (allowMove) {
          setObjects(prev => prev.map(o => {
              if (o.id === draggingId) return { ...o, x: newX, y: newY };
              return o;
          }));
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
                            const playingActor = obj.activeAnimation ? getActor(obj.activeAnimation.playingActorId) : undefined;
                            
                            if (!actor) return null;
                            const isDragging = draggingId === obj.id;
                            
                            const currentScale = obj.scale || 1.0;
                            const displaySize = ACTOR_SIZE * currentScale;

                            return (
                                <div
                                    key={obj.id}
                                    onMouseDown={(e) => handleMouseDown(e, obj)}
                                    className={`absolute flex items-center justify-center select-none ${!obj.isLocked ? 'cursor-grab active:cursor-grabbing' : ''} ${obj.isEphemeral ? 'pointer-events-none' : ''}`}
                                    style={{ 
                                        left: obj.x, 
                                        top: obj.y, 
                                        width: displaySize, 
                                        height: displaySize,
                                        zIndex: isDragging ? 50 : 10,
                                        transition: isDragging ? 'none' : 'transform 0.1s',
                                        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                                        opacity: obj.isEphemeral ? 0.9 : 1
                                    }}
                                >
                                    <AnimatedSprite 
                                        baseActor={actor} 
                                        playingActor={playingActor} 
                                        isLooping={obj.activeAnimation?.isLoop} 
                                        isEphemeral={obj.isEphemeral}
                                        onFinish={() => handleAnimationFinish(obj.id)}
                                        triggerTime={obj.activeAnimation?.startTime}
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