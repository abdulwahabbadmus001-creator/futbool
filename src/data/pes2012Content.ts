import { Player, Team } from '../types/football';

export interface PesSkillCard {
  code: string;
  name: string;
  category: 'P' | 'S';
  description: string;
}

export const PES2012_SKILL_CARDS: PesSkillCard[] = [
  { code: 'P01', name: 'Classic No.10', category: 'P', description: 'Dictates tempo from central midfield with incisive through balls.' },
  { code: 'P02', name: 'Anchor Man', category: 'P', description: 'Holds position in front of the back four to intercept counter-attacks.' },
  { code: 'P03', name: 'Trickster', category: 'P', description: 'Uses stepovers, elasticos, and body feints to beat defenders 1v1.' },
  { code: 'P04', name: 'Darting Run', category: 'P', description: 'Bursts into open channels behind fullbacks at high acceleration.' },
  { code: 'P05', name: 'Mazing Run', category: 'P', description: 'Weaves through tight defensive blocks with close ball control.' },
  { code: 'P06', name: 'Pinpoint Pass', category: 'P', description: 'Delivers long diagonal switches with high backspin accuracy.' },
  { code: 'P07', name: 'Early Cross', category: 'P', description: 'Whips curling crosses behind the defensive line before it sets.' },
  { code: 'P08', name: 'Box to Box', category: 'P', description: 'Relentlessly covers both penalty areas throughout the 90 minutes.' },
  { code: 'P09', name: 'Incisive Run', category: 'P', description: 'Cuts inside from the wing onto the stronger shooting foot.' },
  { code: 'P12', name: 'Goal Poacher', category: 'P', description: 'Plays on the shoulder of the last defender to pounce on rebounds.' },
  { code: 'P13', name: 'Dummy Runner', category: 'P', description: 'Drags center-backs out of position to create space for teammates.' },
  { code: 'P16', name: 'Extra Frontman', category: 'P', description: 'Center-back who surges forward to join attacks on set pieces and late chases.' },
  { code: 'S01', name: '1-Touch Play', category: 'S', description: 'Executes first-time passes and finishes with minimal accuracy penalty.' },
  { code: 'S02', name: 'Outside Curve', category: 'S', description: 'Bends passes and shots with the outside of the boot (Trivela).' },
  { code: 'S03', name: 'Long Throw', category: 'S', description: 'Hurls flat, dangerous throw-ins directly into the six-yard box.' },
  { code: 'S04', name: 'Super-Sub', category: 'S', description: 'Receives an attacking and stamina boost when introduced in the 2nd half.' },
  { code: 'S05', name: 'Speed Merchant', category: 'S', description: 'Maintains elite top sprint speed even while dribbling at feet.' },
  { code: 'S06', name: 'Long Range Drive', category: 'S', description: 'Strikes dipping, high-velocity shots from outside the penalty arc.' },
  { code: 'S08', name: 'Turning Skills', category: 'S', description: 'Executes sharp 360° Marseille Roulette and Cruyff turns under pressure.' },
  { code: 'S13', name: 'Step On Skill', category: 'S', description: 'Uses sole-of-the-boot drag-backs for sudden directional changes.' },
  { code: 'S15', name: 'Knuckle Shot', category: 'S', description: 'Strikes unpredictable zero-spin free kicks and long shots that swerve mid-air.' },
];

export interface LinkFeintCombo {
  id: string;
  direction: 'R-Stick Up' | 'R-Stick Down' | 'R-Stick Left' | 'R-Stick Right';
  name: string;
  sequence: [string, string, string];
}

export const DEFAULT_LINK_FEINTS: LinkFeintCombo[] = [
  {
    id: 'lf-up',
    direction: 'R-Stick Up',
    name: 'Elastico → Roulette',
    sequence: ['Flip Flap (Elastico)', 'Double Touch', '360° Marseille Roulette'],
  },
  {
    id: 'lf-down',
    direction: 'R-Stick Down',
    name: 'Drag-Back → Sombrero',
    sequence: ['Sole Drag-Back', 'Body Feint Left', 'Rainbow Flick'],
  },
  {
    id: 'lf-left',
    direction: 'R-Stick Left',
    name: 'Stepover Burst',
    sequence: ['Scissors Feint', 'Reverse Stepover', 'Diagonal Knock-On'],
  },
  {
    id: 'lf-right',
    direction: 'R-Stick Right',
    name: 'Cruyff Cut Inside',
    sequence: ['Matthews Feint', 'Cruyff Turn', 'Outside Curl Setup'],
  },
];

export interface StrategySlotAssignment {
  button: 'cross' | 'circle' | 'triangle' | 'square';
  symbol: '×' | '○' | '△' | '□';
  color: string;
  strategyName: string;
  description: string;
  active: boolean;
}

