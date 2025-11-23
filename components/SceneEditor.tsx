import React, { useState, useRef, useEffect } from 'react';
import { GameData, LevelObject, Actor, Scene } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trash2, Square, ArrowRight, Trophy, HelpCircle, Hand, Eye, DoorOpen, Utensils, Skull, Puzzle, Ban, RotateCw, Globe, MapPin, X, Timer, ChevronsRight, Flag, Hourglass, Sparkles, Crosshair, Volume2, VolumeX, Edit3, Plus, RefreshCw, Clapperboard, ArrowDown, Repeat, Clock, Hash, PlusCircle, Calculator, Maximize, Lock, Unlock, Paintbrush, Upload, Move, Settings, Play, Save, Book } from 'lucide-react';

interface SceneEditorProps {
    gameData: GameData;
    currentSceneId: string;
    onSwitchScene: (sceneId: string) => void;
    onAddScene: () => void;
    onUpdateCurrentScene: (objects: LevelObject[]) => void;
    selectedActorId: string | null;
    onPlay: () => void;
    onSave: () => void;
    onOpenRules: () => void;
    onChangeTitle: (title: string) => void;
    onEditBackground: () => void;
    onUpdateBackground: (bgImage: string | undefined) => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
    gameData,
    currentSceneId,
    onSwitchScene,
    onAddScene,
    onUpdateCurrentScene,
    selectedActorId,
    onPlay,
    onSave,
    onOpenRules,
    onChangeTitle,
    onEditBackground,
    onUpdateBackground
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [scale, setScale] = useState(1);
    const [isLockMode, setIsLockMode] = useState(false);

    const [draggedActorId, setDraggedActorId] = useState<string | null>(null);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [hudConfigModal, setHudConfigModal] = useState<string | null>(null);

