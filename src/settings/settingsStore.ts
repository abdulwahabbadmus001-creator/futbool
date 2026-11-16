import { CursorColorTier, GameSettings } from '../types/football';

export const DEFAULT_SETTINGS: GameSettings = {
  matchDurationMinutes: 5,
  difficulty: 'regular',
  gameSpeed: 1.0,
  cameraPreset: 'wide',
  cameraDistance: 1.0,
  cameraHeight: 1.0,
  cursorColor: 'orange',
  graphicsQuality: 'high',
  resolutionScale: 1.0,
  sfxVolume: 0.75,
  musicVolume: 0.45,
  crowdVolume: 0.6,
  vibration: true,
  mobileControlLayout: 'auto',
  offsideRule: true,
  injuriesEnabled: true,
  keyBindings: {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    sprint: 'KeyK',
    shortPass: 'KeyJ',
    throughPass: 'KeyI',
    shoot: 'KeyL',
    loftedPass: 'KeyO',
    switchPlayer: 'KeyQ',
    tackle: 'Space',
    tacticalMod: 'KeyE',
    feint: 'KeyC',
    roulette: 'KeyV',
    pause: 'Escape',
  },
};

export function cloneDefaultSettings(): GameSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function getCursorHex(tier: CursorColorTier): number {
  switch (tier) {
    case 'gold':
      return 0xffb800;
    case 'cyan':
      return 0x00d4ff;
    case 'emerald':
      return 0x10b981;
    case 'rose':
      return 0xf43f5e;
    case 'orange':
    default:
      return 0xff6b00;
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'Esc';
  return code;
}
