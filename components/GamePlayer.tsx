
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GameData, InteractionType, LevelObject, RuleTrigger, RuleEffect, Actor } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trophy, Skull, MousePointer, DoorOpen, Loader2, Play, Volume2, Hash } from 'lucide-react';

interface GamePlayerProps {
    gameData: GameData;
    currentSceneId: string;
    onExit: () => void;
    onNextScene: () => void;
}

// --- HELPER: Base64 to ArrayBuffer ---
const base64ToArrayBuffer = (base64: string) => {
    try {
        const content = base64.includes(',') ? base64.split(',')[1] : base64;
        const binaryString = window.atob(content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Base64 decode error", e);
        return new ArrayBuffer(0);
    }
};

// --- SPEECH BUBBLE COMPONENT ---
const SpeechBubble = ({ text }: { text: string }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        let i = 0;
        setDisplayedText("");
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 50); // Speed of typing
        return () => clearInterval(interval);
    }, [text]);

    return (
        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 bg-white border-[3px] border-black rounded-xl px-3 py-2 shadow-md z-50 min-w-[100px] max-w-[200px] text-center pointer-events-none animate-in zoom-in duration-200 origin-bottom">
            <p className="text-sm font-bold leading-tight">{displayedText}</p>
            {/* Triangle tail */}
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
        </div>
    );
};

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

            if (deltaTime > 100) {
                setFrameIdx(curr => {
                    const next = curr + 1;
                    if (next >= activeFrames.length) {
                        if (isLooping) return 0;
                        return curr;
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

// --- BACKGROUND ANIMATION COMPONENT ---
const BackgroundLayer = ({ image, frames }: { image?: string, frames?: string[] }) => {
    const [frameIdx, setFrameIdx] = useState(0);

    useEffect(() => {
        if (frames && frames.length > 1) {
            const interval = setInterval(() => {
                setFrameIdx(curr => (curr + 1) % frames.length);
            }, 200); // 5 FPS for BG
            return () => clearInterval(interval);
        } else {
            setFrameIdx(0);
        }
    }, [frames]);

    const current = (frames && frames.length > 0) ? frames[frameIdx] : image;

    if (!current) return null;

    return (
        <div className="absolute inset-0 z-0">
            <img
                src={current}
                className="w-full h-full object-cover"
                alt="Background"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
};

export const GamePlayer: React.FC<GamePlayerProps> = ({ gameData, currentSceneId, onExit, onNextScene }) => {
    const [activeSceneId, setActiveSceneId] = useState(currentSceneId);
    const [objects, setObjects] = useState<LevelObject[]>([]);

    // VARIABLES STATE
    const [runtimeVariables, setRuntimeVariables] = useState<Record<string, number>>({});

    // DIALOGUE STATE (Active Speech Bubbles)
    const [activeBubbles, setActiveBubbles] = useState<Record<string, { text: string, expiresAt: number }>>({});

    // SHAKE STATE
    const [shakeIntensity, setShakeIntensity] = useState(0);

    // PARTICLES STATE
    const [particles, setParticles] = useState<{ id: string, x: number, y: number, color: string, vx: number, vy: number, life: number, size: number, type: 'CONFETTI' | 'EXPLOSION' | 'SMOKE' | 'RAIN' | 'SPARKLES', actorId?: string }[]>([]);

    const [status, setStatus] = useState<'LOADING' | 'READY' | 'PLAYING' | 'WON' | 'LOST' | 'TRANSITION'>('LOADING');
    const [loadedSoundCount, setLoadedSoundCount] = useState(0);

    // HUD STATE
    const [activeVariablePopup, setActiveVariablePopup] = useState<string | null>(null);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const executingRuleIds = useRef<Set<string>>(new Set());
    const lastTimerExecution = useRef<Record<string, number>>({});
    const activeCollisions = useRef<Set<string>>(new Set());
    const requestRef = useRef<number>(0); // For Physics Loop

    const objectsRef = useRef<LevelObject[]>([]);
    useEffect(() => { objectsRef.current = objects; }, [objects]);

    const variablesRef = useRef<Record<string, number>>({});
    useEffect(() => { variablesRef.current = runtimeVariables; }, [runtimeVariables]);

    // --- AUDIO ENGINE ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBuffers = useRef<Map<string, AudioBuffer>>(new Map());

    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const loadSounds = async () => {
            const sounds = gameData.sounds || [];
            let count = 0;
            for (const sound of sounds) {
                if (!sound.data) continue;
                try {
                    const arrayBuffer = base64ToArrayBuffer(sound.data);
                    if (arrayBuffer.byteLength > 0) {
                        const decoded = await ctx.decodeAudioData(arrayBuffer);
                        audioBuffers.current.set(sound.id, decoded);
                        count++;
                    }
                } catch (e) { console.warn("Failed to preload sound:", sound.id, e); }
            }
            setLoadedSoundCount(count);
            setStatus('READY');
        };
        loadSounds();
        return () => { ctx.close(); };
    }, [gameData.sounds]);

    const startGame = async () => {
        if (audioContextRef.current) {
            try { await audioContextRef.current.resume(); } catch (e) { }
        }
        setStatus('PLAYING');
    };

    const playSound = (soundId: string) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
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

        // Reset Variables (Preserve Globals)
        setRuntimeVariables(prev => {
            const nextVars = { ...prev };
            if (gameData.variables) {
                gameData.variables.forEach(v => {
                    // If it's a GLOBAL variable, only set it if it doesn't exist yet (first load)
                    // If it's a SCENE variable (scoped to this scene), reset it
                    // If it's a SCENE variable (scoped to ANOTHER scene), leave it alone (or reset? doesn't matter much if not visible)

                    const isGlobal = v.scope === 'GLOBAL' || !v.scope;
                    const isCurrentScene = v.scope === sceneId;

                    if (isGlobal) {
                        if (nextVars[v.id] === undefined) {
                            nextVars[v.id] = v.initialValue;
                        }
                        // If it exists, KEEP IT!
                    } else if (isCurrentScene) {
                        // Always reset local variables for the new scene
                        nextVars[v.id] = v.initialValue;
                    }
                });
            }
            return nextVars;
        });
        setActiveBubbles({}); // Clear bubbles

        setStatus(prev => (prev === 'LOADING' || prev === 'READY') ? prev : 'PLAYING');
        setDraggingId(null);
        executingRuleIds.current.clear();
        activeCollisions.current.clear();
        setShakeIntensity(0);
    };

    // PHYSICS LOOP (Projectiles & Particles)
    useEffect(() => {
        let lastTime = performance.now();
        const loop = (time: number) => {
            const dt = (time - lastTime) / 1000; // Delta time in seconds
            lastTime = time;

            // Update Objects (Projectiles & HELD objects)
            setObjects(prev => {
                let changed = false;
                const next = prev.map(o => {
                    // HELD OBJECT LOGIC
                    if (o.heldBy) {
                        const holder = prev.find(h => h.id === o.heldBy);
                        if (holder) {
                            // Snap to holder WITH OFFSET
                            const mySize = ACTOR_SIZE * (o.scale || 1);
                            const holderSize = ACTOR_SIZE * (holder.scale || 1);

                            // Use configured offsets if available, otherwise center
                            const offsetX = o.holdOffsetX ?? 0;
                            const offsetY = o.holdOffsetY ?? 0;

                            // Position relative to holder's center + offset
                            const nx = holder.x + (holderSize / 2) - (mySize / 2) + offsetX;
                            const ny = holder.y + (holderSize / 2) - (mySize / 2) + offsetY;

                            if (Math.abs(o.x - nx) > 1 || Math.abs(o.y - ny) > 1) {
                                changed = true;
                                return { ...o, x: nx, y: ny, vx: 0, vy: 0 };
                            }
                            return o;
                        } else {
                            // Holder gone, drop it
                            changed = true;
                            return { ...o, heldBy: undefined };
                        }
                    }

                    // Handle Active Path Movement
                    if (o.activePath) {
                        changed = true;
                        const targetPoint = o.activePath.points[o.activePath.currentIndex];
                        const dx = targetPoint.x - o.x;
                        const dy = targetPoint.y - o.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const speed = o.activePath.speed || 2;

                        if (dist < speed) {
                            // Reached point
                            const nextIndex = (o.activePath.currentIndex + 1) % o.activePath.points.length;
                            // If not looping and reached end, stop
                            if (!o.activePath.loop && nextIndex === 0) {
                                return { ...o, x: targetPoint.x, y: targetPoint.y, activePath: undefined };
                            }
                            return {
                                ...o,
                                x: targetPoint.x,
                                y: targetPoint.y,
                                activePath: { ...o.activePath, currentIndex: nextIndex }
                            };
                        } else {
                            // Move towards point
                            return {
                                ...o,
                                x: o.x + (dx / dist) * speed,
                                y: o.y + (dy / dist) * speed
                            };
                        }
                    }

                    if (o.vx || o.vy || o.z || o.vz) {
                        changed = true;
                        let nx = o.x + (o.vx || 0) * dt * 60; // Scale speed
                        let ny = o.y + (o.vy || 0) * dt * 60;

                        // Z-Axis Physics (Jump)
                        let nz = (o.z || 0) + (o.vz || 0) * dt * 60;
                        let nvz = (o.vz || 0);

                        // Gravity
                        if (nz > 0 || nvz > 0) {
                            nvz -= 1.5 * dt * 60; // Gravity force
                        }

                        // Ground collision
                        if (nz < 0) {
                            nz = 0;
                            nvz = 0;
                        }

                        // Bounds check for projectiles (destroy if out of bounds)
                        if (nx < -50 || nx > SCENE_WIDTH + 50 || ny < -50 || ny > SCENE_HEIGHT + 50) {
                            return null; // Mark for deletion
                        }
                        return { ...o, x: nx, y: ny, z: nz, vz: nvz };
                    }
                    return o;
                }).filter(Boolean) as LevelObject[];

                return changed ? next : prev;
            });

            // Update Particles
            setParticles(prev => {
                if (prev.length === 0) return prev;
                return prev.map(p => {
                    let newVx = p.vx;
                    let newVy = p.vy;
                    let newLife = p.life - dt;

                    // Physics based on Type
                    if (p.type === 'CONFETTI') {
                        newVy += 0.5; // Gravity
                        newVx *= 0.98; // Air resistance
                    } else if (p.type === 'EXPLOSION') {
                        newVy += 0.2;
                        newVx *= 0.95;
                    } else if (p.type === 'SMOKE') {
                        newVy -= 0.5; // Rise up
                        newVx += (Math.random() - 0.5) * 0.5; // Wiggle
                    } else if (p.type === 'RAIN') {
                        newVy = 15; // Fall fast
                    }

                    return {
                        ...p,
                        x: p.x + newVx * dt * 60,
                        y: p.y + newVy * dt * 60,
                        vx: newVx,
                        vy: newVy,
                        life: newLife
                    };
                }).filter(p => p.life > 0);
            });

            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // Bubble Cleanup Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setActiveBubbles(prev => {
                let changed = false;
                const next = { ...prev };
                for (const key in next) {
                    if (next[key].expiresAt < now) {
                        delete next[key];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Remove ephemeral objects
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
                nextId = gameData.scenes[idx + 1].id;
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
            if (o.id === objId) return { ...o, activeAnimation: undefined };
            return o;
        }));
    };

    const getActiveRules = () => {
        return gameData.rules.filter(r => r.scope === 'GLOBAL' || r.scope === activeSceneId);
    };

    // --- CHECK VARIABLE RULES ---
    const checkVariableRules = async () => {
        const activeRules = getActiveRules();
        const varRules = activeRules.filter(r => r.trigger === RuleTrigger.VAR_CHECK);

        for (const rule of varRules) {
            if (executingRuleIds.current.has(rule.id)) continue;

            const currentVal = variablesRef.current[rule.variableId || ''] ?? 0;
            const targetVal = rule.threshold || 0;
            let match = false;

            if (rule.condition === 'EQUALS' && currentVal === targetVal) match = true;
            if (rule.condition === 'GREATER' && currentVal > targetVal) match = true;
            if (rule.condition === 'LESS' && currentVal < targetVal) match = true;

            if (rule.invert) match = !match;

            // CHANCE CHECK
            if (match && rule.chance && Math.random() > rule.chance) match = false;

            if (match) {
                executingRuleIds.current.add(rule.id);
                if (rule.soundId) playSound(rule.soundId);

                // For global rules (VAR_CHECK), default the subject to the Hero (or first actor)
                // This allows effects like "DIE" to work on the player when a variable changes
                const hero = objectsRef.current.find(o => o.actorId === gameData.actors[0].id);
                const subjectId = hero ? hero.id : 'GLOBAL';

                await executeRuleEffects(rule.id, rule.effects, subjectId, null);
                setTimeout(() => executingRuleIds.current.delete(rule.id), 1000);
            }
        }
    };

    // Trigger variable check whenever variables change
    useEffect(() => {
        if (status === 'PLAYING') {
            checkVariableRules();
        }
    }, [runtimeVariables, status]);


    const executeRuleEffects = async (ruleId: string, effects: RuleEffect[], subjectObjId: string, objectObjId: string | null) => {
        let previousActionDuration = 0;

        for (const effect of effects) {
            if (effect.type === InteractionType.THEN || effect.type === InteractionType.WAIT) {
                if (previousActionDuration > 0) {
                    await new Promise(resolve => setTimeout(resolve, previousActionDuration));
                }
                previousActionDuration = 0;
                continue;
            }

            // VARIABLE MODIFICATION
            if (effect.type === InteractionType.MODIFY_VAR && effect.variableId) {
                setRuntimeVariables(prev => {
                    const current = prev[effect.variableId!] || 0;
                    let next = current;
                    if (effect.operation === 'ADD') next += (effect.value || 1);
                    if (effect.operation === 'SUB') next -= (effect.value || 1);
                    if (effect.operation === 'SET') next = (effect.value || 0);
                    return { ...prev, [effect.variableId!]: next };
                });
                previousActionDuration = 0;
                continue;
            }

            // Standard Object Logic...
            let targets: string[] = [];
            if (effect.spawnActorId && (
                (effect.target === 'OBJECT' && !objectObjId) ||
                (effect.type === InteractionType.SPAWN) ||
                (effect.type === InteractionType.SAY) ||
                (effect.type === InteractionType.SWAP && effect.target === 'OBJECT' && !objectObjId)
            )) {
                if (effect.type !== InteractionType.SPAWN) {
                    targets = objectsRef.current.filter(o => o.actorId === effect.spawnActorId).map(o => o.id);
                }
            } else {
                const targetId = effect.target === 'OBJECT' && objectObjId ? objectObjId : subjectObjId;
                if (targetId) targets.push(targetId);
            }

            if (effect.type === InteractionType.SPAWN) {
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
                continue;
            }

            for (const targetId of targets) {
                // SAY EFFECT
                if (effect.type === InteractionType.SAY && effect.text) {
                    const duration = Math.max(2000, effect.text.length * 100); // Minimum 2s, or longer for more text
                    setActiveBubbles(prev => ({
                        ...prev,
                        [targetId]: { text: effect.text!, expiresAt: Date.now() + duration }
                    }));
                    // Don't block sequence too long, but maybe a little?
                    previousActionDuration = 500;
                    continue;
                }

                switch (effect.type) {
                    case InteractionType.WIN:
                        setStatus('WON');
                        previousActionDuration = 0;
                        break;
                    case InteractionType.DESTROY_SUBJECT:
                        const subjInstance = objectsRef.current.find(o => o.id === subjectObjId);
                        if (subjInstance && subjInstance.actorId === gameData.actors[0].id) {
                            setStatus('LOST');
                        }
                        setObjects(prev => prev.filter(o => o.id !== subjectObjId));
                        if (subjectObjId === draggingId) setDraggingId(null);
                        previousActionDuration = 0;
                        break;
                    case InteractionType.DESTROY_OBJECT:
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
                    case InteractionType.JUMP:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                // Apply vertical velocity for jump (Z-axis)
                                // Default intensity 15 if not specified
                                const jumpStrength = effect.value || 15;
                                return { ...o, vz: jumpStrength };
                            }
                            return o;
                        }));
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
                    case InteractionType.SHAKE:
                        setShakeIntensity(20); // Shake hard!
                        setTimeout(() => setShakeIntensity(0), 500);
                        previousActionDuration = 0;
                        break;
                    // CHASE (Was STEP)
                    case InteractionType.CHASE:
                        // ... (existing CHASE logic) ...
                        // Move towards target (hero or specific actor)
                        const subjectObj = objectsRef.current.find(o => o.id === targetId);
                        if (!subjectObj) break;

                        const chaseTargetActorId = effect.spawnActorId; // If set, chase this actor. If null, chase hero.

                        let targetX = 0;
                        let targetY = 0;

                        if (chaseTargetActorId) {
                            const targetObj = objectsRef.current.find(o => o.actorId === chaseTargetActorId);
                            if (targetObj) {
                                targetX = targetObj.x;
                                targetY = targetObj.y;
                            }
                        } else {
                            // Chase Hero
                            const hero = objectsRef.current.find(o => o.actorId === gameData.actors[0].id);
                            if (hero) {
                                targetX = hero.x;
                                targetY = hero.y;
                            }
                        }

                        // Simple step towards target
                        const dx = targetX - subjectObj.x;
                        const dy = targetY - subjectObj.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist > 5) {
                            const stepSize = 10; // Pixel per step
                            const moveX = (dx / dist) * stepSize;
                            const moveY = (dy / dist) * stepSize;

                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return { ...o, x: o.x + moveX, y: o.y + moveY };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 200; // Small delay for steps
                        break;

                    case InteractionType.MOVE:
                        if (effect.path && effect.path.length > 0) {
                            setObjects(prev => prev.map(o => {
                                if (o.id === targetId) {
                                    return {
                                        ...o,
                                        activePath: {
                                            points: effect.path!,
                                            currentIndex: 0,
                                            speed: 2, // Default speed
                                            loop: true // Default loop? Or make it configurable? Let's say loop for now.
                                        }
                                    };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;
                    case InteractionType.SHOOT:
                        if (effect.spawnActorId) {
                            // Determine Shooters
                            let shooters: LevelObject[] = [];
                            if (effect.shooterActorId) {
                                shooters = objectsRef.current.filter(o => o.actorId === effect.shooterActorId);
                            } else {
                                // Default: Use the subject (the one performing the action)
                                const s = objectsRef.current.find(o => o.id === subjectObjId);
                                if (s) shooters.push(s);
                            }

                            shooters.forEach(shooter => {
                                let vx = 0;
                                let vy = 0;
                                const speed = 8; // Projectile speed

                                // Find nearest other object to shoot at
                                const others = objectsRef.current.filter(o => o.id !== shooter.id);
                                let closest = null;
                                let minDist = Infinity;
                                for (const o of others) {
                                    const d = Math.hypot(o.x - shooter.x, o.y - shooter.y);
                                    if (d < minDist) {
                                        minDist = d;
                                        closest = o;
                                    }
                                }

                                if (closest) {
                                    const dx = closest.x - shooter.x;
                                    const dy = closest.y - shooter.y;
                                    const dist = Math.hypot(dx, dy);
                                    if (dist > 0) {
                                        vx = (dx / dist) * speed;
                                        vy = (dy / dist) * speed;
                                    }
                                } else {
                                    // Default direction if no target? Down?
                                    vy = speed;
                                }

                                // Calculate Spawn Position with Offset
                                const spawnX = shooter.x + (effect.shootOffsetX || 0);
                                const spawnY = shooter.y + (effect.shootOffsetY || 0);

                                const projectile: LevelObject = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    actorId: effect.spawnActorId!,
                                    x: spawnX,
                                    y: spawnY,
                                    scale: effect.projectileSize || 0.5,
                                    vx,
                                    vy,
                                    isEphemeral: false
                                };

                                setObjects(prev => [...prev, projectile]);
                            });
                        }
                        previousActionDuration = 0;
                        break;
                    case InteractionType.HOLD:
                        // HOLD
                        const holdTargetType = effect.holdConfig?.targetActorId;
                        const holdHolderType = effect.holdConfig?.holderActorId;

                        // 1. Determine the HOLDER Instance(s)
                        let potentialHolders: LevelObject[] = [];
                        if (holdHolderType) {
                            // If a specific holder type is configured, find all instances of that type
                            potentialHolders = objectsRef.current.filter(o => o.actorId === holdHolderType);
                        } else {
                            // Default: The subject of the rule (e.g. the one who clicked or collided)
                            const subj = objectsRef.current.find(o => o.id === subjectObjId);
                            if (subj) potentialHolders.push(subj);
                        }

                        // 2. For each holder, try to find a target to hold
                        const updates = new Map<string, Partial<LevelObject>>();

                        potentialHolders.forEach(holder => {
                            // If this holder is already holding something, maybe skip? Or allow multiple? 
                            // For now, let's assume one item per holder for simplicity, unless we want to stack.
                            // But the user might want to hold multiple things. Let's allow it.

                            let targetToHold: LevelObject | null = null;

                            if (holdTargetType) {
                                // Find nearest instance of this type that is NOT held
                                const candidates = objectsRef.current.filter(o => o.actorId === holdTargetType && !o.heldBy && o.id !== holder.id);
                                let minDist = Infinity;
                                candidates.forEach(c => {
                                    const d = Math.hypot(c.x - holder.x, c.y - holder.y);
                                    if (d < minDist) {
                                        minDist = d;
                                        targetToHold = c;
                                    }
                                });
                            } else {
                                // Default: The target of the rule (e.g. the object clicked or collided with)
                                // But only if it's NOT the holder itself
                                if (targetId && targetId !== holder.id) {
                                    const t = objectsRef.current.find(o => o.id === targetId);
                                    if (t && !t.heldBy) targetToHold = t;
                                }
                            }

                            if (targetToHold) {
                                updates.set(targetToHold.id, {
                                    heldBy: holder.id,
                                    holdOffsetX: effect.holdConfig?.offsetX || 0,
                                    holdOffsetY: effect.holdConfig?.offsetY || 0
                                });
                            }
                        });

                        if (updates.size > 0) {
                            setObjects(prev => prev.map(o => {
                                if (updates.has(o.id)) {
                                    return { ...o, ...updates.get(o.id) };
                                }
                                return o;
                            }));
                        }
                        previousActionDuration = 0;
                        break;

                    case InteractionType.DROP:
                        // DROP
                        const dropTargetType = effect.holdConfig?.targetActorId;
                        const dropHolderType = effect.holdConfig?.holderActorId;

                        // 1. Determine the HOLDER Instance(s)
                        let droppers: LevelObject[] = [];
                        if (dropHolderType) {
                            droppers = objectsRef.current.filter(o => o.actorId === dropHolderType);
                        } else {
                            const subj = objectsRef.current.find(o => o.id === subjectObjId);
                            if (subj) droppers.push(subj);
                        }

                        // 2. Drop items held by these droppers
                        setObjects(prev => prev.map(obj => {
                            // Is this object held by one of our droppers?
                            const heldByDropper = droppers.some(d => d.id === obj.heldBy);

                            if (heldByDropper) {
                                // If a specific target type was requested, check it
                                if (dropTargetType && obj.actorId !== dropTargetType) return obj;

                                // Drop at holder's position (NO OFFSET)
                                const holder = droppers.find(d => d.id === obj.heldBy);
                                let newX = obj.x;
                                let newY = obj.y;

                                if (holder) {
                                    newX = holder.x;
                                    newY = holder.y;
                                }

                                return {
                                    ...obj,
                                    heldBy: undefined,
                                    holdOffsetX: undefined,
                                    holdOffsetY: undefined,
                                    x: newX,
                                    y: newY
                                };
                            }
                            return obj;
                        }));
                        previousActionDuration = 0;
                        break;
                    case InteractionType.PARTICLES:
                        const targetObj = objectsRef.current.find(o => o.id === targetId);
                        if (targetObj) {
                            const pType = effect.particleType || 'CONFETTI';
                            const pCount = effect.particleCount || 20;
                            const pSize = effect.particleSize || 4;
                            const pArea = effect.particleArea || 20;

                            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
                            if (pType === 'SMOKE') colors.length = 0; // Reset for smoke

                            const newParticles = Array.from({ length: pCount }).map(() => {
                                const angle = Math.random() * Math.PI * 2;
                                const speed = Math.random() * 5 + 2;
                                const offsetR = Math.random() * pArea;

                                let color = colors[Math.floor(Math.random() * colors.length)];
                                if (pType === 'SMOKE') color = `rgba(200, 200, 200, ${Math.random() * 0.5 + 0.5})`;
                                if (pType === 'RAIN') color = '#4444ff';

                                let vx = Math.cos(angle) * speed;
                                let vy = Math.sin(angle) * speed - 5;
                                let life = 1.0 + Math.random();

                                if (pType === 'SMOKE') {
                                    vx = (Math.random() - 0.5) * 2;
                                    vy = -Math.random() * 2 - 1;
                                    life = 2.0;
                                } else if (pType === 'RAIN') {
                                    vx = 0;
                                    vy = 10;
                                    life = 0.5;
                                }

                                return {
                                    id: Math.random().toString(36),
                                    x: targetObj.x + ACTOR_SIZE / 2 + Math.cos(angle) * offsetR,
                                    y: targetObj.y + ACTOR_SIZE / 2 + Math.sin(angle) * offsetR,
                                    color: color || '#fff',
                                    vx,
                                    vy,
                                    life,
                                    size: pSize,
                                    type: pType,
                                    actorId: effect.particleActorId
                                };
                            });
                            setParticles(prev => [...prev, ...newParticles]);
                        }
                        previousActionDuration = 0;
                        break;
                }
            }
        }
    };

    // START & TIMER RULES
    // START & TIMER RULES
    useEffect(() => {
        if (status !== 'PLAYING') return;
        const activeRules = getActiveRules();

        // START
        const startRules = activeRules.filter(r => r.trigger === RuleTrigger.START);
        if (startRules.length > 0) {
            startRules.forEach(rule => {
                if (!executingRuleIds.current.has(rule.id)) {
                    executingRuleIds.current.add(rule.id);
                    if (rule.soundId) setTimeout(() => playSound(rule.soundId!), 50);
                    executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                }
            });
        }

        // TIMER
        const timerRules = activeRules.filter(r => r.trigger === RuleTrigger.TIMER);
        const interval = setInterval(() => {
            if (status !== 'PLAYING') return;
            const now = Date.now();

            timerRules.forEach(rule => {
                const lastTime = lastTimerExecution.current[rule.id] || 0;
                const intervalMs = (rule.interval || 2) * 1000;

                if (now - lastTime >= intervalMs) {
                    lastTimerExecution.current[rule.id] = now;

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
                }
            });
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [activeSceneId, status]); // Removed objects.length to prevent re-triggering START on spawn

    // KEYBOARD CONTROLS (KEY TRIGGER)
    useEffect(() => {
        if (status !== 'PLAYING') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase();
            let mappedKey = key;

            // Map special keys to match Rule format
            if (key === 'ARROWUP') mappedKey = 'UP';
            if (key === 'ARROWDOWN') mappedKey = 'DOWN';
            if (key === 'ARROWLEFT') mappedKey = 'LEFT';
            if (key === 'ARROWRIGHT') mappedKey = 'RIGHT';
            if (key === ' ') mappedKey = 'SPACE';

            // Also support WASD as arrows if desired, or keep them separate?
            // For now, let's map WASD to arrows for backward compatibility if they were used that way
            // But the new recorder allows recording 'W' specifically.
            // Let's keep the old map for now as a fallback or alternative?
            // Actually, the previous code mapped 'w' to 'UP'.
            // If I want to support "Any key", I should probably respect the recorded key.
            // If the rule says 'UP', then ArrowUp or W should trigger it.
            // If the rule says 'W', then only W should trigger it.

            const activeRules = getActiveRules();
            const keyRules = activeRules.filter(r => r.trigger === RuleTrigger.KEY_PRESS);

            keyRules.forEach(rule => {
                let isMatch = false;

                // Legacy/Arrow Logic
                if (rule.key === 'UP' && (key === 'ARROWUP' || key === 'W')) isMatch = true;
                else if (rule.key === 'DOWN' && (key === 'ARROWDOWN' || key === 'S')) isMatch = true;
                else if (rule.key === 'LEFT' && (key === 'ARROWLEFT' || key === 'A')) isMatch = true;
                else if (rule.key === 'RIGHT' && (key === 'ARROWRIGHT' || key === 'D')) isMatch = true;
                // Direct Match (for new keys like SPACE, ENTER, X, Z...)
                else if (rule.key === mappedKey) isMatch = true;

                // Normal: Match AND Not Invert
                // Invert: Not Match AND Invert
                const shouldRun = (isMatch && !rule.invert) || (!isMatch && rule.invert);

                // CHANCE CHECK
                if (shouldRun && rule.chance && Math.random() > rule.chance) return;

                if (shouldRun) {
                    // Find all subjects for this rule
                    const subjects = objectsRef.current.filter(o => o.actorId === rule.subjectId);
                    subjects.forEach(subj => {
                        if (!executingRuleIds.current.has(rule.id)) {
                            if (rule.soundId) playSound(rule.soundId);
                            executeRuleEffects(rule.id, rule.effects, subj.id, null);
                        }
                    });

                    // If no subject (Global rule?), just execute once
                    if (!rule.subjectId) {
                        executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
                    }
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, activeSceneId]);

    const checkCollision = (
        rect1: { x: number, y: number, scale?: number },
        rect2: { x: number, y: number, scale?: number },
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
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();

        const activeRules = getActiveRules();
        const clickRules = activeRules.filter(r => r.trigger === RuleTrigger.CLICK);

        let ruleTriggered = false;

        // 1. Trigger Normal Click Rules for THIS object
        // 2. Trigger Inverted Click Rules for ALL OTHER objects

        for (const rule of clickRules) {
            if (executingRuleIds.current.has(rule.id)) continue;

            let shouldRun = false;
            let targetObjId = obj.id;

            if (rule.subjectId === obj.actorId && !rule.invert) {
                // Normal Click on this object
                shouldRun = true;
                ruleTriggered = true;
            } else if (rule.subjectId !== obj.actorId && rule.invert) {
                // Inverted Click: We clicked 'obj', but the rule is for 'rule.subjectId'
                // So we should trigger this rule for all instances of 'rule.subjectId'
                // Wait, we need to iterate over all instances of rule.subjectId
                const subjects = objectsRef.current.filter(o => o.actorId === rule.subjectId);
                subjects.forEach(subj => {
                    if (rule.soundId) playSound(rule.soundId);
                    executeRuleEffects(rule.id, rule.effects, subj.id, null);
                });
                continue; // Handled separately
            }

            if (shouldRun) {
                // CHANCE CHECK
                if (rule.chance && Math.random() > rule.chance) shouldRun = false;
            }

            if (shouldRun) {
                executingRuleIds.current.add(rule.id);
                if (rule.soundId) playSound(rule.soundId);
                await executeRuleEffects(rule.id, rule.effects, targetObjId, null);
                executingRuleIds.current.delete(rule.id);
            }
        }

        if (ruleTriggered) return;

        if (!obj.isLocked) {
            dragOffset.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
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
                { x: newX, y: newY, scale: movingObj.scale },
                { x: other.x, y: other.y, scale: other.scale }
            );
            const pairKey = [movingObj.id, other.id].sort().join(':');

            if (isTouching) {
                if (!activeCollisions.current.has(pairKey)) {
                    activeCollisions.current.add(pairKey);
                    const activeRules = getActiveRules();

                    // Regular COLLISION rules
                    const rules = activeRules.filter(r =>
                        r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                    );
                    for (const rule of rules) {
                        const shouldTrigger = rule.invert ? false : true;
                        if (shouldTrigger) {
                            // CHANCE CHECK
                            if (rule.chance && Math.random() > rule.chance) continue;

                            const hasBlock = rule.effects.some(e => e.type === InteractionType.BLOCK);
                            const hasPush = rule.effects.some(e => e.type === InteractionType.PUSH);
                            if (hasBlock || hasPush) allowMove = false;
                            if (!executingRuleIds.current.has(rule.id)) {
                                if (rule.soundId) playSound(rule.soundId);
                                if (rule.effects.length > 0) {
                                    executingRuleIds.current.add(rule.id);
                                    executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id)
                                        .then(() => { executingRuleIds.current.delete(rule.id); });
                                }
                            }
                        }
                    }

                    // HIT trigger (projectile collisions)
                    const movingIsProjectile = (movingObj.vx !== undefined && movingObj.vx !== 0) || (movingObj.vy !== undefined && movingObj.vy !== 0);
                    const otherIsProjectile = (other.vx !== undefined && other.vx !== 0) || (other.vy !== undefined && other.vy !== 0);

                    if (movingIsProjectile || otherIsProjectile) {
                        // When moving object (projectile) hits other
                        if (movingIsProjectile) {
                            const hitRules = activeRules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === other.actorId && r.objectId === movingObj.actorId
                            );
                            for (const rule of hitRules) {
                                if (!executingRuleIds.current.has(rule.id)) {
                                    if (rule.soundId) playSound(rule.soundId);
                                    if (rule.effects.length > 0) {
                                        executingRuleIds.current.add(rule.id);
                                        executeRuleEffects(rule.id, rule.effects, other.id, movingObj.id)
                                            .then(() => { executingRuleIds.current.delete(rule.id); });
                                    }
                                }
                            }
                        }

                        // When other object (projectile) hits moving
                        if (otherIsProjectile) {
                            const hitRules = activeRules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                            );
                            for (const rule of hitRules) {
                                if (!executingRuleIds.current.has(rule.id)) {
                                    if (rule.soundId) playSound(rule.soundId);
                                    if (rule.effects.length > 0) {
                                        executingRuleIds.current.add(rule.id);
                                        executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id)
                                            .then(() => { executingRuleIds.current.delete(rule.id); });
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                const isStillClose = checkCollision(
                    { x: newX, y: newY, scale: movingObj.scale }, { x: other.x, y: other.y, scale: other.scale }, 5
                );
                if (!isStillClose && activeCollisions.current.has(pairKey)) {
                    activeCollisions.current.delete(pairKey);

                    // --- COLLISION + INVERT (CONTINUOUS TOUCHING) ---
                    // This logic was previously for "EXIT COLLISION" but is now for continuous inverted collision.
                    // The original "EXIT COLLISION" logic is removed as per the user's instruction to insert new code.
                    // Assuming `matchActors`, `continuousCollisions`, and `triggerRule` are defined elsewhere or will be added.
                    // For now, I'll comment them out to maintain syntactical correctness if they are not defined.
                    /*
                    if (matchActors) {
                        const invertMatches = rules.filter(r =>
                            r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId && r.invert
                        );

                        for (const r of invertMatches) {
                            if (!continuousCollisions[r.id]) {
                                continuousCollisions[r.id] = new Set();
                            }
                            const pairKey = `${movingObj.id}_${other.id}`;
                            if (!continuousCollisions[r.id].has(pairKey)) {
                                continuousCollisions[r.id].add(pairKey);
                                triggerRule(r, movingObj.id, other.id);
                            }
                        }
                    }
                    */

                    // --- HIT TRIGGER (Projectile Collision Detection) ---
                    // Check if either object is a projectile (has velocity)
                    const movingIsProjectile = (movingObj.vx !== undefined && movingObj.vx !== 0) || (movingObj.vy !== undefined && movingObj.vy !== 0);
                    const otherIsProjectile = (other.vx !== undefined && other.vx !== 0) || (other.vy !== undefined && other.vy !== 0);

                    // Assuming `matchActors` and `triggerRule` are defined elsewhere or will be added.
                    // For now, I'll comment them out to maintain syntactical correctness if they are not defined.
                    /*
                    if (matchActors && (movingIsProjectile || otherIsProjectile)) {
                        // When A (projectile) hits B
                        if (movingIsProjectile) {
                            const hitRules = rules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === other.actorId && r.objectId === movingObj.actorId
                            );
                            hitRules.forEach(r => triggerRule(r, other.id, movingObj.id));
                        }

                        // When B (projectile) hits A
                        if (otherIsProjectile) {
                            const hitRules = rules.filter(r =>
                                r.trigger === RuleTrigger.HIT && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                            );
                            hitRules.forEach(r => triggerRule(r, movingObj.id, other.id));
                        }
                    }
                    */

                    // Original "EXIT COLLISION" logic (now after the new insertion)
                    const activeRules = getActiveRules();
                    const rules = activeRules.filter(r =>
                        r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId && r.invert
                    );
                    for (const rule of rules) {
                        if (!executingRuleIds.current.has(rule.id)) {
                            if (rule.soundId) playSound(rule.soundId);
                            executeRuleEffects(rule.id, rule.effects, movingObj.id, other.id);
                        }
                    }
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

    const handleMouseUp = () => { setDraggingId(null); };
    const currentScene = gameData.scenes.find(s => s.id === activeSceneId);

    return (
        <div className="fixed inset-0 bg-[#facc15] z-50 flex items-center justify-center font-['Gochi_Hand'] overflow-hidden">
            <div className="bg-[#333] p-4 md:p-8 rounded-[2.5rem] shadow-[15px_20px_0px_rgba(0,0,0,0.8)] relative flex flex-col items-center border-4 border-black max-h-screen scale-90 md:scale-100">
                <div className="bg-[#88919d] p-3 rounded-xl border-4 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-6">
                    <div
                        className={`bg-white relative overflow-hidden border-2 border-black/80 shadow-inner cursor-none ${shakeIntensity > 0 ? 'animate-shake' : ''}`}
                        style={{
                            width: '800px', height: '600px', maxWidth: '80vw', maxHeight: '60vh',
                            backgroundColor: gameData.backgroundColor, cursor: 'default',
                            transform: shakeIntensity > 0 ? `translate(${Math.random() * shakeIntensity - shakeIntensity / 2}px, ${Math.random() * shakeIntensity - shakeIntensity / 2}px)` : 'scale(1)'
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <BackgroundLayer image={currentScene?.backgroundImage} frames={currentScene?.backgroundFrames} />

                        {/* PARTICLES */}
                        {particles.map(p => (
                            <div
                                key={p.id}
                                className={`absolute rounded-sm ${p.type === 'SMOKE' && !p.actorId ? 'rounded-full blur-sm' : ''}`}
                                style={{
                                    left: p.x,
                                    top: p.y,
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.actorId ? 'transparent' : p.color,
                                    opacity: Math.min(1, p.life),
                                    transform: `rotate(${p.life * 360}deg)`
                                }}
                            >
                                {p.actorId && <img src={getActor(p.actorId)?.imageData} className="w-full h-full object-contain" />}
                            </div>
                        ))}
                        {/* UI OVERLAY */}
                        {/* VARIABLES HUD REMOVED - NOW ATTACHED TO OBJECTS */}

                        {status === 'LOADING' && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center">
                                <Loader2 size={48} className="animate-spin text-gray-400" />
                                <p className="mt-2 font-bold text-gray-400 animate-pulse">LOADING ASSETS...</p>
                            </div>
                        )}

                        {status === 'READY' && (
                            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center cursor-pointer" onClick={startGame}>
                                <button className="group relative">
                                    <div className="w-24 h-24 bg-[#22c55e] rounded-full border-[4px] border-black flex items-center justify-center shadow-[6px_6px_0px_black] group-hover:scale-110 group-active:scale-95 group-active:shadow-none transition-all">
                                        <Play size={48} className="text-white fill-white ml-2" />
                                    </div>
                                </button>
                                <p className="mt-6 font-bold text-3xl animate-bounce text-black">CLICK TO START!</p>
                            </div>
                        )}

                        <div className="w-full h-full relative" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
                            {objects.map(obj => {
                                const actor = getActor(obj.actorId);
                                const playingActor = obj.activeAnimation ? getActor(obj.activeAnimation.playingActorId) : undefined;
                                if (!actor) return null;
                                const isDragging = draggingId === obj.id;
                                const currentScale = obj.scale || 1.0;
                                const displaySize = ACTOR_SIZE * currentScale;
                                const activeBubble = activeBubbles[obj.id];

                                return (
                                    <>
                                        {/* SHADOW (Only when in air) */}
                                        {(obj.z || 0) > 0 && (
                                            <div
                                                className="absolute bg-black/20 rounded-full blur-[2px]"
                                                style={{
                                                    left: obj.x + displaySize * 0.2,
                                                    top: obj.y + displaySize * 0.8,
                                                    width: displaySize * 0.6,
                                                    height: displaySize * 0.2,
                                                    zIndex: 5 + Math.floor(obj.y) // Ground level z-index
                                                }}
                                            />
                                        )}
                                        <div
                                            key={obj.id}
                                            onMouseDown={(e) => handleMouseDown(e, obj)}
                                            className={`absolute flex items-center justify-center select-none ${!obj.isLocked ? 'cursor-grab active:cursor-grabbing' : ''} ${obj.isEphemeral ? 'pointer-events-none' : ''}`}
                                            style={{
                                                left: obj.x, top: obj.y - (obj.z || 0), width: displaySize, height: displaySize,
                                                zIndex: isDragging ? 50 : 10 + Math.floor(obj.y), // Use Y for Z-sorting
                                                transition: isDragging ? 'none' : 'transform 0.1s',
                                                transform: isDragging ? 'scale(1.05)' : 'scale(1)', opacity: obj.isEphemeral ? 0.9 : 1
                                            }}
                                        >
                                            {activeBubble && <SpeechBubble text={activeBubble.text} />}
                                            <AnimatedSprite baseActor={actor} playingActor={playingActor} isLooping={obj.activeAnimation?.isLoop} isEphemeral={obj.isEphemeral} onFinish={() => handleAnimationFinish(obj.id)} triggerTime={obj.activeAnimation?.startTime} />

                                            {/* ATTACHED VARIABLE MONITOR (HUD) */}
                                            {obj.variableMonitor && (
                                                <>
                                                    {/* POPUP MODE: Show button */}
                                                    {obj.variableMonitor.displayMode === 'POPUP' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveVariablePopup(activeVariablePopup === obj.id ? null : obj.id);
                                                                }}
                                                                className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-50"
                                                            >
                                                                <span className="font-bold text-xs">i</span>
                                                            </button>

                                                            {/* POPUP HUD */}
                                                            {activeVariablePopup === obj.id && (
                                                                <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 bg-white border-[3px] border-black rounded-xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] z-[60] min-w-[140px] animate-in zoom-in duration-200 origin-bottom">
                                                                    {(() => {
                                                                        const val = runtimeVariables[obj.variableMonitor!.variableId] ?? 0;
                                                                        const vDef = gameData.variables?.find(v => v.id === obj.variableMonitor!.variableId);
                                                                        const name = vDef ? vDef.name : "???";

                                                                        return (
                                                                            <div className="flex flex-col gap-2">
                                                                                <div className="font-bold text-sm text-center uppercase border-b-2 border-black/10 pb-1">{name}</div>

                                                                                {obj.variableMonitor!.mode === 'TEXT' ? (
                                                                                    <div className="text-center text-2xl font-bold">{val}</div>
                                                                                ) : (
                                                                                    <div className="flex flex-col gap-1 w-full">
                                                                                        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-black relative">
                                                                                            <div
                                                                                                className="h-full transition-all duration-300"
                                                                                                style={{
                                                                                                    width: `${Math.min(100, Math.max(0, (val / (obj.variableMonitor!.maxValue || 100)) * 100))}%`,
                                                                                                    backgroundColor: obj.variableMonitor!.barColor || '#22c55e'
                                                                                                }}
                                                                                            ></div>
                                                                                        </div>
                                                                                        <div className="text-xs font-bold text-center text-gray-500">
                                                                                            {val} / {obj.variableMonitor!.maxValue || 100}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    {/* Triangle tail */}
                                                                    <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
                                                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* ALWAYS_VISIBLE MODE: Direct integration into sprite */}
                                                    {(obj.variableMonitor.displayMode === 'ALWAYS_VISIBLE' || !obj.variableMonitor.displayMode) && (
                                                        <div
                                                            className="absolute pointer-events-none select-none flex flex-col items-center justify-center font-bold z-50"
                                                            style={{
                                                                left: '50%',
                                                                top: '50%',
                                                                transform: `translate(-50%, -50%) translate(${obj.variableMonitor.offsetX || 0}px, ${obj.variableMonitor.offsetY || 0}px)`,
                                                                width: obj.variableMonitor.width ? `${obj.variableMonitor.width}px` : 'auto',
                                                                minWidth: obj.variableMonitor.width ? 'auto' : 100,
                                                                padding: (obj.variableMonitor.showBackground ?? true) ? 4 : 0,
                                                                backgroundColor: (obj.variableMonitor.showBackground ?? true) ? (obj.variableMonitor.backgroundColor || 'rgba(0,0,0,0.5)') : 'transparent',
                                                                borderRadius: (obj.variableMonitor.showBackground ?? true) ? 8 : 0,
                                                                fontFamily: 'monospace',
                                                                color: obj.variableMonitor.textColor || '#FFFFFF'
                                                            }}
                                                        >
                                                            {(() => {
                                                                const val = runtimeVariables[obj.variableMonitor!.variableId] ?? 0;
                                                                const vDef = gameData.variables?.find(v => v.id === obj.variableMonitor!.variableId);
                                                                const name = vDef ? vDef.name : "???";

                                                                if (obj.variableMonitor!.mode === 'TEXT') {
                                                                    return (
                                                                        <div className="text-center text-lg whitespace-nowrap">
                                                                            {(obj.variableMonitor!.showLabel ?? true) && `${name}: `}{val}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    const barHeight = obj.variableMonitor!.height || 16;
                                                                    return (
                                                                        <div className="flex flex-col gap-1 w-full">
                                                                            {(obj.variableMonitor!.showLabel ?? true) && (
                                                                                <div className="text-[10px] uppercase">{name}</div>
                                                                            )}
                                                                            <div
                                                                                className="w-full bg-gray-700 rounded-full overflow-hidden border border-white/20 relative"
                                                                                style={{ height: `${barHeight}px` }}
                                                                            >
                                                                                <div
                                                                                    className="h-full transition-all duration-300"
                                                                                    style={{
                                                                                        width: `${Math.min(100, Math.max(0, (val / (obj.variableMonitor!.maxValue || 100)) * 100))}%`,
                                                                                        backgroundColor: obj.variableMonitor!.barColor || '#22c55e'
                                                                                    }}
                                                                                ></div>
                                                                                {barHeight >= 12 && (obj.variableMonitor!.showLabel ?? true) && (
                                                                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] drop-shadow-md text-white">
                                                                                        {val} / {obj.variableMonitor!.maxValue || 100}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </>
                                );
                            })}
                        </div >

                        {(status === 'WON' || status === 'LOST' || status === 'TRANSITION') && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300 p-4 z-50">
                                {status === 'WON' && (<div className="text-yellow-400 text-center"><Trophy size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">YOU WIN!</h2></div>)}
                                {status === 'LOST' && (<div className="text-red-500 text-center"><Skull size={80} strokeWidth={2} className="mx-auto mb-4 animate-pulse" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">GAME OVER</h2></div>)}
                                {status === 'TRANSITION' && (<div className="text-purple-400 text-center"><DoorOpen size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-4xl font-bold">NEXT SCENE...</h2></div>)}
                                {(status === 'WON' || status === 'LOST') && (<button onClick={() => resetGame(activeSceneId)} className="mt-8 sketch-btn bg-white text-black px-8 py-2 text-2xl font-bold hover:scale-110 transition-transform">TRY AGAIN</button>)}
                            </div>
                        )
                        }
                    </div>
                </div>
                <div className="w-full flex justify-center items-center px-8 text-gray-500 gap-8">
                    <div className="flex items-center gap-2 text-white/50"><MousePointer className="animate-bounce" /><span>Use mouse to drag & click!</span></div>
                    <div className="flex gap-4">
                        <button onClick={() => resetGame(activeSceneId)} className="w-16 h-16 bg-red-500 rounded-full border-b-[6px] border-red-900 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-white font-bold text-xs">RESET</button>
                        <button onClick={onExit} className="w-16 h-16 bg-yellow-400 rounded-full border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 shadow-xl flex items-center justify-center text-yellow-900 font-bold text-xs">EXIT</button>
                    </div>
                </div>
            </div>
        </div>
    );
};