export const DEFAULT_STRATEGY_SLOTS: StrategySlotAssignment[] = [
  {
    button: 'cross',
    symbol: '×',
    color: '#38BDF8',
    strategyName: 'Quick Counter Attack',
    description: 'Forwards sprint immediately into vertical channels on ball recovery.',
    active: true,
  },
  {
    button: 'circle',
    symbol: '○',
    color: '#F43F5E',
    strategyName: 'All-Out Defence',
    description: 'Compact 2-bank defensive block drops deep to protect the box.',
    active: false,
  },
  {
    button: 'triangle',
    symbol: '△',
    color: '#10B981',
    strategyName: 'CB Overlap',
    description: 'Central defender charges forward into attacking midfield during build-up.',
    active: false,
  },
  {
    button: 'square',
    symbol: '□',
    color: '#EC4899',
    strategyName: 'High Pressing & Offside Trap',
    description: 'Defensive line steps up simultaneously to compress midfield space.',
    active: true,
  },
];

export interface ExtraContentPack {
  id: string;
  title: string;
  category: 'Football Life' | 'Classic Teams' | 'Legends' | 'Broadcast & Balls';
  costGP: number;
  description: string;
  unlockedByDefault?: boolean;
}

export const EXTRA_CONTENT_PACKS: ExtraContentPack[] = [
  {
    id: 'pack-club-boss',
    title: 'Club Boss Mode (Football Life)',
    category: 'Football Life',
    costGP: 100,
    description: 'Unlock the 3rd Football Life pillar: become Club Chairman, hire managers, set ticket prices, and expand your stadium.',
    unlockedByDefault: true,
  },
  {
    id: 'pack-ml-veterans',
    title: 'Master League Original Castolo XI',
    category: 'Football Life',
    costGP: 150,
    description: 'Play with the iconic Konami Master League default squad featuring Castolo, Minanda, Ordaz, Ximelez, Ivarov, and Stremer.',
    unlockedByDefault: true,
  },
  {
    id: 'pack-classic-brazil',
    title: 'Classic Brazil & Argentina Squads',
    category: 'Classic Teams',
    costGP: 1200,
    description: 'Unlock South American all-time great national squads for Exhibition and Tournament modes.',
  },
  {
    id: 'pack-classic-europe',
    title: 'Classic France, Italy & Germany',
    category: 'Classic Teams',
    costGP: 1200,
    description: 'Unlock European World Cup champion legends with signature Playing Style cards.',
  },
  {
    id: 'pack-ucl-ball-pack',
    title: 'UEFA Finale Starball & Classic Balls',
    category: 'Broadcast & Balls',
    costGP: 600,
    description: 'Official 32-panel thermally bonded starball and classic stitched leather match balls.',
    unlockedByDefault: true,
  },
  {
    id: 'pack-libertadores-hud',
    title: 'Copa Santander Libertadores Broadcast Package',
    category: 'Broadcast & Balls',
    costGP: 800,
    description: 'South American night atmosphere, red/gold Libertadores scorebug, and ticker.',
    unlockedByDefault: true,
  },
];

/**
 * Iconic Konami Master League Default Original Squad (Castolo, Minanda, Ordaz, Ximelez, Ivarov, etc.)
 */
const makeMLPlayer = (
  id: string,
  number: number,
  name: string,
  shortName: string,
  position: Player['position'],
  nationality: string,
  age: number,
  overall: number,
  pace: number,
  shooting: number,
  passing: number,
  dribbling: number,
  defending: number,
  physical: number,
  goalkeeping = 20
): Player => ({
  id,
  name,
  shortName,
  number,
  position,
  nationality,
  age,
  overall,
  attributes: { pace, shooting, passing, dribbling, defending, physical, goalkeeping },
  appearance: {
    skinTone: '#e0ac69',
    hairColor: '#1e1b18',
    hairStyle: 'short',
    bootColor: '#00E5FF',
  },
  marketValue: Math.round(overall * 0.25 * 10) / 10,
  wage: Math.round(overall * 0.8),
  contractYears: 3,
  fitness: 100,
  injuredWeeks: 0,
  archetype: position === 'ST' ? 'goal-poacher' : position === 'CAM' ? 'classic-10' : 'balanced',
  morale: 90,
  formArrow: 'up',
});

