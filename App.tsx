import React, { useState, useEffect } from 'react';
import { Actor, GameData, Rule, ToolMode, LevelObject, Sound } from './types';
import { INITIAL_GAME_DATA, CANVAS_SIZE, DEFAULT_HERO, SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from './constants';
import { SpriteEditor } from './components/SpriteEditor';
import { SceneEditor } from './components/SceneEditor';
import { RuleEditor } from './components/RuleEditor';
import { GamePlayer } from './components/GamePlayer';
import { ProjectManager } from './components/ProjectManager';
import { generateGameIdea } from './services/geminiService';
import { Sparkles, Plus, Download, Upload, FileUp, FileDown, Home, Save } from 'lucide-react';

const App: React.FC = () => {
  // Default to PROJECTS view (Home Screen)
  const [view, setView] = useState<ToolMode>(ToolMode.PROJECTS);
  
  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const [selectedActorId, setSelectedActorId] = useState<string>(gameData.actors[0]?.id || '');
  const [currentSceneId, setCurrentSceneId] = useState<string>(INITIAL_GAME_DATA.scenes[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [savedProjects, setSavedProjects] = useState<GameData[]>([]);

  // --- STORAGE LOGIC ---
  useEffect(() => {
    // Load project list on mount
    const stored = localStorage.getItem('sok_maker_projects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // MIGRATION: Ensure all projects have sounds array
        const migrated = parsed.map((p: any) => ({
            ...p,
            sounds: p.sounds || []
        }));
        setSavedProjects(migrated);
      } catch (e) { console.error("Failed to load projects", e); }
    }
  }, []);

  const saveProjectToStorage = (dataToSave: GameData) => {
    const updatedProject = { ...dataToSave, lastModified: Date.now() };
    
    const existingIdx = savedProjects.findIndex(p => p.id === updatedProject.id);
    let newProjects = [...savedProjects];
    
    if (existingIdx >= 0) {
      newProjects[existingIdx] = updatedProject;
    } else {
      newProjects.push(updatedProject);
    }

    setSavedProjects(newProjects);
    localStorage.setItem('sok_maker_projects', JSON.stringify(newProjects));
    setGameData(updatedProject); // Update state to reflect saved time
  };

  const deleteProject = (id: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;
    const newProjects = savedProjects.filter(p => p.id !== id);
    setSavedProjects(newProjects);
    localStorage.setItem('sok_maker_projects', JSON.stringify(newProjects));
  };

  const handleNewProject = () => {
    const newProject: GameData = {
      ...INITIAL_GAME_DATA,
      id: Math.random().toString(36).substr(2, 9),
      lastModified: Date.now(),
      // Fresh unique IDs for default data
      actors: [{ ...DEFAULT_HERO, id: Math.random().toString(36).substr(2, 9) }],
      scenes: [{ id: 'scene_1', objects: [] }],
      rules: [],
      sounds: []
    };
    // Reset selection
    setGameData(newProject);
    setSelectedActorId(newProject.actors[0].id);
    setCurrentSceneId(newProject.scenes[0].id);
    setView(ToolMode.DRAW);
  };

  const handleLoadProject = (project: GameData) => {
    // Ensure legacy projects have sounds
    const loadedData = { ...project, sounds: project.sounds || [] };
    setGameData(loadedData);
    setSelectedActorId(loadedData.actors[0]?.id || '');
    setCurrentSceneId(loadedData.scenes[0]?.id || 'scene_1');
    setView(ToolMode.SCENE);
  };

  const handleGoHome = () => {
    // Auto-save on exit if current project exists
    if (view !== ToolMode.PROJECTS) {
       saveProjectToStorage(gameData);
    }
    setView(ToolMode.PROJECTS);
  };

  // --- ACTOR LOGIC ---
  const addActor = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    
    const newActor: Actor = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Thing ${gameData.actors.length + 1}`,
      imageData: canvas.toDataURL()
    };
    setGameData({ ...gameData, actors: [...gameData.actors, newActor] });
    setSelectedActorId(newActor.id);
    if (view !== ToolMode.DRAW) setView(ToolMode.DRAW);
  };

  const updateActor = (updated: Actor) => {
    setGameData({
      ...gameData,
      actors: gameData.actors.map(a => a.id === updated.id ? updated : a)
    });
  };

  const deleteActor = (id: string) => {
    if (gameData.actors.length <= 1) return; // Keep at least one
    setGameData({
      ...gameData,
      actors: gameData.actors.filter(a => a.id !== id),
      scenes: gameData.scenes.map(scene => ({
          ...scene,
          objects: scene.objects.filter(obj => obj.actorId !== id)
      })),
      rules: gameData.rules.filter(r => r.subjectId !== id && r.objectId !== id)
    });
    if (selectedActorId === id) setSelectedActorId(gameData.actors[0].id);
  };

  // --- SCENE LOGIC ---
  const addScene = () => {
      const newId = `scene_${gameData.scenes.length + 1}`;
      setGameData({
          ...gameData,
          scenes: [...gameData.scenes, { id: newId, objects: [] }]
      });
      setCurrentSceneId(newId);
  };

  const updateCurrentSceneLevel = (objects: LevelObject[]) => {
      setGameData({
          ...gameData,
          scenes: gameData.scenes.map(s => s.id === currentSceneId ? { ...s, objects } : s)
      });
  };

  const handleNextScene = () => {
      const currentIndex = gameData.scenes.findIndex(s => s.id === currentSceneId);
      if (currentIndex >= 0 && currentIndex < gameData.scenes.length - 1) {
          setCurrentSceneId(gameData.scenes[currentIndex + 1].id);
      } else {
          setCurrentSceneId(gameData.scenes[0].id);
      }
  };

  const updateRules = (rules: Rule[]) => setGameData({ ...gameData, rules });
  const updateSounds = (sounds: Sound[]) => setGameData({ ...gameData, sounds }); // NEW
  const updateTitle = (title: string) => setGameData({ ...gameData, title });

  // --- AI ---
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const generated = await generateGameIdea(prompt);
    if (generated) {
      const newProject: GameData = {
        ...gameData, // Keep ID
        title: generated.title || "My Story",
        actors: generated.actors || [DEFAULT_HERO],
        rules: generated.rules || [],
        scenes: generated.scenes || [{ id: 'scene_1', objects: [] }],
        sounds: []
      };
      setGameData(newProject);
      setSelectedActorId(newProject.actors?.[0]?.id || '');
      if (newProject.scenes && newProject.scenes.length > 0) {
          setCurrentSceneId(newProject.scenes[0].id);
      }
      setView(ToolMode.SCENE);
    }
    setIsGenerating(false);
    setPrompt('');
  };

  // --- EXPORT ---
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameData));
    const el = document.createElement('a');
    el.setAttribute("href", dataStr);
    el.setAttribute("download", gameData.title.replace(/\s+/g, '_') + ".sok.json");
    document.body.appendChild(el);
    el.click();
    el.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          if (!data.scenes && data.level) {
              data.scenes = [{ id: 'scene_1', objects: data.level }];
          }
          // Assign a new random ID to avoid conflict with existing local projects
          data.id = Math.random().toString(36).substr(2, 9);
          handleLoadProject(data);
          saveProjectToStorage(data); // Auto-save imported project
        } catch (err) { alert("Bad file"); }
      };
      reader.readAsText(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, actorId: string) => {
    e.dataTransfer.setData("actorId", actorId);
    e.dataTransfer.setData("type", "NEW_FROM_BAR");
    if (view !== ToolMode.RULES && view !== ToolMode.SCENE) {
        setView(ToolMode.SCENE);
    }
  };

  // --- RENDER VIEWS ---

  if (view === ToolMode.PROJECTS) {
    return (
      <ProjectManager 
        savedProjects={savedProjects}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
        onDeleteProject={deleteProject}
      />
    );
  }

  if (view === ToolMode.PLAY) {
    return (
        <GamePlayer 
            gameData={gameData} 
            currentSceneId={currentSceneId} 
            onExit={() => setView(ToolMode.SCENE)} 
            onNextScene={handleNextScene}
        />
    );
  }

  const Tab = ({ mode, label }: { mode: ToolMode, label: string }) => (
    <button
      onClick={() => setView(mode)}
      className={`
        px-6 py-2 text-xl font-bold border-x-2 border-t-2 border-black rounded-t-xl mx-1 transition-all relative top-[3px] z-10
        ${view === mode 
          ? 'bg-white pb-3 rotate-0 translate-y-0 shadow-sm' 
          : 'bg-gray-200 text-gray-500 hover:bg-gray-100 rotate-1 translate-y-1'}
      `}
      style={{ borderRadius: '12px 12px 0 0' }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-[#fdfbf7] text-black font-['Gochi_Hand'] overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 px-4 flex items-center justify-between border-b-[3px] border-black bg-white relative z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          {/* HOME BUTTON */}
          <button onClick={handleGoHome} className="hover:scale-110 transition-transform" title="Back to Projects">
              <div className="bg-gray-200 p-2 rounded-full border-2 border-black">
                  <Home size={20} />
              </div>
          </button>

          <h1 className="text-3xl font-bold tracking-widest rotate-[-2deg] ml-2 underline decoration-wavy decoration-pink-300 hidden md:block">SOK-CLONE</h1>
          
          <div className="hidden md:flex items-center sketch-box px-3 py-0.5 bg-yellow-50 ml-4 h-10 rotate-1">
            <Sparkles size={18} className="text-purple-500 mr-2 animate-pulse" />
            <input 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder={isGenerating ? "Dreaming..." : "Tell me a game idea..."}
                disabled={isGenerating}
                className="bg-transparent outline-none w-64 text-lg placeholder-gray-400 font-['Gochi_Hand']"
            />
          </div>
        </div>

        <div className="flex gap-3 mr-2 items-center">
            {/* QUICK SAVE BTN */}
            <button 
                onClick={() => { saveProjectToStorage(gameData); alert("Project Saved!"); }} 
                className="sketch-btn w-10 h-10 bg-blue-100 flex items-center justify-center" 
                title="Save to My Projects"
            >
                <Save size={20} className="text-blue-600" />
            </button>

            <div className="h-6 w-[2px] bg-gray-300 mx-1"></div>

            <label className="cursor-pointer w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center" title="Import JSON">
                <FileUp size={24} />
                <input type="file" onChange={handleImport} className="hidden" accept=".json" />
            </label>
            <button onClick={handleExport} className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center" title="Export JSON">
                <FileDown size={24} />
            </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex px-6 border-b-[3px] border-black bg-[#e5e5e5] pt-3 shrink-0">
        <Tab mode={ToolMode.DRAW} label="Draw" />
        <Tab mode={ToolMode.SCENE} label="Place" />
        <Tab mode={ToolMode.RULES} label="Rules" />
      </div>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 relative bg-[#fdfbf7] overflow-hidden flex flex-col">
         <div 
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }} 
         />

         <div className="flex-1 w-full h-full overflow-hidden relative pb-32 z-10">
            {view === ToolMode.DRAW && selectedActorId && (
                <SpriteEditor 
                    actor={gameData.actors.find(a => a.id === selectedActorId)!}
                    onUpdate={updateActor}
                    onDelete={deleteActor}
                    isHero={selectedActorId === 'hero'}
                />
            )}
            {view === ToolMode.SCENE && (
                <SceneEditor 
                    gameData={gameData}
                    currentSceneId={currentSceneId}
                    onSwitchScene={setCurrentSceneId}
                    onAddScene={addScene}
                    onUpdateCurrentScene={updateCurrentSceneLevel}
                    selectedActorId={selectedActorId}
                    onPlay={() => setView(ToolMode.PLAY)}
                    onSave={() => { saveProjectToStorage(gameData); alert("Project Saved!"); }}
                    onOpenRules={() => setView(ToolMode.RULES)}
                    onChangeTitle={updateTitle}
                />
            )}
            {view === ToolMode.RULES && (
                <div className="h-full overflow-hidden p-4">
                    <RuleEditor 
                        gameData={gameData} 
                        onUpdateRules={updateRules} 
                        onUpdateSounds={updateSounds} 
                        currentSceneId={currentSceneId} 
                    />
                </div>
            )}
         </div>
      </main>

      {/* BOTTOM ACTOR STRIP */}
      <div className="h-32 bg-[#ffbad2] border-t-[4px] border-black flex items-center px-6 gap-6 absolute bottom-0 w-full z-30 overflow-x-auto shadow-[0px_-4px_15px_rgba(0,0,0,0.1)]">
          <button 
            onClick={addActor}
            className="h-24 w-24 flex flex-col items-center justify-center bg-white border-[3px] border-black rounded-2xl hover:bg-gray-50 flex-shrink-0 shadow-md transform hover:-rotate-3 transition-transform group"
          >
              <Plus size={48} className="text-gray-400 group-hover:text-black transition-colors" />
              <span className="text-sm font-bold text-gray-400 group-hover:text-black">NEW</span>
          </button>

          <div className="h-20 w-[3px] bg-black/10 rounded-full mx-2" />

          {gameData.actors.map(actor => (
              <button
                key={actor.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, actor.id)}
                onClick={() => {
                    setSelectedActorId(actor.id);
                    if(view === ToolMode.RULES) return; 
                    setView(ToolMode.DRAW);
                }}
                className={`
                    relative h-24 w-24 bg-white border-[3px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 overflow-hidden cursor-grab active:cursor-grabbing
                    ${selectedActorId === actor.id && view !== ToolMode.RULES
                        ? 'border-black shadow-[6px_6px_0px_0px_black] -translate-y-3 rotate-[-2deg]' 
                        : 'border-black/40 hover:border-black hover:-translate-y-1 hover:rotate-1'}
                `}
              >
                  <img 
                    src={actor.imageData} 
                    alt={actor.name}
                    className="w-full h-full object-contain p-1 pointer-events-none"
                  />
                  
                  {selectedActorId === actor.id && view !== ToolMode.RULES && (
                      <div className="absolute -top-4 -right-2 bg-yellow-300 text-black text-sm font-bold px-3 py-1 border-2 border-black rounded-full rotate-12 shadow-sm z-10">
                          EDIT
                      </div>
                  )}
              </button>
          ))}
          <div className="w-10 flex-shrink-0"></div>
      </div>

    </div>
  );
};

export default App;