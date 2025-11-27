import React, { useState } from 'react';
import { GameData, Rule, InteractionType, RuleTrigger, Sound, GlobalVariable, RuleEffect } from '../types';
import { TRIGGER_MAGNETS, EFFECT_MAGNETS, SCENE_WIDTH, SCENE_HEIGHT } from '../constants';
import { X, Plus, Play, Save, Edit2, Edit3, Trash2, Eye, Hand, Flag, Clock, Square, Utensils, ArrowRight, Trophy, DoorOpen, Skull, Zap, Ban, Timer, ArrowDown, Pause, RotateCcw, Image as ImageIcon, Move, MousePointer, EyeOff, Lock, Unlock, Layers, Grid, Type, List, Check, Sparkles, RefreshCw, Clapperboard, Hash, PlusCircle, MessageCircle, MessageSquare, Keyboard, Footprints, Activity, Crosshair, Target, ArrowDownCircle, Hourglass, Puzzle, Globe, MapPin, Volume2, VolumeX, Mic, Upload, Download, Info, HelpCircle, Settings, Repeat, ChevronsRight, Dices, RotateCw, Calculator, Map, Gamepad2, Ghost, Coins, AlertTriangle, Copy, Clipboard, Heart, Music, Wind, LogOut } from 'lucide-react';
import { SoundRecorder } from './SoundRecorder';
import { IconEditor } from './IconEditor';

// --- HELPER: Variable Linker Component ---
interface VariableLinkerProps {
    label: string;
    value: number;
    variableId?: string;
    onValueChange: (val: number) => void;
    onVariableChange: (varId: string | undefined) => void;
    variables: GlobalVariable[];
    min?: number;
    max?: number;
    step?: number;
}

