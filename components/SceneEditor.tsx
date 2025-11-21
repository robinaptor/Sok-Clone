import React, { useState, useRef, useEffect } from 'react';
import { GameData, LevelObject, Actor, Scene } from '../types';
import { SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from '../constants';
import { Trash2, Play, Save, Book, Lock, Unlock, X, Image as ImageIcon, Paintbrush, Upload } from 'lucide-react';

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
  onEditBackground: () => void; // NEW
  onUpdateBackground: (bgImage: string | undefined) => void; // NEW for upload/clear
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
  const [isLockMode, setIsLockMode] = useState(false); // Controls if new items are locked
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Get current level objects
  const currentScene = gameData.scenes.find(s => s.id === currentSceneId) || gameData.scenes[0];
  const levelObjects = currentScene.objects;

  // --- Auto-Scale Logic to keep Canvas fully visible ---
  useEffect(() => {
    const handleResize = () => {
        if (wrapperRef.current) {
            const availableWidth = wrapperRef.current.clientWidth - 40; // padding
            const availableHeight = wrapperRef.current.clientHeight - 40;
            
            const scaleX = availableWidth / SCENE_WIDTH;
            const scaleY = availableHeight / SCENE_HEIGHT;
            
            // Fit containment
            setScale(Math.min(scaleX, scaleY, 1)); 
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    
    // Little delay to allow layout to settle
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to find actor data
  const getActor = (actorId: string) => gameData.actors.find(a => a.id === actorId);
  const selectedActor = selectedActorId ? getActor(selectedActorId) : null;

  // --- Drag & Drop Logic ---

  const handleItemDragStart = (e: React.DragEvent, objId: string, offsetX: number, offsetY: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move"; 
    e.dataTransfer.setData("type", "MOVE_EXISTING");
    e.dataTransfer.setData("levelObjectId", objId);
    // We store the INTERNAL offset (e.g. 0-80px) directly
    e.dataTransfer.setData("dragOffsetX", offsetX.toString());
    e.dataTransfer.setData("dragOffsetY", offsetY.toString());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Mouse position converted to INTERNAL SCENE COORDINATES
    const clientX = (e.clientX - rect.left) / scale;
    const clientY = (e.clientY - rect.top) / scale;

    const type = e.dataTransfer.getData("type");

    if (type === "MOVE_EXISTING") {
        const objId = e.dataTransfer.getData("levelObjectId");
        // Offset is already in internal pixels (from dragStart), no need to scale
        const offX = parseFloat(e.dataTransfer.getData("dragOffsetX")) || 0;
        const offY = parseFloat(e.dataTransfer.getData("dragOffsetY")) || 0;

        let newX = clientX - offX;
        let newY = clientY - offY;

        newX = Math.max(0, Math.min(newX, SCENE_WIDTH - ACTOR_SIZE));
        newY = Math.max(0, Math.min(newY, SCENE_HEIGHT - ACTOR_SIZE));

        const newLevel = levelObjects.map(obj => {
            if (obj.id === objId) return { ...obj, x: newX, y: newY };
            return obj;
        });
        onUpdateCurrentScene(newLevel);
    } 
    else {
        // New item from sidebar
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
                isLocked: isLockMode // Apply current lock state
            };
            onUpdateCurrentScene([...levelObjects, newObj]);
        }
    }
  };

  const toggleObjectLock = (objId: string) => {
      const newLevel = levelObjects.map(obj => {
          if (obj.id === objId) return { ...obj, isLocked: !obj.isLocked };
          return obj;
      });
      onUpdateCurrentScene(newLevel);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
  };

  const handleTrashDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData("type");
      if (type === "MOVE_EXISTING") {
          const objId = e.dataTransfer.getData("levelObjectId");
          onUpdateCurrentScene(levelObjects.filter(obj => obj.id !== objId));
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

  // --- Background Animation Preview Logic ---
  const [bgFrameIdx, setBgFrameIdx] = useState(0);
  useEffect(() => {
      if (currentScene.backgroundFrames && currentScene.backgroundFrames.length > 1) {
          const interval = setInterval(() => {
              setBgFrameIdx(curr => (curr + 1) % currentScene.backgroundFrames!.length);
          }, 500); // Slow BG animation for preview
          return () => clearInterval(interval);
      } else {
          setBgFrameIdx(0);
      }
  }, [currentScene.backgroundFrames]);

  const currentBgImage = currentScene.backgroundFrames?.[bgFrameIdx] || currentScene.backgroundImage;

  return (
    <div className="flex w-full h-full overflow-hidden">
        
      {/* LEFT SIDEBAR (Tabs) */}
      <div className="w-16 flex flex-col gap-2 pt-8 pl-2 z-10 h-full overflow-y-auto pb-20">
         {gameData.scenes.map((scene, index) => (
             <button
                key={scene.id}
                onClick={() => onSwitchScene(scene.id)}
                className={`w-12 h-12 border-2 border-black flex items-center justify-center font-bold text-2xl rounded-l-lg shadow-md cursor-pointer transition-all relative left-2
                ${currentSceneId === scene.id 
                    ? 'bg-[#ffcc80] w-14 hover:w-14' // Active: Orange, sticks out
                    : 'bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600'} 
                `}
             >
                 {index + 1}
             </button>
         ))}
         
         {/* ADD SCENE BUTTON */}
         <button 
            onClick={onAddScene}
            className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-bold text-2xl rounded-l-lg shadow-sm cursor-pointer hover:bg-green-50 text-gray-400 hover:text-green-500 ml-2"
            title="Add New Scene"
         >
            +
         </button>
      </div>

      {/* CENTER AREA (Canvas + Header) */}
      <div className="flex-1 flex flex-col relative">
          
          {/* TOP HEADER (Hero Face + Title) */}
          <div className="h-16 flex items-center justify-center relative z-20 -mb-4 pointer-events-none">
             <div className="pointer-events-auto flex items-center">
                 {/* Hero Avatar Circle */}
                 <div className="w-16 h-16 rounded-full bg-white border-[3px] border-black overflow-hidden relative z-10 shadow-md">
                    {gameData.actors[0] && (
                        <img src={gameData.actors[0].imageData} className="w-full h-full object-contain p-1" alt="Hero"/>
                    )}
                 </div>
                 {/* Title Box */}
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

          {/* CANVAS WRAPPER */}
          <div ref={wrapperRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div 
                className="relative bg-white shadow-[5px_5px_0px_rgba(0,0,0,0.2)] sketch-box transition-transform duration-200 origin-center"
                style={{
                    width: SCENE_WIDTH,
                    height: SCENE_HEIGHT,
                    transform: `scale(${scale})`
                }}
              >
                {/* BACKGROUND LAYER */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    {currentBgImage && (
                         <img 
                            src={currentBgImage} 
                            className="w-full h-full object-cover" 
                            alt="Scene Background"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    )}
                </div>

                {/* TRASH BUTTON (Top Right of Canvas) */}
                <div 
                    className="absolute -top-8 -right-8 w-16 h-16 z-50"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('scale-125'); }}
                    onDragLeave={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('scale-125'); }}
                    onDrop={(e) => { e.stopPropagation(); e.currentTarget.classList.remove('scale-125'); handleTrashDrop(e); }}
                >
                    <X size={64} strokeWidth={4} className="text-red-500 drop-shadow-md cursor-pointer hover:scale-110 transition-transform" />
                </div>

                {/* THE DROP ZONE */}
                <div 
                    ref={containerRef}
                    className={`w-full h-full relative overflow-hidden z-10 ${isDragOver ? 'bg-blue-50/20' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    {levelObjects.map((obj) => {
                        const actor = getActor(obj.actorId);
                        if (!actor) return null;
                        return (
                            <div 
                                key={obj.id}
                                draggable="true"
                                onClick={() => toggleObjectLock(obj.id)}
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    const target = e.currentTarget as HTMLElement;
                                    const rect = target.getBoundingClientRect();
                                    
                                    // Calculate Offset in SCENE space (unscaled)
                                    const screenOffsetX = e.clientX - rect.left;
                                    const screenOffsetY = e.clientY - rect.top;
                                    
                                    const sceneOffsetX = screenOffsetX / scale;
                                    const sceneOffsetY = screenOffsetY / scale;

                                    if (e.dataTransfer.setDragImage) {
                                         e.dataTransfer.setDragImage(target, sceneOffsetX, sceneOffsetY);
                                    }

                                    handleItemDragStart(e, obj.id, sceneOffsetX, sceneOffsetY);
                                }}
                                className="absolute cursor-grab active:cursor-grabbing hover:scale-105 transition-transform hover:z-10 group"
                                style={{
                                    left: obj.x,
                                    top: obj.y,
                                    width: ACTOR_SIZE,
                                    height: ACTOR_SIZE
                                }}
                            >
                                <img 
                                    src={actor.imageData} 
                                    alt={actor.name}
                                    className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
                                />
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
      <div className="w-24 flex flex-col items-center pt-8 gap-6 pr-4 z-10">
          
          {/* Play */}
          <button onClick={onPlay} className="hover:scale-110 transition-transform" title="Play Game">
             <Play size={50} className="text-[#d4e157] fill-[#d4e157] drop-shadow-md stroke-black stroke-[2]" />
          </button>
          
          {/* Save */}
          <button onClick={onSave} className="hover:scale-110 transition-transform" title="Save Game">
             <div className="bg-[#5c6bc0] p-2 rounded-md border-2 border-black shadow-md">
                 <Save size={32} className="text-white" />
             </div>
          </button>

          {/* Rules Book */}
          <button onClick={onOpenRules} className="hover:scale-110 transition-transform" title="Open Rules">
              <div className="bg-[#8d6e63] w-12 h-14 rounded-r-md border-2 border-black border-l-4 flex items-center justify-center shadow-md relative">
                  <div className="absolute left-1 top-2 w-6 h-1 bg-[#a1887f] border border-black/30"></div>
                  <Book size={24} className="text-white/80" />
              </div>
          </button>

          {/* SEPARATOR */}
          <div className="w-full h-[2px] bg-black/10 my-2"></div>

          {/* BACKGROUND TOOLS */}
          <div className="flex flex-col gap-2 items-center">
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
          </div>

          {/* SEPARATOR */}
          <div className="w-full h-[2px] bg-black/10 my-2"></div>

          {/* Lock Toggle (for placing items) */}
          <button 
            onClick={() => setIsLockMode(!isLockMode)}
            className={`hover:scale-110 transition-transform ${isLockMode ? 'opacity-100' : 'opacity-50'}`}
            title={isLockMode ? "New items will be LOCKED (Fixed)" : "New items will be MOVABLE"}
          >
              {isLockMode ? <Lock size={32} /> : <Unlock size={32} />}
          </button>

          {/* Selected Object Preview Box */}
          <div className="mt-auto mb-20 flex flex-col items-center">
              <div className="w-20 h-20 bg-white border-[3px] border-black rounded-lg flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,0.2)] relative overflow-hidden">
                  {selectedActor ? (
                      <>
                        <img src={selectedActor.imageData} className="w-full h-full object-contain p-2 animate-[wiggle_1s_ease-in-out_infinite]" />
                        {isLockMode && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><Lock className="text-black/50"/></div>}
                      </>
                  ) : (
                      <span className="text-gray-300 text-xs text-center">Select Object</span>
                  )}
              </div>
              <span className="text-xs font-bold mt-1 opacity-50">{isLockMode ? 'FIXED' : 'DRAGGABLE'}</span>
          </div>

      </div>
    </div>
  );
};