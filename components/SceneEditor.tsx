
import React, { useState, useRef, useEffect } from 'react';
import { GameData, LevelObject, Actor, Scene } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trash2, Play, Save, Book, Lock, Unlock, X, Image as ImageIcon, Paintbrush, Upload, Maximize, Move } from 'lucide-react';

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
    e.stopPropagation();
    setIsDragOver(false);

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = (e.clientX - rect.left) / scale;
    const clientY = (e.clientY - rect.top) / scale;
    const type = e.dataTransfer.getData("type");

    if (type === "MOVE_EXISTING") {
        const objId = e.dataTransfer.getData("levelObjectId");
        const offX = parseFloat(e.dataTransfer.getData("dragOffsetX")) || 0;
        const offY = parseFloat(e.dataTransfer.getData("dragOffsetY")) || 0;

        let newX = clientX - offX;
        let newY = clientY - offY;

        // Snap / Bounds
        // Note: We don't strictly clamp max bounds here to allow moving large objects partially offscreen
        newX = Math.max(-ACTOR_SIZE, Math.min(newX, SCENE_WIDTH));
        newY = Math.max(-ACTOR_SIZE, Math.min(newY, SCENE_HEIGHT));

        const newLevel = levelObjects.map(obj => {
            if (obj.id === objId) return { ...obj, x: newX, y: newY };
            return obj;
        });
        onUpdateCurrentScene(newLevel);
    } 
    else {
        const actorId = e.dataTransfer.getData("actorId");
        if (actorId) {
            let x = clientX - (ACTOR_SIZE / 2);
            let y = clientY - (ACTOR_SIZE / 2);
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

  return (
    <div className="flex w-full h-full overflow-hidden" onClick={() => setSelectedObjId(null)}>
        
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
                        <img src={gameData.actors[0].imageData} className="w-full h-full object-contain p-1" alt="Hero"/>
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
                         <img src={currentBgImage} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }}/>
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
              <div className="flex flex-col gap-3 items-center animate-in slide-in-from-right w-full">
                   <div className="w-full h-[2px] bg-black/10 mb-2"></div>
                   <span className="text-[10px] font-bold text-blue-500 uppercase">SELECTED</span>
                   
                   {/* SCALE SLIDER */}
                   <div className="flex flex-col items-center w-full px-1">
                       <Maximize size={16} className="text-gray-400 mb-1"/>
                       <input 
                           type="range" min="0.2" max="3.0" step="0.1"
                           value={selectedInstance.scale || 1}
                           onChange={(e) => updateSelectedScale(parseFloat(e.target.value))}
                           className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                       />
                       <span className="text-[9px] font-bold text-gray-400 mt-1">{Math.round((selectedInstance.scale || 1)*100)}%</span>
                   </div>

                   {/* LOCK TOGGLE */}
                   <button 
                        onClick={() => toggleObjectLock(selectedInstance.id)}
                        className={`p-2 rounded-full border-2 border-black shadow-sm transition-all ${selectedInstance.isLocked ? 'bg-red-100 text-red-500' : 'bg-white hover:bg-gray-100'}`}
                        title="Lock Position"
                   >
                       {selectedInstance.isLocked ? <Lock size={20}/> : <Unlock size={20}/>}
                   </button>

                   {/* DELETE */}
                   <button 
                        onClick={deleteSelectedObject}
                        className="p-2 rounded-full border-2 border-black bg-white text-red-500 shadow-sm hover:bg-red-50 transition-all"
                        title="Delete Object"
                   >
                       <Trash2 size={20}/>
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
                    <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload}/>
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
    </div>
  );
};
