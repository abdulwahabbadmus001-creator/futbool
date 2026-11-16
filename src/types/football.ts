export type PositionRole =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST';

export type TeamCategory = 'club' | 'national';

export type KitPattern = 'solid' | 'stripes' | 'hoops' | 'sash' | 'halves';
export type KitSlot = 'home' | 'away' | 'alt';

export interface KitDesign {
  primary: string;
  secondary: string;
  shorts: string;
  socks: string;
  gkPrimary: string;
  pattern: KitPattern;
}

export interface CrestConfig {
  shape: 'shield' | 'circle' | 'crest' | 'diamond';
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
}

export interface PlayerAttributes {
  pace: number;        // 40-99
  shooting: number;    // 40-99
  passing: number;     // 40-99
  dribbling: number;   // 40-99
  defending: number;   // 40-99
  physical: number;    // 40-99
  goalkeeping: number; // 15-99
}

export interface PlayerAppearance {
  skinTone: string;
  hairColor: string;
  hairStyle: 'short' | 'fade' | 'long' | 'buzz';
  bootColor: string;
}

export type PlayerArchetype =
  | 'balanced'
  | 'target-man'
  | 'goal-poacher'
  | 'box-to-box'
  | 'classic-10'
  | 'anchor-man';

export type FormArrow = 'up-hot' | 'up' | 'flat' | 'down' | 'down-cold';

export type CornerRoutine = 'standard' | 'near-post' | 'far-post' | 'short-decoy';
export type FreeKickRoutine = 'direct-curl' | 'dummy-over' | 'two-kicker-layoff';

export interface Player {
  id: string;
  name: string;
  shortName: string;
  number: number;
  position: PositionRole;
  nationality: string;
  age: number;
  overall: number;
  attributes: PlayerAttributes;
  appearance: PlayerAppearance;
  marketValue: number; // in millions EUR
  wage: number;        // weekly in thousands EUR
  contractYears: number;
  fitness: number;     // 0-100 for Career mode
  injuredWeeks: number;
  archetype?: PlayerArchetype;
  morale?: number;     // 0-100
  formArrow?: FormArrow;
  isRegen?: boolean;
  regenFrom?: string;
}

export type Mentality = 'ultra-defensive' | 'defensive' | 'balanced' | 'attacking' | 'all-out-attack';

export interface TeamTactics {
  formationId: string;
  attackingFormationId?: string;
  defendingFormationId?: string;
  mentality: Mentality;
  pressing: 'low' | 'medium' | 'high';
  passingStyle: 'short' | 'mixed' | 'long';
  lineHeight: number;     // 0.2 to 0.9
  compactness?: number;   // 0.2 to 0.9 (PES 2012 zonal squeeze)
  supportRange?: number;  // 0.2 to 0.9 (teammate run spacing)
  counterAttack?: boolean;
  manMarking?: Record<string, string>; // defenderSlot/id -> opponentRoleOrSlotKey
  cornerRoutine?: CornerRoutine;
  freeKickRoutine?: FreeKickRoutine;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  category: TeamCategory;
  leagueName: string;
  rating: {
    attack: number;
    midfield: number;
    defense: number;
    overall: number;
  };
  homeKit: KitDesign;
  awayKit: KitDesign;
  altKit?: KitDesign;
  crest: CrestConfig;
  tactics: TeamTactics;
  startingXI: string[]; // 11 player IDs matching formation slot order
  substitutes: string[]; // up to 7 player IDs
  roster: Player[];
  budget: number; // Career starting budget in millions
}

export interface FormationSlot {
  index: number;
  role: PositionRole;
  /** Normalized X across team half: 0 = own goal line, 1 = halfway/attacking anchor */
  x: number;
  /** Normalized Y across pitch width: -1 = left touchline, +1 = right touchline */
  y: number;
}

export interface FormationPreset {
  id: string;
  name: string;
  label: string;
  description: string;
  slots: FormationSlot[];
}

export type WeatherCondition = 'clear' | 'rain' | 'snow';

export interface StadiumConfig {
  id: string;
  name: string;
  city: string;
  capacity: number;
  timeOfDay: 'night' | 'dusk' | 'day' | 'overcast';
  pitchPattern: 'stripes' | 'checkered' | 'classic';
  standColor: string;
  accentColor: string;
}

export type DifficultyLevel =
  | 'beginner'
  | 'amateur'
  | 'regular'
  | 'professional'
  | 'top-player'
  | 'legend'
  | 'superstar';

