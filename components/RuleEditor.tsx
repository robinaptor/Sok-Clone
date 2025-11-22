
import React, { useState } from 'react';
import { GameData, Rule, InteractionType, RuleTrigger, Sound, GlobalVariable, RuleEffect } from '../types';
import { TRIGGER_MAGNETS, EFFECT_MAGNETS, SCENE_WIDTH, SCENE_HEIGHT } from '../constants';
import { Trash2, Square, ArrowRight, Trophy, HelpCircle, Hand, Eye, DoorOpen, Utensils, Skull, Puzzle, Ban, RotateCw, Globe, MapPin, X, Timer, ChevronsRight, Flag, Hourglass, Sparkles, Crosshair, Volume2, VolumeX, Edit3, Plus, RefreshCw, Clapperboard, ArrowDown, Repeat, Clock, Hash, PlusCircle, Calculator, Settings, MessageCircle, MessageSquare, Keyboard, Footprints, Activity } from 'lucide-react';
import { SoundRecorder } from './SoundRecorder';

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

    // State for Position Picker Modal (Only for SPAWN)
    const [pickingLocationFor, setPickingLocationFor] = useState<{ ruleId: string, effectIndex: number } | null>(null);

    // State for Selection Modal (Spawn/Swap/Anim -> Actor, Change Scene -> Scene)
    const [selectionModal, setSelectionModal] = useState<{
        ruleId: string;
        effectIndex: number;
        type: 'ACTOR' | 'SCENE';
        label: string; // "SELECT ANIMATION" etc
        allowTargetSelection?: boolean; // For SWAP/ANIM (Subject vs Object)
        currentTarget?: 'SUBJECT' | 'OBJECT';
        subjectActorId?: string; // To show preview
        objectActorId?: string; // To show preview
        allowLoop?: boolean; // For ANIM
        currentLoop?: boolean;
    } | null>(null);

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

    // NEW: State for Creating/Editing Variable
    const [showNewVarModal, setShowNewVarModal] = useState(false);
    const [editingVarId, setEditingVarId] = useState<string | null>(null);
    const [newVarName, setNewVarName] = useState("");
    const [newVarInitial, setNewVarInitial] = useState(0);

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
    const visibleVariables = (gameData.variables || []).filter(v => {
        if (viewScope === 'GLOBAL') return v.scope === 'GLOBAL' || !v.scope;
        return v.scope === currentSceneId;
    });

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
            default: return <HelpCircle size={20} />;
        }
    };

    // --- ACTIONS ---

    const openNewVariableModal = () => {
        setNewVarName("");
        setNewVarInitial(0);
        setEditingVarId(null);
        setShowNewVarModal(true);
    };

    const openEditVariableModal = (v: GlobalVariable) => {
        setNewVarName(v.name);
        setNewVarInitial(v.initialValue);
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
                scope: activeScopeId === 'GLOBAL' ? 'GLOBAL' : currentSceneId
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
    };

    const handleSlotDrop = (e: React.DragEvent, ruleId: string, slot: 'subject' | 'object' | 'effects' | 'trigger_modifier', effectIndex?: number) => {
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

                const newEffect: RuleEffect = { type: interaction, target: defaultTarget };

                // Handle MODIFY_VAR magnet
                if (interaction === InteractionType.MODIFY_VAR) {
                    const firstVar = visibleVariables[0];
                    if (firstVar) {
                        newEffect.variableId = firstVar.id;
                        newEffect.operation = 'ADD';
                        newEffect.value = 1;
                    }
                }

                // Handle STEP magnet (Target Selection)
                if (interaction === InteractionType.STEP) {
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

    const getActorImage = (id: string) => {
        return gameData.actors.find(a => a.id === id)?.imageData;
    };

    const handleSelectionSave = (selectedId: string) => {
        if (!selectionModal) return;
        const { ruleId, effectIndex, type, currentTarget, currentLoop } = selectionModal;

        onUpdateRules(gameData.rules.map(r => {
            if (r.id === ruleId) {
                const newEffects = [...r.effects];
                // Safety check
                if (!newEffects[effectIndex]) return r;

                if (type === 'ACTOR') {
                    const currentEffect = newEffects[effectIndex];
                    if (currentEffect.type === InteractionType.DESTROY_OBJECT || currentEffect.type === InteractionType.SAY) {
                        newEffects[effectIndex] = {
                            ...currentEffect,
                            target: currentTarget || 'OBJECT',
                            spawnActorId: selectedId
                        };
                    } else if (currentEffect.type === InteractionType.STEP) {
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

    const getTriggerLabel = (rule: Rule) => {
        if (rule.trigger === RuleTrigger.START) return "GAME STARTS";
        if (rule.trigger === RuleTrigger.TIMER) return "EVERY 2 SEC";
        if (rule.trigger === RuleTrigger.COLLISION) return rule.invert ? "TOUCHING" : "TOUCHES";
        if (rule.trigger === RuleTrigger.VAR_CHECK) {
            const v = gameData.variables?.find(v => v.id === rule.variableId);
            const name = v ? v.name : "???";
            const op = rule.condition === 'EQUALS' ? '=' : rule.condition === 'GREATER' ? '>' : '<';
            return `${name} ${op} ${rule.threshold}`;
        }
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

            {/* --- MODAL: SELECTION (ACTOR / SCENE) --- */}
            {selectionModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
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
                            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-4">
                                {gameData.actors.map(actor => (
                                    <button key={actor.id} onClick={() => handleSelectionSave(actor.id)} className="aspect-square border-2 border-black rounded-lg p-2 hover:bg-yellow-100 hover:scale-105 transition-all flex flex-col items-center gap-1 shadow-sm">
                                        <img src={actor.imageData} className="w-full h-full object-contain" />
                                        <span className="text-xs font-bold truncate w-full text-center">{actor.name}</span>
                                    </button>
                                ))}
                            </div>
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

            {/* --- LEFT: TRIGGERS & VARIABLES --- */}
            <div className="w-44 bg-yellow-100 border-[3px] border-black/10 p-4 flex flex-col gap-6 items-center shadow-inner rounded-l-lg overflow-y-auto shrink-0">

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

                <div className="w-full h-[2px] bg-black/10 my-2"></div>

                <div className="w-full flex flex-col items-center gap-2">
                    <h3 className="font-bold text-lg text-blue-800 flex items-center gap-2"><Hash size={20} /> VARIABLES</h3>

                    {/* SCOPE FILTER LABEL */}
                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                        {viewScope === 'GLOBAL' ? 'Global Variables' : 'Scene Variables'}
                    </div>

                    {/* VARIABLE LIST ITEMS */}
                    {visibleVariables.map(v => (
                        <div
                            key={v.id}
                            className="w-full bg-white border-2 border-blue-400 rounded-lg p-2 shadow-sm relative group cursor-grab active:cursor-grabbing hover:bg-blue-50 transition-colors"
                            draggable="true"
                            onDragStart={(e) => {
                                e.dataTransfer.setData("type", "VARIABLE");
                                e.dataTransfer.setData("variableId", v.id);
                                e.dataTransfer.effectAllowed = "copy";
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden" onClick={() => openEditVariableModal(v)}>
                                    <div className="w-6 h-6 shrink-0 bg-blue-100 rounded border border-blue-300 flex items-center justify-center text-blue-600 cursor-pointer">
                                        <Edit3 size={12} />
                                    </div>
                                    <span className="font-bold text-sm truncate cursor-pointer hover:underline" title={v.name}>{v.name}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteVariable(v.id); }}
                                    className="text-red-300 hover:text-red-600 shrink-0"
                                    title="Delete Variable"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="text-[8px] text-gray-400 text-center mt-1">Initial: {v.initialValue}</div>
                        </div>
                    ))}

                    <button onClick={openNewVariableModal} className="w-full py-2 bg-blue-100 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center gap-1 hover:bg-blue-200 font-bold text-blue-600 text-sm">
                        <Plus size={16} /> NEW
                    </button>
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
                            No rules yet.<br /><br />Drag a "STARTER" here to begin!
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
                                            <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center bg-white">
                                                {rule.trigger === RuleTrigger.VAR_CHECK ? (
                                                    <Hash size={24} className="text-blue-500" />
                                                ) : (
                                                    <div style={{ color: TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.color || '#000' }}>
                                                        {getIcon(TRIGGER_MAGNETS.find(m => m.type === rule.trigger)?.icon || 'help')}
                                                    </div>
                                                )}
                                            </div>
                                            {rule.invert && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Ban size={48} className="text-red-500 drop-shadow-md opacity-80" strokeWidth={3} /></div>}

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
                                            onClick={() => {
                                                const keys: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
                                                const currentIdx = keys.indexOf(rule.key || 'UP');
                                                const nextKey = keys[(currentIdx + 1) % keys.length];
                                                onUpdateRules(gameData.rules.map(r => r.id === rule.id ? { ...r, key: nextKey } : r));
                                            }}
                                            className="px-3 py-2 bg-yellow-100 border-2 border-yellow-500 border-dashed rounded flex flex-col items-center justify-center hover:bg-yellow-200 min-w-[60px]"
                                        >
                                            <span className="text-[10px] font-bold text-yellow-800">KEY</span>
                                            <span className="font-bold text-2xl leading-none">
                                                {rule.key === 'UP' && '⬆️'}
                                                {rule.key === 'DOWN' && '⬇️'}
                                                {rule.key === 'LEFT' && '⬅️'}
                                                {rule.key === 'RIGHT' && '➡️'}
                                                {!rule.key && '⬆️'}
                                            </span>
                                        </button>
                                    )}

                                    {/* TIMER TRIGGER CONFIG */}
                                    {rule.trigger === RuleTrigger.TIMER && (
                                        <button
                                            onClick={() => {
                                                const val = prompt("Enter timer interval in seconds:", (rule.interval || 2).toString());
                                                if (val) {
                                                    const num = parseFloat(val);
                                                    if (!isNaN(num) && num > 0) {
                                                        onUpdateRules(gameData.rules.map(r => r.id === rule.id ? { ...r, interval: num } : r));
                                                    }
                                                }
                                            }}
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

                                    {rule.trigger !== RuleTrigger.VAR_CHECK && (
                                        <div className="font-['Space_Mono'] font-bold text-sm text-gray-400 flex flex-col items-center px-2">
                                            {rule.invert && <span className="text-red-500 font-bold text-lg animate-pulse">IS NOT</span>}
                                            <span>{getTriggerLabel(rule)}</span>
                                        </div>
                                    )}

                                    {/* OBJECT SLOT */}
                                    {rule.trigger === RuleTrigger.COLLISION && (
                                        <div className={`w-16 h-16 border-2 border-dashed ${rule.objectId ? 'border-black bg-white' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden relative`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100') }} onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-100')} onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-100'); handleSlotDrop(e, rule.id, 'object') }}>
                                            {rule.objectId ? <img src={getActorImage(rule.objectId)} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400 font-bold">WHO?</span>}
                                        </div>
                                    )}
                                </div>

                                <ArrowRight size={24} className="text-black/20 shrink-0 mx-2" />

                                {/* --- RIGHT SIDE: MULTIPLE EFFECTS --- */}
                                <div className={`flex-1 min-h-[80px] border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex items-center gap-2 relative p-2 overflow-x-auto`} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-green-50'); }} onDragLeave={(e) => { e.currentTarget.classList.remove('bg-green-50'); }} onDrop={(e) => { e.currentTarget.classList.remove('bg-green-50'); handleSlotDrop(e, rule.id, 'effects'); }}>
                                    {rule.effects.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-xs text-gray-400 font-bold animate-pulse">DRAG EFFECTS HERE</span></div>}

                                    {rule.effects.map((effect, idx) => {

                                        // VARIABLE MODIFIER EFFECT
                                        if (effect.type === InteractionType.MODIFY_VAR) {
                                            const v = gameData.variables?.find(va => va.id === effect.variableId);
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setVarConfigValue(effect.value || 1);
                                                            setVarConfigOp(effect.operation as any || 'ADD');
                                                            setVarConfigVariableId(effect.variableId!);
                                                            setVariableModal({ ruleId: rule.id, type: 'EFFECT', effectIndex: idx, variableId: effect.variableId! });
                                                        }}
                                                        className="flex flex-col items-center bg-cyan-50 border-2 border-cyan-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1 hover:bg-cyan-100"
                                                    >
                                                        <span className="text-[10px] font-bold text-cyan-600 uppercase">VAR</span>
                                                        <div className="font-bold text-lg">{v?.name || '???'}</div>
                                                        <div className="text-xs bg-cyan-200 px-2 rounded-full">{effect.operation} {effect.value}</div>
                                                    </button>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // SAY (Dialogue)
                                        if (effect.type === InteractionType.SAY) {
                                            const targetIcon = effect.target === 'OBJECT' ? rule.objectId : rule.subjectId;
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-yellow-50 border-2 border-yellow-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-yellow-700 uppercase">SAY</span>
                                                        <div className="flex gap-1 items-center">
                                                            {/* Target Selector */}
                                                            <div className="flex flex-col items-center scale-90">
                                                                <button onClick={() => setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: "WHO SPEAKS?", allowTargetSelection: true, currentTarget: effect.target || 'SUBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId })} className="w-8 h-8 border border-black rounded bg-gray-100 overflow-hidden flex items-center justify-center hover:scale-110 transition-transform" title="Who speaks?">
                                                                    {(effect.target === 'OBJECT' && !rule.objectId) ? <div className="text-[10px] font-bold">ANY</div> : (targetIcon ? <img src={getActorImage(targetIcon)} className="w-full h-full object-contain" /> : <span className="text-xs">?</span>)}
                                                                </button>
                                                            </div>

                                                            {/* Text Editor Trigger */}
                                                            <button
                                                                onClick={() => setTextInputModal({ ruleId: rule.id, effectIndex: idx, currentText: effect.text || '' })}
                                                                className="w-10 h-10 border-2 border-black rounded bg-yellow-200 hover:bg-yellow-300 flex items-center justify-center transition-transform hover:scale-105"
                                                                title="Edit Text"
                                                            >
                                                                <MessageSquare size={20} className="text-yellow-800" />
                                                            </button>
                                                        </div>
                                                        <div className="text-[10px] bg-yellow-200 px-2 rounded-full max-w-[70px] truncate mt-1">{effect.text || '...'}</div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

                                        // SPAWN / SWAP / ANIM / EAT (Actor Based)
                                        if (effect.type === InteractionType.SPAWN || effect.type === InteractionType.SWAP || effect.type === InteractionType.PLAY_ANIM || effect.type === InteractionType.DESTROY_OBJECT) {
                                            const isSpawn = effect.type === InteractionType.SPAWN;
                                            const isSwap = effect.type === InteractionType.SWAP;
                                            const isAnim = effect.type === InteractionType.PLAY_ANIM;
                                            const isEat = effect.type === InteractionType.DESTROY_OBJECT;
                                            let label = isSpawn ? "SPAWN" : isSwap ? "SWAP" : "ANIM";
                                            if (isEat) label = "EAT";
                                            const colorClass = isSpawn ? "purple" : isSwap ? "pink" : "fuchsia";
                                            let bgColor = isSpawn ? "bg-purple-100" : isSwap ? "bg-pink-100" : "bg-fuchsia-100";
                                            let borderColor = isSpawn ? "border-purple-500" : isSwap ? "border-pink-500" : "border-fuchsia-500";
                                            let textColor = isSpawn ? "text-purple-600" : isSwap ? "text-pink-600" : "text-fuchsia-600";
                                            if (isEat) { bgColor = "bg-red-100"; borderColor = "border-red-500"; textColor = "text-red-600"; }
                                            let Icon = isSpawn ? Sparkles : isSwap ? RefreshCw : Clapperboard;
                                            if (isEat) Icon = Utensils;
                                            const targetIcon = effect.target === 'OBJECT' ? rule.objectId : rule.subjectId;
                                            const showTarget = (isSwap || isAnim || isEat) && (rule.trigger === RuleTrigger.COLLISION || rule.trigger === RuleTrigger.CLICK);

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
                                                                <button onClick={() => setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: isSpawn ? "SPAWN WHAT?" : isSwap ? "SWAP WHO FOR WHAT?" : "PLAY WHICH ANIM?", allowTargetSelection: showTarget, allowLoop: isAnim, currentLoop: effect.isLoop || false, currentTarget: effect.target || 'SUBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId })} className={`w-10 h-10 border-2 border-black rounded ${bgColor} hover:brightness-95 flex items-center justify-center transition-transform hover:scale-105 relative`}>
                                                                    {effect.spawnActorId ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <Icon size={20} className={textColor} strokeWidth={3} />}
                                                                    {!effect.spawnActorId && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                                                                </button>
                                                            )}
                                                            {isEat && (
                                                                <button onClick={() => { if (effect.target === 'OBJECT' && !rule.objectId) { setSelectionModal({ ruleId: rule.id, effectIndex: idx, type: 'ACTOR', label: "DESTROY WHICH TYPE?", allowTargetSelection: true, currentTarget: 'OBJECT', subjectActorId: rule.subjectId, objectActorId: rule.objectId }); } }} className={`w-10 h-10 border-2 border-black rounded ${bgColor} flex items-center justify-center relative`}>
                                                                    {(effect.spawnActorId && (effect.target === 'OBJECT' && !rule.objectId)) ? <img src={getActorImage(effect.spawnActorId)} className="w-full h-full object-contain" /> : <Icon size={24} className={textColor} strokeWidth={3} />}
                                                                </button>
                                                            )}
                                                            {isSpawn && effect.spawnActorId && (
                                                                <button onClick={() => setPickingLocationFor({ ruleId: rule.id, effectIndex: idx })} className={`w-6 h-10 border-2 border-black rounded flex items-center justify-center transition-colors ${effect.spawnX !== undefined ? 'bg-green-300' : 'bg-gray-100 hover:bg-gray-200'}`} title="Set Location"><Crosshair size={14} className={effect.spawnX !== undefined ? 'text-black' : 'text-gray-400'} /></button>
                                                            )}
                                                            {isAnim && effect.isLoop && <div className="absolute top-0 right-0 bg-purple-600 rounded-full p-[2px] border border-white"><Repeat size={8} className="text-white" /></div>}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }



                                        // STEP (Movement)
                                        if (effect.type === InteractionType.STEP) {
                                            return (
                                                <div key={idx} className="relative group shrink-0">
                                                    <div className="flex flex-col items-center bg-white border-2 border-green-500 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-green-600 uppercase">STEP</span>
                                                        <div className="flex gap-1 items-center">
                                                            <div className="flex flex-col items-center scale-90">
                                                                <button
                                                                    onClick={() => setSelectionModal({
                                                                        ruleId: rule.id,
                                                                        effectIndex: idx,
                                                                        type: 'ACTOR',
                                                                        label: "MOVE TOWARDS WHO?",
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
                                                            {effect.spawnActorId ? 'TOWARDS TARGET' : 'TOWARDS HERO'}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:scale-110 z-10"><X size={14} /></button>
                                                </div>
                                            );
                                        }

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

                                        if (effect.type === InteractionType.THEN) {
                                            return (
                                                <div key={idx} className="relative group shrink-0 flex items-center justify-center px-2">
                                                    <div className="flex flex-col items-center bg-white border-2 border-gray-400 rounded-lg p-2 shadow-sm h-[90px] min-w-[80px] justify-center gap-1">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">THEN</span>
                                                        <div className="w-12 h-10 flex items-center justify-center"><ChevronsRight size={28} className="text-gray-400" /></div>
                                                    </div>
                                                    <button onClick={() => removeEffect(rule.id, idx)} className="absolute -top-2 right-0 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center hover:scale-110 z-10"><X size={12} /></button>
                                                </div>
                                            );
                                        }

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
                </div>
            </div>

            {/* --- RIGHT: EFFECTS (DO) --- */}
            <div className="w-40 bg-green-100 border-[3px] border-black/10 p-4 flex flex-col gap-4 items-center shadow-inner rounded-r-lg overflow-y-auto shrink-0">
                <h3 className="font-bold text-xl text-green-800 flex items-center gap-2">EFFECTS <Puzzle size={20} /></h3>
                {EFFECT_MAGNETS.map((mag) => (
                    <div key={mag.type} draggable="true" onDragStart={(e) => { e.dataTransfer.setData("type", "NEW_EFFECT_MAGNET"); e.dataTransfer.setData("interaction", mag.type); }} className="w-full bg-white border-2 border-green-500 rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex flex-col items-center gap-1 group">
                        <div className="font-bold text-sm text-green-600">THEN...</div>
                        <div className="w-10 h-10 rounded flex items-center justify-center text-white border border-black shadow-sm" style={{ backgroundColor: mag.color }}>{getIcon(mag.icon)}</div>
                        <span className="font-bold text-md text-center leading-none">{mag.label}</span>
                    </div>
                ))}
            </div>

        </div>
    );
};
