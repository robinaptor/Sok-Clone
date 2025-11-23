
import { Actor, GameData, InteractionType, RuleTrigger } from './types';

// Scene Dimensions in Pixels
export const SCENE_WIDTH = 800;
export const SCENE_HEIGHT = 600;
export const ACTOR_SIZE = 80; // Size of actors in pixels
export const MOVE_STEP = 80;  // How far actors move per keypress

// For the canvas drawing resolution
export const CANVAS_SIZE = 128;

export const DEFAULT_ACTOR_ID = 'hero';

// A simple base64 smiley face placeholder
const SMILEY_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAFJJREFUWEft18EJACAMBMG0/6Z1CRaC+F0C+5hlF0gS10lqZs4dt6/Z9TxgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwYMGDBgwIABAwY8Fw05Aty0x58AAAAASUVORK5CYII=`;

export const DEFAULT_HERO: Actor = {
  id: 'hero',
  name: 'Hero',
  imageData: SMILEY_BASE64
};

export const INITIAL_GAME_DATA: GameData = {
  id: 'new_project', // Placeholder, replaced on creation
  title: 'My Paint Story',
  lastModified: Date.now(),
  backgroundColor: '#ffffff',
  actors: [DEFAULT_HERO],
  rules: [],
  scenes: [
    {
      id: 'scene_1',
      objects: [
        { id: 'start_p1', actorId: 'hero', x: 360, y: 260, isLocked: false }
      ]
    }
  ],
  sounds: [],
  variables: [
    { id: 'score', name: 'Score', initialValue: 0, scope: 'GLOBAL' }
  ]
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  [InteractionType.CHASE]: 'CHASE',
  [InteractionType.SHAKE]: 'Shakes',
  [InteractionType.DESTROY_OBJECT]: 'Eats',
  [InteractionType.DESTROY_SUBJECT]: 'Dies by',
  [InteractionType.WIN]: 'Wins',
  [InteractionType.WAIT]: 'Waits',
  [InteractionType.CHANGE_SCENE]: 'Goes to Next Scene',
  [InteractionType.SPAWN]: 'Appears',
  [InteractionType.SWAP]: 'Transforms',
  [InteractionType.PLAY_ANIM]: 'Plays Anim',
  [InteractionType.MODIFY_VAR]: 'Modifies Variable',
  [InteractionType.SAY]: 'SAY',
  [InteractionType.SHOOT]: 'SHOOT',
  [InteractionType.PARTICLES]: 'CONFETTI',
  [InteractionType.HOLD]: 'HOLDS',
  [InteractionType.DROP]: 'DROPS',
  [InteractionType.BLOCK]: 'BLOCKS',
  [InteractionType.NOTHING]: 'NOTHING',
  [InteractionType.THEN]: 'THEN',
  [InteractionType.PUSH]: 'PUSH',
  [InteractionType.MOVE]: 'MOVES', // NEW
  [InteractionType.JUMP]: 'JUMPS',
  [InteractionType.STEP]: 'STEPS', // NEW
};

// NEW: Magnet Definitions categorized
export const TRIGGER_MAGNETS = [
  { type: RuleTrigger.KEY_PRESS, label: 'KEY', color: '#fcd34d', icon: 'keyboard' }, // Yellow (NEW)
  { type: RuleTrigger.COLLISION, label: 'TOUCH', color: '#fcd34d', icon: 'eye' }, // Yellow
  { type: RuleTrigger.HIT, label: 'HIT', color: '#fb923c', icon: 'target' }, // Orange (NEW)
  { type: RuleTrigger.CLICK, label: 'CLICK', color: '#fcd34d', icon: 'hand' }, // Yellow
  { type: RuleTrigger.START, label: 'START', color: '#86efac', icon: 'flag' }, // Green
  { type: RuleTrigger.TIMER, label: 'TIMER', color: '#93c5fd', icon: 'hourglass' }, // Blue
  { type: RuleTrigger.VAR_CHECK, label: 'VAR?', color: '#60a5fa', icon: 'hash' }, // Blue (NEW)
];

export const EFFECT_MAGNETS = [
  { type: InteractionType.CHASE, label: 'CHASE', color: '#4ade80', icon: 'footprints' }, // Green (Replaces Step)
  { type: InteractionType.MOVE, label: 'MOVE', color: '#3b82f6', icon: 'map' }, // Blue (Path)
  { type: InteractionType.STEP, label: 'STEP', color: '#3b82f6', icon: 'arrow-right' }, // Blue (Step)
  { type: InteractionType.SHAKE, label: 'SHAKE', color: '#f87171', icon: 'activity' }, // Red (Visual Juice)
  { type: InteractionType.JUMP, label: 'JUMP', color: '#10b981', icon: 'arrow-down-circle' }, // Emerald

  { type: InteractionType.DESTROY_OBJECT, label: 'EAT', color: '#ef4444', icon: 'utensils' }, // Red
  { type: InteractionType.DESTROY_SUBJECT, label: 'DIE', color: '#ef4444', icon: 'skull' }, // Red

  // The 3 Special Effects
  { type: InteractionType.SPAWN, label: 'SPAWN', color: '#d8b4fe', icon: 'sparkles' }, // Purple
  { type: InteractionType.SAY, label: 'SAY', icon: 'message-circle', color: '#fde047' }, // Yellow-300
  { type: InteractionType.SHOOT, label: 'SHOOT', icon: 'crosshair', color: '#fca5a5' }, // Red-300
  { type: InteractionType.PARTICLES, label: 'CONFETTI', icon: 'sparkles', color: '#d8b4fe' }, // Purple-300
  { type: InteractionType.SWAP, label: 'SWAP', color: '#f0abfc', icon: 'refresh' }, // Pink
  { type: InteractionType.PLAY_ANIM, label: 'ANIM', color: '#e879f9', icon: 'film' }, // Magenta

  { type: InteractionType.CHANGE_SCENE, label: 'DOOR', color: '#c084fc', icon: 'door-open' }, // Purple
  { type: InteractionType.WIN, label: 'WIN', color: '#facc15', icon: 'trophy' }, // Gold

  { type: InteractionType.MODIFY_VAR, label: 'SET VAR', color: '#3b82f6', icon: 'hash' }, // Blue Darker (NEW)

  { type: InteractionType.HOLD, label: 'HOLD', color: '#fbbf24', icon: 'hand' }, // Amber
  { type: InteractionType.DROP, label: 'DROP', color: '#fbbf24', icon: 'arrow-down' }, // Amber
  { type: InteractionType.WAIT, label: 'WAIT', color: '#9ca3af', icon: 'clock' }, // Gray

  { type: InteractionType.THEN, label: 'THEN', color: '#9ca3af', icon: 'timer' }, // Grey/Timer
];

export const NOT_MAGNET = {
  label: 'NOT', color: '#ef4444', icon: 'ban'
};