export type CameraPreset =
  | 'broadcast'
  | 'wide'
  | 'dynamic'
  | 'vertical'
  | 'stadium'
  | 'player-lock'
  | 'broadcast-wide'
  | 'tele'
  | 'end-to-end';

export type ReplayCameraPreset = 'director' | 'goalcam' | 'sideline' | 'helicopter';

export type MatchImportance = 'friendly' | 'league' | 'cup' | 'derby' | 'final';

export type CursorColorTier = 'orange' | 'gold' | 'cyan' | 'emerald' | 'rose';
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  sprint: string;
  shortPass: string;
  throughPass: string;
  shoot: string;
  loftedPass: string;
  switchPlayer: string;
  tackle: string;
  tacticalMod: string;
  feint: string;
  roulette: string;
  pause: string;
}

export interface GameSettings {
  matchDurationMinutes: 3 | 5 | 7 | 10;
  difficulty: DifficultyLevel;
  gameSpeed: 0.85 | 1.0 | 1.15;
  cameraPreset: CameraPreset;
  cameraDistance: number; // 0.8 - 1.4
  cameraHeight: number;   // 0.8 - 1.4
  cursorColor: CursorColorTier;
  graphicsQuality: GraphicsQuality;
  resolutionScale: 0.75 | 1.0 | 1.25;
  sfxVolume: number;      // 0 - 1
  musicVolume: number;    // 0 - 1
  crowdVolume: number;    // 0 - 1
  vibration: boolean;
  mobileControlLayout: 'auto' | 'always-on' | 'off';
  offsideRule: boolean;
  injuriesEnabled: boolean;
  keyBindings: KeyBindings;
}

export type MatchModeType =
  | 'exhibition'
  | 'tournament'
  | 'league'
  | 'career'
  | 'legend'
  | 'training'
  | 'practice';

export type TrainingDrillType =
  | 'free-practice'
  | 'target-shooting'
  | 'dribbling-slalom'
  | 'free-kick-challenge'
  | 'passing'
  | 'shooting'
  | 'dribbling'
  | 'goalkeeper'
  | 'set-pieces'
  | 'penalties';

export type TrainingMedal = 'none' | 'bronze' | 'silver' | 'gold';

export interface MatchConfig {
  mode: MatchModeType;
  homeTeam: Team;
  awayTeam: Team;
  homeKitType: KitSlot;
  awayKitType: KitSlot;
  stadium: StadiumConfig;
  weather?: WeatherCondition;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  allowExtraTime: boolean;
  allowPenalties: boolean;
  trainingDrill?: TrainingDrillType;
  legendPlayerId?: string;
  preferredCameraPreset?: CameraPreset;
  importance?: MatchImportance;
  competitionContext?: {
    competitionId: string;
    fixtureId: string;
    label: string;
  };
}

export interface MatchTeamStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  possessionTicks: number;
  passesAttempted: number;
  passesCompleted: number;
  tackles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  offsides: number;
  saves: number;
}

export interface MatchGoalEvent {
  minute: number;
  teamSide: 'home' | 'away';
  scorerId: string;
  scorerName: string;
  assistName?: string;
}

export interface MatchSummary {
  id: string;
  playedAt: string;
  mode: MatchModeType;
  competitionLabel?: string;
  homeTeamId: string;
  homeTeamName: string;
  homeShortCode: string;
  awayTeamId: string;
  awayTeamName: string;
  awayShortCode: string;
  homeGoals: number;
  awayGoals: number;
  penalties?: { home: number; away: number };
  homeStats: MatchTeamStats;
  awayStats: MatchTeamStats;
  goalEvents: MatchGoalEvent[];
  manOfTheMatch: string;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  trainingResult?: {
    drill: TrainingDrillType;
    score: number;
    medal: TrainingMedal;
  };
  legendEval?: {
    playerId: string;
    playerName: string;
    rating: number;
    goals: number;
    assists: number;
    passesCompleted: number;
    shotsOnTarget: number;
    tacklesWon: number;
  };
}

export interface Fixture {
  id: string;
  round: number;
  stageLabel: string;
  groupId?: string;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  penalties?: { home: number; away: number };
  goalScorers?: { playerId: string; playerName: string; teamId: string; minute: number }[];
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  shortCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TournamentState {
  id: string;
  name: string;
  size: 8 | 16;
  userTeamId: string;
  teamIds: string[];
  phase: 'group' | 'quarterfinal' | 'semifinal' | 'final' | 'completed';
  groups: { id: string; name: string; teamIds: string[] }[];
  fixtures: Fixture[];
  championTeamId?: string;
  updatedAt: string;
}

export interface LeagueScorerEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamShortCode: string;
  goals: number;
}

