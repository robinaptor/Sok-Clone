
export enum ToolMode {
  PROJECTS = 'PROJECTS', // New Home Screen
  DRAW = 'DRAW',
  SCENE = 'SCENE',
  RULES = 'RULES',
  PLAY = 'PLAY'
}

export interface Actor {
  id: string;
  name: string;
  imageData: string; // Base64 data URL
}

export interface Sound {
  id: string;
  name: string;
  data: string; // Base64 Audio Data
}

export enum RuleTrigger {
  COLLISION = 'COLLISION',
  CLICK = 'CLICK',
  START = 'START', // Triggered when scene loads
  TIMER = 'TIMER'  // Triggered periodically
}

export enum InteractionType {
  BLOCK = 'BLOCK',
  PUSH = 'PUSH',
  DESTROY_OBJECT = 'DESTROY_OBJECT', // Eat
  DESTROY_SUBJECT = 'DESTROY_SUBJECT', // Die
  WIN = 'WIN',
  CHANGE_SCENE = 'CHANGE_SCENE', // Go to next level
  SPAWN = 'SPAWN', // New: Make object appear
  NOTHING = 'NOTHING',
  THEN = 'THEN' // Sequence / Delay modifier
}

export interface RuleEffect {
  type: InteractionType;
  targetSceneId?: string; // For CHANGE_SCENE
  // For SPAWN
  spawnActorId?: string;
  spawnX?: number;
  spawnY?: number;
}

export interface Rule {
  id: string;
  scope: 'GLOBAL' | string; // 'GLOBAL' or specific scene ID
  trigger: RuleTrigger;
  subjectId: string; // The actor moving or being clicked (IGNORED FOR START)
  objectId?: string;  // The actor being hit (only for collision)
  effects: RuleEffect[]; // MULTIPLE effects
  invert?: boolean; // The "NOT" logic
  soundId?: string; // NEW: Audio to play when triggered
}

export interface LevelObject {
  id: string;
  actorId: string;
  x: number;
  y: number;
  isLocked?: boolean; // If true, cannot be dragged in Game Mode
}

export interface Scene {
  id: string;
  objects: LevelObject[];
}

export interface GameData {
  id: string; // Unique ID for storage
  title: string;
  lastModified: number; // Timestamp
  actors: Actor[];
  rules: Rule[];
  scenes: Scene[];
  sounds: Sound[]; // NEW: Library of sounds
  backgroundColor: string;
}

export interface GameState {
  currentView: ToolMode;
  gameData: GameData;
  selectedActorId: string | null;
}
