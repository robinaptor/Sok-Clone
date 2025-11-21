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

    const activeFrames = playingActor?.frames && playingActor.frames.length > 0 ? playingActor.frames : [baseActor.imageData];
    const isPlaying = !!playingActor;

    useEffect(() => {
        setFrameIdx(0);
        lastTimeRef.current = 0; 
    }, [playingActor?.id, triggerTime]);

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
  const [activeSceneId, setActiveSceneId] = useState(currentSceneId);
  const [objects, setObjects] = useState<LevelObject[]>([]);
  const [status, setStatus] = useState<'PLAYING' | 'WON' | 'LOST' | 'TRANSITION'>('PLAYING');
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const executingRuleIds = useRef<Set<string>>(new Set());
  const activeCollisions = useRef<Set<string>>(new Set());
  
  // REF TO ALWAYS GET LATEST OBJECTS STATE
  const objectsRef = useRef<LevelObject[]>([]);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  // --- AUDIO ENGINE ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffers = useRef<Map<string, AudioBuffer>>(new Map());

  // Init Audio Context & Preload
  useEffect(() => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const loadSounds = async () => {
          if (!gameData.sounds) return;
          for (const sound of gameData.sounds) {
              if (!sound.data) continue;
              try {
                  // Fetch handles data-URIs correctly and efficiently
                  const res = await fetch(sound.data);
                  const arrayBuffer = await res.arrayBuffer();
                  const decoded = await ctx.decodeAudioData(arrayBuffer);
                  audioBuffers.current.set(sound.id, decoded);
              } catch (e) {
                  console.warn("Failed to preload sound:", sound.id, e);
              }
          }
      };

      loadSounds();

      return () => {
          ctx.close();
      };
  }, [gameData.sounds]);

  const playSound = (soundId: string) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Try to resume if suspended (common if play started via timer without click)
      if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
      }

      const buffer = audioBuffers.current.get(soundId);
      if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
      }
  };

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

  useEffect(() => {
      const ephemeralObjs = objects.filter(o => o.isEphemeral);
      if (ephemeralObjs.length > 0) {
          const timer = setTimeout(() => {
              setObjects(prev => prev.filter(o => !o.isEphemeral));
          }, 1000); 
          return () => clearTimeout(timer);
      }
  }, [objects.length]); 

  const jumpToScene = (targetId?: string) => {
      let nextId = targetId;
      if (!nextId) {
          const idx = gameData.scenes.findIndex(s => s.id === activeSceneId);
          if (idx >= 0 && idx < gameData.scenes.length - 1) {
              nextId = gameData.scenes[idx+1].id;
          } else {
              nextId = gameData.scenes[0].id;
          }
      }
      if (gameData.scenes.find(s => s.id === nextId)) {
          resetGame(nextId!);
      }
  };

  const getActor = useCallback((id: string) => gameData.actors.find(a => a.id === id), [gameData]);

  const handleAnimationFinish = (objId: string) => {
      setObjects(prev => prev.map(o => {
          if (o.id === objId) {
              return { ...o, activeAnimation: undefined };
          }
          return o;
      }));
  };

  const getActiveRules = () => {
      return gameData.rules.filter(r => r.scope === 'GLOBAL' || r.scope === activeSceneId);
  };

  const executeRuleEffects = async (ruleId: string, effects: RuleEffect[], subjectObjId: string, objectObjId: string | null) => {
      let previousActionDuration = 0;

      for (const effect of effects) {
          if (effect.type === InteractionType.THEN) {
              if (previousActionDuration > 0) {
                  await new Promise(resolve => setTimeout(resolve, previousActionDuration));
              }
              previousActionDuration = 0; 
              continue;
          }

          const targetObjId = effect.target === 'OBJECT' && objectObjId ? objectObjId : subjectObjId;

          // Remote Trigger Logic
          let targets: string[] = [];
          // Use objectsRef.current to get the absolute latest list of objects
          if (effect.target === 'OBJECT' && !objectObjId && effect.spawnActorId) {
              targets = objectsRef.current.filter(o => o.actorId === effect.spawnActorId).map(o => o.id);
          } else {
              const targetId = effect.target === 'OBJECT' && objectObjId ? objectObjId : subjectObjId;
              if (targetId) targets.push(targetId);
          }

          for (const targetId of targets) {
              switch (effect.type) {
                  case InteractionType.WIN:
                      setStatus('WON');
                      previousActionDuration = 0;
                      break;
                      
                  case InteractionType.DESTROY_SUBJECT:
                      // Find the actual object instance being destroyed
                      const subjInstance = objectsRef.current.find(o => o.id === subjectObjId);
                      
                      // Check if it is the Hero (The first actor in the list is always the Hero)
                      if (subjInstance && subjInstance.actorId === gameData.actors[0].id) {
                          setStatus('LOST');
                      }

                      setObjects(prev => prev.filter(o => o.id !== subjectObjId));
                      if (subjectObjId === draggingId) setDraggingId(null);
                      
                      previousActionDuration = 0;
                      break;

                   case InteractionType.DESTROY_OBJECT: 
                      // Check if the object being eaten is the hero (unlikely but possible)
                      const objInstance = objectsRef.current.find(o => o.id === targetId);
                      if (objInstance && objInstance.actorId === gameData.actors[0].id) {
                          setStatus('LOST');
                      }

                      setObjects(prev => prev.filter(o => o.id !== targetId));
                      previousActionDuration = 0;
                      break;

                   case InteractionType.CHANGE_SCENE:
                      setStatus('TRANSITION');
                      await new Promise(resolve => setTimeout(resolve, 1000)); 
                      jumpToScene(effect.targetSceneId);
                      previousActionDuration = 0;
                      break;
                   
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
                   
                   case InteractionType.SWAP:
                        if (effect.spawnActorId) {
                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return { ...o, actorId: effect.spawnActorId!, activeAnimation: undefined };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;

                   case InteractionType.PLAY_ANIM:
                       if (effect.spawnActorId) {
                           const actor = getActor(effect.spawnActorId);
                           if (actor && actor.frames && actor.frames.length > 1) {
                               previousActionDuration = (actor.frames.length * 100) + 100; 
                           } else {
                               previousActionDuration = 0;
                           }

                           setObjects(prev => prev.map(o => {
                               if (o.id === targetId) {
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
                          if (o.id === targetId) {
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
              }
          }
      }
  };

  useEffect(() => {
      if (status !== 'PLAYING') return; 

      const activeRules = getActiveRules();

      const startRules = activeRules.filter(r => r.trigger === RuleTrigger.START);
      
      startRules.forEach(rule => {
          if (!executingRuleIds.current.has(rule.id)) {
               executingRuleIds.current.add(rule.id); 
               if (rule.soundId) playSound(rule.soundId);
               executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
          }
      });

      const timerRules = activeRules.filter(r => r.trigger === RuleTrigger.TIMER);

      const interval = setInterval(() => {
          if (status !== 'PLAYING') return;
          
          timerRules.forEach(rule => {
               // Use objectsRef to avoid stale closure on objects array
               const targets = objectsRef.current.filter(o => o.actorId === rule.subjectId);
               if (targets.length > 0) {
                   targets.forEach(t => {
                        if (rule.soundId) playSound(rule.soundId);
                        executeRuleEffects(rule.id, rule.effects, t.id, null);
                   });
               } else if (!rule.subjectId) {
                   if (rule.soundId) playSound(rule.soundId);
                   executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
               }
          });
      }, 2000);

      return () => clearInterval(interval);
  }, [activeSceneId, status, objects.length]); 

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

  const handleMouseDown = async (e: React.MouseEvent, obj: LevelObject) => {
      if (status !== 'PLAYING') return;
      e.stopPropagation();
      
      // Ensure audio context is active on user interaction
      if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
      }

      const activeRules = getActiveRules();
      const clickRules = activeRules.filter(r => r.trigger === RuleTrigger.CLICK && r.subjectId === obj.actorId);
      
      let ruleTriggered = false;
      for (const rule of clickRules) {
          if (executingRuleIds.current.has(rule.id)) continue; 

          ruleTriggered = true;
          executingRuleIds.current.add(rule.id);

          if (rule.soundId) playSound(rule.soundId); 

          await executeRuleEffects(rule.id, rule.effects, obj.id, null);
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

      newX = Math.max(0, Math.min(newX, SCENE_WIDTH - mySize));
      newY = Math.max(0, Math.min(newY, SCENE_HEIGHT - mySize));

      let allowMove = true;
      
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
                              
                              // PLAY SOUND IMMEDIATELY
                              if (rule.soundId) playSound(rule.soundId);

                              if (rule.effects.length > 0) {
                                  executingRuleIds.current.add(rule.id);
                                  
                                  executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id)
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
                                <div className="text-red-500 text-center">
                                    <Skull size={80} strokeWidth={2} className="mx-auto mb-4 animate-pulse" />
                                    <h2 className="text-6xl font-bold stroke-black drop-shadow-md">GAME OVER</h2>
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