export interface LeagueState {
  id: string;
  name: string;
  userTeamId: string;
  teamIds: string[];
  currentRound: number;
  totalRounds: number;
  fixtures: Fixture[];
  scorers: LeagueScorerEntry[];
  completed: boolean;
  championTeamId?: string;
  updatedAt: string;
}

export interface TransferListing {
  player: Player;
  sellingTeamId: string;
  sellingTeamName: string;
  askingPrice: number;
}

export interface CareerObjective {
  id: string;
  title: string;
  targetPosition: number;
  completed: boolean;
}

export interface SponsorContract {
  id: string;
  name: string;
  signingBonus: number; // Millions
  winBonus: number;     // Millions per win
  weeklyIncome: number; // Millions per week
  signed: boolean;
}

export interface CareerStaffLevels {
  coach: number;   // 1..5: boosts youth & young player attribute growth
  scout: number;   // 1..5: discounts transfer fees
  medical: number; // 1..5: faster recovery & fewer strain injuries
  youth: number;   // 1..5: raises seasonal academy prospect OVR
}

export interface SponsorTarget {
  id: string;
  title: string;
  targetType: 'wins' | 'goals' | 'clean-sheets';
  targetValue: number;
  currentValue: number;
  bonusAmount: number;
  claimed: boolean;
}

export interface InternationalManagerOffer {
  id: string;
  nationId: string;
  nationName: string;
  expectation: string;
  salaryBonus: number;
}

export interface CareerState {
  id: string;
  clubId: string;
  seasonNumber: number;
  budget: number; // Millions
  weeklyWageBill: number; // Thousands
  league: LeagueState;
  squad: Player[];
  transferMarket: TransferListing[];
  youthAcademy: Player[];
  sponsors: SponsorContract[];
  activeSponsorId?: string;
  sponsorTargets?: SponsorTarget[];
  staffLevels?: CareerStaffLevels;
  revealedPlayerIds?: string[];
  internationalOffers?: InternationalManagerOffer[];
  activeNationId?: string;
  objectives: CareerObjective[];
  trainingFocus: 'attack' | 'passing' | 'defense' | 'fitness';
  newsFeed: { id: string; week: number; headline: string }[];
  trophiesWon: number;
  updatedAt: string;
}

export interface BecomeLegendOffer {
  id: string;
  clubId: string;
  clubName: string;
  weeklyWage: number;
  rolePromise: string;
}

export interface BecomeLegendState {
  id: string;
  player: Player;
  clubId: string;
  seasonNumber: number;
  league: LeagueState;
  appearances: number;
  goals: number;
  assists: number;
  avgRating: number;
  xp: number;
  skillPoints: number;
  managerTrust?: number; // 0-100
  releaseClause?: number; // Millions EUR
  intlCallUps?: number;
  intlNationName?: string;
  loanOrTransferStatus?: 'none' | 'loan-requested' | 'transfer-requested';
  trainingFocus: 'speed' | 'shooting' | 'passing' | 'technique' | 'defense';
  offers: BecomeLegendOffer[];
  newsFeed: { id: string; week: number; headline: string }[];
  updatedAt: string;
}

export interface PersistentSaveData {
  version: number;
  lastMode: 'exhibition' | 'tournament' | 'league' | 'career' | 'legend' | null;
  settings: GameSettings;
  customTeams: Record<string, Team>;
  matchHistory: MatchSummary[];
  activeTournament: TournamentState | null;
  activeLeague: LeagueState | null;
  activeCareer: CareerState | null;
  activeLegend: BecomeLegendState | null;
  trainingMedals?: Record<string, TrainingMedal>;
  records: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    cleanSheets: number;
    tournamentsWon: number;
    leaguesWon: number;
    biggestWinMargin: number;
    biggestWinLabel: string;
  };
}

export type AppScreen =
  | 'loading'
  | 'title'
  | 'main-menu'
  | 'match-setup'
  | 'match-live'
  | 'tournament'
  | 'league'
  | 'career'
  | 'become-legend'
  | 'team-management'
  | 'edit-mode'
  | 'training'
  | 'practice-arena'
  | 'community'
  | 'match-history'
  | 'stats-records'
  | 'settings'
  | 'controls-guide'
  | 'data-management'
  | 'credits';
