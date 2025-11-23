
import React, { useState, useEffect } from 'react';
import { Actor, GameData, Rule, ToolMode, LevelObject, Sound, GlobalVariable } from './types';
import { INITIAL_GAME_DATA, CANVAS_SIZE, DEFAULT_HERO, SCENE_WIDTH, SCENE_HEIGHT, ACTOR_SIZE } from './constants';
import { SpriteEditor } from './components/SpriteEditor';
import { SceneEditor } from './components/SceneEditor';
import { RuleEditor } from './components/RuleEditor';
import { GamePlayer } from './components/GamePlayer';
import { ProjectManager } from './components/ProjectManager';
import { HelpSection } from './components/HelpSection';
import { CreationWizard } from './components/CreationWizard';
import { ContextualHelp } from './components/ContextualHelp';
import { TutorialOverlay } from './components/TutorialOverlay';
import { generateGameIdea, generateActor } from './services/geminiService';
import { Sparkles, Plus, Download, Upload, FileUp, FileDown, Home, Save, ChevronUp, Paintbrush, Wand2 } from 'lucide-react';

const App: React.FC = () => {
  // Default to PROJECTS view (Home Screen)
  const [view, setView] = useState<ToolMode>(ToolMode.PROJECTS);

  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const [selectedActorId, setSelectedActorId] = useState<string>(gameData.actors[0]?.id || '');
  const [currentSceneId, setCurrentSceneId] = useState<string>(INITIAL_GAME_DATA.scenes[0].id);

  // New state to track if we are editing a scene background instead of an actor
  const [editingSceneBackgroundId, setEditingSceneBackgroundId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [savedProjects, setSavedProjects] = useState<GameData[]>([]);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [showContextualHelp, setShowContextualHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const [history, setHistory] = useState<GameData[]>([]);
  const [future, setFuture] = useState<GameData[]>([]);

  // --- UNDO / REDO LOGIC ---
  const updateGameData = (update: React.SetStateAction<GameData>, addToHistory = true) => {
    if (addToHistory) {
      setHistory(prev => [...prev, gameData]);
      setFuture([]); // Clear redo stack on new action
    }
    setGameData(update);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture(prev => [gameData, ...prev]);
    setHistory(newHistory);
    setGameData(previous);

    // Also update selection if needed? Maybe not strictly necessary but good UX
    // For now, keep it simple.
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory(prev => [...prev, gameData]);
    setFuture(newFuture);
    setGameData(next);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, future, gameData]);


  // --- STORAGE LOGIC ---
  useEffect(() => {
    // Load project list on mount
    const stored = localStorage.getItem('sok_maker_projects');
    if (stored) {
      try {
        setSavedProjects(JSON.parse(stored));
      } catch (e) { console.error("Failed to load projects", e); }
    }

    // Check tutorial status
    const tutorialDone = localStorage.getItem('sok_maker_tutorial_done');
    if (!tutorialDone) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('sok_maker_tutorial_done', 'true');
  };

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
    // Don't add to history for auto-saves or manual saves, 
    // but we do want to update the timestamp in the current state.
    // Actually, saving shouldn't change the game state other than timestamp.
    // Let's just update silently.
    setGameData(updatedProject);
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
      sounds: [],
      variables: INITIAL_GAME_DATA.variables || []
    };
    // Reset selection
    setGameData(newProject);
    setHistory([]); // Clear history for new project
    setFuture([]);
    setSelectedActorId(newProject.actors[0].id);
    setCurrentSceneId(newProject.scenes[0].id);
    setEditingSceneBackgroundId(null);
    setView(ToolMode.DRAW);
  };

  const handleLoadProject = (project: GameData) => {
    setGameData(project);
    setHistory([]); // Clear history for loaded project
    setFuture([]);
    setSelectedActorId(project.actors[0]?.id || '');
    setCurrentSceneId(project.scenes[0]?.id || 'scene_1');
    setEditingSceneBackgroundId(null);
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
  const handleWizardCreate = (type: 'HERO' | 'ENEMY' | 'ITEM' | 'BLOCK') => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw default look based on type
      ctx.fillStyle = type === 'HERO' ? '#3b82f6' : // Blue
        type === 'ENEMY' ? '#ef4444' : // Red
          type === 'ITEM' ? '#eab308' : // Yellow
            '#6b7280'; // Gray (Block)

      // Draw a shape
      if (type === 'BLOCK') {
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      } else {
        // Circle for others
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Add a simple face or symbol
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbol = type === 'HERO' ? '^_^' : type === 'ENEMY' ? 'Ò_Ó' : type === 'ITEM' ? '$' : '#';
      ctx.fillText(symbol, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }

    const newActor: Actor = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'HERO' ? 'Hero' : type === 'ENEMY' ? 'Baddie' : type === 'ITEM' ? 'Coin' : 'Wall',
      imageData: canvas.toDataURL()
    };

    updateGameData(prev => ({ ...prev, actors: [...prev.actors, newActor] }));
    setSelectedActorId(newActor.id);
    setEditingSceneBackgroundId(null);
    setShowCreationWizard(false);
    if (view !== ToolMode.DRAW) setView(ToolMode.DRAW);
  };

  const handleMagicCreate = async (type: 'HERO' | 'ENEMY' | 'ITEM' | 'BLOCK', prompt: string) => {
    setIsGenerating(true);
    const result = await generateActor(prompt, type);
    setIsGenerating(false);

    if (result) {
      const { actor, rules } = result;

      // Convert AI rules to Game Rules
      const newRules: Rule[] = rules.map((r: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        scope: 'GLOBAL',
        trigger: r.trigger as any,
        key: r.key,
        subjectId: r.trigger === 'COLLISION' ? actor.id : '',
        objectId: r.trigger === 'COLLISION' ? (r.targetTag === 'HERO' ? 'hero' : '') : '', // Simplified mapping
        effects: [{
          type: r.effectType as any,
          direction: r.effectDirection,
          value: 1
        }]
      }));

      // Add to Game Data
      updateGameData(prev => ({
        ...prev,
        actors: [...prev.actors, actor],
        rules: [...prev.rules, ...newRules],
        // Also add to current scene!
        scenes: prev.scenes.map(s => {
          if (s.id === currentSceneId) {
            return {
              ...s,
              objects: [...s.objects, {
                id: Math.random().toString(36).substr(2, 9),
                actorId: actor.id,
                x: Math.floor(CANVAS_SIZE / 2 - ACTOR_SIZE / 2),
                y: Math.floor(CANVAS_SIZE / 2 - ACTOR_SIZE / 2)
              }]
            };
          }
          return s;
        })
      }));

      setSelectedActorId(actor.id);
      setShowCreationWizard(false);
      setView(ToolMode.SCENE); // Go to scene to see the new actor
    }
  };

  const openWizard = () => {
    setShowCreationWizard(true);
  };

  const addActorDirectly = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw NOTHING! The user wants it empty.
      // ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Already empty by default
    }

    const newActor: Actor = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Actor',
      imageData: canvas.toDataURL()
    };

    updateGameData(prev => ({ ...prev, actors: [...prev.actors, newActor] }));
    setSelectedActorId(newActor.id);
    setEditingSceneBackgroundId(null);
    if (view !== ToolMode.DRAW) setView(ToolMode.DRAW);
  };

  // Handles updates from SpriteEditor (both for Actors AND Scene Backgrounds)
  const updateSprite = (updated: Actor) => {
    if (editingSceneBackgroundId) {
      // We are editing a Scene Background
      updateGameData(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => {
          if (s.id === editingSceneBackgroundId) {
            return {
              ...s,
              backgroundImage: updated.imageData,
              backgroundFrames: updated.frames
            };
          }
          return s;
        })
      }));
    } else {
      // We are editing a standard Actor
      updateGameData(prev => ({
        ...prev,
        actors: prev.actors.map(a => a.id === updated.id ? updated : a)
      }));
    }
  };

  const deleteActor = (id: string) => {
    // If we are in BG edit mode, "Delete" just clears the BG
    if (editingSceneBackgroundId) {
      updateGameData(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => {
          if (s.id === editingSceneBackgroundId) {
            return { ...s, backgroundImage: undefined, backgroundFrames: undefined };
          }
          return s;
        })
      }));
      return;
    }

    if (gameData.actors.length <= 1) return; // Keep at least one

    updateGameData(prev => ({
      ...prev,
      actors: prev.actors.filter(a => a.id !== id),
      scenes: prev.scenes.map(scene => ({
        ...scene,
        objects: scene.objects.filter(obj => obj.actorId !== id)
      })),
      rules: prev.rules.filter(r => r.subjectId !== id && r.objectId !== id)
    }));

    if (selectedActorId === id) setSelectedActorId(gameData.actors[0].id);
  };

  // --- SCENE LOGIC ---
  const addScene = () => {
    const newId = `scene_${gameData.scenes.length + 1}`;
    updateGameData(prev => ({
      ...prev,
      scenes: [...prev.scenes, { id: newId, objects: [] }]
    }));
    setCurrentSceneId(newId);
  };

  const updateCurrentSceneLevel = (objects: LevelObject[]) => {
    updateGameData(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === currentSceneId ? { ...s, objects } : s)
    }));
  };

  const handleNextScene = () => {
    const currentIndex = gameData.scenes.findIndex(s => s.id === currentSceneId);
    if (currentIndex >= 0 && currentIndex < gameData.scenes.length - 1) {
      setCurrentSceneId(gameData.scenes[currentIndex + 1].id);
    } else {
      setCurrentSceneId(gameData.scenes[0].id);
    }
  };

  // --- SCENE BACKGROUND LOGIC ---
  const handleEditSceneBackground = () => {
    setEditingSceneBackgroundId(currentSceneId);
    setView(ToolMode.DRAW);
  };

  const handleUpdateBackground = (bgImage: string | undefined) => {
    updateGameData(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => {
        if (s.id === currentSceneId) {
          return {
            ...s,
            backgroundImage: bgImage,
            // Clear frames if we upload a static image, 
            // otherwise keep them if we are just triggering update
            backgroundFrames: bgImage ? undefined : s.backgroundFrames
          };
        }
        return s;
      })
    }));
  };

  const updateRules = (rules: Rule[]) => updateGameData(prev => ({ ...prev, rules }));
  const updateSounds = (sounds: Sound[]) => updateGameData(prev => ({ ...prev, sounds }));
  const updateVariables = (variables: GlobalVariable[]) => updateGameData(prev => ({ ...prev, variables }));
  const updateTitle = (title: string) => updateGameData(prev => ({ ...prev, title }));

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
        sounds: [],
        variables: []
      };
      setGameData(newProject);
      setSelectedActorId(newProject.actors?.[0]?.id || '');
      if (newProject.scenes && newProject.scenes.length > 0) {
        setCurrentSceneId(newProject.scenes[0].id);
      }
      setEditingSceneBackgroundId(null);
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

  // --- HELPERS FOR DRAW VIEW ---
  // When in DRAW mode, if we are editing a background, construct a fake "Actor" object
  // so the SpriteEditor can understand it.
  const getActorToEdit = (): Actor => {
    if (editingSceneBackgroundId) {
      const scene = gameData.scenes.find(s => s.id === editingSceneBackgroundId);
      // Default blank canvas if no BG
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = CANVAS_SIZE;
      blankCanvas.height = CANVAS_SIZE;
      const blankData = blankCanvas.toDataURL();

      return {
        id: `BG_${scene?.id || 'temp'}`,
        name: 'Scene Background',
        imageData: scene?.backgroundImage || blankData,
        frames: scene?.backgroundFrames
      };
    } else {
      return gameData.actors.find(a => a.id === selectedActorId)!;
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

  const Tab = ({ mode, label, ...props }: { mode: ToolMode, label: string } & React.HTMLAttributes<HTMLButtonElement>) => (
    <button
      {...props}
      onClick={() => {
        setView(mode);
        // If switching away from DRAW manually, assume we are done editing BG
        if (mode !== ToolMode.DRAW) {
          setEditingSceneBackgroundId(null);
        }
      }}
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
          <button onClick={handleGoHome} className="hover:scale-110 transition-transform" title="Back to Projects" data-help="Go back to your list of projects">
            <div className="bg-gray-200 p-2 rounded-full border-2 border-black">
              <Home size={20} />
            </div>
          </button>

          <h1 className="text-3xl font-bold tracking-widest rotate-[-2deg] ml-2 underline decoration-wavy decoration-pink-300 hidden md:block">SOK-CLONE</h1>

          <button
            onClick={openWizard}
            className="hidden md:flex items-center sketch-box px-4 py-1 bg-purple-100 ml-4 h-10 rotate-1 hover:scale-105 transition-transform hover:bg-purple-200 text-purple-900 font-bold gap-2"
            data-help="Open the Magic Wizard to create new things!"
          >
            <Wand2 size={20} className="text-purple-600" />
            MAGIC WIZARD
          </button>
        </div>

        <div className="flex gap-3 mr-4 items-center">
          {/* QUICK SAVE BTN */}
          <button
            onClick={() => { saveProjectToStorage(gameData); alert("Project Saved!"); }}
            className="sketch-btn w-10 h-10 bg-blue-100 flex items-center justify-center"
            title="Save to My Projects"
            data-help="Save your game to your local projects list."
          >
            <Save size={20} className="text-blue-600" />
          </button>

          <div className="h-6 w-[2px] bg-gray-300 mx-1"></div>

          <label className="cursor-pointer w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center" title="Import JSON" data-help="Import a game file (.json) from your computer.">
            <FileUp size={24} />
            <input type="file" onChange={handleImport} className="hidden" accept=".json" />
          </label>
          <button onClick={handleExport} className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center" title="Export JSON" data-help="Download your game as a file to share with friends!">
            <FileDown size={24} />
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex px-6 border-b-[3px] border-black bg-[#e5e5e5] pt-3 shrink-0">
        {/* If editing BG, show special Label */}
        {editingSceneBackgroundId ? (
          <div className="px-6 py-2 text-xl font-bold border-x-2 border-t-2 border-black rounded-t-xl mx-1 bg-purple-100 pb-3 relative top-[3px] z-10 flex items-center gap-2">
            <Paintbrush size={18} /> EDITING BACKGROUND
          </div>
        ) : (
          <Tab mode={ToolMode.DRAW} label="Draw" data-tutorial="draw-tab" />
        )}
        <Tab mode={ToolMode.SCENE} label="Place" data-tutorial="scene-tab" />
        <Tab mode={ToolMode.RULES} label="Rules" data-tutorial="rules-tab" />
        <Tab mode={ToolMode.HELP} label="Aide" />
      </div>

      {/* CONTEXTUAL HELP TOGGLE */}
      <ContextualHelp active={showContextualHelp} onToggle={() => setShowContextualHelp(!showContextualHelp)} />

      {/* TUTORIAL OVERLAY */}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

      {/* MAIN WORKSPACE */}
      <main className="flex-1 relative bg-[#fdfbf7] overflow-hidden flex flex-col">
        <div
          className="absolute inset-0 pointer-events-none opacity-10 z-0"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}
        />

        <div className="flex-1 w-full h-full overflow-hidden relative z-10">
          {view === ToolMode.DRAW && (
            <SpriteEditor
              key={editingSceneBackgroundId ? 'BG_EDIT' : selectedActorId}
              actor={getActorToEdit()}
              onUpdate={updateSprite}
              onDelete={deleteActor}
              isHero={!editingSceneBackgroundId && selectedActorId === 'hero'}
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
              onEditBackground={handleEditSceneBackground}
              onUpdateBackground={handleUpdateBackground}
            />
          )}
          {view === ToolMode.RULES && (
            <div className="h-full overflow-hidden p-4 pb-24">
              <RuleEditor
                gameData={gameData}
                onUpdateRules={updateRules}
                onUpdateSounds={updateSounds}
                onUpdateVariables={updateVariables}
                currentSceneId={currentSceneId}
              />
            </div>
          )}
          {view === ToolMode.HELP && (
            <HelpSection />
          )}
        </div>
      </main>

      {/* BOTTOM ACTOR STRIP - SLIDING PANEL (Hide when editing Background) */}
      {!editingSceneBackgroundId && (
        <div className="fixed bottom-0 w-full z-40 transition-transform duration-300 ease-out translate-y-[calc(100%-24px)] hover:translate-y-0 group">

          {/* HOVER TAB / HANDLE (Visible when collapsed) */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-10 bg-[#ffbad2] border-t-[4px] border-x-[4px] border-black rounded-t-2xl flex items-center justify-center cursor-pointer group-hover:opacity-0 transition-opacity duration-200 shadow-md">
            <ChevronUp size={24} className="text-black/50 animate-bounce" />
          </div>

          <div className="h-32 bg-[#ffbad2] border-t-[4px] border-black flex items-center px-6 gap-6 w-full overflow-x-auto shadow-[0px_-4px_15px_rgba(0,0,0,0.1)] relative">

            {/* "ITEMS" Label for clarity when open */}
            <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-br">
              PROJECT ITEMS
            </div>

            <button
              onClick={addActorDirectly}
              className="h-24 w-24 flex flex-col items-center justify-center bg-white border-[3px] border-black rounded-2xl hover:bg-gray-50 flex-shrink-0 shadow-md transform hover:rotate-3 transition-transform group/btn-new"
              data-help="Create a new actor manually"
            >
              <Plus size={40} className="text-gray-400 group-hover/btn-new:scale-110 transition-transform mb-1" strokeWidth={3} />
              <span className="text-xs font-bold text-gray-400">NEW</span>
            </button>

            <div className="h-20 w-[3px] bg-black/10 rounded-full mx-2" />

            {gameData.actors.map(actor => (
              <button
                key={actor.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, actor.id)}
                onClick={() => {
                  setSelectedActorId(actor.id);
                  if (view === ToolMode.RULES) return;
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
      )}

      {/* WIZARD MODAL */}
      {showCreationWizard && (
        <CreationWizard
          onClose={() => setShowCreationWizard(false)}
          onCreate={handleWizardCreate}
          onMagicCreate={handleMagicCreate}
        />
      )}

    </div>
  );
};

export default App;