    // HUD Modal Drag State
    const [hudDragging, setHudDragging] = useState(false);
    const [hudResizing, setHudResizing] = useState(false);
    const hudDragStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Selection & Resizing State
    const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const resizeStartRef = useRef<{ x: number, startScale: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const currentScene = gameData.scenes.find(s => s.id === currentSceneId) || gameData.scenes[0];
    const levelObjects = currentScene.objects;

    // --- Auto-Scale Logic ---
    useEffect(() => {
        const handleResize = () => {
            if (wrapperRef.current) {
                const availableWidth = wrapperRef.current.clientWidth - 40;
                const availableHeight = wrapperRef.current.clientHeight - 40;
                const scaleX = availableWidth / SCENE_WIDTH;
                const scaleY = availableHeight / SCENE_HEIGHT;
                setScale(Math.min(scaleX, scaleY, 1));
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        setTimeout(handleResize, 100);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Global Mouse Up for Resizing ---
    useEffect(() => {
        const handleGlobalUp = () => {
            if (resizingId) {
                setResizingId(null);
                resizeStartRef.current = null;
            }
        };
        const handleGlobalMove = (e: MouseEvent) => {
            if (resizingId && resizeStartRef.current) {
                const deltaX = e.clientX - resizeStartRef.current.x;
                // Sensitivity: 200px drag = +1.0 scale
                const scaleChange = deltaX / 200;
                const newScale = Math.max(0.2, Math.min(5.0, resizeStartRef.current.startScale + scaleChange));

                const newObjects = levelObjects.map(obj =>
                    obj.id === resizingId ? { ...obj, scale: newScale } : obj
                );
                onUpdateCurrentScene(newObjects);
            }
        };

        if (resizingId) {
            window.addEventListener('mouseup', handleGlobalUp);
            window.addEventListener('mousemove', handleGlobalMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleGlobalUp);
            window.removeEventListener('mousemove', handleGlobalMove);
        };
    }, [resizingId, levelObjects]);

    const getActor = (actorId: string) => gameData.actors.find(a => a.id === actorId);
    const selectedActor = selectedActorId ? getActor(selectedActorId) : null;
    const selectedInstance = levelObjects.find(o => o.id === selectedObjId);

    // --- Drag & Drop Logic ---
    const handleItemDragStart = (e: React.DragEvent, objId: string, offsetX: number, offsetY: number) => {
        e.stopPropagation();
        // If dragging, select it
        setSelectedObjId(objId);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("type", "MOVE_EXISTING");
        e.dataTransfer.setData("levelObjectId", objId);
        e.dataTransfer.setData("dragOffsetX", offsetX.toString());
        e.dataTransfer.setData("dragOffsetY", offsetY.toString());
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const dropX = (e.clientX - containerRect.left) / scale;
        const dropY = (e.clientY - containerRect.top) / scale;

        // HUD DRAGGING LOGIC
        const hudData = e.dataTransfer.getData("text/plain");
        if (hudData && hudData.startsWith("HUD_")) {
            const parentId = hudData.replace("HUD_", "");
            const clickOffsetX = parseFloat(e.dataTransfer.getData("clickOffsetX") || "0");
            const clickOffsetY = parseFloat(e.dataTransfer.getData("clickOffsetY") || "0");

            const parentObj = levelObjects.find(o => o.id === parentId);
            if (parentObj && parentObj.variableMonitor) {
                // Calculate new offset relative to parent center
                // dropX is mouse position in scene coords
                // We want the center of the HUD element to be at (dropX - clickOffsetX + width/2, dropY - clickOffsetY + height/2)
                // But simpler: just use the drop position as the new center for now, adjusting for click offset

                const newCenterX = dropX - clickOffsetX + 50; // +50 because minWidth is 100, so center is +50
                const newCenterY = dropY - clickOffsetY + 20; // Approx height/2

                const newOffsetX = newCenterX - (parentObj.x + ACTOR_SIZE / 2);
                const newOffsetY = newCenterY - (parentObj.y + ACTOR_SIZE / 2);

                onUpdateCurrentScene(levelObjects.map(o => o.id === parentId ? {
                    ...o,
                    variableMonitor: {
                        ...o.variableMonitor!,
                        offsetX: Math.round(newOffsetX),
                        offsetY: Math.round(newOffsetY)
                    }
                } : o));
            }
            return;
        }

        // Original logic for moving/creating objects, adapted to new variables
        const type = e.dataTransfer.getData("type");

        if (type === "MOVE_EXISTING") {
            const objId = e.dataTransfer.getData("levelObjectId");
            const offX = parseFloat(e.dataTransfer.getData("dragOffsetX")) || 0;
            const offY = parseFloat(e.dataTransfer.getData("dragOffsetY")) || 0;

            let newX = dropX - offX;
            let newY = dropY - offY;

            // Snap / Bounds
            // Note: We don't strictly clamp max bounds here to allow moving large objects partially offscreen
            newX = Math.max(-ACTOR_SIZE, Math.min(newX, SCENE_WIDTH));
            newY = Math.max(-ACTOR_SIZE, Math.min(newY, SCENE_HEIGHT));

            const newLevel = levelObjects.map(obj => {
                if (obj.id === objId) return { ...obj, x: newX, y: newY };
                return obj;
            });
            onUpdateCurrentScene(newLevel);
        } else {
            const actorId = e.dataTransfer.getData("actorId");
            if (actorId) {
                let x = dropX - (ACTOR_SIZE / 2);
                let y = dropY - (ACTOR_SIZE / 2);
                x = Math.max(0, Math.min(x, SCENE_WIDTH - ACTOR_SIZE));
                y = Math.max(0, Math.min(y, SCENE_HEIGHT - ACTOR_SIZE));

                const newObj: LevelObject = {
                    id: Math.random().toString(36).substr(2, 9),
                    actorId,
                    x,
                    y,
                    isLocked: isLockMode,
                    scale: 1.0
                };
                onUpdateCurrentScene([...levelObjects, newObj]);
                setSelectedObjId(newObj.id); // Select new object
            }
        }
    };

    const updateSelectedScale = (newScale: number) => {
        if (!selectedObjId) return;
        onUpdateCurrentScene(levelObjects.map(o => o.id === selectedObjId ? { ...o, scale: newScale } : o));
    };

    const toggleObjectLock = (objId: string) => {
        const newLevel = levelObjects.map(obj => {
            if (obj.id === objId) return { ...obj, isLocked: !obj.isLocked };
            return obj;
        });
        onUpdateCurrentScene(newLevel);
    };

    const deleteSelectedObject = () => {
        if (!selectedObjId) return;
        onUpdateCurrentScene(levelObjects.filter(o => o.id !== selectedObjId));
        setSelectedObjId(null);
    };

    const handleTrashDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData("type");
        if (type === "MOVE_EXISTING") {
            const objId = e.dataTransfer.getData("levelObjectId");
            onUpdateCurrentScene(levelObjects.filter(obj => obj.id !== objId));
            if (selectedObjId === objId) setSelectedObjId(null);
        }
    };

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    onUpdateBackground(evt.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // --- BG Anim Preview ---
    const [bgFrameIdx, setBgFrameIdx] = useState(0);
    useEffect(() => {
        if (currentScene.backgroundFrames && currentScene.backgroundFrames.length > 1) {
            const interval = setInterval(() => {
                setBgFrameIdx(curr => (curr + 1) % currentScene.backgroundFrames!.length);
            }, 500);
            return () => clearInterval(interval);
        } else {
            setBgFrameIdx(0);
        }
    }, [currentScene.backgroundFrames]);

    const currentBgImage = currentScene.backgroundFrames?.[bgFrameIdx] || currentScene.backgroundImage;

    // --- HUD Modal State ---
    const [hudModal, setHudModal] = useState<{ variableId: string, mode: 'TEXT' | 'BAR', maxValue: number, color: string } | null>(null);

    return (
        <div className="flex w-full h-full overflow-hidden" onClick={() => setSelectedObjId(null)}>

            {/* HUD MODAL */}
            {hudModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 border-4 border-black rounded-xl shadow-2xl flex flex-col gap-4 w-[300px] sketch-box" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl uppercase flex items-center gap-2"><Maximize size={24} /> NEW HUD WIDGET</h3>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">VARIABLE</label>
                            <select
                                value={hudModal.variableId}
                                onChange={e => setHudModal({ ...hudModal, variableId: e.target.value })}
                                className="w-full border-2 border-black rounded p-2 font-bold bg-yellow-50"
                            >
                                {gameData.variables?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                {(!gameData.variables || gameData.variables.length === 0) && <option value="">No Variables</option>}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-xs text-gray-500">STYLE</label>
                            <div className="flex gap-2">
                                <button onClick={() => setHudModal({ ...hudModal, mode: 'TEXT' })} className={`flex-1 py-2 border-2 rounded font-bold ${hudModal.mode === 'TEXT' ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'}`}>TEXT</button>
                                <button onClick={() => setHudModal({ ...hudModal, mode: 'BAR' })} className={`flex-1 py-2 border-2 rounded font-bold ${hudModal.mode === 'BAR' ? 'bg-green-100 border-green-500' : 'bg-white border-gray-300'}`}>BAR</button>
                            </div>
                        </div>

                        {hudModal.mode === 'BAR' && (
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-xs text-gray-500">MAX VALUE</label>
                                <input type="number" value={hudModal.maxValue} onChange={e => setHudModal({ ...hudModal, maxValue: parseInt(e.target.value) })} className="w-full border-2 border-black rounded p-2 font-bold" />
                            </div>
                        )}

                        <div className="flex gap-2 mt-2">
                            <button onClick={() => setHudModal(null)} className="flex-1 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">CANCEL</button>
                            <button
                                onClick={() => {
                                    if (!hudModal.variableId) return;
                                    const newObj: LevelObject = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        actorId: 'HUD_WIDGET', // Special ID
                                        x: SCENE_WIDTH / 2 - 50,
                                        y: SCENE_HEIGHT / 2 - 20,
                                        variableMonitor: {
                                            variableId: hudModal.variableId,
                                            mode: hudModal.mode,
                                            maxValue: hudModal.maxValue,
                                            color: '#000000'
                                        }
                                    };
                                    onUpdateCurrentScene([...levelObjects, newObj]);
                                    setHudModal(null);
                                }}
                                className="flex-1 bg-[#22c55e] text-white py-2 font-bold rounded shadow-[2px_2px_0px_black] active:translate-y-1 active:shadow-none"
                            >
                                ADD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT SIDEBAR (Tabs) */}
            <div className="w-16 flex flex-col gap-2 pt-8 pl-2 z-10 h-full overflow-y-auto pb-20" onClick={e => e.stopPropagation()}>
                {gameData.scenes.map((scene, index) => (
                    <button
                        key={scene.id}
                        onClick={() => onSwitchScene(scene.id)}
                        className={`w-12 h-12 border-2 border-black flex items-center justify-center font-bold text-2xl rounded-l-lg shadow-md cursor-pointer transition-all relative left-2
                ${currentSceneId === scene.id
                                ? 'bg-[#ffcc80] w-14 hover:w-14'
                                : 'bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600'} 
                `}
                    >
                        {index + 1}
                    </button>
                ))}
                <button
                    onClick={onAddScene}
                    className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-bold text-2xl rounded-l-lg shadow-sm cursor-pointer hover:bg-green-50 text-gray-400 hover:text-green-500 ml-2"
                >
                    +
                </button>
            </div>

            {/* CENTER AREA */}
            <div className="flex-1 flex flex-col relative">

                {/* HEADER */}
                <div className="h-16 flex items-center justify-center relative z-20 -mb-4 pointer-events-none">
                    <div className="pointer-events-auto flex items-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-white border-[3px] border-black overflow-hidden relative z-10 shadow-md">
                            {gameData.actors[0] && (
                                <img src={gameData.actors[0].imageData} className="w-full h-full object-contain p-1" alt="Hero" />
                            )}
                        </div>
                        <div className="sketch-box h-12 px-4 flex items-center bg-white -ml-4 pl-6 min-w-[200px]">
                            <input
                                value={gameData.title}
                                onChange={(e) => onChangeTitle(e.target.value)}
                                className="w-full h-full outline-none font-bold text-xl bg-transparent text-center font-['Gochi_Hand']"
                                placeholder="Level Name"
                            />
                        </div>
                    </div>
                </div>

                {/* CANVAS */}
                <div ref={wrapperRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                    <div
                        className="relative bg-white shadow-[5px_5px_0px_rgba(0,0,0,0.2)] sketch-box transition-transform duration-200 origin-center"
                        style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT, transform: `scale(${scale})` }}
                        onClick={(e) => { e.stopPropagation(); setSelectedObjId(null); }}
                    >
                        {/* BACKGROUND */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                            {currentBgImage && (
                                <img src={currentBgImage} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                            )}
                        </div>

                        {/* TRASH */}
                        <div
                            className="absolute -top-8 -right-8 w-16 h-16 z-50"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('scale-125'); }}
                            onDragLeave={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('scale-125'); }}
                            onDrop={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('scale-125'); handleTrashDrop(e); }}
                        >
                            <X size={64} strokeWidth={4} className="text-red-500 drop-shadow-md cursor-pointer hover:scale-110 transition-transform" />
                        </div>

                        {/* DROP ZONE */}
                        <div
                            ref={containerRef}
                            className={`w-full h-full relative z-10 ${isDragOver ? 'bg-blue-50/20' : ''}`}
                            onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                        >
                            {levelObjects.map((obj) => {
                                // HUD WIDGET RENDER
                                if (obj.variableMonitor) {
                                    const isSelected = selectedObjId === obj.id;
                                    const v = gameData.variables?.find(v => v.id === obj.variableMonitor!.variableId);
                                    const name = v ? v.name : "???";

                                    // Calculate absolute position based on offset
                                    const monitorX = obj.x + ACTOR_SIZE / 2 + (obj.variableMonitor.offsetX || 0);
                                    const monitorY = obj.y + ACTOR_SIZE / 2 + (obj.variableMonitor.offsetY || 0);

                                    return (
                                        <div
                                            key={obj.id + "_hud"}
                                            draggable={isSelected} // Only draggable if parent is selected
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedObjId(obj.id);
                                            }}
                                            onDragStart={(e) => {
                                                e.stopPropagation();
                                                const target = e.currentTarget as HTMLElement;
                                                const rect = target.getBoundingClientRect();
                                                // We store the offset relative to the HUD element itself to keep mouse position consistent
                                                const clickOffsetX = (e.clientX - rect.left) / scale;
                                                const clickOffsetY = (e.clientY - rect.top) / scale;

                                                // We use a special ID format for HUD dragging: "HUD_PARENTID"
                                                e.dataTransfer.setData("text/plain", `HUD_${obj.id}`);
                                                e.dataTransfer.setData("clickOffsetX", clickOffsetX.toString());
                                                e.dataTransfer.setData("clickOffsetY", clickOffsetY.toString());
                                            }}
                                            className={`absolute cursor-move select-none flex flex-col items-center justify-center font-bold text-white shadow-sm z-50 group ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                                            style={{
                                                left: monitorX,
                                                top: monitorY,
                                                transform: 'translate(-50%, -50%)',
                                                minWidth: 100,
                                                padding: 4,
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                borderRadius: 8,
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {obj.variableMonitor.mode === 'TEXT' ? (
                                                <div className="text-center text-lg whitespace-nowrap">{name}: 0</div>
                                            ) : (
                                                <div className="flex flex-col gap-1 w-full">
                                                    <div className="text-[10px] uppercase">{name}</div>
                                                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 w-full"></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Delete button (on hover when selected) */}
                                            {isSelected && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: undefined } : o));
                                                    }}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors border-2 border-white opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={12} className="text-white" />
                                                </button>
                                            )}

                                            {isSelected && <div className="absolute -top-2 -left-2 bg-yellow-400 w-4 h-4 rounded-full animate-pulse"></div>}
                                        </div>
                                    );
                                }

                                const actor = getActor(obj.actorId);
                                if (!actor) return null;
                                const isSelected = selectedObjId === obj.id;
                                const objScale = obj.scale || 1.0;

                                return (
                                    <div
                                        key={obj.id}
                                        draggable="true"
                                        onClick={(e) => { e.stopPropagation(); setSelectedObjId(obj.id); }}
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            // We don't allow dragging if resizing
                                            if (resizingId) { e.preventDefault(); return; }

                                            const target = e.currentTarget as HTMLElement;
                                            const rect = target.getBoundingClientRect();
                                            const sceneOffsetX = (e.clientX - rect.left) / scale;
                                            const sceneOffsetY = (e.clientY - rect.top) / scale;
                                            if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(target, sceneOffsetX, sceneOffsetY);
                                            handleItemDragStart(e, obj.id, sceneOffsetX, sceneOffsetY);
                                        }}
                                        className={`absolute cursor-grab active:cursor-grabbing hover:z-20 group select-none ${isSelected ? 'z-30' : 'z-10'}`}
                                        style={{
                                            left: obj.x,
                                            top: obj.y,
                                            width: ACTOR_SIZE * objScale,
                                            height: ACTOR_SIZE * objScale
                                        }}
                                    >
                                        <img
                                            src={actor.imageData}
                                            alt={actor.name}
                                            className={`w-full h-full object-contain pointer-events-none drop-shadow-sm ${isSelected ? 'filter brightness-110' : ''}`}
                                        />

                                        {isSelected && (
                                            <>
                                                <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none animate-[pulse_2s_infinite]"></div>

                                                {/* RESIZE HANDLE */}
                                                <div
                                                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-md cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-50"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setResizingId(obj.id);
                                                        resizeStartRef.current = { x: e.clientX, startScale: objScale };
                                                    }}
                                                    draggable={false}
                                                >
                                                    <Maximize size={12} className="text-white" />
                                                </div>
                                            </>
                                        )}

                                        {obj.isLocked && (
                                            <div className="absolute top-0 right-0 bg-black/50 p-1 rounded-full">
                                                <Lock size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR (Tools) */}
            <div className="w-24 flex flex-col items-center pt-8 gap-6 pr-4 z-10" onClick={e => e.stopPropagation()}>

                <button onClick={onPlay} className="hover:scale-110 transition-transform" title="Play Game">
                    <Play size={50} className="text-[#d4e157] fill-[#d4e157] drop-shadow-md stroke-black stroke-[2]" />
                </button>

                <button onClick={onSave} className="hover:scale-110 transition-transform" title="Save Game">
                    <div className="bg-[#5c6bc0] p-2 rounded-md border-2 border-black shadow-md">
                        <Save size={32} className="text-white" />
                    </div>
                </button>

                <button onClick={onOpenRules} className="hover:scale-110 transition-transform" title="Open Rules">
                    <div className="bg-[#8d6e63] w-12 h-14 rounded-r-md border-2 border-black border-l-4 flex items-center justify-center shadow-md relative">
                        <div className="absolute left-1 top-2 w-6 h-1 bg-[#a1887f] border border-black/30"></div>
                        <Book size={24} className="text-white/80" />
                    </div>
                </button>

                <div className="w-full h-[2px] bg-black/10 my-2"></div>

                {/* OBJECT PROPERTIES (Dynamic Panel) */}
                {selectedInstance ? (
                    <div className="flex flex-col gap-3 items-center animate-in slide-in-from-right w-full pb-20">
                        <div className="w-full h-[2px] bg-black/10 mb-2"></div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">SELECTED</span>

                        {/* SCALE SLIDER */}
                        <div className="flex flex-col items-center w-full px-1">
                            <Maximize size={16} className="text-gray-400 mb-1" />
                            <input
                                type="range" min="0.2" max="3.0" step="0.1"
                                value={selectedInstance.scale || 1}
                                onChange={(e) => updateSelectedScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[9px] font-bold text-gray-400 mt-1">{Math.round((selectedInstance.scale || 1) * 100)}%</span>
                        </div>

                        {/* LOCK TOGGLE */}
                        <button
                            onClick={() => toggleObjectLock(selectedInstance.id)}
                            className={`p-2 rounded-full border-2 border-black shadow-sm transition-all ${selectedInstance.isLocked ? 'bg-red-100 text-red-500' : 'bg-white hover:bg-gray-100'}`}
                            title="Lock Position"
                        >
                            {selectedInstance.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                        </button>

                        {/* VARIABLE MONITOR CONFIG */}
                        <div className="w-full h-[2px] bg-black/10 my-2"></div>
                        <div className="flex flex-col gap-2 w-full px-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase text-center">HUD / MONITOR</span>

                            {!selectedInstance.variableMonitor ? (
                                <button
                                    onClick={() => {
                                        if (!gameData.variables || gameData.variables.length === 0) {
                                            alert("Create a variable first!");
                                            return;
                                        }
                                        onUpdateCurrentScene(levelObjects.map(o => o.id === selectedInstance.id ? {
                                            ...o,
                                            variableMonitor: {
                                                variableId: gameData.variables[0].id,
                                                mode: 'TEXT',
                                                maxValue: 100,
                                                offsetX: 0,
                                                offsetY: 0,
                                                textColor: '#FFFFFF',
                                                backgroundColor: '#000000',
                                                barColor: '#22c55e'
                                            }
                                        } : o));
                                    }}
                                    className="w-full py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600"
                                >
                                    ATTACH VARIABLE
                                </button>
                            ) : (
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="text-[9px] text-blue-500 font-bold text-center mb-1 animate-pulse">
                                        DRAG THE HUD ON THE ACTOR!
                                    </div>

                                    <button
                                        onClick={() => setHudConfigModal(selectedInstance.id)}
                                        className="w-full py-2 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)] text-xs font-bold rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                                    >
                                        <Settings size={14} />
                                        CONFIGURE HUD
                                    </button>

                                    <button
                                        onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === selectedInstance.id ? { ...o, variableMonitor: undefined } : o))}
                                        className="w-full py-1 bg-red-100 text-red-500 text-[10px] font-bold rounded hover:bg-red-200 mt-1"
                                    >
                                        REMOVE
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* DELETE */}
                        <button
                            onClick={deleteSelectedObject}
                            className="p-2 rounded-full border-2 border-black bg-white text-red-500 shadow-sm hover:bg-red-50 transition-all mt-2"
                            title="Delete Object"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ) : (
                    // DEFAULT TOOLS (When nothing selected)
                    <div className="flex flex-col gap-2 items-center animate-in slide-in-from-right">
                        <span className="text-[10px] font-bold text-gray-400">STAGE</span>

                        <button onClick={onEditBackground} className="sketch-btn w-10 h-10 bg-white hover:bg-purple-50" title="Draw Background">
                            <Paintbrush size={20} className="text-purple-500" />
                        </button>

                        <label className="sketch-btn w-10 h-10 bg-white hover:bg-blue-50 cursor-pointer" title="Upload Background">
                            <Upload size={20} className="text-blue-500" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                        </label>

                        {currentScene.backgroundImage && (
                            <button onClick={() => onUpdateBackground(undefined)} className="sketch-btn w-10 h-10 bg-white hover:bg-red-50" title="Clear Background">
                                <Trash2 size={20} className="text-red-500" />
                            </button>
                        )}

                        <div className="w-full h-[2px] bg-black/10 my-2"></div>

                        <button
                            onClick={() => setIsLockMode(!isLockMode)}
                            className={`hover:scale-110 transition-transform ${isLockMode ? 'opacity-100' : 'opacity-50'}`}
                            title="Auto-Lock new items"
                        >
                            {isLockMode ? <Lock size={32} /> : <Unlock size={32} />}
                        </button>

                        {/* Selected Actor Preview (Paint Brush) */}
                        <div className="mt-4 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-[3px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.2)] overflow-hidden">
                                {selectedActor ? (
                                    <img src={selectedActor.imageData} className="w-full h-full object-contain p-1" />
                                ) : (
                                    <span className="text-gray-300 text-[8px]">None</span>
                                )}
                            </div>
                            <span className="text-[8px] font-bold mt-1 text-gray-400 uppercase">BRUSH</span>
                        </div>
                    </div>
                )}
            </div>

            {/* HUD CONFIG MODAL - VISUAL EDITOR */}
            {hudConfigModal && (() => {
                const obj = levelObjects.find(o => o.id === hudConfigModal);
                if (!obj || !obj.variableMonitor) return null;

                const actor = getActor(obj.actorId);
                if (!actor) return null;

                // Global mouse move handler
                const handleGlobalMouseMove = (e: React.MouseEvent) => {
                    if (hudDragging) {
                        const deltaX = e.clientX - hudDragStartRef.current.x;
                        const deltaY = e.clientY - hudDragStartRef.current.y;
                        onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? {
                            ...o,
                            variableMonitor: {
                                ...o.variableMonitor!,
                                offsetX: (o.variableMonitor!.offsetX || 0) + deltaX,
                                offsetY: (o.variableMonitor!.offsetY || 0) + deltaY
                            }
                        } : o));
                        hudDragStartRef.current = { x: e.clientX, y: e.clientY };
                    } else if (hudResizing) {
                        const deltaX = e.clientX - hudDragStartRef.current.x;
                        const deltaY = e.clientY - hudDragStartRef.current.y;
                        onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? {
                            ...o,
                            variableMonitor: {
                                ...o.variableMonitor!,
                                width: Math.max(20, (o.variableMonitor!.width || 100) + deltaX),
                                height: Math.max(4, (o.variableMonitor!.height || 16) + deltaY)
                            }
                        } : o));
                        hudDragStartRef.current = { x: e.clientX, y: e.clientY };
                    }
                };

                return (
                    <div
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                        onMouseMove={handleGlobalMouseMove}
                        onMouseUp={() => {
                            setHudDragging(false);
                            setHudResizing(false);
                        }}
                    >
                        <div className="bg-white rounded-xl border-[4px] border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-w-2xl w-full">
                            {/* HEADER */}
                            <div className="bg-gray-100 p-4 border-b-2 border-black flex justify-between items-center">
                                <h2 className="font-black text-xl uppercase flex items-center gap-2">
                                    <Settings className="w-6 h-6" />
                                    HUD VISUAL EDITOR
                                </h2>
                                <button onClick={() => setHudConfigModal(null)} className="hover:bg-gray-200 p-1 rounded">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* CONTROLS */}
                            <div className="p-4 border-b-2 border-black bg-gray-50 flex flex-wrap gap-4">
                                {/* VARIABLE SELECT */}
                                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                    <label className="font-bold text-xs text-gray-500">VARIABLE</label>
                                    <select
                                        value={obj.variableMonitor.variableId}
                                        onChange={(e) => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, variableId: e.target.value } } : o))}
                                        className="w-full p-2 border-2 border-gray-300 rounded font-bold"
                                    >
                                        {gameData.variables?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>

                                {/* MODE TOGGLE */}
                                <div className="flex flex-col gap-1">
                                    <label className="font-bold text-xs text-gray-500">STYLE</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, mode: 'TEXT' } } : o))}
                                            className={`px-4 py-2 border-2 border-black rounded font-bold shadow-sm ${obj.variableMonitor.mode === 'TEXT' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            TEXT
                                        </button>
                                        <button
                                            onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, mode: 'BAR' } } : o))}
                                            className={`px-4 py-2 border-2 border-black rounded font-bold shadow-sm ${obj.variableMonitor.mode === 'BAR' ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            BAR
                                        </button>
                                    </div>
                                </div>

                                {/* DISPLAY MODE */}
                                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                    <label className="font-bold text-xs text-gray-500">DISPLAY</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, displayMode: 'ALWAYS_VISIBLE' } } : o))}
                                            className={`flex-1 px-2 py-2 border-2 border-black rounded font-bold shadow-sm text-xs ${(obj.variableMonitor.displayMode === 'ALWAYS_VISIBLE' || !obj.variableMonitor.displayMode) ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            VISIBLE
                                        </button>
                                        <button
                                            onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, displayMode: 'POPUP' } } : o))}
                                            className={`flex-1 px-2 py-2 border-2 border-black rounded font-bold shadow-sm text-xs ${obj.variableMonitor.displayMode === 'POPUP' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            POPUP
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* VISUAL EDITOR */}
                            <div className="p-6 flex flex-col items-center gap-4">
                                <div className="text-sm font-bold text-gray-500 text-center">
                                    🖱️ Drag to move • Drag corners to resize
                                </div>

                                {/* PREVIEW AREA */}
                                <div
                                    className="relative border-4 border-black rounded-lg overflow-hidden bg-gray-100"
                                    style={{ width: '400px', height: '400px' }}
                                >
                                    {/* ACTOR SPRITE */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <img src={actor.imageData} className="w-32 h-32 object-contain opacity-40" />
                                    </div>

                                    {/* HUD ELEMENT */}
                                    {(obj.variableMonitor.displayMode === 'ALWAYS_VISIBLE' || !obj.variableMonitor.displayMode) && (
                                        <div
                                            className="absolute cursor-move border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                                            style={{
                                                left: 200 + (obj.variableMonitor.offsetX || 0),
                                                top: 200 + (obj.variableMonitor.offsetY || 0),
                                                width: obj.variableMonitor.width || 100,
                                                height: obj.variableMonitor.mode === 'BAR' ? (obj.variableMonitor.height || 16) : 'auto',
                                                minHeight: obj.variableMonitor.mode === 'TEXT' ? '24px' : undefined,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setHudDragging(true);
                                                hudDragStartRef.current = { x: e.clientX, y: e.clientY };
                                            }}
                                        >
                                            {/* HUD CONTENT PREVIEW */}
                                            <div className="p-2 flex items-center justify-center font-bold text-xs text-gray-700">
                                                {obj.variableMonitor.mode === 'BAR' ? 'BAR' : 'TEXT'}
                                            </div>

                                            {/* RESIZE HANDLES */}
                                            {obj.variableMonitor.mode === 'BAR' && (
                                                <>
                                                    {/* Bottom-right corner */}
                                                    <div
                                                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            setHudResizing(true);
                                                            hudDragStartRef.current = { x: e.clientX, y: e.clientY };
                                                        }}
                                                    ></div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* TOGGLES */}
                                {(obj.variableMonitor.displayMode === 'ALWAYS_VISIBLE' || !obj.variableMonitor.displayMode) && (
                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, showLabel: !(o.variableMonitor!.showLabel ?? true) } } : o))}
                                                className={`px-4 py-2 border-2 border-black rounded font-bold text-xs ${(obj.variableMonitor.showLabel ?? true) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                            >
                                                {(obj.variableMonitor.showLabel ?? true) ? '✓' : '✗'} SHOW LABEL
                                            </button>
                                            <button
                                                onClick={() => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, showBackground: !(o.variableMonitor!.showBackground ?? true) } } : o))}
                                                className={`px-4 py-2 border-2 border-black rounded font-bold text-xs ${(obj.variableMonitor.showBackground ?? true) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                            >
                                                {(obj.variableMonitor.showBackground ?? true) ? '✓' : '✗'} SHOW BG
                                            </button>
                                        </div>

                                        {/* MAX VALUE (for BAR mode) */}
                                        {obj.variableMonitor.mode === 'BAR' && (
                                            <div className="flex flex-col gap-1">
                                                <label className="font-bold text-xs text-gray-500">MAX VALUE</label>
                                                <input
                                                    type="number"
                                                    value={obj.variableMonitor.maxValue || 100}
                                                    onChange={(e) => onUpdateCurrentScene(levelObjects.map(o => o.id === obj.id ? { ...o, variableMonitor: { ...o.variableMonitor!, maxValue: parseInt(e.target.value) || 100 } } : o))}
                                                    className="w-full p-2 border-2 border-gray-300 rounded font-bold"
                                                    min="1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* FOOTER */}
                            <div className="p-4 border-t-2 border-black bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setHudConfigModal(null)}
                                    className="px-6 py-2 bg-black text-white font-bold rounded hover:bg-gray-800 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all"
                                >
                                    DONE
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