const VariableLinker: React.FC<VariableLinkerProps> = ({ label, value, variableId, onValueChange, onVariableChange, variables, min, max, step }) => {
    const isLinked = !!variableId;
    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center">
                <label className="font-bold text-xs text-gray-500 uppercase">{label}</label>
                <button
                    onClick={() => onVariableChange(isLinked ? undefined : variables[0]?.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-colors ${isLinked ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'}`}
                    title="Link to Variable"
                >
                    # VAR
                </button>
            </div>
            {isLinked ? (
                <select
                    value={variableId}
                    onChange={(e) => onVariableChange(e.target.value)}
                    className="w-full border-2 border-blue-500 rounded p-1 font-bold text-sm bg-blue-50 outline-none"
                >
                    {variables.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    {variables.length === 0 && <option value="">No Variables</option>}
                </select>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onValueChange(parseFloat(e.target.value))}
                        className="flex-1 h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black border-2 border-black/10"
                    />
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onValueChange(parseFloat(e.target.value))}
                        className="w-16 border-2 border-black rounded p-1 font-bold text-center text-sm"
                    />
                </div>
            )}

        </div>
    );
};

interface RuleEditorProps {
    gameData: GameData;
    onUpdateRules: (rules: Rule[]) => void;
    onUpdateSounds: (sounds: Sound[]) => void;
    onUpdateVariables: (variables: GlobalVariable[]) => void;
    currentSceneId: string;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ gameData, onUpdateRules, onUpdateSounds, onUpdateVariables, currentSceneId }) => {
    const [isDraggingOverBoard, setIsDraggingOverBoard] = useState(false);
    const [viewScope, setViewScope] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');
    const [sidebarTab, setSidebarTab] = useState<'BLOCKS' | 'BEHAVIORS'>('BLOCKS');

    const [showIconEditor, setShowIconEditor] = useState(false);
    const [editingVariableId, setEditingVariableId] = useState<string | null>(null);

    // BEHAVIORS PRESETS
    const BEHAVIORS = [
        {
            id: 'platformer_controls',
            label: 'Platformer Controls',
            icon: <Gamepad2 size={24} className="text-purple-600" />,
            description: 'Move Left/Right & Jump',
            rules: [
                { trigger: 'KEY_PRESS', key: 'RIGHT', effects: [{ type: 'STEP', direction: 'RIGHT', force: 1 }] },
                { trigger: 'KEY_PRESS', key: 'LEFT', effects: [{ type: 'STEP', direction: 'LEFT', force: 1 }] },
                { trigger: 'KEY_PRESS', key: 'SPACE', effects: [{ type: 'JUMP', force: 12 }] },
            ]
        },
        {
            id: 'topdown_move',
            label: 'Top-Down Move',
            icon: <Map size={24} className="text-blue-600" />,
            description: 'Move in 4 directions',
            rules: [
                { trigger: 'KEY_PRESS', key: 'UP', effects: [{ type: 'STEP', direction: 'UP', force: 1 }] },
                { trigger: 'KEY_PRESS', key: 'DOWN', effects: [{ type: 'STEP', direction: 'DOWN', force: 1 }] },
                { trigger: 'KEY_PRESS', key: 'LEFT', effects: [{ type: 'STEP', direction: 'LEFT', force: 1 }] },
                { trigger: 'KEY_PRESS', key: 'RIGHT', effects: [{ type: 'STEP', direction: 'RIGHT', force: 1 }] },
            ]
        },
        {
            id: 'collectable',
            label: 'Collectable Item',
            icon: <Coins size={24} className="text-yellow-600" />,
            description: 'Touch -> Destroy + Score',
            rules: [
                {
                    trigger: 'COLLISION',
                    effects: [
                        { type: 'DESTROY_OBJECT', target: 'SUBJECT' }, // Self destroy
                        { type: 'MODIFY_VAR', operation: 'ADD', value: 1 } // Add to score (needs var selection)
                    ]
                }
            ]
        },
        {
            id: 'enemy_chase',
            label: 'Enemy Chaser',
            icon: <Ghost size={24} className="text-red-600" />,
            description: 'Follows the player',
            rules: [
                {
                    trigger: 'TIMER',
                    interval: 0.5,
                    effects: [{ type: 'CHASE' }]
                },
                {
                    trigger: 'COLLISION',
                    effects: [{ type: 'SAY', text: 'Gotcha!' }]
                }
            ]
        },
        {
            id: 'hazard',
            label: 'Deadly Hazard',
            icon: <AlertTriangle size={24} className="text-orange-600" />,
            description: 'Touch -> Restart Level',
            rules: [
                {
                    trigger: 'COLLISION',
                    effects: [{ type: 'CHANGE_SCENE', targetSceneId: 'RESTART' }] // Special ID for restart? Or just let user pick.
                }
            ]
        }
    ];

    // State for Position Picker Modal (Only for SPAWN)
    const [pickingLocationFor, setPickingLocationFor] = useState<{ ruleId: string, effectIndex: number } | null>(null);

    // State for Selection Modal (Spawn/Swap/Anim -> Actor, Change Scene -> Scene)
    const [selectionModal, setSelectionModal] = useState<{
        ruleId: string;
        effectIndex: number;
        type: 'ACTOR' | 'SCENE' | 'MUSIC';
        label: string; // "SELECT ANIMATION" etc
        allowTargetSelection?: boolean; // For SWAP/ANIM (Subject vs Object)
        currentTarget?: 'SUBJECT' | 'OBJECT';
        subjectActorId?: string; // To show preview
        objectActorId?: string; // To show preview
        allowLoop?: boolean; // For ANIM
        currentLoop?: boolean;
        allowMultiple?: boolean; // NEW: For Multi-Select
        selectedIds?: string[]; // NEW: For Multi-Select
    } | null>(null);

    // State for Timer Config Modal
    const [timerModal, setTimerModal] = useState<{ ruleId: string, interval: number } | null>(null);

    // State for Text Input Modal (SAY)
    const [textInputModal, setTextInputModal] = useState<{
        ruleId: string;
        effectIndex: number;
        currentText: string;
    } | null>(null);

    // State for Sound Modal
    const [recordingForRuleId, setRecordingForRuleId] = useState<string | null>(null);

    // State for Variable Configuration Modal (Existing var logic)
    const [variableModal, setVariableModal] = useState<{
        ruleId: string;
        type: 'TRIGGER' | 'EFFECT';
        effectIndex?: number;
        variableId: string;
    } | null>(null);

    // State for Hold/Drop Config Modal
    const [holdConfigModal, setHoldConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        type: 'HOLD' | 'DROP';
        targetActorId?: string;
        holderActorId?: string;
        offsetX?: number;
        offsetY?: number;
    } | null>(null);

    // NEW: Particle Config Modal
    const [particleModal, setParticleModal] = useState<{
        ruleId: string;
        effectIndex: number;
        type: 'CONFETTI' | 'EXPLOSION' | 'SPARKLES' | 'RAIN' | 'SMOKE';
        count?: number;
        size?: number;
        area?: number;
        particleActorId?: string;
    } | null>(null);

    // NEW: Shoot Config Modal
    const [shootConfigModal, setShootConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        speed: number;
        angleOffset: number;
        lifetime: number;
        shooterId?: string;
        offsetX?: number;
        offsetY?: number;
        projectileSize?: number;
    } | null>(null);

    // NEW: Chance Config Modal
    const [chanceModal, setChanceModal] = useState<{ ruleId: string, chance: number } | null>(null);

    // NEW: State for Key Recorder Modal
    const [keyRecordModal, setKeyRecordModal] = useState<{
        ruleId: string;
    } | null>(null);

    // NEW: State for Jump Config Modal
    const [jumpConfigModal, setJumpConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        intensity: number;
        paramRefs?: Record<string, string>;
    } | null>(null);

    // NEW: Path Editor Modal
    const [pathEditorModal, setPathEditorModal] = useState<{
        ruleId: string;
        effectIndex: number;
        path: { x: number, y: number }[];
    } | null>(null);

    // NEW: Wait Config Modal
    const [waitConfigModal, setWaitConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        duration: number;
        paramRefs?: Record<string, string>;
    } | null>(null);

    // NEW: Velocity Config Modal
    const [velocityConfigModal, setVelocityConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        vx: number;
        vy: number;
        paramRefs?: Record<string, string>;
    } | null>(null);

    // NEW: Spawn Config Modal (for Random Y)
    const [rotationConfigModal, setRotationConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        rotation: number;
        operation: 'SET' | 'ADD';
        paramRefs?: Record<string, string>;
    } | null>(null);

    const [spawnConfigModal, setSpawnConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        randomY: boolean;
        minY: number;
        maxY: number;
        scale: number;
        scaleX?: number;
        scaleY?: number;
        vx: number;
        vy: number;
        x?: number;
        y?: number;
        mode?: 'SINGLE' | 'DOUBLE_VERTICAL';
        actorId2?: string;
        gap?: number;
        autoDestroy?: boolean;
        paramRefs?: Record<string, string>;
    } | null>(null);

    // NEW: Gravity Config Modal
    const [gravityConfigModal, setGravityConfigModal] = useState<{ ruleId: string, effectIndex: number, hasScreenCollision: boolean, force: number, paramRefs?: Record<string, string> } | null>(null);

    // NEW: Music Config Modal
    const [musicConfigModal, setMusicConfigModal] = useState<{
        ruleId: string;
        effectIndex: number;
        volume: number;
        paramRefs?: Record<string, string>;
    } | null>(null);

    // NEW: State for Creating/Editing Variable
    const [showNewVarModal, setShowNewVarModal] = useState(false);
    const [editingVarId, setEditingVarId] = useState<string | null>(null);
    const [newVarName, setNewVarName] = useState("");
    const [newVarInitial, setNewVarInitial] = useState(0);
    const [newVarScope, setNewVarScope] = useState<'GLOBAL' | 'SCENE'>('GLOBAL');

    // Form state for variable config modal
    const [varConfigValue, setVarConfigValue] = useState<number>(1);
    const [varConfigOp, setVarConfigOp] = useState<'ADD' | 'SUB' | 'SET' | 'EQUALS' | 'GREATER' | 'LESS'>('ADD');
    const [varConfigVariableId, setVarConfigVariableId] = useState<string>('');


    const activeScopeId = viewScope === 'GLOBAL' ? 'GLOBAL' : currentSceneId;
    const filteredRules = gameData.rules.filter(r => r.scope === activeScopeId);
    const currentScene = gameData.scenes.find(s => s.id === currentSceneId) || gameData.scenes[0];

    // Filter variables based on current scope view
    // GLOBAL view: Show GLOBAL vars
    // LOCAL view: Show LOCAL vars for this scene
    // UPDATE: Show ALL variables, but sort them? Or just list them all.
    const visibleVariables = (gameData.variables || []);

    // --- HELPER: Get Icon Component ---
    const getIcon = (name: string) => {
        switch (name) {
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
            case 'refresh': return <RefreshCw size={20} strokeWidth={3} />;
            case 'film': return <Clapperboard size={20} strokeWidth={3} />;
            case 'hash': return <Hash size={20} strokeWidth={3} />;
            case 'plus-circle': return <PlusCircle size={20} strokeWidth={3} />;
            case 'message-circle': return <MessageCircle size={20} strokeWidth={3} />;
            case 'keyboard': return <Keyboard size={20} strokeWidth={3} />;
            case 'footprints': return <Footprints size={20} strokeWidth={3} />;
            case 'activity': return <Activity size={20} strokeWidth={3} />;
            case 'crosshair': return <Crosshair size={20} strokeWidth={3} />;
            case 'target': return <Target size={20} strokeWidth={3} />;
            case 'arrow-down-circle': return <ArrowDownCircle size={20} strokeWidth={3} />;
            case 'map': return <Map size={20} strokeWidth={3} />;
            case 'arrow-down': return <ArrowDown size={20} strokeWidth={3} />;
            case 'clock': return <Clock size={20} strokeWidth={3} />;
            case 'dice': return <div className="border-2 border-current rounded w-5 h-5 flex items-center justify-center font-bold text-[10px]">50</div>;
            case 'music': return <Music size={20} strokeWidth={3} />;
            case 'wind': return <Wind size={20} strokeWidth={3} />;
            case 'log-out': return <LogOut size={20} strokeWidth={3} />;
            default: return <HelpCircle size={20} />;
        }
    };

    // --- ACTIONS ---

    const openNewVariableModal = () => {
        setNewVarName("");
        setNewVarInitial(0);
        setNewVarScope(viewScope === 'GLOBAL' ? 'GLOBAL' : 'SCENE');
        setEditingVarId(null);
        setShowNewVarModal(true);
    };

    const openEditVariableModal = (v: GlobalVariable) => {
        setNewVarName(v.name);
        setNewVarInitial(v.initialValue);
        setNewVarScope(v.scope === 'GLOBAL' || !v.scope ? 'GLOBAL' : 'SCENE');
        setEditingVarId(v.id);
        setShowNewVarModal(true);
    };

    const saveNewVariable = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!newVarName.trim()) return;

        if (editingVarId) {
            // UPDATE
            const updated = (gameData.variables || []).map(v => v.id === editingVarId ? { ...v, name: newVarName.trim(), initialValue: Number(newVarInitial) } : v);
            onUpdateVariables(updated);
        } else {
            // CREATE
            const newVar: GlobalVariable = {
                id: Math.random().toString(36).substr(2, 9),
                name: newVarName.trim(),
                initialValue: Number(newVarInitial) || 0,
                scope: newVarScope === 'GLOBAL' ? 'GLOBAL' : currentSceneId
            };
            onUpdateVariables([...(gameData.variables || []), newVar]);
        }
        setShowNewVarModal(false);
        setEditingVarId(null);
    };

    const handleDeleteVariable = (id: string) => {
        if (confirm("Delete this variable?")) {
            onUpdateVariables((gameData.variables || []).filter(v => v.id !== id));
        }
    };

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
                subjectId: '', objectId: '', effects: []
            };

            // Special handling for VAR_CHECK magnet (defaults to first variable if exists)
            if (trigger === RuleTrigger.VAR_CHECK) {
                const firstVar = visibleVariables[0];
                if (firstVar) {
                    newRule.variableId = firstVar.id;
                    newRule.condition = 'EQUALS';
                    newRule.threshold = 1;
                }
            }

            // Special handling for KEY_PRESS magnet (defaults to UP)
            if (trigger === RuleTrigger.KEY_PRESS) {
                newRule.key = 'UP';
            }

            onUpdateRules([...gameData.rules, newRule]);
        }
        // DRAGGING A VARIABLE ONTO THE BOARD = CREATE A TRIGGER (WHEN VAR = X)
        else if (type === "VARIABLE") {
            const varId = e.dataTransfer.getData("variableId");
            const newRule: Rule = {
                id: Math.random().toString(36).substr(2, 9),
                scope: activeScopeId,
                trigger: RuleTrigger.VAR_CHECK, // START WITH CHECK
                variableId: varId,
                condition: 'EQUALS',
                threshold: 1,
                subjectId: '', objectId: '', effects: []
            };
            onUpdateRules([...gameData.rules, newRule]);

            // Open config immediately
            setVarConfigValue(1);
            setVarConfigOp('EQUALS');
            setVarConfigVariableId(varId);
            setVariableModal({ ruleId: newRule.id, type: 'TRIGGER', variableId: varId });
        }
        // DRAGGING A BEHAVIOR
        else if (type === "NEW_BEHAVIOR") {
            const behaviorId = e.dataTransfer.getData("behaviorId");
            const behavior = BEHAVIORS.find(b => b.id === behaviorId);

            if (behavior) {
                const newRules = behavior.rules.map(t => {
                    const template = t as any;
                    // Map template to actual Rule object
                    const rule: Rule = {
                        id: Math.random().toString(36).substr(2, 9),
                        scope: activeScopeId,
                        trigger: template.trigger as RuleTrigger,
                        subjectId: '',
                        objectId: '',
                        effects: template.effects.map((eff: any) => ({
                            ...eff,
                            type: eff.type as InteractionType
                        })) as RuleEffect[]
                    };

                    // Special handling for specific templates
                    if (template.key) rule.key = template.key;
                    if (template.interval) rule.interval = template.interval;

                    return rule;
                });

                onUpdateRules([...gameData.rules, ...newRules]);
            }
        }
    };

    const handleSlotDrop = (e: React.DragEvent, ruleId: string, slot: 'subject' | 'object' | 'effects' | 'trigger_modifier' | 'trigger', effectIndex?: number) => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData("type");

        if (type === "NEW_FROM_BAR" || type === "ACTOR_SELECT") {
            const actorId = e.dataTransfer.getData("actorId");
            if (actorId) {
                if (slot === 'subject' || slot === 'object') {
                    onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, [slot === 'subject' ? 'subjectId' : 'objectId']: actorId } : r));
                }
            }
        }
        else if (type === "NEW_EFFECT_MAGNET") {
            const interaction = e.dataTransfer.getData("interaction") as InteractionType;
            if (slot === 'effects') {
                const defaultTarget = interaction === InteractionType.DESTROY_OBJECT ? 'OBJECT' : 'SUBJECT';

                let newEffect: RuleEffect = { type: interaction, target: defaultTarget };

                // Handle MODIFY_VAR magnet
                if (interaction === InteractionType.MODIFY_VAR) {
                    const firstVar = visibleVariables[0];
                    if (firstVar) {
                        newEffect.variableId = firstVar.id;
                        newEffect.operation = 'ADD';
                        newEffect.value = 1;
                    }
                }

                // Handle CHASE magnet (Target Selection)
                if (interaction === InteractionType.CHASE) {
                    // We want to select WHO to move towards (optional, but good feature)
                    // If we don't select anyone, it might default to Hero or Forward
                    // Let's open the modal to pick a target actor
                    setTimeout(() => {
                        setSelectionModal({
                            ruleId,
                            effectIndex: gameData.rules.find(r => r.id === ruleId)!.effects.length - 1, // It will be the last one
                            type: 'ACTOR',
                            label: 'MOVE TOWARDS WHO?',
                            allowTargetSelection: false // Just pick an actor ID
                        });
                    }, 50);
                }

                // Handle SAY magnet
                if (interaction === InteractionType.SAY) {
                    newEffect.text = "Hello!";
                    // We will open the modal via a timeout to ensure render happens first
                    setTimeout(() => {
                        // Find the rule again to get the correct effect index
                        setTextInputModal({ ruleId, effectIndex: gameData.rules.find(r => r.id === ruleId)!.effects.length, currentText: "Hello!" });
                    }, 50);
                }

                // Handle CHASE magnet
                if (interaction === InteractionType.CHASE) {
                    newEffect = {
                        type: InteractionType.CHASE,
                        spawnActorId: undefined // Default to chasing Hero
                    };
                } else if (interaction === InteractionType.PUSH) {
                    // No specific default values needed for PUSH beyond the type and default target
                } else if (interaction === InteractionType.SHOOT) {
                    setTimeout(() => {
                        setSelectionModal({
                            ruleId,
                            effectIndex: gameData.rules.find(r => r.id === ruleId)!.effects.length - 1,
                            type: 'ACTOR',
                            label: 'SHOOT WHAT?',
                            allowTargetSelection: false
                        });
                    }, 50);
                } else if (interaction === InteractionType.PLAY_MUSIC) {
                    setTimeout(() => {
                        setSelectionModal({
                            ruleId,
                            effectIndex: gameData.rules.find(r => r.id === ruleId)!.effects.length - 1,
                            type: 'MUSIC',
                            label: 'SELECT MUSIC TRACK',
                            allowTargetSelection: false
                        });
                    }, 50);
                } else if (interaction === InteractionType.SET_VELOCITY) {
                    newEffect.velocity = { x: 0, y: 0 };
                    setTimeout(() => {
                        setVelocityConfigModal({
                            ruleId,
                            effectIndex: gameData.rules.find(r => r.id === ruleId)!.effects.length - 1,
                            vx: 0,
                            vy: 0
                        });
                    }, 50);
                } else if (interaction === InteractionType.SET_GRAVITY) {
                    // No config needed for now, just toggle on
                }

                onUpdateRules(gameData.rules.map(r => {
                    if (r.id === ruleId) {
                        return { ...r, effects: [...r.effects, newEffect] };
                    }
                    return r;
                }));
            }
        }
        else if (type === "NOT_STICKER" && slot === 'trigger_modifier') {
            onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, invert: !r.invert } : r));
        }
        else if (type === "DICE_STICKER" && (slot === 'trigger_modifier' || slot === 'trigger')) {
            onUpdateRules(gameData.rules.map(r => r.id === ruleId ? { ...r, chance: r.chance === 0.5 ? undefined : 0.5 } : r));
        }
        // DRAGGING A VARIABLE ONTO THE TRIGGER SLOT = CONVERT TO VAR CHECK
        else if (type === "VARIABLE" && slot === 'trigger_modifier') {
            const varId = e.dataTransfer.getData("variableId");
            onUpdateRules(gameData.rules.map(r => r.id === ruleId ? {
                ...r,
                trigger: RuleTrigger.VAR_CHECK,
                variableId: varId,
                condition: 'EQUALS',
                threshold: 1,
                subjectId: '', objectId: '' // Clear fields that might not apply anymore
            } : r));

            // Open modal
            setVarConfigValue(1);
            setVarConfigOp('EQUALS');
            setVarConfigVariableId(varId);
            setVariableModal({ ruleId: ruleId, type: 'TRIGGER', variableId: varId });
        }
        // DRAGGING A VARIABLE ONTO THE EFFECT SLOT = MODIFY VARIABLE (ADD 1)
        else if (type === "VARIABLE" && slot === 'effects') {
            const varId = e.dataTransfer.getData("variableId");
            onUpdateRules(gameData.rules.map(r => {
                if (r.id === ruleId) {
                    // Add new effect
                    const newEffect: RuleEffect = {
                        type: InteractionType.MODIFY_VAR,
                        variableId: varId,
                        operation: 'ADD',
                        value: 1
                    };
                    const newEffects = [...r.effects, newEffect];

                    // Trigger modal for the LAST effect
                    setTimeout(() => {
                        setVarConfigValue(1);
                        setVarConfigOp('ADD');
                        setVarConfigVariableId(varId);
                        setVariableModal({ ruleId: r.id, type: 'EFFECT', effectIndex: r.effects.length, variableId: varId });
                    }, 50);

                    return { ...r, effects: newEffects };
                }
                return r;
            }));
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

    const updateEffect = (ruleId: string, effectIndex: number, updates: Partial<RuleEffect>) => {
        onUpdateRules(gameData.rules.map(r => {
            if (r.id === ruleId) {
                const newEffects = [...r.effects];
                newEffects[effectIndex] = { ...newEffects[effectIndex], ...updates };
                return { ...r, effects: newEffects };
            }
            return r;
        }));
    };

    const getActorImage = (id: string) => {
        return gameData.actors.find(a => a.id === id)?.imageData;
    };

    const handleSelectionSave = (selectedId: string) => {
        if (!selectionModal) return;

        // MULTI-SELECT LOGIC
        if (selectionModal.allowMultiple) {
            const currentIds = selectionModal.selectedIds || [];
            const newIds = currentIds.includes(selectedId)
                ? currentIds.filter(id => id !== selectedId)
                : [...currentIds, selectedId];

            setSelectionModal({ ...selectionModal, selectedIds: newIds });
            return; // Don't close modal yet
        }

        // SPECIAL CASE: If we are selecting a sprite for the Particle Modal
        if (particleModal) {
            setParticleModal({ ...particleModal, particleActorId: selectedId });
            setSelectionModal(null);
            return;
        }

        // SPECIAL CASE: If we are selecting a sprite for the Shoot Config Modal
        if (shootConfigModal) {
            setShootConfigModal({ ...shootConfigModal, shooterId: selectedId });
            setSelectionModal(null);
            return;
        }

        // SPECIAL CASE: Hold/Drop Config
        if (holdConfigModal) {
            onUpdateRules(gameData.rules.map(r => {
                if (r.id === holdConfigModal.ruleId) {
                    const newEffects = [...r.effects];
                    const currentConfig = newEffects[holdConfigModal.effectIndex].holdConfig || {};

                    if (selectionModal.label.includes("HOLDER")) {
                        newEffects[holdConfigModal.effectIndex] = {
                            ...newEffects[holdConfigModal.effectIndex],
                            holdConfig: { ...currentConfig, holderActorId: selectedId }
                        };
                    } else {
                        newEffects[holdConfigModal.effectIndex] = {
                            ...newEffects[holdConfigModal.effectIndex],
                            holdConfig: { ...currentConfig, targetActorId: selectedId }
                        };
                    }
                    return { ...r, effects: newEffects };
                }
                return r;
            }));
            setSelectionModal(null);
            return;
        }

        const { ruleId, effectIndex, type, currentTarget, currentLoop } = selectionModal;

        onUpdateRules(gameData.rules.map(r => {
            if (r.id === ruleId) {
                const newEffects = [...r.effects];
                // Safety check
                if (!newEffects[effectIndex]) return r;

                if (type === 'ACTOR') {
                    const currentEffect = newEffects[effectIndex];

                    if (currentEffect.type === InteractionType.SAY) {
                        newEffects[effectIndex] = {
                            ...currentEffect,
                            spawnActorId: selectedId,
                            target: currentTarget || currentEffect.target || 'SUBJECT'
                        };
                    } else if (currentEffect.type === InteractionType.DESTROY_OBJECT) {
                        newEffects[effectIndex] = {
                            ...currentEffect,
                            target: currentTarget || 'OBJECT',
                            spawnActorId: selectedId
                        };
                    } else if (currentEffect.type === InteractionType.CHASE || currentEffect.type === InteractionType.SHOOT) {
                        newEffects[effectIndex] = {
                            ...currentEffect,
                            spawnActorId: selectedId
                        };
                    } else {
                        newEffects[effectIndex] = {
                            ...currentEffect,
                            spawnActorId: selectedId,
                            target: currentTarget || 'SUBJECT',
                            isLoop: currentLoop
                        };
                    }
                } else if (type === 'MUSIC') {
                    newEffects[effectIndex] = { ...newEffects[effectIndex], spawnActorId: selectedId };
                } else {
                    newEffects[effectIndex] = { ...newEffects[effectIndex], targetSceneId: selectedId };
                }
                return { ...r, effects: newEffects };
            }
            return r;
        }));
        setSelectionModal(null);
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
        onUpdateSounds([...(gameData.sounds || []), newSound]);
        onUpdateRules(gameData.rules.map(r => r.id === recordingForRuleId ? { ...r, soundId } : r));
        setRecordingForRuleId(null);
    };

    const handleVariableConfigSave = () => {
        if (!variableModal) return;
        const { ruleId, type, effectIndex } = variableModal;

        onUpdateRules(gameData.rules.map(r => {
            if (r.id === ruleId) {
                if (type === 'TRIGGER') {
                    return { ...r, threshold: varConfigValue, condition: varConfigOp as any, variableId: varConfigVariableId };
                } else if (type === 'EFFECT' && effectIndex !== undefined) {
                    const newEffects = [...r.effects];
                    newEffects[effectIndex] = { ...newEffects[effectIndex], value: varConfigValue, operation: varConfigOp as any, variableId: varConfigVariableId };
                    return { ...r, effects: newEffects };
                }
            }
            return r;
        }));
        setVariableModal(null);
    };

    const handleTextSave = () => {
        if (!textInputModal) return;
        const { ruleId, effectIndex, currentText } = textInputModal;
        onUpdateRules(gameData.rules.map(r => {
            if (r.id === ruleId) {
                const newEffects = [...r.effects];
                newEffects[effectIndex] = { ...newEffects[effectIndex], text: currentText };
                return { ...r, effects: newEffects };
            }
            return r;
        }));
        setTextInputModal(null);
    };

    const getTriggerVerb = (rule: Rule): string => {
        if (rule.trigger === RuleTrigger.COLLISION) return rule.invert ? "TOUCHING" : "TOUCHES";
        if (rule.trigger === RuleTrigger.HIT) return "HIT BY";
        if (rule.trigger === RuleTrigger.CLICK) return "CLICK ON";
        if (rule.trigger === RuleTrigger.START) return "START";
        if (rule.trigger === RuleTrigger.TIMER) return "EVERY";
        if (rule.trigger === RuleTrigger.VAR_CHECK) return "IF";
        if (rule.trigger === RuleTrigger.KEY_PRESS) return "PRESS";
        return "";
    };

    const getTriggerLabel = (rule: Rule) => {
        if (rule.trigger === RuleTrigger.START) return "GAME STARTS";
        if (rule.trigger === RuleTrigger.TIMER) return "EVERY 2 SEC";
        if (rule.trigger === RuleTrigger.COLLISION) return rule.invert ? "TOUCHING" : "TOUCHES";
        if (rule.trigger === RuleTrigger.HIT) return "HIT BY";
        if (rule.trigger === RuleTrigger.VAR_CHECK) {
            const v = gameData.variables?.find(v => v.id === rule.variableId);
            const name = v ? v.name : "???";
            const op = rule.condition === 'EQUALS' ? '=' : rule.condition === 'GREATER' ? '>' : '<';
            return `${name} ${op} ${rule.threshold}`;
        }
        if (rule.trigger === RuleTrigger.KEY_PRESS) return "IS PRESSED";
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

            {/* --- MODAL: TEXT INPUT (SAY) --- */}
            {textInputModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[320px] sketch-box">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <h3 className="font-bold text-xl uppercase flex items-center gap-2">
                                <MessageCircle size={24} /> DIALOGUE
                            </h3>
                            <button onClick={() => setTextInputModal(null)}><X size={24} /></button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs uppercase text-gray-500">What do they say?</label>
                            <textarea
                                autoFocus
                                rows={3}
                                value={textInputModal.currentText}
                                onChange={e => setTextInputModal({ ...textInputModal, currentText: e.target.value })}
                                className="w-full border-2 border-black rounded p-2 font-bold text-lg bg-yellow-50 outline-none focus:bg-white transition-colors resize-none"
                            />
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button onClick={() => setTextInputModal(null)} className="flex-1 py-2 border-2 border-black rounded font-bold hover:bg-gray-100">CANCEL</button>
                            <button onClick={handleTextSave} className="flex-1 py-2 bg-[#22c55e] border-2 border-black rounded font-bold text-white hover:bg-[#16a34a] shadow-[2px_2px_0px_black] active:translate-y-1 active:shadow-none transition-all">
                                SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: NEW/EDIT VARIABLE --- */}
            {showNewVarModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[320px] sketch-box">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <h3 className="font-bold text-xl uppercase flex items-center gap-2">
                                <Hash size={24} /> {editingVarId ? 'EDIT VARIABLE' : 'NEW VARIABLE'}
                            </h3>
                            <button onClick={() => setShowNewVarModal(false)}><X size={24} /></button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs uppercase text-gray-500">Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Score, Lives..."
                                value={newVarName}
                                onChange={e => setNewVarName(e.target.value)}
                                className="w-full border-2 border-black rounded p-2 font-bold text-lg bg-yellow-50 outline-none focus:bg-white transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs uppercase text-gray-500">Initial Value</label>
                            <input
                                type="number"
                                value={newVarInitial}
                                onChange={e => setNewVarInitial(Number(e.target.value))}
                                className="w-full border-2 border-black rounded p-2 font-bold text-lg outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs uppercase text-gray-500">Scope</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setNewVarScope('GLOBAL')}
                                    className={`flex-1 py-2 border-2 rounded font-bold flex items-center justify-center gap-2 ${newVarScope === 'GLOBAL' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-400'}`}
                                >
                                    <Globe size={16} /> GLOBAL
                                </button>
                                <button
                                    onClick={() => setNewVarScope('SCENE')}
                                    className={`flex-1 py-2 border-2 rounded font-bold flex items-center justify-center gap-2 ${newVarScope === 'SCENE' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-gray-300 text-gray-400'}`}
                                >
                                    <MapPin size={16} /> SCENE
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button onClick={() => setShowNewVarModal(false)} className="flex-1 py-2 border-2 border-black rounded font-bold hover:bg-gray-100">CANCEL</button>
                            <button onClick={saveNewVariable} className="flex-1 py-2 bg-[#22c55e] border-2 border-black rounded font-bold text-white hover:bg-[#16a34a] shadow-[2px_2px_0px_black] active:translate-y-1 active:shadow-none transition-all">
                                {editingVarId ? 'SAVE CHANGES' : 'CREATE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: VARIABLE CONFIG --- */}
            {variableModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[300px] sketch-box">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <h3 className="font-bold text-xl uppercase">{variableModal.type === 'TRIGGER' ? 'CHECK VARIABLE' : 'CHANGE VARIABLE'}</h3>
                            <button onClick={() => setVariableModal(null)}><X size={24} /></button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">VARIABLE:</label>
                            <select
                                value={varConfigVariableId}
                                onChange={(e) => setVarConfigVariableId(e.target.value)}
                                className="w-full border-2 border-black rounded p-2 font-bold mb-2 bg-yellow-50 outline-none"
                            >
                                {/* SHOW ALL VARIABLES IN DROPDOWN REGARDLESS OF SCOPE FOR FLEXIBILITY */}
                                {gameData.variables?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                {(!gameData.variables || gameData.variables.length === 0) && <option value="">No Variables</option>}
                            </select>
                        </div>

                        {variableModal.type === 'TRIGGER' ? (
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-xs text-gray-500">CONDITION:</label>
                                <div className="flex gap-1">
                                    {['EQUALS', 'GREATER', 'LESS'].map(op => (
                                        <button key={op} onClick={() => setVarConfigOp(op as any)} className={`flex-1 py-2 border-2 border-black rounded font-bold text-xs ${varConfigOp === op ? 'bg-cyan-200' : 'bg-white hover:bg-gray-50'}`}>
                                            {op === 'EQUALS' ? '=' : op === 'GREATER' ? '>' : '<'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-xs text-gray-500">OPERATION:</label>
                                <div className="flex gap-1">
                                    {['ADD', 'SUB', 'SET'].map(op => (
                                        <button key={op} onClick={() => setVarConfigOp(op as any)} className={`flex-1 py-2 border-2 border-black rounded font-bold text-xs ${varConfigOp === op ? 'bg-cyan-200' : 'bg-white hover:bg-gray-50'}`}>
                                            {op}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">VALUE:</label>
                            <input type="number" value={varConfigValue} onChange={e => setVarConfigValue(parseInt(e.target.value) || 0)} className="w-full border-2 border-black rounded p-2 font-bold text-center text-xl" />
                        </div>

                        <button onClick={handleVariableConfigSave} className="sketch-btn bg-[#22c55e] text-white py-2 font-bold">SAVE</button>
                    </div>
                </div>
            )}

            {/* --- MODAL: TIMER CONFIG --- */}
            {timerModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[300px] sketch-box">
                        <h3 className="font-bold text-xl uppercase text-center">TIMER INTERVAL</h3>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">SECONDS:</label>
                            <input
                                type="number"
                                value={timerModal.interval}
                                onChange={e => setTimerModal({ ...timerModal, interval: parseFloat(e.target.value) })}
                                className="w-full border-2 border-black rounded p-2 font-bold text-center text-xl"
                                step="0.1"
                                min="0.1"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setTimerModal(null)} className="flex-1 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">CANCEL</button>
                            <button
                                onClick={() => {
                                    if (timerModal.interval > 0) {
                                        onUpdateRules(gameData.rules.map(r => r.id === timerModal.ruleId ? { ...r, interval: timerModal.interval } : r));
                                        setTimerModal(null);
                                    }
                                }}
                                className="flex-1 bg-[#22c55e] text-white py-2 font-bold rounded hover:scale-105 transition-transform"
                            >
                                SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: SELECTION (ACTOR / SCENE) --- */}
            {selectionModal && (
                <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[90%] max-w-md max-h-[80vh] overflow-hidden sketch-box">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <h3 className="font-bold text-xl flex items-center gap-2 uppercase">{selectionModal.label}</h3>
                            <button onClick={() => setSelectionModal(null)}><X size={24} /></button>
                        </div>

                        {selectionModal.allowTargetSelection && (
                            <div className="flex gap-4 justify-center py-2 bg-gray-100 rounded-lg border-2 border-black/10">
                                <button onClick={() => setSelectionModal({ ...selectionModal, currentTarget: 'SUBJECT' })} className={`flex flex-col items-center p-2 rounded border-2 transition-all ${selectionModal.currentTarget === 'SUBJECT' ? 'bg-white border-black shadow-md scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                    <span className="text-[10px] font-bold mb-1">THIS ONE</span>
                                    <div className="w-12 h-12 bg-white border border-black rounded flex items-center justify-center">
                                        {selectionModal.subjectActorId ? <img src={getActorImage(selectionModal.subjectActorId)} className="w-full h-full object-contain" /> : <div className="text-xs">?</div>}
                                    </div>
                                </button>
                                <div className="flex items-center text-gray-400"><ArrowRight size={20} /></div>
                                <button onClick={() => setSelectionModal({ ...selectionModal, currentTarget: 'OBJECT' })} className={`flex flex-col items-center p-2 rounded border-2 transition-all ${selectionModal.currentTarget === 'OBJECT' ? 'bg-white border-black shadow-md scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                    <span className="text-[10px] font-bold mb-1">THAT ONE</span>
                                    <div className="w-12 h-12 bg-white border border-black rounded flex items-center justify-center">
                                        {selectionModal.objectActorId ? <img src={getActorImage(selectionModal.objectActorId)} className="w-full h-full object-contain" /> : <div className="text-xs font-bold">ANY</div>}
                                    </div>
                                </button>
                            </div>
                        )}

                        {selectionModal.type === 'ACTOR' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-4">
                                    {gameData.actors.map(actor => {
                                        const isSelected = selectionModal.selectedIds?.includes(actor.id);
                                        return (
                                            <button
                                                key={actor.id}
                                                onClick={() => handleSelectionSave(actor.id)}
                                                className={`aspect-square border-2 rounded-lg p-2 transition-all flex flex-col items-center gap-1 shadow-sm ${isSelected ? 'bg-violet-200 border-violet-600 scale-105 ring-2 ring-violet-400' : 'border-black hover:bg-yellow-100 hover:scale-105'}`}
                                            >
                                                <img src={actor.imageData} className="w-full h-full object-contain" />
                                                <span className="text-xs font-bold truncate w-full text-center">{actor.name}</span>
                                                {isSelected && <div className="absolute top-1 right-1 bg-violet-600 text-white rounded-full p-0.5"><Check size={12} /></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectionModal.allowMultiple && (
                                    <div className="pt-4 border-t-2 border-black flex justify-end">
                                        <button
                                            onClick={() => {
                                                // Save Multi-Select Result
                                                updateEffect(selectionModal.ruleId, selectionModal.effectIndex, {
                                                    spawnActorId: selectionModal.selectedIds?.[0], // Keep first one for legacy/preview
                                                    targetActorIds: selectionModal.selectedIds
                                                });
                                                setSelectionModal(null);
                                            }}
                                            className="px-6 py-2 bg-violet-500 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-none"
                                        >
                                            DONE ({selectionModal.selectedIds?.length || 0})
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {selectionModal.type === 'SCENE' && (
                            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-4">
                                {gameData.scenes.map((scene, idx) => (
                                    <button key={scene.id} onClick={() => handleSelectionSave(scene.id)} className="aspect-square border-2 border-black rounded-lg p-2 hover:bg-purple-100 hover:scale-105 transition-all flex flex-col items-center justify-center gap-2 shadow-sm bg-gray-50">
                                        <div className="text-4xl font-bold text-gray-400">#{idx + 1}</div>
                                        <span className="text-xs font-bold truncate w-full text-center">SCENE {idx + 1}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectionModal.type === 'MUSIC' && (
                            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                                {gameData.music?.map((track) => (
                                    <button key={track.id} onClick={() => handleSelectionSave(track.id)} className="w-full p-3 border-2 border-black rounded-lg hover:bg-pink-100 hover:scale-[1.02] transition-all flex items-center gap-3 shadow-sm bg-white text-left">
                                        <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white border-2 border-black">
                                            <Music size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm uppercase">{track.name}</div>
                                            <div className="text-[10px] text-gray-500 font-bold">{track.type}</div>
                                        </div>
                                        <Play size={16} className="text-gray-400" />
                                    </button>
                                ))}
                                {(!gameData.music || gameData.music.length === 0) && (
                                    <div className="text-center text-gray-500 font-bold mt-10">NO MUSIC TRACKS FOUND.<br />GO TO MUSIC TOOL TO CREATE ONE!</div>
                                )}
                            </div>
                        )}

                        {/* LOOP TOGGLE FOR ANIMATIONS */}
                        {selectionModal.allowLoop && (
                            <div className="flex justify-center pt-2 border-t-2 border-black/10">
                                <button
                                    onClick={() => setSelectionModal({ ...selectionModal, currentLoop: !selectionModal.currentLoop })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold transition-all ${selectionModal.currentLoop ? 'bg-purple-500 text-white border-purple-700' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                                >
                                    <Repeat size={16} />
                                    {selectionModal.currentLoop ? 'LOOPING' : 'PLAY ONCE'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
                                <img key={obj.id} src={getActorImage(obj.actorId)} className="absolute opacity-50 grayscale" style={{ left: obj.x / 2, top: obj.y / 2, width: 40, height: 40 }} />
                            ))}
                        </div>
                        <button onClick={() => setPickingLocationFor(null)} className="sketch-btn px-6 py-2 bg-red-100 font-bold">CANCEL</button>
                    </div>
                </div>
            )}

            {/* --- MODAL: PARTICLE CONFIG --- */}
            {particleModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-4 w-[320px] sketch-box">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                            <h3 className="font-bold text-xl uppercase flex items-center gap-2"><Sparkles size={24} /> PARTICLES</h3>
                            <button onClick={() => setParticleModal(null)}><X size={24} /></button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">STYLE</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['CONFETTI', 'EXPLOSION', 'SMOKE', 'RAIN'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setParticleModal({ ...particleModal, type: t as any })}
                                        className={`py-2 border-2 rounded font-bold text-xs ${particleModal.type === t ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">CUSTOM SPRITE (OPTIONAL)</label>
                            <button
                                onClick={() => setSelectionModal({
                                    ruleId: particleModal.ruleId,
                                    effectIndex: particleModal.effectIndex,
                                    type: 'ACTOR',
                                    label: "CHOOSE PARTICLE SPRITE",
                                    allowTargetSelection: false
                                })}
                                className="w-full h-12 border-2 border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                            >
                                {particleModal.particleActorId ? (
                                    <>
                                        <img src={getActorImage(particleModal.particleActorId)} className="w-8 h-8 object-contain" />
                                        <span className="text-xs font-bold">CHANGE SPRITE</span>
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle size={20} />
                                        <span className="text-xs font-bold">SELECT SPRITE</span>
                                    </>
                                )}
                            </button>
                            {particleModal.particleActorId && (
                                <button onClick={() => setParticleModal({ ...particleModal, particleActorId: undefined })} className="text-xs text-red-500 font-bold underline self-end">REMOVE SPRITE</button>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">COUNT: {particleModal.count}</label>
                            <input type="range" min="5" max="100" value={particleModal.count} onChange={e => setParticleModal({ ...particleModal, count: parseInt(e.target.value) })} className="accent-purple-500" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">SIZE: {particleModal.size}</label>
                            <input type="range" min="2" max="20" value={particleModal.size} onChange={e => setParticleModal({ ...particleModal, size: parseInt(e.target.value) })} className="accent-purple-500" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">AREA: {particleModal.area}</label>
                            <input type="range" min="10" max="200" value={particleModal.area} onChange={e => setParticleModal({ ...particleModal, area: parseInt(e.target.value) })} className="accent-purple-500" />
                        </div>

                        <button
                            onClick={() => {
                                onUpdateRules(gameData.rules.map(r => {
                                    if (r.id === particleModal.ruleId) {
                                        const newEffects = [...r.effects];
                                        newEffects[particleModal.effectIndex] = {
                                            ...newEffects[particleModal.effectIndex],
                                            particleType: particleModal.type,
                                            particleCount: particleModal.count,
                                            particleSize: particleModal.size,
                                            particleArea: particleModal.area,
                                            particleActorId: particleModal.particleActorId
                                        };
                                        return { ...r, effects: newEffects };
                                    }
                                    return r;
                                }));
                                setParticleModal(null);
                            }}
                            className="sketch-btn bg-[#22c55e] text-white py-2 font-bold mt-2"
                        >
                            SAVE
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL: SHOOT CONFIG --- */}
            {shootConfigModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-4 border-4 border-black rounded-xl shadow-2xl flex flex-col items-center gap-4 sketch-box w-[350px]">
                        <h3 className="font-bold text-xl">SHOOT CONFIG</h3>

                        {/* SHOOTER SELECTION */}
                        <div className="flex flex-col gap-2 w-full">
                            <label className="font-bold text-xs text-gray-500">SHOOTER (OPTIONAL)</label>
                            <button
                                onClick={() => setSelectionModal({
                                    ruleId: shootConfigModal.ruleId,
                                    effectIndex: shootConfigModal.effectIndex,
                                    type: 'ACTOR',
                                    label: "CHOOSE SHOOTER",
                                    allowTargetSelection: false
                                })}
                                className="w-full h-12 border-2 border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                            >
                                {shootConfigModal.shooterId ? (
                                    <>
                                        <img src={getActorImage(shootConfigModal.shooterId)} className="w-8 h-8 object-contain" />
                                        <span className="text-xs font-bold">CHANGE SHOOTER</span>
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle size={20} />
                                        <span className="text-xs font-bold">DEFAULT (SUBJECT)</span>
                                    </>
                                )}
                            </button>
                            {shootConfigModal.shooterId && shootConfigModal.shooterId !== (gameData.rules.find(r => r.id === shootConfigModal.ruleId)?.subjectId) && (
                                <button onClick={() => setShootConfigModal({ ...shootConfigModal, shooterId: '' })} className="text-xs text-red-500 font-bold underline self-end">RESET TO DEFAULT</button>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <label className="font-bold text-xs text-gray-500">SPAWN POINT</label>
                            <div className="text-xs text-gray-400 mb-1">Click on the sprite to set offset</div>
                            <div
                                className="relative bg-gray-100 cursor-crosshair border-2 border-black overflow-hidden flex items-center justify-center self-center"
                                style={{ width: '200px', height: '200px' }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left - 100; // Center relative
                                    const y = e.clientY - rect.top - 100;
                                    setShootConfigModal({ ...shootConfigModal, offsetX: x, offsetY: y });
                                }}
                            >
                                {/* Render Shooter Sprite */}
                                {shootConfigModal.shooterId ? (
                                    <img
                                        src={getActorImage(shootConfigModal.shooterId)}
                                        className="w-[100px] h-[100px] object-contain opacity-50"
                                    />
                                ) : (
                                    <div className="text-gray-400 font-bold">?</div>
                                )}

                                {/* Render Crosshair at Offset */}
                                <div
                                    className="absolute w-4 h-4 border-2 border-red-500 rounded-full bg-red-500/50 pointer-events-none"
                                    style={{
                                        left: 100 + (shootConfigModal.offsetX || 0) - 8,
                                        top: 100 + (shootConfigModal.offsetY || 0) - 8
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <label className="font-bold text-xs text-gray-500">PROJECTILE SIZE: {shootConfigModal.projectileSize?.toFixed(1) || 0.5}</label>
                            <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={shootConfigModal.projectileSize || 0.5}
                                onChange={e => setShootConfigModal({ ...shootConfigModal, projectileSize: parseFloat(e.target.value) })}
                                className="accent-red-500"
                            />
                        </div>

                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShootConfigModal(null)} className="flex-1 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">CANCEL</button>
                            <button
                                onClick={() => {
                                    onUpdateRules(gameData.rules.map(r => {
                                        if (r.id === shootConfigModal.ruleId) {
                                            const newEffects = [...r.effects];
                                            const ruleSubjectId = r.subjectId;
                                            const isCustomShooter = shootConfigModal.shooterId && shootConfigModal.shooterId !== ruleSubjectId;

                                            newEffects[shootConfigModal.effectIndex] = {
                                                ...newEffects[shootConfigModal.effectIndex],
                                                shootOffsetX: shootConfigModal.offsetX || 0,
                                                shootOffsetY: shootConfigModal.offsetY || 0,
                                                projectileSize: shootConfigModal.projectileSize,
                                                shooterActorId: isCustomShooter ? shootConfigModal.shooterId : undefined
                                            };
                                            return { ...r, effects: newEffects };
                                        }
                                        return r;
                                    }));
                                    setShootConfigModal(null);
                                }}
                                className="flex-1 bg-[#22c55e] text-white py-2 font-bold rounded"
                            >
                                SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: CHANCE CONFIG --- */}
            {chanceModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-2xl flex flex-col items-center gap-4 w-[300px] sketch-box">
                        <h3 className="font-bold text-xl uppercase flex items-center gap-2"><Dices size={24} /> CHANCE</h3>

                        <div className="flex flex-col gap-2 w-full">
                            <div className="text-4xl font-bold text-center text-purple-600">
                                {Math.round(chanceModal.chance * 100)}%
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={chanceModal.chance}
                                onChange={e => setChanceModal({ ...chanceModal, chance: parseFloat(e.target.value) })}
                                className="accent-purple-500 w-full h-4"
                            />
                            <div className="flex justify-between text-xs font-bold text-gray-400">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onUpdateRules(gameData.rules.map(r => r.id === chanceModal.ruleId ? { ...r, chance: chanceModal.chance } : r));
                                setChanceModal(null);
                            }}
                            className="sketch-btn bg-[#22c55e] text-white py-2 font-bold mt-2 w-full"
                        >
                            SAVE
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL: HOLD/DROP CONFIG --- */}
            {holdConfigModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-4 border-4 border-black rounded-xl shadow-2xl flex flex-col items-center gap-4 sketch-box w-[350px] max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-xl uppercase flex items-center gap-2">
                            {holdConfigModal.type === 'HOLD' ? <Hand size={24} /> : <ArrowDownCircle size={24} />}
                            {holdConfigModal.type} CONFIG
                        </h3>

                        {/* TARGET SELECTION (WHAT TO HOLD/DROP) */}
                        <div className="flex flex-col gap-2 w-full">
                            <label className="font-bold text-xs text-gray-500">
                                {holdConfigModal.type === 'HOLD' ? 'PICK UP WHAT?' : 'DROP WHAT?'}
                            </label>
                            <button
                                onClick={() => setSelectionModal({
                                    ruleId: holdConfigModal.ruleId,
                                    effectIndex: holdConfigModal.effectIndex,
                                    type: 'ACTOR',
                                    label: holdConfigModal.type === 'HOLD' ? "PICK UP WHICH OBJECT?" : "DROP WHICH OBJECT?",
                                    allowTargetSelection: false
                                })}
                                className="w-full h-12 border-2 border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                            >
                                {(() => {
                                    const rule = gameData.rules.find(r => r.id === holdConfigModal.ruleId);
                                    const effect = rule?.effects[holdConfigModal.effectIndex];
                                    const targetId = effect?.holdConfig?.targetActorId;

                                    if (targetId) {
                                        return (
                                            <>
                                                <img src={getActorImage(targetId)} className="w-8 h-8 object-contain" />
                                                <span className="text-xs font-bold">SPECIFIC OBJECT</span>
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <div className="text-xs font-bold text-gray-400">DEFAULT (INTERACTED OBJECT)</div>
                                        </>
                                    );
                                })()}
                            </button>
                            {gameData.rules.find(r => r.id === holdConfigModal.ruleId)?.effects[holdConfigModal.effectIndex]?.holdConfig?.targetActorId && (
                                <button
                                    onClick={() => {
                                        onUpdateRules(gameData.rules.map(r => {
                                            if (r.id === holdConfigModal.ruleId) {
                                                const newEffects = [...r.effects];
                                                newEffects[holdConfigModal.effectIndex] = {
                                                    ...newEffects[holdConfigModal.effectIndex],
                                                    holdConfig: { ...newEffects[holdConfigModal.effectIndex].holdConfig, targetActorId: undefined }
                                                };
                                                return { ...r, effects: newEffects };
                                            }
                                            return r;
                                        }));
                                    }}
                                    className="text-xs text-red-500 font-bold underline self-end"
                                >
                                    RESET TO DEFAULT
                                </button>
                            )}
                        </div>

                        {/* HOLDER SELECTION (WHO HOLDS/DROPS) */}
                        <div className="flex flex-col gap-2 w-full">
                            <label className="font-bold text-xs text-gray-500">
                                {holdConfigModal.type === 'HOLD' ? 'WHO HOLDS IT?' : 'WHO DROPS IT?'}
                            </label>
                            <button
                                onClick={() => setSelectionModal({
                                    ruleId: holdConfigModal.ruleId,
                                    effectIndex: holdConfigModal.effectIndex,
                                    type: 'ACTOR',
                                    label: "WHO IS THE HOLDER?",
                                    allowTargetSelection: false
                                })}
                                className="w-full h-12 border-2 border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                            >
                                {(() => {
                                    const rule = gameData.rules.find(r => r.id === holdConfigModal.ruleId);
                                    const effect = rule?.effects[holdConfigModal.effectIndex];
                                    const holderId = effect?.holdConfig?.holderActorId;

                                    if (holderId) {
                                        return (
                                            <>
                                                <img src={getActorImage(holderId)} className="w-8 h-8 object-contain" />
                                                <span className="text-xs font-bold">SPECIFIC ACTOR</span>
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <div className="text-xs font-bold text-gray-400">DEFAULT (SUBJECT)</div>
                                        </>
                                    );
                                })()}
                            </button>
                        </div>

                        {/* OFFSET SELECTION (ONLY FOR HOLD) */}
                        {holdConfigModal.type === 'HOLD' && (
                            <div className="flex flex-col gap-2 w-full">
                                <label className="font-bold text-xs text-gray-500">HOLD POSITION (OFFSET)</label>
                                <div className="text-xs text-gray-400 mb-1">Click to set where the item is held</div>
                                <div
                                    className="relative bg-gray-100 cursor-crosshair border-2 border-black overflow-hidden flex items-center justify-center self-center"
                                    style={{ width: '200px', height: '200px' }}
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left - 100;
                                        const y = e.clientY - rect.top - 100;

                                        onUpdateRules(gameData.rules.map(r => {
                                            if (r.id === holdConfigModal.ruleId) {
                                                const newEffects = [...r.effects];
                                                const currentConfig = newEffects[holdConfigModal.effectIndex].holdConfig || {};
                                                newEffects[holdConfigModal.effectIndex] = {
                                                    ...newEffects[holdConfigModal.effectIndex],
                                                    holdConfig: { ...currentConfig, offsetX: x, offsetY: y }
                                                };
                                                return { ...r, effects: newEffects };
                                            }
                                            return r;
                                        }));
                                    }}
                                >
                                    {/* Render Holder Sprite */}
                                    {(() => {
                                        const rule = gameData.rules.find(r => r.id === holdConfigModal.ruleId);
                                        const effect = rule?.effects[holdConfigModal.effectIndex];
                                        const holderId = effect?.holdConfig?.holderActorId || rule?.subjectId;

                                        return holderId ? (
                                            <img src={getActorImage(holderId)} className="w-[100px] h-[100px] object-contain opacity-50" />
                                        ) : (
                                            <div className="text-gray-400 font-bold">?</div>
                                        );
                                    })()}

                                    {/* Render Item Sprite at Offset */}
                                    {(() => {
                                        const rule = gameData.rules.find(r => r.id === holdConfigModal.ruleId);
                                        const effect = rule?.effects[holdConfigModal.effectIndex];
                                        const targetId = effect?.holdConfig?.targetActorId || rule?.objectId;
                                        const offsetX = effect?.holdConfig?.offsetX || 0;
                                        const offsetY = effect?.holdConfig?.offsetY || 0;

                                        return (
                                            <div
                                                className="absolute w-8 h-8 border-2 border-blue-500 bg-blue-500/30 flex items-center justify-center pointer-events-none"
                                                style={{
                                                    left: 100 + offsetX - 16,
                                                    top: 100 + offsetY - 16
                                                }}
                                            >
                                                {targetId ? <img src={getActorImage(targetId)} className="w-full h-full object-contain" /> : <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setHoldConfigModal(null)}
                            className="sketch-btn bg-[#22c55e] text-white py-2 font-bold mt-2 w-full"
                        >
                            DONE
                        </button>
                    </div>
                </div>
            )}
            {/* --- LEFT SIDEBAR: TRIGGERS & VARIABLES --- */}
            <div className="w-44 bg-yellow-100 border-[3px] border-black/10 p-0 flex flex-col shadow-inner rounded-l-lg overflow-hidden shrink-0">

                {/* SIDEBAR TABS */}
                <div className="flex w-full border-b-2 border-black/10">
                    <button
                        onClick={() => setSidebarTab('BLOCKS')}
                        className={`flex-1 py-2 font-bold text-xs flex items-center justify-center gap-1 ${sidebarTab === 'BLOCKS' ? 'bg-yellow-100 text-black' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        data-help="Basic triggers like 'When Clicked' or 'When Game Starts'"
                    >
                        <Puzzle size={16} /> BLOCKS
                    </button>
                    <button
                        onClick={() => setSidebarTab('BEHAVIORS')}
                        className={`flex-1 py-2 font-bold text-xs flex items-center justify-center gap-1 ${sidebarTab === 'BEHAVIORS' ? 'bg-yellow-100 text-black' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        data-help="Pre-made behaviors like 'Platformer Controls' or 'Top-Down Movement'"
                    >
                        <Sparkles size={16} /> QUICK
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 items-center">
                    {sidebarTab === 'BLOCKS' ? (
                        <>
                            <div className="w-full flex flex-col items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-200">
                                <h3 className="font-bold text-lg text-yellow-800 flex items-center gap-2">TRIGGERS <Zap size={20} /></h3>
                                {TRIGGER_MAGNETS.map((mag) => (
                                    <div
                                        key={mag.type}
                                        draggable="true"
                                        onDragStart={(e) => { e.dataTransfer.setData("type", "NEW_TRIGGER_MAGNET"); e.dataTransfer.setData("trigger", mag.type); }}
                                        className="w-full bg-white border-2 border-yellow-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group"
                                        data-help={`Drag this to start a new rule: ${mag.label}`}
                                    >
                                        <div className="font-bold text-sm text-yellow-600">WHEN...</div>
                                        <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm" style={{ backgroundColor: mag.color }}>{getIcon(mag.icon)}</div>
                                        <span className="font-bold text-md text-center leading-none">{mag.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="w-full flex flex-col items-center gap-4 mt-8 animate-in slide-in-from-left-4 fade-in duration-200 delay-75">
                                <h3 className="font-bold text-lg text-red-800 flex items-center gap-2">MODIFIERS <Settings size={20} /></h3>
                                <div
                                    draggable="true"
                                    onDragStart={(e) => { e.dataTransfer.setData("type", "NOT_STICKER"); }}
                                    className="w-full bg-white border-2 border-red-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group"
                                    data-help="Drag onto a trigger to invert it (NOT)"
                                >
                                    <div className="font-bold text-sm text-red-600">NOT</div>
                                    <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm bg-red-100">
                                        <Ban size={24} className="text-red-500" strokeWidth={3} />
                                    </div>
                                    <span className="font-bold text-md text-center leading-none">INVERT</span>
                                </div>

                                <div
                                    draggable="true"
                                    onDragStart={(e) => { e.dataTransfer.setData("type", "DICE_STICKER"); }}
                                    className="w-full bg-white border-2 border-purple-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group"
                                    data-help="Drag onto a trigger to add a % chance"
                                >
                                    <div className="font-bold text-sm text-purple-600">CHANCE</div>
                                    <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm bg-purple-100">
                                        <Dices size={24} className="text-purple-500" strokeWidth={3} />
                                    </div>
                                    <span className="font-bold text-md text-center leading-none">CHANCE</span>
                                </div>
                            </div>

                            <div className="w-full flex flex-col items-center gap-4 mt-8 animate-in slide-in-from-left-4 fade-in duration-200 delay-100">
                                <h3 className="font-bold text-lg text-blue-800 flex items-center gap-2">VARIABLES <Hash size={20} /></h3>
                                {gameData.variables.map((v) => (
                                    <div key={v.id} className="w-full bg-white border-2 border-blue-400 rounded-lg p-2 shadow-sm flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-blue-700 text-sm flex items-center gap-1">
                                                <Hash size={12} /> {v.name}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newMode = !v.isIconMode;
                                                        const updated = gameData.variables.map(rv => rv.id === v.id ? { ...rv, isIconMode: newMode } : rv);
                                                        onUpdateVariables(updated);
                                                    }}
                                                    className={`p-1 rounded ${v.isIconMode ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                                                    title="Toggle Icon Mode (Hearts)"
                                                >
                                                    {v.isIconMode ? <Heart size={14} fill="currentColor" /> : <Hash size={14} />}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingVariableId(v.id);
                                                        setShowIconEditor(true);
                                                    }}
                                                    className="p-1 text-blue-400 hover:bg-blue-50 rounded"
                                                    title="Edit Icon"
                                                >
                                                    {v.icon ? <img src={v.icon} className="w-4 h-4 object-contain" /> : <Edit2 size={14} />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteVariable(v.id); }}
                                                    className="text-red-300 hover:text-red-600 shrink-0"
                                                    title="Delete Variable"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 text-center mt-1">Initial: {v.initialValue}</div>
                                    </div>
                                ))}
                                <button
                                    onClick={openNewVariableModal}
                                    className="w-full py-2 bg-blue-100 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center gap-1 hover:bg-blue-200 font-bold text-blue-600 text-sm"
                                    data-help="Create a new variable to track numbers (score, health, etc.)"
                                >
                                    <Plus size={16} /> NEW
                                </button>
                            </div>

                            {/* ICON EDITOR MODAL */}
                            {showIconEditor && editingVariableId && (
                                <IconEditor
                                    initialIcon={gameData.variables.find(v => v.id === editingVariableId)?.icon}
                                    onSave={(dataUrl) => {
                                        const updated = gameData.variables.map(v => v.id === editingVariableId ? { ...v, icon: dataUrl, isIconMode: true } : v);
                                        onUpdateVariables(updated);
                                        setShowIconEditor(false);
                                        setEditingVariableId(null);
                                    }}
                                    onCancel={() => {
                                        setShowIconEditor(false);
                                        setEditingVariableId(null);
                                    }}
                                />
                            )}

                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-200">
                            <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2 text-center leading-tight">✨ QUICK BEHAVIORS</h3>
                            <div className="text-[10px] text-center text-gray-500 mb-2">Drag these to add multiple rules at once!</div>

                            {BEHAVIORS.map((beh) => (
                                <div
                                    key={beh.id}
                                    draggable="true"
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("type", "NEW_BEHAVIOR");
                                        e.dataTransfer.setData("behaviorId", beh.id);
                                    }}
                                    className="w-full bg-white border-2 border-purple-400 rounded-lg p-3 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center border-2 border-purple-200 group-hover:bg-purple-100 transition-colors">
                                        {beh.icon}
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-sm text-purple-900">{beh.label}</div>
                                        <div className="text-[10px] text-gray-500 leading-tight mt-1">{beh.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                    }
                </div >
            </div >

            {/* --- MAIN BOARD --- */}
            < div className="flex-1 flex flex-col bg-white border-[8px] border-[#d4a373] rounded-xl shadow-2xl relative overflow-hidden" >
                <div className="h-16 bg-[#f3e5f5] border-b-[3px] border-[#d4a373] flex items-center justify-center gap-4 shrink-0">
                    <button onClick={() => setViewScope('GLOBAL')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'GLOBAL' ? 'bg-blue-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}>
                        <Globe size={20} /> WORLD RULES
                    </button>
                    <button onClick={() => setViewScope('LOCAL')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border-2 transition-all ${viewScope === 'LOCAL' ? 'bg-orange-500 text-white border-black scale-105 shadow-md' : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'}`}>
                        <MapPin size={20} /> THIS SCENE RULES
                    </button>
                    <div className="w-[1px] h-8 bg-gray-300 mx-2"></div>
                    <button
                        onClick={() => {
                            const stored = localStorage.getItem('sok_maker_clipboard_rule');
                            if (stored) {
                                try {
                                    const copiedRule = JSON.parse(stored);
                                    const newRule = {
                                        ...copiedRule,
                                        id: Math.random().toString(36).substr(2, 9),
                                        scope: viewScope // Paste into current scope
                                    };
                                    onUpdateRules([...gameData.rules, newRule]);
                                } catch (e) { console.error("Failed to paste rule", e); }
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold border-2 bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all"
                        title="Paste Rule from Clipboard"
                    >
                        <Clipboard size={18} /> PASTE
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
                            No rules yet.<br /><br />Drag a "STARTER" here to begin!
                        </div>
                    )}

                    {filteredRules.map((rule) => (
                        <div
                            key={rule.id}
                            draggable="true"
                            onDragStart={(e) => {
                                e.dataTransfer.setData("type", "REORDER_RULE");
                                e.dataTransfer.setData("ruleId", rule.id);
                                e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const type = e.dataTransfer.getData("type");
                                if (type === "REORDER_RULE") {
                                    const sourceRuleId = e.dataTransfer.getData("ruleId");
                                    if (sourceRuleId === rule.id) return;

                                    const allRules = [...gameData.rules];
                                    const sourceIndex = allRules.findIndex(r => r.id === sourceRuleId);
                                    let targetIndex = allRules.findIndex(r => r.id === rule.id);

                                    // Check if dropping on bottom half
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relativeY = e.clientY - rect.top;
                                    if (relativeY > rect.height / 2) {
                                        targetIndex++;
                                    }

                                    if (sourceIndex >= 0 && targetIndex >= 0) {
                                        const [movedRule] = allRules.splice(sourceIndex, 1);
                                        // Adjust target index if removal shifted it
                                        if (sourceIndex < targetIndex) {
                                            targetIndex--;
                                        }
                                        allRules.splice(targetIndex, 0, movedRule);
                                        onUpdateRules(allRules);
                                    }
                                } else {
                                    handleSlotDrop(e, rule.id, 'trigger_modifier');
                                }
                            }}
                            className="relative w-full max-w-5xl bg-white/90 border-[3px] border-black rounded-full pl-4 pr-12 py-3 flex items-center justify-between shadow-[4px_4px_0px_rgba(0,0,0,0.2)] animate-[wiggle_1s_ease-in-out_infinite] cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform"
                        >
                            <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex gap-1 z-20">
                                <button
                                    onClick={() => {
                                        localStorage.setItem('sok_maker_clipboard_rule', JSON.stringify(rule));
                                        // Optional: Visual feedback
                                    }}
                                    className="bg-blue-500 text-white rounded-full p-2 border-2 border-black hover:scale-110 transition-transform shadow-sm"
                                    title="Copy Rule"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={() => removeRule(rule.id)}
                                    className="bg-red-500 text-white rounded-full p-2 border-2 border-black hover:scale-110 transition-transform shadow-sm"
                                    title="Delete Rule"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

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
                                            <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center bg-white relative">
                                                {rule.trigger === RuleTrigger.VAR_CHECK ? (
                                                    <Hash size={24} className="text-blue-500" />
                                                ) : (
                                                    <div style={{ color: TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.color || '#000' }}>
                                                        {getIcon(TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.icon || 'help')}
                                                    </div>
                                                )}

                                                {/* CHANCE OVERLAY */}
                                                {rule.chance && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setChanceModal({ ruleId: rule.id, chance: rule.chance! }); }}
                                                        className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 rounded-full border border-white z-10 flex items-center gap-0.5 hover:scale-110 transition-transform"
                                                    >
                                                        <Dices size={10} /> {Math.round(rule.chance * 100)}%
                                                    </button>
                                                )}

                                                {rule.invert && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Ban size={48} className="text-red-500 drop-shadow-md opacity-80" strokeWidth={3} /></div>}
                                            </div>

                                            <button
                                                onClick={() => setRecordingForRuleId(rule.id)}
                                                className={`absolute -bottom-2 -left-2 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-20 ${rule.soundId ? 'bg-green-400' : 'bg-gray-200 hover:bg-green-200'}`}
                                                title={rule.soundId ? "Change Sound" : "Add Sound Effect"}
                                            >
                                                {rule.soundId ? <Volume2 size={16} /> : <VolumeX size={16} className="text-gray-500" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* VARIABLE TRIGGER CONFIG */}
                                    {rule.trigger === RuleTrigger.VAR_CHECK && (
                                        <button
                                            onClick={() => {
                                                setVarConfigValue(rule.threshold || 0);
                                                setVarConfigOp(rule.condition as any || 'EQUALS');
                                                setVarConfigVariableId(rule.variableId!);
                                                setVariableModal({ ruleId: rule.id, type: 'TRIGGER', variableId: rule.variableId! });
                                            }}
                                            className="px-3 py-2 bg-blue-100 border-2 border-blue-400 border-dashed rounded flex flex-col items-center justify-center hover:bg-blue-200"
                                        >
                                            <span className="text-[10px] font-bold text-blue-800">CHECK</span>
                                            <span className="font-bold">{getTriggerLabel(rule)}</span>
                                        </button>
                                    )}

                                    {/* KEY TRIGGER CONFIG */}
                                    {rule.trigger === RuleTrigger.KEY_PRESS && (
                                        <button
                                            onClick={() => setKeyRecordModal({ ruleId: rule.id })}
                                            className="px-3 py-2 bg-yellow-100 border-2 border-yellow-500 border-dashed rounded flex flex-col items-center justify-center hover:bg-yellow-200 min-w-[60px]"
                                        >
                                            <span className="text-[10px] font-bold text-yellow-800">KEY</span>
                                            <span className="font-bold text-xl leading-none uppercase">
                                                {rule.key || 'PRESS'}
                                            </span>
                                        </button>
                                    )}

                                    {/* TIMER TRIGGER CONFIG */}
                                    {rule.trigger === RuleTrigger.TIMER && (
                                        <button
                                            onClick={() => setTimerModal({ ruleId: rule.id, interval: rule.interval || 2 })}
                                            className="px-3 py-2 bg-blue-100 border-2 border-blue-500 border-dashed rounded flex flex-col items-center justify-center hover:bg-blue-200 min-w-[60px]"
                                        >
                                            <span className="text-[10px] font-bold text-blue-800">EVERY</span>
                                            <span className="font-bold text-xl leading-none">{rule.interval || 2}s</span>
                                        </button>
                                    )}

                                    {/* SUBJECT SLOT */}
                                    {rule.trigger !== RuleTrigger.START && rule.trigger !== RuleTrigger.VAR_CHECK && (
                                        <div className={`w-16 h-16 border-2 border-dashed ${rule.subjectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100') }} onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-100')} onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'subject') }}>
                                            {rule.subjectId ? <img src={getActorImage(rule.subjectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                        </div>
                                    )}

                                    {rule.trigger !== RuleTrigger.VAR_CHECK && rule.trigger !== RuleTrigger.TIMER && (
                                        <div className="font-['Space_Mono'] font-bold text-sm text-gray-400 flex flex-col items-center px-2">
                                            {rule.invert && <span className="text-red-500 font-bold text-lg animate-pulse">IS NOT</span>}
                                            <span>{getTriggerLabel(rule)}</span>
                                        </div>
                                    )}

                                    {/* OBJECT SLOT */}
                                    {(rule.trigger === RuleTrigger.COLLISION || rule.trigger === RuleTrigger.HIT) && (
                                        <div className={`w-16 h-16 border-2 border-dashed ${rule.objectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100') }} onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-100')} onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'object') }}>
                                            {rule.objectId ? <img src={getActorImage(rule.objectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                        </div>
                                    )}
                                </div>

                                <ArrowRight size={24} className="text-black/20 shrink-0 mx-2" />

                                {/* --- RIGHT SIDE: MULTIPLE EFFECTS --- */}
                                <div className={`flex-1 min-h-[80px] border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex items-center gap-2 relative p-2 overflow-x-auto`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-green-50'); }} onDragLeave={(e) => { e.currentTarget.classList.remove('bg-green-50'); }} onDrop={(e) => { e.currentTarget.classList.remove('bg-green-50'); handleSlotDrop(e, rule.id, 'effects'); }}>
                                    {rule.effects?.length === 0 && <span className="text-xs text-gray-400 font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">DRAG EFFECTS HERE</span>}
                                    {rule.effects.map((effect, idx) => {
                                        // VARIABLE MODIFIER
                                        if (effect.type === InteractionType.MODIFY_VAR) {
                                            const v = gameData.variables?.find(v => v.id === effect.variableId);
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-blue-400 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <div className="text-[10px] font-bold text-blue-800 uppercase">VAR</div>
                                                        <div className="font-bold text-sm truncate max-w-[70px]">{v?.name || '???'}</div>
                                                        <div className="text-xs bg-blue-100 px-2 rounded font-bold">
                                                            {effect.operation === 'ADD' ? '+' : effect.operation === 'SUB' ? '-' : '='} {effect.value}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setVarConfigValue(effect.value || 1);
                                                            setVarConfigOp(effect.operation as any || 'ADD');
                                                            setVarConfigVariableId(effect.variableId!);
                                                            setVariableModal({ ruleId: rule.id, type: 'EFFECT', effectIndex: idx, variableId: effect.variableId! });
                                                        }}
                                                        className="absolute -top-2 -left-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center hover:scale-110 z-10 shadow-sm"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // SAY EFFECT
                                        if (effect.type === InteractionType.SAY) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-yellow-400 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <MessageSquare size={20} className="text-yellow-600" />
                                                        <span className="text-[10px] font-bold text-gray-400">SAYS...</span>
                                                        <div className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full bg-yellow-50 p-1 rounded border border-yellow-200">
                                                            "{effect.text || '...'}"
                                                        </div>

                                                        {/* Target Selection for SAY */}
                                                        <button
                                                            onClick={() => setSelectionModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                type: 'ACTOR',
                                                                label: "WHO SAYS IT?",
                                                                allowTargetSelection: true,
                                                                currentTarget: effect.target || 'SUBJECT',
                                                                subjectActorId: rule.subjectId,
                                                                objectActorId: rule.objectId
                                                            })}
                                                            className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center hover:scale-110 z-10 shadow-sm"
                                                            title="Who speaks?"
                                                        >
                                                            {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain rounded-full" /> : <div className="text-[8px] font-bold">WHO</div>}
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => setTextInputModal({ ruleId: rule.id, effectIndex: idx, currentText: effect.text || '' })}
                                                        className="absolute -top-2 -left-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center hover:scale-110 z-10 shadow-sm"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // SHOOT EFFECT
                                        if (effect.type === InteractionType.SHOOT) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-red-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <Crosshair size={24} className="text-red-500" />
                                                        <span className="text-[10px] font-bold text-red-800">SHOOT</span>

                                                        <button
                                                            onClick={() => setSelectionModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                type: 'ACTOR',
                                                                label: "SHOOT WHAT?",
                                                                allowTargetSelection: false
                                                            })}
                                                            className="w-8 h-8 border border-black rounded bg-red-100 hover:bg-red-200 flex items-center justify-center transition-transform hover:scale-105 relative"
                                                        >
                                                            {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <span className="text-xs">?</span>}
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => setShootConfigModal({
                                                            ruleId: rule.id,
                                                            effectIndex: idx,
                                                            shooterId: rule.subjectId || '',
                                                            offsetX: effect.shootOffsetX || 0,
                                                            offsetY: effect.shootOffsetY || 0,
                                                            projectileSize: effect.projectileSize || 0.5,
                                                            speed: 10, // Default speed
                                                            angleOffset: 0, // Default angle
                                                            lifetime: 60 // Default lifetime
                                                        })}
                                                        className="absolute -top-2 -left-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center hover:scale-110 z-10 shadow-sm"
                                                    >
                                                        <Crosshair size={12} />
                                                    </button>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // PARTICLES EFFECT
                                        if (effect.type === InteractionType.PARTICLES) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="w-16 h-16 bg-purple-100 border-2 border-purple-500 rounded-lg flex flex-col items-center justify-center shadow-sm">
                                                        <Sparkles size={24} className="text-purple-500" />
                                                        <span className="text-[10px] font-bold text-purple-800">{effect.particleType || 'CONFETTI'}</span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setParticleModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                type: effect.particleType || 'CONFETTI',
                                                                count: effect.particleCount || 20,
                                                                size: effect.particleSize || 4,
                                                                area: effect.particleArea || 50,
                                                                particleActorId: effect.particleActorId
                                                            });
                                                        }}
                                                        className="absolute -top-2 -left-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center hover:scale-110 z-10 shadow-sm"
                                                        title="Configure Particles"
                                                    >
                                                        <Settings size={12} />
                                                    </button>

                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // PLAY MUSIC EFFECT
                                        if (effect.type === InteractionType.PLAY_MUSIC) {
                                            const trackName = gameData.music?.find(t => t.id === effect.spawnActorId)?.name || "Select...";
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="w-24 h-[90px] bg-pink-100 border-2 border-pink-500 rounded-lg flex flex-col items-center justify-center shadow-sm p-1 gap-1">
                                                        <Music size={24} className="text-pink-500" />
                                                        <span className="text-[10px] font-bold text-pink-800 uppercase">PLAY MUSIC</span>
                                                        <button
                                                            onClick={() => setMusicConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                volume: effect.volume !== undefined ? effect.volume : 0.5,
                                                                paramRefs: effect.paramRefs || {}
                                                            })}
                                                            className="w-full text-[10px] p-1 rounded border border-pink-300 bg-white truncate font-bold"
                                                        >
                                                            {trackName}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        }

                                        // SPAWN / SWAP / ANIM / EAT (Actor Based)
                                        if ([InteractionType.SPAWN, InteractionType.SWAP, InteractionType.PLAY_ANIM, InteractionType.DESTROY_OBJECT].includes(effect.type)) {
                                            const isSpawn = effect.type === InteractionType.SPAWN;
                                            const isSwap = effect.type === InteractionType.SWAP;
                                            const isAnim = effect.type === InteractionType.PLAY_ANIM;
                                            const isEat = effect.type === InteractionType.DESTROY_OBJECT;
                                            let label = isSpawn ? "SPAWN" : isSwap ? "SWAP" : "ANIM";
                                            if (isEat) label = "EAT";

                                            let borderColor = isSpawn ? "border-purple-500" : isSwap ? "border-pink-500" : "border-fuchsia-500";
                                            let textColor = isSpawn ? "text-purple-600" : isSwap ? "text-pink-600" : "text-fuchsia-600";
                                            if (isEat) { borderColor = "border-red-500"; textColor = "text-red-600"; }

                                            const targetIcon = effect.target === 'OBJECT' ? rule.objectId : rule.subjectId;
                                            const showTarget = (isSwap || isAnim || isEat) && (rule.trigger === RuleTrigger.COLLISION || rule.trigger === RuleTrigger.CLICK || rule.trigger === RuleTrigger.HIT);

                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className={`flex flex-col items-center bg-white border-2 ${borderColor} rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1`}>
                                                        <span className={`text-[10px] font-bold ${textColor} uppercase`}>{label}</span>
                                                        <div className="flex gap-1 items-center">
                                                            {showTarget && (
                                                                <div className="flex flex-col items-center scale-90">
                                                                    <button onClick={() => setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: `WHO TO ${label}?`, allowTargetSelection: true, currentTarget: effect.target || 'OBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId })} className="w-8 h-8 border border-black rounded bg-gray-100 overflow-hidden flex items-center justify-center hover:scale-110 transition-transform">
                                                                        {(effect.target === 'OBJECT' && !rule.objectId) ? <div className="text-[10px] font-bold">ANY</div> : (targetIcon ? <img src={getActorImage(targetIcon)} className="w-full h-full object-contain" /> : <span className="text-xs">?</span>)}
                                                                    </button>
                                                                    {(isSpawn || isSwap || isAnim) && <ArrowRight size={12} className="mt-1" />}
                                                                </div>
                                                            )}
                                                            {(isSpawn || isSwap || isAnim) && (
                                                                <button onClick={() => setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: isSpawn ? "SPAWN WHAT?" : isSwap ? "SWAP WHO FOR WHAT?" : "PLAY WHICH ANIM?", allowTargetSelection: showTarget, allowLoop: isAnim, currentLoop: effect.isLoop || false, currentTarget: effect.target || 'SUBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId })} className="w-10 h-10 border-2 border-black rounded bg-white hover:bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                                                    {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <HelpCircle size={20} className={textColor} strokeWidth={3} />}
                                                                    {!effect.spawnActorId && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                                                                </button>
                                                            )}
                                                            {isEat && (
                                                                <button onClick={() => { if (effect.target === 'OBJECT' && !rule.objectId) { setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: "DESTROY WHICH TYPE?", allowTargetSelection: true, currentTarget: 'OBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId }); } }} className={`w-10 h-10 border-2 border-black rounded bg-red-100 flex items-center justify-center relative`}>
                                                                    {(effect.spawnActorId && (effect.target === 'OBJECT' && !rule.objectId)) ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <Skull size={24} className={textColor} strokeWidth={3} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {isSpawn && effect.spawnActorId && (
                                                            <>
                                                                <button onClick={() => setPickingLocationFor({ ruleId: rule.id, effectIndex: idx })} className={`absolute -top-2 -left-2 w-6 h-6 border-2 border-black rounded-full flex items-center justify-center transition-colors shadow-sm z-10 hover:scale-110 ${effect.spawnX !== undefined ? 'bg-green-300' : 'bg-white hover:bg-gray-200'}`} title="Set Location"><Crosshair size={12} className={effect.spawnX !== undefined ? 'text-black' : 'text-gray-400'} /></button>
                                                                <button onClick={() => setSpawnConfigModal({ ruleId: rule.id, effectIndex: idx, randomY: !!effect.spawnRandomY, minY: effect.spawnYMin || 0, maxY: effect.spawnYMax || SCENE_HEIGHT, scale: effect.spawnScale || 1.0, scaleX: effect.spawnScaleX, scaleY: effect.spawnScaleY, vx: effect.spawnVelocity?.x || 0, vy: effect.spawnVelocity?.y || 0, x: effect.spawnX, y: effect.spawnY, mode: effect.spawnMode, actorId2: effect.spawnActorId2, gap: effect.spawnGap })} className={`absolute -bottom-2 -left-2 w-6 h-6 border-2 border-black rounded-full flex items-center justify-center transition-colors shadow-sm z-10 hover:scale-110 ${effect.spawnRandomY ? 'bg-purple-300' : 'bg-white hover:bg-gray-200'}`} title="Random Y"><Dices size={12} className={effect.spawnRandomY ? 'text-black' : 'text-gray-400'} /></button>
                                                            </>
                                                        )}
                                                        {isAnim && effect.isLoop && <div className="absolute top-0 right-0 bg-purple-600 rounded-full p-[2px] border border-white"><Repeat size={8} className="text-white" /></div>}
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // CHASE EFFECT
                                        if (effect.type === InteractionType.CHASE) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-green-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-green-600 uppercase">CHASE</span>
                                                        <div className="flex gap-1 items-center">
                                                            <div className="flex flex-col items-center scale-90">
                                                                <button
                                                                    onClick={() => setSelectionModal({
                                                                        ruleId: rule.id,
                                                                        effectIndex: idx,
                                                                        type: 'ACTOR',
                                                                        label: "CHASE WHO?",
                                                                        allowTargetSelection: false
                                                                    })}
                                                                    className="w-10 h-10 border-2 border-black rounded bg-green-100 hover:bg-green-200 flex items-center justify-center transition-transform hover:scale-105 relative"
                                                                    title="Select Target"
                                                                >
                                                                    {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <Footprints size={20} className="text-green-600" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="text-[8px] bg-green-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            {effect.spawnActorId ? 'TARGET' : 'HERO'}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // STEP EFFECT
                                        if (effect.type === InteractionType.STEP) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-blue-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase">STEP</span>
                                                        <button
                                                            onClick={() => {
                                                                const dirs = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
                                                                const currentIdx = dirs.indexOf(effect.direction || 'RIGHT');
                                                                const nextDir = dirs[(currentIdx + 1) % 4] as any;

                                                                onUpdateRules(gameData.rules.map(r => {
                                                                    if (r.id === rule.id) {
                                                                        const newEffects = [...r.effects];
                                                                        newEffects[idx] = { ...newEffects[idx], direction: nextDir };
                                                                        return { ...r, effects: newEffects };
                                                                    }
                                                                    return r;
                                                                }));
                                                            }}
                                                            className="w-10 h-10 border-2 border-black rounded bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors"
                                                        >
                                                            {(!effect.direction || effect.direction === 'UP') && <ArrowDown size={24} className="text-blue-600 rotate-180" />}
                                                            {effect.direction === 'DOWN' && <ArrowDown size={24} className="text-blue-600" />}
                                                            {effect.direction === 'LEFT' && <ArrowRight size={24} className="text-blue-600 rotate-180" />}
                                                            {effect.direction === 'RIGHT' && <ArrowRight size={24} className="text-blue-600" />}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // PUSH EFFECT
                                        if (effect.type === InteractionType.PUSH) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-blue-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase">PUSH</span>
                                                        <div className="w-10 h-10 border-2 border-black rounded bg-blue-100 flex items-center justify-center">
                                                            {effect.direction === 'UP' && <ArrowDown size={24} className="text-blue-600 rotate-180" />}
                                                            {effect.direction === 'DOWN' && <ArrowDown size={24} className="text-blue-600" />}
                                                            {effect.direction === 'LEFT' && <ArrowRight size={24} className="text-blue-600 rotate-180" />}
                                                            {effect.direction === 'RIGHT' && <ArrowRight size={24} className="text-blue-600" />}
                                                        </div>
                                                        <div className="text-[8px] bg-blue-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            FORCE: {effect.force || 1}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // JUMP EFFECT
                                        if (effect.type === InteractionType.JUMP) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-emerald-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">JUMP</span>
                                                        <button
                                                            onClick={() => setJumpConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                intensity: effect.value || 15,
                                                                paramRefs: effect.paramRefs || {}
                                                            })}
                                                            className="w-10 h-10 border-2 border-black rounded bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-transform hover:scale-105"
                                                        >
                                                            <ArrowDownCircle size={20} className="text-emerald-600 rotate-180" />
                                                        </button>
                                                        <div className="text-[8px] bg-emerald-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            POWER: {effect.value || 15}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // CHANGE SCENE
                                        if (effect.type === InteractionType.CHANGE_SCENE) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-purple-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-purple-600 uppercase">GOTO</span>
                                                        <button onClick={() => setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'SCENE', label: "SELECT DESTINATION" })} className="w-12 h-10 border-2 border-black rounded bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-transform hover:scale-105 relative">
                                                            {effect.targetSceneId ? <span className="font-bold text-xl text-purple-900">#{gameData.scenes.findIndex(s => s.id === effect.targetSceneId) + 1}</span> : <DoorOpen size={24} className="text-purple-600" />}
                                                            {!effect.targetSceneId && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // MOVE EFFECT
                                        if (effect.type === InteractionType.MOVE) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-blue-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase">MOVE</span>
                                                        <div className="flex gap-1 items-center">
                                                            <button
                                                                onClick={() => setPathEditorModal({ ruleId: rule.id, effectIndex: idx, path: effect.path || [] })}
                                                                className="w-10 h-10 border-2 border-black rounded bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-transform hover:scale-105"
                                                            >
                                                                <Map size={20} className="text-blue-600" />
                                                            </button>
                                                            <div className="flex flex-col items-center scale-90">
                                                                <button
                                                                    onClick={() => setSelectionModal({
                                                                        ruleId: rule.id,
                                                                        effectIndex: idx,
                                                                        type: 'ACTOR',
                                                                        label: "MOVE WHO?",
                                                                        allowTargetSelection: false
                                                                    })}
                                                                    className="w-8 h-8 border border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-transform hover:scale-105 relative"
                                                                >
                                                                    {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <span className="text-[8px] font-bold">HERO</span>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="text-[8px] bg-blue-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            {effect.path?.length || 0} PTS
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // WAIT EFFECT
                                        if (effect.type === InteractionType.WAIT) {
                                            return (
                                                <div key={idx} className="relative group shrink-0 flex items-center justify-center px-2">
                                                    <div className="flex flex-col items-center bg-white border-2 border-gray-400 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">WAIT</span>
                                                        <button
                                                            onClick={() => setWaitConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                duration: effect.value || 1,
                                                                paramRefs: effect.paramRefs || {}
                                                            })}
                                                            className="flex flex-col items-center justify-center hover:scale-105 transition-transform"
                                                        >
                                                            <Clock size={24} className="text-gray-400 mb-1" />
                                                            <span className="text-xs font-bold bg-gray-100 px-2 rounded border border-gray-300">
                                                                {effect.value || 1}s
                                                            </span>
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center hover:scale-110 z-10"><X size={12} /></button>
                                                </div>
                                            );
                                        }

                                        // HOLD / DROP EFFECT
                                        if (effect.type === InteractionType.HOLD || effect.type === InteractionType.DROP) {
                                            const isHold = effect.type === InteractionType.HOLD;
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className={`flex flex-col items-center bg-white border-2 ${isHold ? 'border-orange-500' : 'border-blue-500'} rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1`}>
                                                        {isHold ? <Hand size={24} className="text-orange-500" /> : <ArrowDownCircle size={24} className="text-blue-500" />}
                                                        <span className={`text-[10px] font-bold ${isHold ? 'text-orange-800' : 'text-blue-800'} uppercase`}>{isHold ? 'HOLD' : 'DROP'}</span>

                                                        <button
                                                            onClick={() => setHoldConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                type: isHold ? 'HOLD' : 'DROP'
                                                            })}
                                                            className="w-full py-1 bg-gray-100 hover:bg-gray-200 rounded border border-black/10 text-[8px] font-bold flex items-center justify-center gap-1"
                                                        >
                                                            <Settings size={8} /> CONFIG
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // SET VELOCITY
                                        if (effect.type === InteractionType.SET_VELOCITY) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-sky-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-sky-600 uppercase">VELOCITY</span>
                                                        <button
                                                            onClick={() => setVelocityConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                vx: effect.velocity?.x || 0,
                                                                vy: effect.velocity?.y || 0,
                                                                paramRefs: effect.paramRefs || {}
                                                            })}
                                                            className="w-10 h-10 border-2 border-black rounded bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-transform hover:scale-105"
                                                        >
                                                            <Wind size={20} className="text-sky-600" />
                                                        </button>
                                                        <div className="text-[8px] bg-sky-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            {effect.velocity?.x || 0}, {effect.velocity?.y || 0}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // SET GRAVITY
                                        if (effect.type === InteractionType.SET_GRAVITY) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-violet-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-violet-600 uppercase">GRAVITY</span>
                                                        <div className="flex gap-1 items-center">
                                                            <button
                                                                onClick={() => setGravityConfigModal({
                                                                    ruleId: rule.id,
                                                                    effectIndex: idx,
                                                                    hasScreenCollision: effect.hasScreenCollision || false,
                                                                    force: effect.value || 0.4,
                                                                    paramRefs: effect.paramRefs || {}
                                                                })}
                                                                className="w-10 h-10 border-2 border-black rounded bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-transform hover:scale-105"
                                                            >
                                                                <ArrowDown size={20} className="text-violet-600" />
                                                            </button>
                                                            {/* Target Selector for Global Rules (e.g. Start) */}
                                                            {(rule.trigger === RuleTrigger.START || !rule.subjectId) && (
                                                                <div className="flex flex-col items-center scale-90">
                                                                    <button
                                                                        onClick={() => setSelectionModal({
                                                                            ruleId: rule.id,
                                                                            effectIndex: idx,
                                                                            type: 'ACTOR',
                                                                            label: "GRAVITY ON WHO?",
                                                                            allowTargetSelection: false,
                                                                            allowMultiple: true, // Enable Multi-Select
                                                                            selectedIds: effect.targetActorIds || (effect.spawnActorId ? [effect.spawnActorId] : [])
                                                                        })}
                                                                        className="w-8 h-8 border border-black rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-transform hover:scale-105 relative"
                                                                    >
                                                                        {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <span className="text-[8px] font-bold">WHO?</span>}
                                                                        {/* Multi-Select Badge */}
                                                                        {effect.targetActorIds && effect.targetActorIds.length > 1 && (
                                                                            <div className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                                                                +{effect.targetActorIds.length - 1}
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[8px] bg-violet-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            {effect.hasScreenCollision ? 'BOUNDED' : 'ON'} ({effect.value || 0.4})
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        if (effect.type === InteractionType.SET_ROTATION) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-yellow-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-yellow-600 uppercase">ROTATE</span>
                                                        <button
                                                            onClick={() => setRotationConfigModal({
                                                                ruleId: rule.id,
                                                                effectIndex: idx,
                                                                rotation: effect.rotation || 0,
                                                                operation: effect.rotationOperation || 'SET',
                                                                paramRefs: effect.paramRefs || {}
                                                            })}
                                                            className="w-10 h-10 border-2 border-black rounded bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center transition-transform hover:scale-105"
                                                        >
                                                            <RotateCw size={20} className="text-yellow-600" />
                                                        </button>
                                                        <div className="text-[8px] bg-yellow-100 px-2 rounded-full max-w-[70px] truncate mt-1">
                                                            {effect.rotationOperation === 'ADD' ? '+' : '='} {effect.rotation || 0}°
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // GENERIC / OTHER
                                        const magnet = EFFECT_MAGNETS.find(m => m.type === effect.type);
                                        return (
                                            <div key={idx} className="relative group shrink-0">
                                                <div className="flex flex-col items-center bg-white border-2 border-green-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                    <div className="w-10 h-10 rounded bg-green-100 border border-black flex items-center justify-center" style={{ backgroundColor: magnet?.color ? magnet.color + '40' : '#dcfce7' }}>{getIcon(magnet?.icon || '')}</div>
                                                    <span className="font-bold text-[10px] text-center leading-none mt-1">{magnet?.label}</span>
                                                </div>
                                                <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => onUpdateRules([...gameData.rules, { id: Math.random().toString(36).substr(2, 9), scope: activeScopeId, trigger: RuleTrigger.START, subjectId: '', objectId: '', effects: [] }])} className="mt-8 bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 border-2 border-white ring-4 ring-black/20">
                        <Plus size={24} /> NEW RULE
                    </button>
                    <div className="h-20"></div>
                </div>
            </div >

            {/* --- RIGHT SIDEBAR: AVAILABLE EFFECTS --- */}
            < div className="w-64 bg-green-100 border-[3px] border-black/10 p-4 flex flex-col gap-4 items-center shadow-inner rounded-r-lg overflow-y-auto shrink-0" >
                <h3 className="font-bold text-xl text-green-800 flex items-center gap-2">EFFECTS <Puzzle size={20} /></h3>
                {
                    EFFECT_MAGNETS.map((mag) => (
                        <div key={mag.type} draggable="true" onDragStart={(e) => { e.dataTransfer.setData("type", "NEW_EFFECT_MAGNET"); e.dataTransfer.setData("interaction", mag.type); }} className="w-full bg-white border-2 border-green-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group">
                            <div className="font-bold text-sm text-green-600">THEN...</div>
                            <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm" style={{ backgroundColor: mag.color }}>{getIcon(mag.icon)}</div>
                            <span className="font-bold text-md text-center leading-none">{mag.label}</span>
                        </div>
                    ))
                }
            </div >

            {/* KEY RECORDER MODAL */}
            {
                keyRecordModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white border-4 border-black rounded-xl p-6 w-[400px] shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                            <h3 className="text-2xl font-black mb-4 font-['Gochi_Hand']">PRESS ANY KEY</h3>
                            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                                <div className="animate-pulse text-gray-400 font-bold text-xl">Waiting for input...</div>
                                <input
                                    autoFocus
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onKeyDown={(e) => {
                                        e.preventDefault();
                                        const key = e.key.toUpperCase();
                                        // Map arrow keys to simplified names if needed, or just use key code
                                        let finalKey = key;
                                        if (key === 'ARROWUP') finalKey = 'UP';
                                        if (key === 'ARROWDOWN') finalKey = 'DOWN';
                                        if (key === 'ARROWLEFT') finalKey = 'LEFT';
                                        if (key === 'ARROWRIGHT') finalKey = 'RIGHT';
                                        if (key === ' ') finalKey = 'SPACE';

                                        onUpdateRules(gameData.rules.map(r => r.id === keyRecordModal.ruleId ? { ...r, key: finalKey } : r));
                                        setKeyRecordModal(null);
                                    }}
                                    onBlur={() => setKeyRecordModal(null)}
                                />
                            </div>
                            <button
                                onClick={() => setKeyRecordModal(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                )
            }

            {/* JUMP CONFIG MODAL */}
            {
                jumpConfigModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white border-4 border-black rounded-xl p-6 w-[400px] shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                            <h3 className="text-2xl font-black mb-4 font-['Gochi_Hand']">JUMP POWER</h3>

                            <div className="mb-6 flex flex-col gap-4">
                                <VariableLinker
                                    label="Jump Force"
                                    value={jumpConfigModal.intensity}
                                    variableId={jumpConfigModal.paramRefs?.['force']}
                                    onValueChange={(val) => setJumpConfigModal({ ...jumpConfigModal, intensity: val })}
                                    onVariableChange={(varId) => setJumpConfigModal({
                                        ...jumpConfigModal,
                                        paramRefs: { ...jumpConfigModal.paramRefs, 'force': varId || '' }
                                    })}
                                    variables={visibleVariables}
                                    min={5} max={40} step={1}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setJumpConfigModal(null)}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        onUpdateRules(gameData.rules.map(r => {
                                            if (r.id === jumpConfigModal.ruleId) {
                                                const newEffects = [...r.effects];
                                                newEffects[jumpConfigModal.effectIndex] = {
                                                    ...newEffects[jumpConfigModal.effectIndex],
                                                    value: jumpConfigModal.intensity,
                                                    paramRefs: jumpConfigModal.paramRefs
                                                };
                                                return { ...r, effects: newEffects };
                                            }
                                            return r;
                                        }));
                                        setJumpConfigModal(null);
                                    }}
                                    className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-white rounded font-bold border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                                >
                                    SAVE
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* WAIT CONFIG MODAL */}
            {
                waitConfigModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                        <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-[300px] animate-bounce-in">
                            <h3 className="text-2xl font-black mb-6 font-['Gochi_Hand'] text-center flex items-center justify-center gap-2">
                                <Clock size={28} className="text-gray-500" />
                                Temps d'attente
                            </h3>

                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-2">
                                    <VariableLinker
                                        label="Duration (s)"
                                        value={waitConfigModal.duration}
                                        variableId={waitConfigModal.paramRefs?.['duration']}
                                        onValueChange={(val) => setWaitConfigModal({ ...waitConfigModal, duration: val })}
                                        onVariableChange={(varId) => setWaitConfigModal({
                                            ...waitConfigModal,
                                            paramRefs: { ...waitConfigModal.paramRefs, 'duration': varId || '' }
                                        })}
                                        variables={visibleVariables}
                                        min={0.1} max={5} step={0.1}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setWaitConfigModal(null)}
                                        className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateEffect(waitConfigModal.ruleId, waitConfigModal.effectIndex, {
                                                value: waitConfigModal.duration,
                                                paramRefs: waitConfigModal.paramRefs
                                            });
                                            setWaitConfigModal(null);
                                        }}
                                        className="px-4 py-2 bg-green-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-green-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                                    >
                                        Valider
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PATH EDITOR MODAL */}
            {
                pathEditorModal && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center" onClick={() => setPathEditorModal(null)}>
                        <div className="bg-white p-4 rounded-xl border-4 border-black shadow-2xl relative max-w-[90vw] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
                                <Map className="text-blue-500" /> DRAW PATH
                            </h3>

                            <div className="relative border-2 border-black bg-gray-100 overflow-hidden cursor-crosshair"
                                style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT, transform: 'scale(0.8)', transformOrigin: 'top center' }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = (e.clientX - rect.left) / 0.8; // Adjust for scale
                                    const y = (e.clientY - rect.top) / 0.8;

                                    // Add point
                                    const newPath = [...pathEditorModal.path, { x, y }];
                                    setPathEditorModal({ ...pathEditorModal, path: newPath });

                                    // Update rule
                                    onUpdateRules(gameData.rules.map(r => {
                                        if (r.id === pathEditorModal.ruleId) {
                                            const newEffects = [...r.effects];
                                            newEffects[pathEditorModal.effectIndex] = { ...newEffects[pathEditorModal.effectIndex], path: newPath };
                                            return { ...r, effects: newEffects };
                                        }
                                        return r;
                                    }));
                                }}
                            >
                                {/* Background Preview */}
                                {currentScene && <div className="absolute inset-0 opacity-50 pointer-events-none">
                                    {currentScene.backgroundImage && <img src={currentScene.backgroundImage} className="w-full h-full object-cover" />}
                                </div>}

                                {/* Grid */}
                                <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                                {/* Path Visualization */}
                                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                                    <polyline
                                        points={pathEditorModal.path.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="4"
                                        strokeDasharray="8 4"
                                    />
                                    {pathEditorModal.path.map((p, i) => (
                                        <g key={i} transform={`translate(${p.x},${p.y})`}>
                                            <circle r="6" fill="#2563eb" stroke="white" strokeWidth="2" />
                                            <text y="-10" textAnchor="middle" className="text-[10px] font-bold fill-blue-800 bg-white">#{i + 1}</text>
                                            {i > 0 && (
                                                // Arrow direction
                                                <path d="M -5,-5 L 0,0 L -5,5" stroke="#3b82f6" strokeWidth="2" fill="none" transform={`rotate(${Math.atan2(p.y - pathEditorModal.path[i - 1].y, p.x - pathEditorModal.path[i - 1].x) * 180 / Math.PI}) translate(-15, 0)`} />
                                            )}
                                        </g>
                                    ))}
                                </svg>
                            </div>

                            <div className="flex justify-between mt-4">
                                <button
                                    onClick={() => {
                                        // Clear path
                                        setPathEditorModal({ ...pathEditorModal, path: [] });
                                        onUpdateRules(gameData.rules.map(r => {
                                            if (r.id === pathEditorModal.ruleId) {
                                                const newEffects = [...r.effects];
                                                newEffects[pathEditorModal.effectIndex] = { ...newEffects[pathEditorModal.effectIndex], path: [] };
                                                return { ...r, effects: newEffects };
                                            }
                                            return r;
                                        }));
                                    }}
                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200"
                                >
                                    CLEAR PATH
                                </button>
                                <button
                                    onClick={() => setPathEditorModal(null)}
                                    className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:scale-105 transition-transform"
                                >
                                    DONE
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* VELOCITY CONFIG MODAL */}
            {
                velocityConfigModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                        <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-[300px] animate-bounce-in">
                            <h3 className="text-2xl font-black mb-6 font-['Gochi_Hand'] text-center flex items-center justify-center gap-2">
                                <Wind size={28} className="text-sky-500" />
                                VELOCITY
                            </h3>

                            <div className="space-y-4">
                                <VariableLinker
                                    label="X Velocity"
                                    value={velocityConfigModal.vx}
                                    variableId={velocityConfigModal.paramRefs?.['vx']}
                                    onValueChange={(val) => setVelocityConfigModal({ ...velocityConfigModal, vx: val })}
                                    onVariableChange={(varId) => setVelocityConfigModal({
                                        ...velocityConfigModal,
                                        paramRefs: { ...velocityConfigModal.paramRefs, 'vx': varId || '' }
                                    })}
                                    variables={visibleVariables}
                                    min={-20} max={20} step={1}
                                />
                                <VariableLinker
                                    label="Y Velocity"
                                    value={velocityConfigModal.vy}
                                    variableId={velocityConfigModal.paramRefs?.['vy']}
                                    onValueChange={(val) => setVelocityConfigModal({ ...velocityConfigModal, vy: val })}
                                    onVariableChange={(varId) => setVelocityConfigModal({
                                        ...velocityConfigModal,
                                        paramRefs: { ...velocityConfigModal.paramRefs, 'vy': varId || '' }
                                    })}
                                    variables={visibleVariables}
                                    min={-20} max={20} step={1}
                                />

                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setVelocityConfigModal(null)}
                                        className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateEffect(velocityConfigModal.ruleId, velocityConfigModal.effectIndex, {
                                                velocity: { x: velocityConfigModal.vx, y: velocityConfigModal.vy },
                                                paramRefs: velocityConfigModal.paramRefs
                                            });
                                            setVelocityConfigModal(null);
                                        }}
                                        className="px-4 py-2 bg-sky-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-sky-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                                    >
                                        SAVE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* GRAVITY CONFIG MODAL */}
            {gravityConfigModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-[300px] animate-bounce-in">
                        <h3 className="text-2xl font-black mb-6 font-['Gochi_Hand'] text-center flex items-center justify-center gap-2">
                            <ArrowDown size={28} className="text-violet-500" />
                            GRAVITY
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-violet-50 p-3 rounded-lg border border-violet-200">
                                <input
                                    type="checkbox"
                                    checked={gravityConfigModal.hasScreenCollision}
                                    onChange={(e) => setGravityConfigModal({ ...gravityConfigModal, hasScreenCollision: e.target.checked })}
                                    className="w-5 h-5 accent-violet-500"
                                />
                                <label className="font-bold text-sm">Screen Collision</label>
                            </div>

                            <div className="border border-red-500 p-1 rounded">
                                <VariableLinker
                                    key="gravity-force-slider"
                                    label="FORCE DE GRAVITÉ"
                                    value={gravityConfigModal.force}
                                    variableId={gravityConfigModal.paramRefs?.['force']}
                                    onValueChange={(val) => setGravityConfigModal({ ...gravityConfigModal, force: val })}
                                    onVariableChange={(varId) => setGravityConfigModal({
                                        ...gravityConfigModal,
                                        paramRefs: { ...gravityConfigModal.paramRefs, 'force': varId || '' }
                                    })}
                                    variables={visibleVariables}
                                    min={0.1} max={2.0} step={0.1}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setGravityConfigModal(null)}
                                className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    updateEffect(gravityConfigModal.ruleId, gravityConfigModal.effectIndex, {
                                        hasScreenCollision: gravityConfigModal.hasScreenCollision,
                                        value: gravityConfigModal.force,
                                        paramRefs: gravityConfigModal.paramRefs
                                    });
                                    setGravityConfigModal(null);
                                }}
                                className="px-4 py-2 bg-violet-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-violet-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                            >
                                SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MUSIC CONFIG MODAL */}
            {musicConfigModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-[300px] animate-bounce-in">
                        <h3 className="text-2xl font-black mb-6 font-['Gochi_Hand'] text-center flex items-center justify-center gap-2">
                            <Music size={28} className="text-pink-500" />
                            MUSIC SETUP
                        </h3>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    // Close this modal and open selection modal
                                    setMusicConfigModal(null);
                                    setSelectionModal({
                                        ruleId: musicConfigModal.ruleId,
                                        effectIndex: musicConfigModal.effectIndex,
                                        type: 'MUSIC',
                                        label: 'SELECT MUSIC TRACK',
                                        allowTargetSelection: false
                                    });
                                }}
                                className="w-full py-3 bg-pink-100 border-2 border-black rounded-lg font-bold hover:bg-pink-200 flex items-center justify-center gap-2"
                            >
                                <Music size={20} />
                                CHANGE TRACK
                            </button>

                            <VariableLinker
                                label="Volume"
                                value={musicConfigModal.volume}
                                variableId={musicConfigModal.paramRefs?.['volume']}
                                onValueChange={(val) => setMusicConfigModal({ ...musicConfigModal, volume: val })}
                                onVariableChange={(varId) => setMusicConfigModal({
                                    ...musicConfigModal,
                                    paramRefs: { ...musicConfigModal.paramRefs, 'volume': varId || '' }
                                })}
                                variables={visibleVariables}
                                min={0} max={1} step={0.1}
                            />

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setMusicConfigModal(null)}
                                    className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        updateEffect(musicConfigModal.ruleId, musicConfigModal.effectIndex, {
                                            volume: musicConfigModal.volume,
                                            paramRefs: musicConfigModal.paramRefs
                                        });
                                        setMusicConfigModal(null);
                                    }}
                                    className="px-4 py-2 bg-pink-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-pink-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                                >
                                    SAVE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* SPAWN CONFIG MODAL */}
            {
                spawnConfigModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setSpawnConfigModal(null)}>
                        <div className="bg-white p-4 rounded-xl shadow-2xl border-4 border-black w-80 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="font-['Gochi_Hand'] text-2xl mb-4 text-center">Spawn Configuration</h3>

                            <div className="mb-4">
                                <label className="block font-bold text-xs mb-1">Spawn Mode</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSpawnConfigModal({ ...spawnConfigModal, mode: 'SINGLE' })}
                                        className={`flex-1 py-1 rounded border-2 border-black font-bold text-xs ${(!spawnConfigModal.mode || spawnConfigModal.mode === 'SINGLE') ? 'bg-purple-400 text-white' : 'bg-white hover:bg-gray-100'}`}
                                    >
                                        Single Object
                                    </button>
                                    <button
                                        onClick={() => setSpawnConfigModal({ ...spawnConfigModal, mode: 'DOUBLE_VERTICAL', vx: spawnConfigModal.vx === 0 ? -5 : spawnConfigModal.vx, autoDestroy: true })}
                                        className={`flex-1 py-1 rounded border-2 border-black font-bold text-xs ${spawnConfigModal.mode === 'DOUBLE_VERTICAL' ? 'bg-purple-400 text-white' : 'bg-white hover:bg-gray-100'}`}
                                    >
                                        Pipe Pair
                                    </button>
                                </div>
                            </div>

                            {spawnConfigModal.mode === 'DOUBLE_VERTICAL' && (
                                <>
                                    <div className="mb-4 bg-purple-50 p-2 rounded border border-purple-200">
                                        <VariableLinker
                                            label="Gap Size"
                                            value={spawnConfigModal.gap || 100}
                                            variableId={spawnConfigModal.paramRefs?.['spawnGap']}
                                            onValueChange={(val) => setSpawnConfigModal({ ...spawnConfigModal, gap: val })}
                                            onVariableChange={(varId) => setSpawnConfigModal({
                                                ...spawnConfigModal,
                                                paramRefs: { ...spawnConfigModal.paramRefs, 'spawnGap': varId || '' }
                                            })}
                                            variables={visibleVariables}
                                            min={20} max={200} step={5}
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1 text-center">Vertical space between pipes</p>
                                    </div>

                                    <div className="mb-4 bg-purple-50 p-2 rounded border border-purple-200">
                                        <label className="block font-bold text-xs mb-1">Bottom Pipe Object</label>
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto border border-gray-300 rounded p-1 bg-white">
                                            <button
                                                onClick={() => setSpawnConfigModal({ ...spawnConfigModal, actorId2: undefined })}
                                                className={`w-8 h-8 border border-gray-300 rounded flex items-center justify-center ${!spawnConfigModal.actorId2 ? 'bg-purple-200 ring-2 ring-purple-500' : 'hover:bg-gray-100'}`}
                                                title="Same as Top Pipe"
                                            >
                                                <span className="text-xs font-bold">=</span>
                                            </button>
                                            {gameData.actors.map(a => (
                                                <button
                                                    key={a.id}
                                                    onClick={() => setSpawnConfigModal({ ...spawnConfigModal, actorId2: a.id })}
                                                    className={`w-8 h-8 border border-gray-300 rounded p-0.5 ${spawnConfigModal.actorId2 === a.id ? 'bg-purple-200 ring-2 ring-purple-500' : 'hover:bg-gray-100'}`}
                                                    title={a.name}
                                                >
                                                    <img src={a.imageData} className="w-full h-full object-contain" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Auto-Destroy: Always ON for Pipe Pair, optional for Single */}
                            {spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <div className="flex items-center gap-2 mb-4 bg-gray-100 p-2 rounded border border-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={spawnConfigModal.autoDestroy}
                                        onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, autoDestroy: e.target.checked })}
                                        className="w-4 h-4 accent-red-500"
                                    />
                                    <div>
                                        <label className="font-bold text-sm block">Auto-Destroy Off-Screen</label>
                                        <span className="text-[10px] text-gray-500">Remove object when it leaves the view</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    checked={spawnConfigModal.randomY}
                                    onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, randomY: e.target.checked })}
                                    className="w-4 h-4 accent-purple-500"
                                />
                                <label className="font-bold text-sm">Randomize Height {spawnConfigModal.mode === 'DOUBLE_VERTICAL' ? '(Recommended)' : ''}</label>
                            </div>

                            {/* Hide Min/Max Y for Double Spawn as it's auto-clamped */}
                            {spawnConfigModal.randomY && spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <>
                                    <div>
                                        <label className="block font-bold text-xs mb-1">Min Y</label>
                                        <input
                                            type="number"
                                            value={spawnConfigModal.minY ?? 0}
                                            onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, minY: parseInt(e.target.value) })}
                                            className="w-full p-1 border border-gray-300 rounded text-sm font-['Gochi_Hand']"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-xs mb-1">Max Y</label>
                                        <input
                                            type="number"
                                            value={spawnConfigModal.maxY ?? SCENE_HEIGHT}
                                            onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, maxY: parseInt(e.target.value) })}
                                            className="w-full p-1 border border-gray-300 rounded text-sm font-['Gochi_Hand']"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Hide Scale/Position options for Double Spawn to simplify */}
                            {spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <div>
                                    <VariableLinker
                                        label="Scale"
                                        value={spawnConfigModal.scale ?? 1.0}
                                        variableId={spawnConfigModal.paramRefs?.['spawnScale']}
                                        onValueChange={(val) => setSpawnConfigModal({ ...spawnConfigModal, scale: val })}
                                        onVariableChange={(varId) => setSpawnConfigModal({
                                            ...spawnConfigModal,
                                            paramRefs: { ...spawnConfigModal.paramRefs, 'spawnScale': varId || '' }
                                        })}
                                        variables={visibleVariables}
                                        min={0.1} max={5.0} step={0.1}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-xs mb-1">
                                    {spawnConfigModal.mode === 'DOUBLE_VERTICAL' ? 'Pipe Thickness' : 'Width (Scale X)'}: {spawnConfigModal.scaleX?.toFixed(1) ?? 'Auto'}
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5.0"
                                    step="0.1"
                                    value={spawnConfigModal.scaleX ?? 1.0}
                                    onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, scaleX: parseFloat(e.target.value) })}
                                    className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 border-2 border-black"
                                />
                                <button onClick={() => setSpawnConfigModal({ ...spawnConfigModal, scaleX: undefined })} className="text-xs text-red-500 underline">Reset</button>
                            </div>

                            {/* Hide Scale Y for Double Spawn as it's auto-calculated */}
                            {spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <div>
                                    <label className="block font-bold text-xs mb-1">Scale Y (Optional): {spawnConfigModal.scaleY?.toFixed(1) ?? 'Auto'}</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="5.0"
                                        step="0.1"
                                        value={spawnConfigModal.scaleY ?? 1.0}
                                        onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, scaleY: parseFloat(e.target.value) })}
                                        className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 border-2 border-black"
                                    />
                                    <button onClick={() => setSpawnConfigModal({ ...spawnConfigModal, scaleY: undefined })} className="text-xs text-red-500 underline">Reset</button>
                                </div>
                            )}

                            {/* Hide Spawn X for Double Spawn (always right side) */}
                            {spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <div>
                                    <label className="block font-bold text-xs mb-1">Spawn X (Optional): {spawnConfigModal.x ?? 'Auto'}</label>
                                    <input
                                        type="number"
                                        value={spawnConfigModal.x ?? ''}
                                        placeholder="Auto"
                                        onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, x: e.target.value ? parseInt(e.target.value) : undefined })}
                                        className="w-full h-8 bg-gray-200 rounded-lg px-2 border-2 border-black font-['Gochi_Hand']"
                                    />
                                </div>
                            )}

                            {/* Hide Gap Y Position if Randomize is checked for Double Spawn */}
                            {(!spawnConfigModal.randomY || spawnConfigModal.mode !== 'DOUBLE_VERTICAL') && (
                                <div>
                                    <label className="block font-bold text-xs mb-1">
                                        {spawnConfigModal.mode === 'DOUBLE_VERTICAL' ? 'Gap Y Position (Center)' : 'Spawn Y (Optional)'}:
                                        {spawnConfigModal.y ?? 'Auto'}
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={spawnConfigModal.y ?? ''}
                                            placeholder="Auto"
                                            onChange={(e) => setSpawnConfigModal({ ...spawnConfigModal, y: e.target.value ? parseInt(e.target.value) : undefined })}
                                            className="flex-1 h-8 bg-gray-200 rounded-lg px-2 border-2 border-black font-['Gochi_Hand']"
                                        />
                                        {spawnConfigModal.y !== undefined && (
                                            <button
                                                onClick={() => setSpawnConfigModal({ ...spawnConfigModal, y: undefined })}
                                                className="px-2 bg-red-100 border-2 border-black rounded text-xs font-bold hover:bg-red-200"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <VariableLinker
                                    label={spawnConfigModal.mode === 'DOUBLE_VERTICAL' ? 'Speed (Left <-> Right)' : 'Initial Velocity X'}
                                    value={spawnConfigModal.vx}
                                    variableId={spawnConfigModal.paramRefs?.['vx']}
                                    onValueChange={(val) => setSpawnConfigModal({ ...spawnConfigModal, vx: val })}
                                    onVariableChange={(varId) => setSpawnConfigModal({
                                        ...spawnConfigModal,
                                        paramRefs: { ...spawnConfigModal.paramRefs, 'vx': varId || '' }
                                    })}
                                    variables={visibleVariables}
                                    min={-20} max={20} step={1}
                                />
                            </div>

                            {/* Hide Velocity Y for Double Spawn (usually 0) */}
                            {spawnConfigModal.mode !== 'DOUBLE_VERTICAL' && (
                                <div>
                                    <VariableLinker
                                        label="Initial Velocity Y"
                                        value={spawnConfigModal.vy}
                                        variableId={spawnConfigModal.paramRefs?.['vy']}
                                        onValueChange={(val) => setSpawnConfigModal({ ...spawnConfigModal, vy: val })}
                                        onVariableChange={(varId) => setSpawnConfigModal({
                                            ...spawnConfigModal,
                                            paramRefs: { ...spawnConfigModal.paramRefs, 'vy': varId || '' }
                                        })}
                                        variables={visibleVariables}
                                        min={-20} max={20} step={1}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setSpawnConfigModal(null)}
                                    className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        updateEffect(spawnConfigModal.ruleId, spawnConfigModal.effectIndex, {
                                            spawnRandomY: spawnConfigModal.randomY,
                                            spawnYMin: spawnConfigModal.minY,
                                            spawnYMax: spawnConfigModal.maxY,
                                            spawnScale: spawnConfigModal.scale,
                                            spawnScaleX: spawnConfigModal.scaleX,
                                            spawnScaleY: spawnConfigModal.scaleY,
                                            spawnVelocity: { x: spawnConfigModal.vx, y: spawnConfigModal.vy },
                                            spawnX: spawnConfigModal.x,
                                            spawnY: spawnConfigModal.y,
                                            spawnMode: spawnConfigModal.mode,
                                            spawnActorId2: spawnConfigModal.actorId2,
                                            spawnGap: spawnConfigModal.gap,
                                            spawnAutoDestroy: spawnConfigModal.autoDestroy,
                                            paramRefs: spawnConfigModal.paramRefs
                                        });
                                        setSpawnConfigModal(null);
                                    }}
                                    className="px-4 py-2 bg-purple-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-purple-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                                >
                                    SAVE
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ROTATION CONFIG MODAL */}
            {rotationConfigModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-[300px] animate-bounce-in">
                        <h3 className="text-2xl font-black mb-6 font-['Gochi_Hand'] text-center flex items-center justify-center gap-2">
                            <RotateCw size={28} className="text-yellow-500" />
                            ROTATION
                        </h3>

                        <div className="space-y-4">
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg border border-gray-300">
                                <button
                                    onClick={() => setRotationConfigModal({ ...rotationConfigModal, operation: 'SET' })}
                                    className={`flex-1 py-1 rounded font-bold text-xs ${rotationConfigModal.operation === 'SET' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                                >
                                    SET ANGLE
                                </button>
                                <button
                                    onClick={() => setRotationConfigModal({ ...rotationConfigModal, operation: 'ADD' })}
                                    className={`flex-1 py-1 rounded font-bold text-xs ${rotationConfigModal.operation === 'ADD' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                                >
                                    SPIN (ADD)
                                </button>
                            </div>

                            <VariableLinker
                                label="Angle (Degrees)"
                                value={rotationConfigModal.rotation}
                                variableId={rotationConfigModal.paramRefs?.['rotation']}
                                onValueChange={(val) => setRotationConfigModal({ ...rotationConfigModal, rotation: val })}
                                onVariableChange={(varId) => setRotationConfigModal({
                                    ...rotationConfigModal,
                                    paramRefs: { ...rotationConfigModal.paramRefs, 'rotation': varId || '' }
                                })}
                                variables={visibleVariables}
                                min={-360} max={360} step={15}
                            />

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setRotationConfigModal(null)}
                                    className="px-4 py-2 bg-gray-200 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-gray-300"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        updateEffect(rotationConfigModal.ruleId, rotationConfigModal.effectIndex, {
                                            rotation: rotationConfigModal.rotation,
                                            rotationOperation: rotationConfigModal.operation,
                                            paramRefs: rotationConfigModal.paramRefs
                                        });
                                        setRotationConfigModal(null);
                                    }}
                                    className="px-4 py-2 bg-yellow-400 border-2 border-black rounded-lg font-bold font-['Gochi_Hand'] hover:bg-yellow-500 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                                >
                                    SAVE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};