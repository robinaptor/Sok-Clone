
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

export interface GlobalVariable {
  id: string;
  name: string;
  initialValue: number;
  scope?: 'GLOBAL' | string; // 'GLOBAL' or specific scene ID
}

export enum RuleTrigger {
  COLLISION = 'COLLISION',
  CLICK = 'CLICK',
  START = 'START', // Triggered when scene loads
  TIMER = 'TIMER',  // Triggered periodically
  VAR_CHECK = 'VAR_CHECK', // Triggered when variable meets condition
  KEY_PRESS = 'KEY_PRESS' // NEW: Keyboard control
}

export enum InteractionType {
  STEP = 'STEP', // NEW: Replaces PUSH/BLOCK - Move in direction
  PUSH = 'PUSH', // Legacy / Strong Push
  BLOCK = 'BLOCK', // Legacy / Solid
  SHAKE = 'SHAKE', // NEW: Screen Shake effect
  DESTROY_OBJECT = 'DESTROY_OBJECT', // Eat
  DESTROY_SUBJECT = 'DESTROY_SUBJECT', // Die
  WIN = 'WIN',
  CHANGE_SCENE = 'CHANGE_SCENE', // Go to next level
  SPAWN = 'SPAWN', // New: Make object appear
  SWAP = 'SWAP',   // New: Transform object
  PLAY_ANIM = 'PLAY_ANIM', // New: visual effect
  MODIFY_VAR = 'MODIFY_VAR', // NEW: Change variable value
  SAY = 'SAY', // NEW: Dialogue bubble
  SHOOT = 'SHOOT', // NEW: Projectile
  PARTICLES = 'PARTICLES', // NEW: Visual effect
  NOTHING = 'NOTHING',
  THEN = 'THEN', // Sequence / Delay modifier
  WAIT = 'WAIT' // NEW: Pause execution
}

export interface RuleEffect {
  type: InteractionType;
  targetSceneId?: string; // For CHANGE_SCENE
  // For SPAWN, SWAP, ANIM
  spawnActorId?: string; // Represents the Target Actor for the effect
  spawnX?: number;
  spawnY?: number;
  // PARTICLES CONFIG
  particleType?: 'CONFETTI' | 'EXPLOSION' | 'SMOKE' | 'RAIN';
  particleCount?: number;
  particleSize?: number;
  particleArea?: number; // Radius
  particleActorId?: string; // NEW: Custom sprite for particles

  // SHOOT CONFIG
  shootOffsetX?: number;
  shootOffsetY?: number;
  projectileSize?: number; // NEW: Custom size for projectile
  target?: 'SUBJECT' | 'OBJECT'; // Determines if the effect applies to the subject or object
  isLoop?: boolean; // For animations
  // For VARIABLES
  variableId?: string;
  operation?: 'ADD' | 'SUB' | 'SET';
  value?: number;
  // For SAY
  text?: string;
}

export interface Rule {
  id: string;
  scope: 'GLOBAL' | string; // 'GLOBAL' or specific scene ID
  trigger: RuleTrigger;
  subjectId: string; // The actor moving or being clicked (IGNORED FOR START)
  objectId?: string;  // The actor being hit (only for collision)
  // For VARIABLE Trigger
  variableId?: string;
  condition?: 'EQUALS' | 'GREATER' | 'LESS';
  threshold?: number;

  // For TIMER Trigger
  interval?: number; // NEW: Custom interval in seconds

  // For KEY TRIGGER
  key?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

  effects: RuleEffect[]; // MULTIPLE effects
  invert?: boolean; // The "NOT" logic
  chance?: number; // NEW: 0-1 probability (0.5 = 50%)
  soundId?: string; // NEW: Audio to play when triggered
}

export interface ActiveAnimation {
  playingActorId: string;
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
  activeAnimation?: ActiveAnimation;
  scale?: number; // Added for visual scaling
  vx?: number; // Velocity X
  vy?: number; // Velocity Y
}

export interface Scene {
  id: string;
  objects: LevelObject[];
  backgroundImage?: string; // Custom background (Base64)
  backgroundFrames?: string[]; // Animated background
}

export interface GameData {
  id: string; // Unique ID for storage
  title: string;
  lastModified: number; // Timestamp
  actors: Actor[];
  rules: Rule[];
  scenes: Scene[];
  sounds: Sound[]; // Library of sounds
  variables: GlobalVariable[]; // NEW: Global variables
  backgroundColor: string;
}

export interface GameState {
  currentView: ToolMode;
  gameData: GameData;
  selectedActorId: string | null;
}