export const MASTER_LEAGUE_ORIGINAL_TEAM: Team = {
  id: 'pes-united-ml-originals',
  name: 'PES United (ML Originals)',
  shortCode: 'PES',
  category: 'club',
  leagueName: 'WE Division 2',
  rating: { attack: 78, midfield: 77, defense: 75, overall: 77 },
  homeKit: {
    primary: '#0B3B8C',
    secondary: '#00E5FF',
    shorts: '#061229',
    socks: '#0B3B8C',
    gkPrimary: '#10B981',
    pattern: 'stripes',
  },
  awayKit: {
    primary: '#F8FAFC',
    secondary: '#0B3B8C',
    shorts: '#0B3B8C',
    socks: '#F8FAFC',
    gkPrimary: '#F59E0B',
    pattern: 'solid',
  },
  crest: {
    shape: 'shield',
    primary: '#0B3B8C',
    secondary: '#061229',
    accent: '#00E5FF',
    monogram: 'PES',
  },
  tactics: {
    formationId: '4-4-2',
    mentality: 'attacking',
    pressing: 'high',
    passingStyle: 'mixed',
    lineHeight: 0.62,
    compactness: 0.68,
    supportRange: 0.72,
    counterAttack: true,
  },
  startingXI: [
    'ml-ivarov',
    'ml-valeny',
    'ml-jaric',
    'ml-stremer',
    'ml-ruskin',
    'ml-dodo',
    'ml-espimas',
    'ml-ximelez',
    'ml-minanda',
    'ml-castolo',
    'ml-ordaz',
  ],
  substitutes: [
    'ml-lothar',
    'ml-libermann',
    'ml-cecui',
    'ml-stein',
    'ml-macco',
    'ml-burchet',
    'ml-huylens',
  ],
  roster: [
    makeMLPlayer('ml-ivarov', 1, 'Ivarov', 'IVAROV', 'GK', 'Russia', 29, 76, 58, 45, 62, 55, 48, 79, 78),
    makeMLPlayer('ml-valeny', 2, 'Valeny', 'VALENY', 'RB', 'France', 28, 76, 81, 60, 72, 74, 77, 79),
    makeMLPlayer('ml-jaric', 3, 'Jaric', 'JARIC', 'CB', 'Serbia', 27, 78, 70, 68, 76, 70, 80, 81),
    makeMLPlayer('ml-stremer', 4, 'Stremer', 'STREMER', 'CB', 'Sweden', 29, 78, 73, 58, 70, 68, 82, 84),
    makeMLPlayer('ml-ruskin', 5, 'Ruskin', 'RUSKIN', 'LB', 'Scotland', 24, 77, 85, 64, 75, 78, 74, 75),
    makeMLPlayer('ml-dodo', 6, 'Dodo', 'DODO', 'CDM', 'Italy', 26, 77, 74, 66, 79, 75, 79, 80),
    makeMLPlayer('ml-espimas', 7, 'Espimas', 'ESPIMAS', 'RM', 'France', 27, 78, 84, 74, 78, 81, 66, 76),
    makeMLPlayer('ml-ximelez', 8, 'Ximelez', 'XIMELEZ', 'LM', 'Spain', 28, 79, 83, 75, 80, 84, 62, 74),
    makeMLPlayer('ml-minanda', 10, 'Minanda', 'MINANDA', 'CAM', 'Portugal', 30, 82, 74, 80, 88, 86, 58, 73),
    makeMLPlayer('ml-castolo', 9, 'Castolo', 'CASTOLO', 'ST', 'Brazil', 29, 83, 87, 85, 76, 86, 50, 77),
    makeMLPlayer('ml-ordaz', 11, 'Ordaz', 'ORDAZ', 'ST', 'Spain', 27, 81, 79, 84, 72, 78, 52, 84),
    makeMLPlayer('ml-lothar', 12, 'Lothar', 'LOTHAR', 'GK', 'Germany', 25, 73, 55, 42, 60, 52, 45, 76, 74),
    makeMLPlayer('ml-libermann', 15, 'Libermann', 'LIBERMANN', 'CB', 'Israel', 31, 74, 68, 55, 68, 65, 77, 80),
    makeMLPlayer('ml-cecui', 16, 'Ceciu', 'CECIU', 'CB', 'Romania', 23, 73, 72, 54, 66, 64, 76, 78),
    makeMLPlayer('ml-stein', 14, 'Stein', 'STEIN', 'CDM', 'Ireland', 26, 75, 75, 65, 74, 72, 77, 82),
    makeMLPlayer('ml-macco', 17, 'Macco', 'MACCO', 'RM', 'Wales', 24, 76, 86, 70, 74, 80, 58, 70),
    makeMLPlayer('ml-burchet', 18, 'Burchet', 'BURCHET', 'RW', 'Australia', 25, 76, 88, 72, 71, 79, 55, 74),
    makeMLPlayer('ml-huylens', 19, 'Huylens', 'HUYLENS', 'ST', 'Netherlands', 31, 78, 77, 82, 70, 76, 48, 80),
  ],
  budget: 45,
};
