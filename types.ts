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
  frames?: string[]; // Animation frames
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
  SWAP = 'SWAP',   // New: Transform object
  PLAY_ANIM = 'PLAY_ANIM', // New: visual effect
  NOTHING = 'NOTHING',
  THEN = 'THEN' // Sequence / Delay modifier
}

export interface RuleEffect {
  type: InteractionType;
  targetSceneId?: string; // For CHANGE_SCENE
  // For SPAWN, SWAP, ANIM
  spawnActorId?: string; // Represents the Target Actor for the effect
  spawnX?: number;
  spawnY?: number;
  target?: 'SUBJECT' | 'OBJECT'; // Who does this apply to?
  isLoop?: boolean; // NEW: For ANIM effect
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

export interface AnimationState {
  playingActorId: string; // The actor whose frames we are using
  isLoop: boolean;
  startTime: number;
}

export interface LevelObject {
  id: string;
  actorId: string;
  x: number;
  y: number;
  isLocked?: boolean; // If true, cannot be dragged in Game Mode
  isEphemeral?: boolean; // For one-shot animations
  creationTime?: number;
  activeAnimation?: AnimationState; // NEW: Tracks current animation status
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