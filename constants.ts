
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
  ]
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  [InteractionType.BLOCK]: 'Stops',
  [InteractionType.PUSH]: 'Pushes',
  [InteractionType.DESTROY_OBJECT]: 'Eats',
  [InteractionType.DESTROY_SUBJECT]: 'Dies by',
  [InteractionType.WIN]: 'Wins',
  [InteractionType.CHANGE_SCENE]: 'Goes to Next Scene',
  [InteractionType.NOTHING]: 'Ignores',
  [InteractionType.THEN]: 'Then...'
};

// NEW: Magnet Definitions categorized
export const TRIGGER_MAGNETS = [
    { type: RuleTrigger.COLLISION, label: 'TOUCH', color: '#fcd34d', icon: 'eye' }, // Yellow
    { type: RuleTrigger.CLICK, label: 'CLICK', color: '#fcd34d', icon: 'hand' }, // Yellow
];

export const EFFECT_MAGNETS = [
    { type: InteractionType.BLOCK, label: 'BLOCK', color: '#60a5fa', icon: 'square' }, // Blue
    { type: InteractionType.PUSH, label: 'PUSH', color: '#4ade80', icon: 'arrow-right' }, // Green
    { type: InteractionType.DESTROY_OBJECT, label: 'EAT', color: '#ef4444', icon: 'utensils' }, // Red
    { type: InteractionType.DESTROY_SUBJECT, label: 'DIE', color: '#ef4444', icon: 'skull' }, // Red
    { type: InteractionType.CHANGE_SCENE, label: 'DOOR', color: '#c084fc', icon: 'door-open' }, // Purple
    { type: InteractionType.WIN, label: 'WIN', color: '#facc15', icon: 'trophy' }, // Gold
    { type: InteractionType.THEN, label: 'THEN', color: '#9ca3af', icon: 'timer' }, // Grey/Timer
];

export const NOT_MAGNET = {
    label: 'NOT', color: '#ef4444', icon: 'ban'
};
