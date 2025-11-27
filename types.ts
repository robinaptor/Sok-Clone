export enum ToolMode {
  PROJECTS = 'PROJECTS', // New Home Screen
  DRAW = 'DRAW',
  SCENE = 'SCENE',
  RULES = 'RULES',
  HELP = 'HELP',
  PLAY = 'PLAY'
}

export interface Actor {
  id: string;
  name: string;
  imageData: string; // Base64 data URL
  frames?: string[]; // Animation frames
  collisionShape?: {
    type: 'RECT' | 'CIRCLE' | 'POLYGON';
    // For RECT
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    // For POLYGON
    points?: { x: number, y: number }[]; // Relative to actor (0,0) is top-left
  };
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
  icon?: string; // DataURL for the icon (e.g. Heart)
  isIconMode?: boolean; // If true, render as repeating icons instead of number
  scope?: 'GLOBAL' | string; // 'GLOBAL' or specific scene ID
}

export enum RuleTrigger {
  COLLISION = 'COLLISION',
  CLICK = 'CLICK',
  START = 'START', // Triggered when scene loads
  TIMER = 'TIMER',  // Triggered periodically
  VAR_CHECK = 'VAR_CHECK', // Triggered when variable meets condition
  KEY_PRESS = 'KEY_PRESS', // NEW: Keyboard control
  HIT = 'HIT', // NEW: When hit by projectile
  OFF_SCREEN = 'OFF_SCREEN' // NEW: When object leaves screen
}

export enum InteractionType {
  CHASE = 'CHASE', // Was STEP - Move towards targets PUSH/BLOCK - Move in direction
  MOVE = 'MOVE', // NEW: Path following
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
  HOLD = 'HOLD', // NEW: Inventory
  DROP = 'DROP', // NEW: Inventory
  JUMP = 'JUMP', // NEW: Jump effect
  NOTHING = 'NOTHING',
  THEN = 'THEN', // Sequence / Delay modifier
  WAIT = 'WAIT', // NEW: Pause execution
  STEP = 'STEP', // NEW: Move one step
  PLAY_MUSIC = 'PLAY_MUSIC', // NEW: Trigger music playback
  SET_VELOCITY = 'SET_VELOCITY', // NEW: Physics control
  SET_GRAVITY = 'SET_GRAVITY' // NEW: Enable/Disable gravity
}

export interface RuleEffect {
  type: InteractionType;
  targetSceneId?: string; // For CHANGE_SCENE
  // For SPAWN, SWAP, ANIM
  spawnActorId?: string; // Represents the Target Actor for the effect
  spawnX?: number;
  spawnY?: number;
  // PARTICLES CONFIG
  particleType?: 'CONFETTI' | 'EXPLOSION' | 'SMOKE' | 'RAIN' | 'SPARKLES';
  particleCount?: number;
  particleSize?: number;
  particleArea?: number; // Radius
  particleActorId?: string; // NEW: Custom sprite for particles

  // SHOOT CONFIG
  shootOffsetX?: number;
  shootOffsetY?: number;
  projectileSize?: number; // NEW: Custom size for projectile
  shooterActorId?: string; // NEW: Custom shooter sprite
  target?: 'SUBJECT' | 'OBJECT'; // Determines if the effect applies to the subject or object
  isLoop?: boolean; // For animations
  // For VARIABLES
  variableId?: string;
  operation?: 'ADD' | 'SUB' | 'SET';
  value?: number;
  // For SAY
  text?: string;
  // For HOLD / DROP
  holdConfig?: {
    targetActorId?: string; // Which object to hold/drop (if different from subject/object)
    holderActorId?: string; // Who holds/drops it
    offsetX?: number;
    offsetY?: number;
  };
  // For MOVE
  path?: { x: number, y: number }[];
  // For PUSH
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  force?: number;
  // For SET_VELOCITY
  velocity?: { x: number, y: number }; // NEW
  // For SET_GRAVITY
  hasScreenCollision?: boolean; // NEW
  // For SPAWN
  spawnRandomY?: boolean; // NEW: Randomize Y position
  spawnYMin?: number; // NEW: Min Y for random spawn
  spawnYMax?: number; // NEW: Max Y for random spawn
  spawnScale?: number; // NEW: Scale of spawned object
  spawnScaleX?: number; // NEW: Non-uniform scale X
  spawnScaleY?: number; // NEW: Non-uniform scale Y
  spawnVelocity?: { x: number, y: number }; // NEW: Velocity of spawned object
  spawnMode?: 'SINGLE' | 'DOUBLE_VERTICAL'; // NEW: Spawn mode
  spawnActorId2?: string; // NEW: Second actor for double spawn
  spawnGap?: number; // NEW: Gap size for double spawn
  spawnAutoDestroy?: boolean; // NEW: Automatically destroy when off-screen
  targetActorIds?: string[]; // NEW: Multiple target actors (e.g. for Gravity)

