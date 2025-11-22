
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

    const [status, setStatus] = useState<'LOADING' | 'READY' | 'PLAYING' | 'WON' | 'LOST' | 'TRANSITION'>('LOADING');
    const [loadedSoundCount, setLoadedSoundCount] = useState(0);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const executingRuleIds = useRef<Set<string>>(new Set());
    const lastTimerExecution = useRef<Record<string, number>>({});
    const activeCollisions = useRef<Set<string>>(new Set());

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

            if (match) {
                executingRuleIds.current.add(rule.id);
                if (rule.soundId) playSound(rule.soundId);
                await executeRuleEffects(rule.id, rule.effects, 'GLOBAL', null);
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
            if (effect.type === InteractionType.THEN) {
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
                    case InteractionType.STEP:
                        setObjects(prev => prev.map(o => {
                            if (o.id === targetId) {
                                // Determine Target
                                let targetX = o.x;
                                let targetY = o.y;

                                // If a specific target actor was chosen in the editor
                                if (effect.spawnActorId) {
                                    // Find nearest instance of this actor
                                    const targets = prev.filter(t => t.actorId === effect.spawnActorId && t.id !== o.id);
                                    if (targets.length > 0) {
                                        // Find closest
                                        let closest = targets[0];
                                        let minDist = Math.hypot(closest.x - o.x, closest.y - o.y);
                                        for (const t of targets) {
                                            const d = Math.hypot(t.x - o.x, t.y - o.y);
                                            if (d < minDist) {
                                                minDist = d;
                                                closest = t;
                                            }
                                        }
                                        targetX = closest.x;
                                        targetY = closest.y;
                                    }
                                } else {
                                    // Default: Move towards Hero (if exists and is not self)
                                    const hero = prev.find(h => h.actorId === gameData.actors[0].id);
                                    if (hero && hero.id !== o.id) {
                                        targetX = hero.x;
                                        targetY = hero.y;
                                    }
                                }

                                // Move towards target
                                const dx = targetX - o.x;
                                const dy = targetY - o.y;
                                const dist = Math.hypot(dx, dy);

                                if (dist > 10) {
                                    const stepSize = 40; // Half a tile
                                    const moveX = (dx / dist) * stepSize;
                                    const moveY = (dy / dist) * stepSize;

                                    let nx = o.x + moveX;
                                    let ny = o.y + moveY;

                                    // Bounds check
                                    const mySize = ACTOR_SIZE * (o.scale || 1);
                                    nx = Math.max(0, Math.min(nx, SCENE_WIDTH - mySize));
                                    ny = Math.max(0, Math.min(ny, SCENE_HEIGHT - mySize));

                                    return { ...o, x: nx, y: ny };
                                }
                            }
                            return o;
                        }));
                        previousActionDuration = 200; // Small delay for steps
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
            const keyMap: Record<string, 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'> = {
                'ArrowUp': 'UP', 'w': 'UP',
                'ArrowDown': 'DOWN', 's': 'DOWN',
                'ArrowLeft': 'LEFT', 'a': 'LEFT',
                'ArrowRight': 'RIGHT', 'd': 'RIGHT'
            };

            const direction = keyMap[e.key];
            if (!direction) return;

            const activeRules = getActiveRules();
            const keyRules = activeRules.filter(r => r.trigger === RuleTrigger.KEY_PRESS);

            keyRules.forEach(rule => {
                const isMatch = rule.key === direction;
                // Normal: Match AND Not Invert
                // Invert: Not Match AND Invert
                const shouldRun = (isMatch && !rule.invert) || (!isMatch && rule.invert);

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
                    const rules = activeRules.filter(r =>
                        r.trigger === RuleTrigger.COLLISION && r.subjectId === movingObj.actorId && r.objectId === other.actorId
                    );
                    for (const rule of rules) {
                        const shouldTrigger = rule.invert ? false : true;
                        if (shouldTrigger) {
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
                }
            } else {
                const isStillClose = checkCollision(
                    { x: newX, y: newY, scale: movingObj.scale }, { x: other.x, y: other.y, scale: other.scale }, 5
                );
                if (!isStillClose && activeCollisions.current.has(pairKey)) {
                    activeCollisions.current.delete(pairKey);

                    // TRIGGER "EXIT COLLISION" (Inverted Rules)
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

                        {/* VARIABLES HUD */}
                        {status === 'PLAYING' && gameData.variables && gameData.variables.length > 0 && (
                            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                                {gameData.variables.map(v => (
                                    <div key={v.id} className="sketch-box px-3 py-1 font-bold text-lg shadow-sm flex items-center gap-2 min-w-[100px]">
                                        <span className="uppercase text-xs text-gray-400">{v.name}:</span>
                                        <span className="text-2xl leading-none">{runtimeVariables[v.id] ?? v.initialValue}</span>
                                    </div>
                                ))}
                            </div>
                        )}

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
                                    <div
                                        key={obj.id}
                                        onMouseDown={(e) => handleMouseDown(e, obj)}
                                        className={`absolute flex items-center justify-center select-none ${!obj.isLocked ? 'cursor-grab active:cursor-grabbing' : ''} ${obj.isEphemeral ? 'pointer-events-none' : ''}`}
                                        style={{
                                            left: obj.x, top: obj.y, width: displaySize, height: displaySize,
                                            zIndex: isDragging ? 50 : 10, transition: isDragging ? 'none' : 'transform 0.1s',
                                            transform: isDragging ? 'scale(1.05)' : 'scale(1)', opacity: obj.isEphemeral ? 0.9 : 1
                                        }}
                                    >
                                        {activeBubble && <SpeechBubble text={activeBubble.text} />}
                                        <AnimatedSprite baseActor={actor} playingActor={playingActor} isLooping={obj.activeAnimation?.isLoop} isEphemeral={obj.isEphemeral} onFinish={() => handleAnimationFinish(obj.id)} triggerTime={obj.activeAnimation?.startTime} />
                                    </div>
                                );
                            })}
                        </div>

                        {(status === 'WON' || status === 'LOST' || status === 'TRANSITION') && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300 p-4 z-50">
                                {status === 'WON' && (<div className="text-yellow-400 text-center"><Trophy size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">YOU WIN!</h2></div>)}
                                {status === 'LOST' && (<div className="text-red-500 text-center"><Skull size={80} strokeWidth={2} className="mx-auto mb-4 animate-pulse" /><h2 className="text-6xl font-bold stroke-black drop-shadow-md">GAME OVER</h2></div>)}
                                {status === 'TRANSITION' && (<div className="text-purple-400 text-center"><DoorOpen size={80} strokeWidth={2} className="mx-auto mb-4 animate-bounce" /><h2 className="text-4xl font-bold">NEXT SCENE...</h2></div>)}
                                {(status === 'WON' || status === 'LOST') && (<button onClick={() => resetGame(activeSceneId)} className="mt-8 sketch-btn bg-white text-black px-8 py-2 text-2xl font-bold hover:scale-110 transition-transform">TRY AGAIN</button>)}
                            </div>
                        )}
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