  // Variable Linking
  paramRefs?: Record<string, string>; // Map param name (e.g. "force", "speed") to variableId
  volume?: number; // For PLAY_MUSIC
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
  // For KEY TRIGGER
  key?: string;

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
  isLocked?: boolean; // If true, can't be dragged in editor

  // Physics state (runtime only)
  vx?: number;
  vy?: number;
  z?: number; // Altitude (for jumps)
  vz?: number; // Vertical velocity (for jumps)
  ignoresGravity?: boolean; // NEW: If true, object is not affected by gravity
  isEphemeral?: boolean; // If true, not saved to scene (e.g. projectiles)
  scale?: number; // For projectiles or effects
  scaleX?: number; // NEW: Non-uniform scale X
  scaleY?: number; // NEW: Non-uniform scale Y
  activePath?: {
    points: { x: number, y: number }[];
    currentIndex: number;
    speed: number;
    loop: boolean;
  };
  hasGravity?: boolean; // NEW: If true, falls down
  hasScreenCollision?: boolean; // NEW: If true, clamps to screen edges
  autoDestroy?: boolean; // NEW: If true, destroys when off-screen
  flipY?: boolean; // NEW: If true, flips the object vertically
  gravityForce?: number; // NEW: Custom gravity strength (default 0.4)

  // Inventory state
  heldBy?: string; // ID of the actor holding this object
  holdOffsetX?: number; // Offset from the holder's center when held
  holdOffsetY?: number; // Offset from the holder's center when held

  // HUD state
  variableMonitor?: {
    variableId: string;
    mode: 'TEXT' | 'BAR';
    displayMode?: 'POPUP' | 'ALWAYS_VISIBLE'; // How to show: button popup or always visible
    maxValue?: number; // For BAR mode
    width?: number; // Custom width for bar (in pixels)
    height?: number; // Custom height for bar (in pixels)
    showLabel?: boolean; // Show variable name above bar/text
    showBackground?: boolean; // Show background behind HUD
    color?: string; // Legacy (maybe used for text?)
    textColor?: string; // NEW
    backgroundColor?: string; // NEW: If undefined, transparent
    barColor?: string; // NEW: For BAR mode
    offsetX?: number; // Position relative to actor
    offsetY?: number; // Position relative to actor
  };
  creationTime?: number;
  activeAnimation?: ActiveAnimation;
}

export interface AudioClip {
  id: string;
  startStep: number; // Float, step index where clip starts
  durationSteps: number; // Float, visual length in steps
  offset: number; // Float, offset in seconds from start of sample
  isLooping: boolean;
  originalDurationSteps?: number; // Float, original length of the sample in steps
}

export interface AudioSettings {
  pitch: number; // Semitones
  playbackRate: number; // Speed (0.5x - 2x)
  volume: number;
  trimStart: number; // Seconds
  trimEnd: number; // Seconds
  eq: {
    high: number; // Gain dB
    mid: number;
    low: number;
  };
}

export interface MusicRow {
  id: string;
  name: string;
  type: 'SYNTH' | 'SAMPLE' | 'AUDIO';
  color?: string;

  // Synth specific
  note?: string; // Base note for the row (e.g. "C4")
  notes?: Record<number, string[]>; // Polyphony: Step index -> Array of notes
  instrumentPreset?: 'DEFAULT' | 'KICK' | 'SNARE' | 'HIHAT' | 'BASS' | 'GUITAR' | 'PIANO';
  waveform?: 'sawtooth' | 'square' | 'sine' | 'triangle';
  adsr?: { attack: number, decay: number, sustain: number, release: number };
  fx?: { delay?: boolean, reverb?: boolean };

  // Sample specific
  sampleData?: string; // Base64
  trimStart?: number; // 0-1
  trimEnd?: number; // 0-1

  // Audio Track specific
  audioClips?: AudioClip[];
  audioSettings?: AudioSettings;

  // Mixer controls
  volume?: number; // 0 to 1
  isMuted?: boolean;
}

export interface MusicTrack {
  id: string;
  name: string;
  data?: string; // Base64 or Blob URL (Legacy/Fallback)
  type: 'UPLOAD' | 'GENERATED';
  sequence?: { note: number, time: number, duration?: number }[]; // For generated music. 'note' refers to the row index.
  rows?: MusicRow[]; // Configuration for each row (instrument). If undefined, assumes default chromatic scale.
  steps?: number; // Number of steps in the sequence (default 16)
  tempo?: number; // BPM (default 120)
}

export interface Scene {
  id: string;
  name?: string;
  objects: LevelObject[];
  backgroundImage?: string; // Custom background (Base64)
  backgroundFrames?: string[]; // Animated background
  backgroundMusicId?: string; // New field
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
  music?: MusicTrack[]; // NEW: Music tracks
  backgroundColor: string;
}

export interface GameState {
  currentView: ToolMode;
  gameData: GameData;
  selectedActorId: string | null;
}