import {
  DifficultyLevel,
  MatchConfig,
  MatchGoalEvent,
  MatchTeamStats,
  Mentality,
  Team,
  TrainingDrillType,
  TrainingMedal,
  WeatherCondition,
} from '../../types/football';
import { getFormationById } from '../../data/formations';
import { computeLegendMatchRating } from '../../career/legendEngine';
import { computeTrainingMedal, getDrillSpec } from '../training/trainingDrills';
import {
  BALL_RADIUS,
  GOAL_HEIGHT,
  HALF_GOAL_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  PENALTY_SPOT_DIST,
  PLAYER_RADIUS,
  detectPitchBoundary,
} from '../physics/pitchPhysics';
import {
  BallState,
  createInitialBall,
  launchBall,
  stepBallPhysics,
} from '../ball/ballPhysics';
import {
  PlayerActionAnim,
  SimPlayer,
  attachBallToDribbler,
  createSimPlayer,
  moveSimPlayer,
  resolvePlayerCollisions,
  stepPlayerVerticalJump,
  triggerPlayerSkill,
} from '../players/playerKinematics';
import {
  MatchPhase,
  RestartContext,
  adjudicateFoul,
  checkOffsideOnPass,
  computeSetPieceSpot,
} from '../rules/matchRules';
import { decidePlayerAI, getDifficultyProfile } from '../ai/teamAI';

export interface UserMatchInput {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  shortPassPressed: boolean;
  throughPassPressed: boolean;
  loftedPassPressed: boolean;
  shootHeld: boolean;
  shootReleased: boolean;
  switchPlayerPressed: boolean;
  tacklePressed: boolean;
  tacticalModPressed: boolean;
  tacticalModHeld: boolean;
  feintPressed: boolean;
  roulettePressed: boolean;
}

export interface TrainingTarget {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  active: boolean;
  kind: 'gate' | 'goal-target';
  points: number;
}

export type SimSoundEvent =
  | 'whistle-start'
  | 'whistle-short'
  | 'whistle-full'
  | 'kick'
  | 'pass'
  | 'post'
  | 'goal'
  | 'save'
  | 'tackle'
  | 'crowd-ooh';

export interface PenaltyShootoutState {
  round: number;
  turn: 'home' | 'away';
  homeResults: ('goal' | 'miss')[];
  awayResults: ('goal' | 'miss')[];
  homeScore: number;
  awayScore: number;
  finished: boolean;
  winner: 'home' | 'away' | null;
}

export interface LegendMatchEval {
  playerId: string;
  playerName: string;
  rating: number;
  goals: number;
  assists: number;
  passesCompleted: number;
  shotsOnTarget: number;
  tacklesWon: number;
}

export interface ReplayPlayerFrame {
  id: string;
  side: 'home' | 'away';
  x: number;
  y: number;
  z: number;
  facing: number;
  actionAnim: PlayerActionAnim;
  walkCycle: number;
  redCard: boolean;
}

export interface ReplayFrame {
  minute: number;
  ball: { x: number; y: number; z: number; rotX: number; rotZ: number };
  players: ReplayPlayerFrame[];
}

export interface CardCutsceneState {
  playerId: string;
  playerName: string;
  side: 'home' | 'away';
  card: 'yellow' | 'red';
  offenderX: number;
  offenderZ: number;
  refX: number;
  refZ: number;
  nextPhase: 'free-kick' | 'penalty-kick';
}

export type ManagerReaction = 'calm' | 'applaud' | 'frustrated';

export interface SimulationSnapshot {
  phase: MatchPhase;
  half: 1 | 2 | 3 | 4; // 3 & 4 are extra time halves
  matchClockSeconds: number;
  displayMinute: number;
  homeScore: number;
  awayScore: number;
  homeStats: MatchTeamStats;
  awayStats: MatchTeamStats;
  goalEvents: MatchGoalEvent[];
  lastEventBanner: string | null;
  controlledPlayerId: string | null;
  controlledPlayerName: string;
  controlledPlayerStamina: number;
  teammateRunnerId: string | null;
  shielding: boolean;
  weather: WeatherCondition;
  shotCharge: number; // 0..1
  offsideEnabled: boolean;
  crowdIntensity: number; // 0..1
  walkoutProgress: number;
  cardCutscene: CardCutsceneState | null;
  homeManagerReaction: ManagerReaction;
  awayManagerReaction: ManagerReaction;
  isDefendingFreeKick: boolean;
  replayCount: number;
  trainingDrill?: TrainingDrillType;
  trainingFeedback: string | null;
  trainingScore: number;
  trainingAttempts: number;
  trainingMaxAttempts: number;
  trainingTimeLeft: number;
  trainingCompleted: boolean;
  trainingMedal: TrainingMedal;
  trainingTargets: TrainingTarget[];
  legendEval: LegendMatchEval | null;
  penaltyShootout: PenaltyShootoutState | null;
  homePlayers: SimPlayer[];
  awayPlayers: SimPlayer[];
  ball: BallState;
}

function emptyStats(): MatchTeamStats {
  return {
    goals: 0,
    shots: 0,
    shotsOnTarget: 0,
    possessionTicks: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    tackles: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
    corners: 0,
    offsides: 0,
    saves: 0,
  };
}

export class FootballSimulation {
  public config: MatchConfig;
  public homeTeam: Team;
  public awayTeam: Team;
  public players: SimPlayer[] = [];
  public ball: BallState = createInitialBall();

  public phase: MatchPhase = 'kickoff';
  public half: 1 | 2 | 3 | 4 = 1;
  public matchClockSeconds = 0;
  public phaseTimer = 1.2;
  public restartContext: RestartContext = { teamSide: 'home', x: 0, z: 0 };

  public homeScore = 0;
  public awayScore = 0;
  public homeStats: MatchTeamStats = emptyStats();
  public awayStats: MatchTeamStats = emptyStats();
  public goalEvents: MatchGoalEvent[] = [];

  public controlledId: string | null = null;
  public teammateRunnerId: string | null = null;
  public weather: WeatherCondition;
  public legendPlayerId?: string;
  public shotCharge = 0;
  public lastEventBanner: string | null = null;
  public bannerTimer = 0;
  public pendingSoundEvents: SimSoundEvent[] = [];
  public cameraTrauma = 0;

  public offsideEnabled = true;
  public difficulty: DifficultyLevel;
  public speedScale = 1.0;
  public crowdIntensity = 0.2;

  // Training state
  public trainingScore = 0;
  public trainingAttempts = 0;
  public trainingMaxAttempts = 0;
  public trainingTimeLeft = 0;
  public trainingCompleted = false;
  public trainingMedal: TrainingMedal = 'none';
  public trainingFeedback: string | null = null;
  public trainingTargets: TrainingTarget[] = [];
  private slalomGateIndex = 0;
  private fkShotSettlingTimer = 0;

  // Become a Legend per-match counters
  private legendGoals = 0;
  private legendAssists = 0;
  private legendPassesCompleted = 0;
  private legendShotsOnTarget = 0;
  private legendTacklesWon = 0;
  private lastHomePasserId: string | null = null;

  // Penalty shootout state
  public penaltyShootout: PenaltyShootoutState | null = null;

  // Broadcast presentation & replay state
  public enableWalkout = false;
  public walkoutProgress = 1;
  public referee = { x: 0, z: -8, facing: Math.PI / 2, walkCycle: 0 };
  public homeManagerReaction: ManagerReaction = 'calm';
  public awayManagerReaction: ManagerReaction = 'calm';
  private homeManagerTimer = 0;
  private awayManagerTimer = 0;
  public cardCutscene: CardCutsceneState | null = null;
  public netWaveTimer = 0;
  public lastScoringSide: 'home' | 'away' | null = null;
  private wallAdvancedThisFk = false;
  private replayBuffer: ReplayFrame[] = [];
  private replaySampleAccum = 0;

  private aiDecisionTimer = 0;
  private cachedPassOriginSide: 'home' | 'away' | null = null;
  private pendingOffside: { teamSide: 'home' | 'away'; x: number; z: number } | null = null;

  constructor(
    config: MatchConfig,
    options?: { offsideRule?: boolean; speedScale?: number; enableWalkout?: boolean }
  ) {
    this.config = config;
    this.homeTeam = JSON.parse(JSON.stringify(config.homeTeam));
    this.awayTeam = JSON.parse(JSON.stringify(config.awayTeam));
    this.difficulty = config.difficulty;
    this.weather = config.weather ?? 'clear';
    this.legendPlayerId = config.legendPlayerId;
    this.offsideEnabled = options?.offsideRule ?? true;
    this.speedScale = options?.speedScale ?? 1.0;
    this.enableWalkout = options?.enableWalkout ?? false;

    this.spawnTeams();
    this.setupMode();
  }

  private setupMode(): void {
    if (this.config.mode === 'training' || this.config.mode === 'practice') {
      const drill = this.config.trainingDrill ?? 'free-practice';
      const spec = getDrillSpec(drill);
      this.trainingScore = 0;
      this.trainingAttempts = 0;
      this.trainingMaxAttempts = spec.maxAttempts;
      this.trainingTimeLeft = spec.timeLimitSec;
      this.trainingCompleted = false;
      this.trainingMedal = 'none';
      this.trainingTargets = [];
      this.slalomGateIndex = 0;

      if (drill === 'penalties') {
        this.phase = 'penalty-kick';
        this.restartContext = { teamSide: 'home', x: HALF_LENGTH - PENALTY_SPOT_DIST, z: 0 };
        this.positionForSetPiece();
      } else if (drill === 'target-shooting' || drill === 'shooting') {
        this.phase = 'playing';
        this.trainingTargets = [
          { id: 'tgt-left', x: HALF_LENGTH - 0.35, y: 1.65, z: -2.4, radius: 1.25, active: true, kind: 'goal-target', points: 150 },
          { id: 'tgt-right', x: HALF_LENGTH - 0.35, y: 1.65, z: 2.4, radius: 1.25, active: true, kind: 'goal-target', points: 150 },
        ];
        this.resetShootingSpot();
        this.trainingFeedback = 'Target Shooting: Strike glowing targets (+150) or beat keeper (+100)!';
      } else if (drill === 'dribbling-slalom' || drill === 'dribbling') {
        this.phase = 'playing';
        const gateCoords: [number, number][] = [
          [5, -5.5],
          [13, 5.5],
          [21, -5.0],
          [29, 5.0],
          [37, -4.0],
          [44, 3.5],
        ];
        this.trainingTargets = gateCoords.map(([gx, gz], idx) => ({
          id: `gate-${idx}`,
          x: gx,
          y: 0.65,
          z: gz,
          radius: 2.35,
          active: idx === 0,
          kind: 'gate',
          points: 100,
        }));
        const striker = this.players.find((p) => p.side === 'home' && p.role === 'ST') ?? this.players[9];
        if (striker) {
          striker.x = -2;
          striker.z = 0;
          striker.vx = 0;
          striker.vz = 0;
          striker.facing = 0;
          this.ball.x = -1;
          this.ball.z = 0;
          this.ball.ownerId = striker.id;
          this.setControlledPlayer(striker.id);
        }
        this.trainingFeedback = 'Slalom: Weave through glowing gates (+100) + Feint [C] or 360° [V] (+50 bonus)!';
      } else if (drill === 'free-kick-challenge' || drill === 'set-pieces') {
        this.trainingTargets = [
          { id: 'fk-tgt-l', x: HALF_LENGTH - 0.35, y: 1.75, z: -2.45, radius: 1.3, active: true, kind: 'goal-target', points: 200 },
          { id: 'fk-tgt-r', x: HALF_LENGTH - 0.35, y: 1.75, z: 2.45, radius: 1.3, active: true, kind: 'goal-target', points: 200 },
        ];
        this.setupNextFreeKickAttempt();
        this.trainingFeedback = 'Free Kick Challenge: Aim with WASD & Hold/Release [L] to bend over the wall!';
      } else if (drill === 'passing') {
        this.phase = 'playing';
        this.trainingFeedback = 'Complete crisp passes [J / K] between teammates.';
      } else if (drill === 'goalkeeper') {
        this.phase = 'playing';
        const gk = this.players.find((p) => p.side === 'home' && p.role === 'GK')!;
        this.setControlledPlayer(gk.id);
        this.ball.x = -24;
        this.ball.z = 2;
        this.trainingFeedback = 'Control the Goalkeeper to track and block incoming AI attacks.';
      } else {
        this.phase = 'playing';
        this.trainingFeedback = 'Open pitch training — practice dribbling, feints [C/V], and teammate runs [E].';
      }
      return;
    }

    if (this.enableWalkout) {
      this.setupWalkout();
    } else {
      this.setupKickoff('home');
    }
  }

  private setupWalkout(): void {
    this.phase = 'walkout';
    this.phaseTimer = 3.0;
    this.walkoutProgress = 0;
    this.ball = createInitialBall();
    const homePlayers = this.players.filter((p) => p.side === 'home');
    const awayPlayers = this.players.filter((p) => p.side === 'away');
    homePlayers.forEach((p, idx) => {
      p.x = -1.6;
      p.z = -18 + idx * 1.1;
      p.facing = Math.PI / 2;
      p.actionAnim = 'run';
    });
    awayPlayers.forEach((p, idx) => {
      p.x = 1.6;
      p.z = -18 + idx * 1.1;
      p.facing = Math.PI / 2;
      p.actionAnim = 'run';
    });
    this.referee.x = 0;
    this.referee.z = -19.5;
    this.referee.facing = Math.PI / 2;
    this.showBanner(`${this.homeTeam.shortCode} vs ${this.awayTeam.shortCode} — MATCHDAY WALKOUT`, 2.6);
  }

  public skipWalkout(): void {
    if (this.phase === 'walkout') {
      this.setupKickoff('home');
    }
  }

  private resetShootingSpot(): void {
    const zOffset = (this.trainingAttempts % 3 - 1) * 4.5;
    this.ball = createInitialBall();
    this.ball.x = 26;
    this.ball.z = zOffset;
    const striker = this.players.find((p) => p.side === 'home' && p.role === 'ST') ?? this.players[9];
    if (striker) {
      striker.x = 24.5;
      striker.z = zOffset;
      striker.vx = 0;
      striker.vz = 0;
      striker.facing = 0;
      this.ball.ownerId = striker.id;
      this.setControlledPlayer(striker.id);
    }
  }

  private setupNextFreeKickAttempt(): void {
    const spots: [number, number][] = [
      [HALF_LENGTH - 22, -6],
      [HALF_LENGTH - 24, 5],
      [HALF_LENGTH - 20, 0],
      [HALF_LENGTH - 25, -10],
      [HALF_LENGTH - 21, 9],
    ];
    const [fx, fz] = spots[this.trainingAttempts % spots.length];
    this.phase = 'free-kick';
    this.restartContext = { teamSide: 'home', x: fx, z: fz };
    this.positionForSetPiece();
    this.fkShotSettlingTimer = 0;

    // Position 3-man defensive wall between ball and goal
    const wallX = fx + (HALF_LENGTH - fx) * 0.42;
    const wallBaseZ = fz * 0.58;
    const awayOutfield = this.players.filter((p) => p.side === 'away' && p.role !== 'GK' && !p.redCard);
    for (let i = 0; i < 3; i++) {
      const w = awayOutfield[i];
      if (w) {
        w.x = wallX;
        w.z = wallBaseZ + (i - 1) * 1.15;
        w.vx = 0;
        w.vz = 0;
        w.facing = Math.PI;
      }
    }
  }

  private spawnTeams(): void {
    this.players = [];
    this.spawnSide(this.homeTeam, 'home');
    this.spawnSide(this.awayTeam, 'away');
    const legend = this.legendPlayerId
      ? this.players.find((p) => p.side === 'home' && p.id === this.legendPlayerId)
      : undefined;
    const firstAttacker = legend ?? this.players.find((p) => p.side === 'home' && p.role !== 'GK');
    if (firstAttacker) this.setControlledPlayer(firstAttacker.id);
  }

  private spawnSide(team: Team, side: 'home' | 'away'): void {
    const formation = getFormationById(team.tactics.formationId);
    const dir = side === 'home' ? 1 : -1;

    team.startingXI.slice(0, 11).forEach((pid, idx) => {
      const rosterPlayer = team.roster.find((p) => p.id === pid) ?? team.roster[idx];
      if (!rosterPlayer) return;
      const slot = formation.slots[idx] ?? formation.slots[0];
      const spawnX = dir * (-HALF_LENGTH * 0.92 + slot.x * HALF_LENGTH * 0.85);
      const spawnZ = dir * slot.y * (HALF_WIDTH * 0.82);
      this.players.push(createSimPlayer(rosterPlayer, side, idx, slot.role, spawnX, spawnZ));
    });
  }

  public setControlledPlayer(playerId: string): void {
    if (this.legendPlayerId) {
      const legend = this.players.find((p) => p.side === 'home' && p.id === this.legendPlayerId && !p.redCard);
      if (legend && playerId !== legend.id) {
        this.controlledId = legend.id;
        for (const p of this.players) {
          p.isControlled = p.id === legend.id;
        }
        return;
      }
    }
    this.controlledId = playerId;
    for (const p of this.players) {
      p.isControlled = p.id === playerId;
    }
  }

  public setupKickoff(kickingSide: 'home' | 'away'): void {
    this.phase = 'kickoff';
    this.phaseTimer = 0.95;
    this.ball = createInitialBall();
    this.teammateRunnerId = null;
    this.restartContext = { teamSide: kickingSide, x: 0, z: 0 };

    for (const side of ['home', 'away'] as const) {
      const team = side === 'home' ? this.homeTeam : this.awayTeam;
      const formation = getFormationById(team.tactics.formationId);
      const dir = side === 'home' ? 1 : -1;
      const sidePlayers = this.players.filter((p) => p.side === side && !p.redCard);

      sidePlayers.forEach((p, idx) => {
        const slot = formation.slots[p.slotIndex] ?? formation.slots[idx];
        const rawX = dir * (-HALF_LENGTH * 0.92 + slot.x * HALF_LENGTH * 0.85);
        p.x = side === 'home' ? Math.min(-1.2, rawX) : Math.max(1.2, rawX);
        p.z = dir * slot.y * (HALF_WIDTH * 0.82);
        p.vx = 0;
        p.vz = 0;
        p.teammateRunTimer = 0;
        p.facing = side === 'home' ? 0 : Math.PI;
        p.actionAnim = 'idle';
      });

      if (side === kickingSide && sidePlayers.length > 0) {
        const kicker = sidePlayers[sidePlayers.length - 1];
        kicker.x = side === 'home' ? -0.6 : 0.6;
        kicker.z = 0;
        if (side === 'home' && !this.legendPlayerId) this.setControlledPlayer(kicker.id);
      }
    }

    if (this.legendPlayerId) {
      this.setControlledPlayer(this.legendPlayerId);
    } else if (kickingSide === 'away') {
      const homeCenter = this.players.find((p) => p.side === 'home' && !p.redCard && p.role !== 'GK');
      if (homeCenter) this.setControlledPlayer(homeCenter.id);
    }

    this.pendingSoundEvents.push('whistle-start');
  }

  private positionForSetPiece(): void {
    const { teamSide, x, z } = this.restartContext;
    const attackDir = teamSide === 'home' ? 1 : -1;
    const attackingTeam = teamSide === 'home' ? this.homeTeam : this.awayTeam;
    this.wallAdvancedThisFk = false;
    this.ball.x = x;
    this.ball.z = z;
    this.ball.y = BALL_RADIUS;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.ownerId = null;

    const takers = this.players.filter((p) => p.side === teamSide && !p.redCard);
    const taker =
      this.phase === 'goal-kick'
        ? takers.find((p) => p.role === 'GK') ?? takers[0]
        : takers
            .filter((p) => p.role !== 'GK')
            .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0] ?? takers[0];

    if (taker) {
      taker.x = x - attackDir * 0.7;
      taker.z = z;
      taker.vx = 0;
      taker.vz = 0;
      taker.facing = Math.atan2(-z, attackDir * HALF_LENGTH - x);
      this.restartContext.takerId = taker.id;
      if (teamSide === 'home' && !this.legendPlayerId) this.setControlledPlayer(taker.id);
    }

    // Apply Corner Routine tactical positioning
    if (this.phase === 'corner-kick') {
      const routine = attackingTeam.tactics.cornerRoutine ?? 'standard';
      const cornerSign = Math.sign(z || 1);
      const attackers = takers.filter((p) => p.id !== taker?.id && p.role !== 'GK').slice(-3);
      if (routine === 'near-post') {
        attackers.forEach((att, idx) => {
          att.x = attackDir * (HALF_LENGTH - 7 - idx * 2.2);
          att.z = cornerSign * (3.2 + idx * 1.4);
        });
      } else if (routine === 'far-post') {
        attackers.forEach((att, idx) => {
          att.x = attackDir * (HALF_LENGTH - 7.5 - idx * 2.0);
          att.z = -cornerSign * (3.8 + idx * 1.5);
        });
      } else if (routine === 'short-decoy' && attackers[0]) {
        attackers[0].x = x - attackDir * 4.5;
        attackers[0].z = z - cornerSign * 5.2;
      }
    }

    // Apply Free Kick defensive 3-man wall when inside shooting range
    const distToGoal = Math.hypot(attackDir * HALF_LENGTH - x, z);
    if (this.phase === 'free-kick' && distToGoal < 33) {
      const wallX = x + ((attackDir * HALF_LENGTH - x) * 9.5) / Math.max(10, distToGoal);
      const wallZ = z + (-z * 9.5) / Math.max(10, distToGoal);
      const wallDefenders = this.players
        .filter((p) => p.side !== teamSide && p.role !== 'GK' && !p.redCard)
        .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
        .slice(0, 3);
      wallDefenders.forEach((w, idx) => {
        w.x = wallX;
        w.z = wallZ + (idx - 1) * 1.1;
        w.vx = 0;
        w.vz = 0;
        w.facing = Math.atan2(z - w.z, x - w.x);
      });
    } else if (this.phase === 'free-kick' || this.phase === 'corner-kick' || this.phase === 'penalty-kick') {
      for (const opp of this.players) {
        if (opp.side === teamSide || opp.redCard) continue;
        if (this.phase === 'penalty-kick' && opp.role === 'GK') {
          opp.x = (opp.side === 'home' ? -1 : 1) * (HALF_LENGTH - 0.5);
          opp.z = 0;
          continue;
        }
        const dx = opp.x - x;
        const dz = opp.z - z;
        const d = Math.hypot(dx, dz);
        if (d < 9.5) {
          opp.x = x + (dx / (d || 1)) * 9.8;
          opp.z = z + (dz / (d || 1)) * 9.8;
        }
      }
    }

    this.phaseTimer = this.phase === 'penalty-kick' ? 1.0 : 0.85;
  }

  public advanceWall(): boolean {
    if (this.phase !== 'free-kick' || this.restartContext.teamSide !== 'away' || this.wallAdvancedThisFk) {
      return false;
    }
    this.wallAdvancedThisFk = true;
    const bx = this.restartContext.x;
    const bz = this.restartContext.z;
    const wall = this.players
      .filter((p) => p.side === 'home' && p.role !== 'GK' && !p.redCard)
      .sort((a, b) => Math.hypot(a.x - bx, a.z - bz) - Math.hypot(b.x - bx, b.z - bz))
      .slice(0, 3);
    for (const w of wall) {
      const dx = bx - w.x;
      const dz = bz - w.z;
      const d = Math.hypot(dx, dz) || 1;
      w.x += (dx / d) * 0.65;
      w.z += (dz / d) * 0.65;
    }
    this.showBanner('WALL INCHED FORWARD', 1.1);
    return true;
  }

  public jumpWall(): boolean {
    const bx = this.restartContext.x;
    const bz = this.restartContext.z;
    const wall = this.players
      .filter((p) => p.side === 'home' && p.role !== 'GK' && !p.redCard && p.y <= 0.05)
      .sort((a, b) => Math.hypot(a.x - bx, a.z - bz) - Math.hypot(b.x - bx, b.z - bz))
      .slice(0, 3);
    if (wall.length === 0) return false;
    for (const w of wall) {
      w.wallJumpVy = 5.6;
    }
    return true;
  }

  public getReplayFrames(): ReplayFrame[] {
    return this.replayBuffer;
  }

  private setManagerReaction(side: 'home' | 'away', reaction: ManagerReaction, duration = 3.0): void {
    if (side === 'home') {
      this.homeManagerReaction = reaction;
      this.homeManagerTimer = duration;
    } else {
      this.awayManagerReaction = reaction;
      this.awayManagerTimer = duration;
    }
  }

  private captureReplayFrame(): void {
    const minute = Math.min(120, Math.floor(this.matchClockSeconds / 60));
    const frame: ReplayFrame = {
      minute,
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        z: this.ball.z,
        rotX: this.ball.rotX,
        rotZ: this.ball.rotZ,
      },
      players: this.players.map((p) => ({
        id: p.id,
        side: p.side,
        x: p.x,
        y: p.y,
        z: p.z,
        facing: p.facing,
        actionAnim: p.actionAnim,
        walkCycle: p.walkCycle,
        redCard: p.redCard,
      })),
    };
    this.replayBuffer.push(frame);
    if (this.replayBuffer.length > 180) {
      this.replayBuffer.shift();
    }
  }

  public setTeamMentality(side: 'home' | 'away', mentality: Mentality): void {
    const team = side === 'home' ? this.homeTeam : this.awayTeam;
    team.tactics.mentality = mentality;
  }

  public setTeamFormation(side: 'home' | 'away', formationId: string): void {
    const team = side === 'home' ? this.homeTeam : this.awayTeam;
    team.tactics.formationId = formationId;
  }

  public makeSubstitution(side: 'home' | 'away', outPlayerId: string, inPlayerId: string): boolean {
    const team = side === 'home' ? this.homeTeam : this.awayTeam;
    const xiIdx = team.startingXI.indexOf(outPlayerId);
    const subIdx = team.substitutes.indexOf(inPlayerId);
    if (xiIdx === -1 || subIdx === -1) return false;

    const inPlayer = team.roster.find((p) => p.id === inPlayerId);
    const simOutIdx = this.players.findIndex((p) => p.id === outPlayerId && p.side === side);
    if (!inPlayer || simOutIdx === -1) return false;

    const oldSim = this.players[simOutIdx];
    if (oldSim.redCard) return false;

    team.startingXI[xiIdx] = inPlayerId;
    team.substitutes[subIdx] = outPlayerId;

    const newSim = createSimPlayer(inPlayer, side, oldSim.slotIndex, oldSim.role, oldSim.x, oldSim.z);
    newSim.isControlled = oldSim.isControlled;
    this.players[simOutIdx] = newSim;
    if (oldSim.isControlled) this.setControlledPlayer(newSim.id);
    return true;
  }

  public startSecondHalf(): void {
    if (this.phase !== 'halftime') return;
    this.half = 2;
    this.matchClockSeconds = 2700;
    this.setupKickoff('away');
  }

  public startExtraTime(): void {
    if (this.phase !== 'extra-time-break') return;
    this.half = 3;
    this.matchClockSeconds = 5400;
    this.setupKickoff('home');
  }

  public startPenaltyShootout(): void {
    this.phase = 'penalty-shootout';
    this.penaltyShootout = {
      round: 1,
      turn: 'home',
      homeResults: [],
      awayResults: [],
      homeScore: 0,
      awayScore: 0,
      finished: false,
      winner: null,
    };
    this.prepareNextPenaltyShot();
  }

  private prepareNextPenaltyShot(): void {
    if (!this.penaltyShootout) return;
    const kickingSide = this.penaltyShootout.turn;
    const spotX = HALF_LENGTH - PENALTY_SPOT_DIST;
    this.ball = createInitialBall();
    this.ball.x = spotX;
    this.ball.z = 0;

    const shooters = this.players.filter((p) => p.side === kickingSide && !p.redCard && p.role !== 'GK');
    const shooter = shooters[(this.penaltyShootout.round - 1) % Math.max(1, shooters.length)] ?? shooters[0];
    const keeper = this.players.find((p) => p.side !== kickingSide && p.role === 'GK') ?? this.players[0];

    for (const p of this.players) {
      p.vx = 0;
      p.vz = 0;
      p.x = -8 + (p.slotIndex - 5) * 1.6;
      p.z = p.side === 'home' ? -12 : 12;
      p.actionAnim = 'idle';
    }

    if (shooter) {
      shooter.x = spotX - 2.4;
      shooter.z = 0;
      shooter.facing = 0;
      if (kickingSide === 'home' && !this.legendPlayerId) this.setControlledPlayer(shooter.id);
    }
    if (keeper) {
      keeper.x = HALF_LENGTH - 0.4;
      keeper.z = 0;
      keeper.facing = Math.PI;
    }
    this.phaseTimer = 0.7;
  }

  public shootPenaltyShootout(aimZ: number, power = 0.82): void {
    if (this.phase !== 'penalty-shootout' || !this.penaltyShootout || this.penaltyShootout.finished) return;
    const ps = this.penaltyShootout;
    const kickingSide = ps.turn;
    const keeperSide = kickingSide === 'home' ? 'away' : 'home';
    const keeper = this.players.find((p) => p.side === keeperSide && p.role === 'GK');
    const shooters = this.players.filter((p) => p.side === kickingSide && !p.redCard && p.role !== 'GK');
    const shooter = shooters[(ps.round - 1) % Math.max(1, shooters.length)] ?? shooters[0];

    const clampedAimZ = Math.max(-HALF_GOAL_WIDTH * 0.92, Math.min(HALF_GOAL_WIDTH * 0.92, aimZ));
    const keeperChoices = [-2.5, 0, 2.5];
    const roll = Math.floor(Math.abs(Math.sin((ps.round * 13 + ps.homeScore * 7 + ps.awayScore * 5) * 1.9)) * 3) % 3;
    const keeperGuessZ = keeperChoices[roll];

    if (keeper) {
      keeper.actionAnim = 'dive';
      keeper.actionTimer = 0.6;
      keeper.diveDirZ = Math.sign(keeperGuessZ);
      keeper.z = keeperGuessZ * 0.75;
    }

    const gkSkill = (keeper?.attributes.goalkeeping ?? 75) / 100;
    const shooterSkill = (shooter?.attributes.shooting ?? 75) / 100;
    const saved = Math.abs(clampedAimZ - keeperGuessZ) < 1.35 && power < 0.92 && gkSkill + 0.1 > shooterSkill;
    const missedWide = power > 0.96 && Math.abs(clampedAimZ) > HALF_GOAL_WIDTH * 0.85;
    const isGoal = !saved && !missedWide;

    launchBall(
      this.ball,
      shooter?.id ?? 'pen',
      kickingSide,
      HALF_LENGTH - this.ball.x,
      clampedAimZ - this.ball.z,
      26 + power * 8,
      2.2 + power * 2.1,
      0,
      true
    );

    if (isGoal) {
      if (kickingSide === 'home') {
        ps.homeResults.push('goal');
        ps.homeScore++;
      } else {
        ps.awayResults.push('goal');
        ps.awayScore++;
      }
      this.showBanner(`${kickingSide === 'home' ? this.homeTeam.shortCode : this.awayTeam.shortCode} SCORES!`, 1.4);
      this.pendingSoundEvents.push('goal');
    } else {
      if (kickingSide === 'home') ps.homeResults.push('miss');
      else ps.awayResults.push('miss');
      this.showBanner(saved ? 'SAVED BY KEEPER!' : 'OFF TARGET!', 1.4);
      this.pendingSoundEvents.push(saved ? 'save' : 'crowd-ooh');
    }

    const hLen = ps.homeResults.length;
    const aLen = ps.awayResults.length;
    if (hLen <= 5 && aLen <= 5) {
      const hRem = 5 - hLen;
      const aRem = 5 - aLen;
      if (ps.homeScore > ps.awayScore + aRem) {
        ps.finished = true;
        ps.winner = 'home';
      } else if (ps.awayScore > ps.homeScore + hRem) {
        ps.finished = true;
        ps.winner = 'away';
      } else if (hLen === 5 && aLen === 5 && ps.homeScore !== ps.awayScore) {
        ps.finished = true;
        ps.winner = ps.homeScore > ps.awayScore ? 'home' : 'away';
      }
    } else if (hLen === aLen && ps.homeScore !== ps.awayScore) {
      ps.finished = true;
      ps.winner = ps.homeScore > ps.awayScore ? 'home' : 'away';
    }

    if (ps.finished) {
      this.phase = 'fulltime';
      this.pendingSoundEvents.push('whistle-full');
    } else {
      if (ps.turn === 'away') ps.round++;
      ps.turn = ps.turn === 'home' ? 'away' : 'home';
      setTimeout(() => {
        if (this.phase === 'penalty-shootout') this.prepareNextPenaltyShot();
      }, 1100);
    }
  }

  public showBanner(text: string, duration = 2.2): void {
    this.lastEventBanner = text;
    this.bannerTimer = duration;
  }

  public triggerTeammateControl(aimX = 0, aimZ = 0, forcedRunnerId?: string): SimPlayer | null {
    const ballOwner = this.players.find((p) => p.id === this.ball.ownerId) ?? null;
    const homeInPossession = ballOwner?.side === 'home' || this.ball.ownerId === null || Boolean(forcedRunnerId);
    const controlled = this.players.find((p) => p.id === this.controlledId);
    const originX = controlled?.x ?? this.ball.x;
    const originZ = controlled?.z ?? this.ball.z;
    const aimLen = Math.hypot(aimX, aimZ);
    const ax = aimLen > 0.15 ? aimX / aimLen : 1;
    const az = aimLen > 0.15 ? aimZ / aimLen : 0;

    if (homeInPossession) {
      let runner: SimPlayer | null = null;
      if (forcedRunnerId) {
        runner = this.players.find((p) => p.id === forcedRunnerId && p.side === 'home' && !p.redCard && p.role !== 'GK') ?? null;
      } else {
        const candidates = this.players
          .filter((p) => p.side === 'home' && !p.redCard && p.role !== 'GK' && p.id !== this.controlledId)
          .sort((a, b) => {
            const dxA = a.x - originX;
            const dzA = a.z - originZ;
            const distA = Math.hypot(dxA, dzA) || 1;
            const dotA = aimLen > 0.15 ? (dxA / distA) * ax + (dzA / distA) * az : dxA / distA;

            const dxB = b.x - originX;
            const dzB = b.z - originZ;
            const distB = Math.hypot(dxB, dzB) || 1;
            const dotB = aimLen > 0.15 ? (dxB / distB) * ax + (dzB / distB) * az : dxB / distB;

            const scoreA = dotA * 18 + (a.x - originX) * 0.6 - distA * 0.25;
            const scoreB = dotB * 18 + (b.x - originX) * 0.6 - distB * 0.25;
            return scoreB - scoreA;
          });
        runner = candidates[0] ?? null;
      }

      if (runner) {
        runner.teammateRunTimer = 2.6;
        const dirX = aimLen > 0.15 ? Math.max(0.45, ax) : 1;
        const dirZ = aimLen > 0.15 ? az : runner.z > 0 ? -0.25 : 0.25;
        runner.teammateRunTargetX = Math.max(-HALF_LENGTH + 8, Math.min(HALF_LENGTH - 4, runner.x + dirX * 16));
        runner.teammateRunTargetZ = Math.max(
          -HALF_WIDTH + 4,
          Math.min(HALF_WIDTH - 4, runner.z + dirZ * 10)
        );
        this.teammateRunnerId = runner.id;
        return runner;
      }
    } else {
      // Defensive Teammate Press: send nearest unmarked home teammate to double-press ball
      const presser = this.players
        .filter((p) => p.side === 'home' && !p.redCard && p.role !== 'GK' && p.id !== this.controlledId)
        .sort((a, b) => Math.hypot(a.x - this.ball.x, a.z - this.ball.z) - Math.hypot(b.x - this.ball.x, b.z - this.ball.z))[0] ?? null;
      if (presser) {
        presser.teammateRunTimer = 1.6;
        presser.teammateRunTargetX = this.ball.x;
        presser.teammateRunTargetZ = this.ball.z;
        this.teammateRunnerId = presser.id;
        return presser;
      }
    }
    return null;
  }

  public step(dt: number, input: UserMatchInput): void {
    const clampedDt = Math.min(dt, 0.05);
    this.cameraTrauma = Math.max(0, this.cameraTrauma - clampedDt * 1.8);
    if (this.netWaveTimer > 0) this.netWaveTimer = Math.max(0, this.netWaveTimer - clampedDt);
    if (this.homeManagerTimer > 0) {
      this.homeManagerTimer = Math.max(0, this.homeManagerTimer - clampedDt);
      if (this.homeManagerTimer === 0) this.homeManagerReaction = 'calm';
    }
    if (this.awayManagerTimer > 0) {
      this.awayManagerTimer = Math.max(0, this.awayManagerTimer - clampedDt);
      if (this.awayManagerTimer === 0) this.awayManagerReaction = 'calm';
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - clampedDt);
      if (this.bannerTimer === 0) this.lastEventBanner = null;
    }

    if (
      this.phase === 'halftime' ||
      this.phase === 'extra-time-break' ||
      this.phase === 'fulltime' ||
      this.trainingCompleted
    ) {
      return;
    }

    // Pre-Match Walkout Phase (skippable via Enter/Space/Pass or button)
    if (this.phase === 'walkout') {
      this.phaseTimer -= clampedDt;
      this.walkoutProgress = Math.max(0, Math.min(1, 1 - this.phaseTimer / 3.0));
      for (const p of this.players) {
        p.z += clampedDt * 5.0;
        p.walkCycle += clampedDt * 6.5;
        p.actionAnim = 'run';
      }
      this.referee.z += clampedDt * 5.0;
      this.referee.walkCycle += clampedDt * 6.5;
      if (
        this.phaseTimer <= 0 ||
        input.shortPassPressed ||
        input.throughPassPressed ||
        input.shootReleased
      ) {
        this.setupKickoff('home');
      }
      return;
    }

    // Referee Disciplinary Card Cutscene Phase
    if (this.phase === 'card-cutscene' && this.cardCutscene) {
      this.phaseTimer -= clampedDt;
      if (this.phaseTimer <= 0) {
        this.phase = this.cardCutscene.nextPhase;
        this.cardCutscene = null;
        this.positionForSetPiece();
      }
      return;
    }

    // Keep wall vertical jumps animating even during restarts
    for (const p of this.players) {
      stepPlayerVerticalJump(p, clampedDt);
    }

    // Referee trails play organically without crowding ball
    const targetRefX = Math.max(-HALF_LENGTH + 8, Math.min(HALF_LENGTH - 8, this.ball.x * 0.72));
    const targetRefZ = Math.max(-HALF_WIDTH + 4, Math.min(HALF_WIDTH - 4, this.ball.z * 0.72 - 8.5));
    const rdx = targetRefX - this.referee.x;
    const rdz = targetRefZ - this.referee.z;
    const rdist = Math.hypot(rdx, rdz);
    if (rdist > 0.4) {
      const rStep = Math.min(rdist, clampedDt * 5.5);
      this.referee.x += (rdx / rdist) * rStep;
      this.referee.z += (rdz / rdist) * rStep;
      this.referee.walkCycle += rStep * 2.2;
      this.referee.facing = Math.atan2(this.ball.z - this.referee.z, this.ball.x - this.referee.x);
    }

    // Dynamic crowd excitement intensity (0.18 idle .. 1.0 goal)
    const attackZoneHeat = Math.max(0, (Math.abs(this.ball.x) - HALF_LENGTH * 0.35) / (HALF_LENGTH * 0.65));
    const shotHeat = this.ball.isShotInFlight ? 0.35 : 0;
    const goalHeat = this.phase === 'goal-celebration' ? 1.0 : 0;
    const targetCrowd = Math.min(1, Math.max(0.18, goalHeat || 0.18 + attackZoneHeat * 0.45 + shotHeat));
    this.crowdIntensity += (targetCrowd - this.crowdIntensity) * Math.min(1, clampedDt * 4);

    if (this.phase === 'penalty-shootout') {
      stepBallPhysics(this.ball, clampedDt, false, this.weather);
      if (this.penaltyShootout && !this.penaltyShootout.finished && this.penaltyShootout.turn === 'away') {
        this.phaseTimer -= clampedDt;
        if (this.phaseTimer <= 0) {
          const aiAim = ((this.penaltyShootout.round % 3) - 1) * 2.4;
          this.shootPenaltyShootout(aiAim, 0.78);
        }
      }
      return;
    }

    if (this.phase === 'goal-celebration') {
      this.phaseTimer -= clampedDt;
      stepBallPhysics(this.ball, clampedDt, true, this.weather);
      for (const p of this.players) {
        if (p.side === this.restartContext.teamSide) {
          p.actionAnim = 'celebrate';
        }
      }
      this.replaySampleAccum += clampedDt;
      if (this.replaySampleAccum >= 0.05) {
        this.replaySampleAccum = 0;
        this.captureReplayFrame();
      }
      if (this.phaseTimer <= 0) {
        const concededSide = this.restartContext.teamSide === 'home' ? 'away' : 'home';
        this.setupKickoff(concededSide);
      }
      return;
    }

    if (
      this.phase === 'kickoff' ||
      this.phase === 'throw-in' ||
      this.phase === 'goal-kick' ||
      this.phase === 'corner-kick' ||
      this.phase === 'free-kick' ||
      this.phase === 'penalty-kick'
    ) {
      this.phaseTimer -= clampedDt;
      const isUserTurn = this.restartContext.teamSide === 'home';

      if (this.phase === 'kickoff') {
        if (
          this.phaseTimer <= 0 ||
          (isUserTurn &&
            (input.shortPassPressed || input.throughPassPressed || Math.hypot(input.moveX, input.moveZ) > 0.2))
        ) {
          this.phase = 'playing';
          const kicker =
            this.players.find((p) => p.id === this.controlledId && p.side === this.restartContext.teamSide) ??
            this.players.find((p) => p.side === this.restartContext.teamSide && p.role !== 'GK');
          if (kicker) {
            this.ball.ownerId = kicker.id;
            this.ball.lastTouchId = kicker.id;
            this.ball.lastTouchSide = kicker.side;
          }
        }
        return;
      }

      const taker = this.players.find((p) => p.id === this.restartContext.takerId);
      if (taker) {
        if (
          isUserTurn &&
          !this.legendPlayerId &&
          (input.shortPassPressed || input.throughPassPressed || input.loftedPassPressed || input.shootReleased)
        ) {
          this.executeSetPieceKick(taker, input);
          this.phase = 'playing';
        } else if ((!isUserTurn || this.legendPlayerId) && this.phaseTimer <= 0) {
          this.executeAISetPiece(taker);
          this.phase = 'playing';
        }
      } else {
        this.phase = 'playing';
      }
      return;
    }

    // Active Playing Phase
    this.advanceMatchClock(clampedDt);
    if (this.phase !== 'playing') return;

    // Graded Training Timer & Target Checking
    if (this.config.mode === 'training' || this.config.mode === 'practice') {
      this.stepGradedTraining(clampedDt);
      if (this.trainingCompleted) return;
    }

    // Player switching [Q] (locked in Become a Legend mode)
    if (input.switchPlayerPressed && !this.legendPlayerId) {
      this.switchToBestHomePlayer();
    }

    // Teammate Control System [E] (directed by movement stick if held)
    if (input.tacticalModPressed) {
      this.triggerTeammateControl(input.moveX, input.moveZ);
    }

    if (this.teammateRunnerId) {
      const runner = this.players.find((p) => p.id === this.teammateRunnerId);
      if (!runner || runner.teammateRunTimer <= 0) {
        this.teammateRunnerId = null;
      }
    }

    // Track possession stats
    if (this.ball.ownerId) {
      const owner = this.players.find((p) => p.id === this.ball.ownerId);
      if (owner) {
        if (owner.side === 'home') this.homeStats.possessionTicks++;
        else this.awayStats.possessionTicks++;
      }
    }

    const controlled = this.players.find((p) => p.id === this.controlledId);
    if (controlled && this.ball.ownerId === controlled.id && input.shootHeld) {
      this.shotCharge = Math.min(1, this.shotCharge + clampedDt * 1.45);
    }

    // Become a Legend: Call for pass from AI home teammate
    if (
      this.legendPlayerId &&
      controlled &&
      this.ball.ownerId &&
      this.ball.ownerId !== controlled.id &&
      (input.shortPassPressed || input.throughPassPressed)
    ) {
      const carrier = this.players.find((p) => p.id === this.ball.ownerId && p.side === 'home');
      if (carrier && carrier.kickCooldown <= 0) {
        const kind = input.throughPassPressed ? 'through' : 'pass';
        const leadX = input.throughPassPressed ? controlled.x + controlled.vx * 0.45 : controlled.x;
        const leadZ = input.throughPassPressed ? controlled.z + controlled.vz * 0.45 : controlled.z;
        this.executeKick(carrier, kind, leadX - carrier.x, leadZ - carrier.z, 0.72);
      }
    }

    const homePresserId = this.findClosestOutfieldPlayer('home');
    const awayPresserId = this.findClosestOutfieldPlayer('away');
    const homeCoverId = this.findSecondClosestOutfieldPlayer('home', homePresserId);
    const awayCoverId = this.findSecondClosestOutfieldPlayer('away', awayPresserId);

    const ballOwner = this.players.find((p) => p.id === this.ball.ownerId) ?? null;
    const homeHasBall = ballOwner?.side === 'home';
    const awayHasBall = ballOwner?.side === 'away';

    const profile = getDifficultyProfile(this.difficulty);
    this.aiDecisionTimer -= clampedDt;
    if (this.aiDecisionTimer <= 0) this.aiDecisionTimer = profile.reactionInterval;

    for (const p of this.players) {
      if (p.redCard) continue;
      const hasBall = this.ball.ownerId === p.id;

      if (p.id === this.controlledId) {
        this.stepControlledPlayer(p, input, hasBall, clampedDt);
      } else {
        const team = p.side === 'home' ? this.homeTeam : this.awayTeam;
        const teamPoss = p.side === 'home' ? homeHasBall : awayHasBall;
        const presserId = p.side === 'home' ? homePresserId : awayPresserId;
        const coverId = p.side === 'home' ? homeCoverId : awayCoverId;
        const decision = decidePlayerAI(
          p,
          this.players,
          this.ball,
          team.tactics,
          teamPoss,
          p.id === presserId,
          p.id === coverId,
          this.difficulty
        );

        moveSimPlayer(p, decision.moveX, decision.moveZ, decision.sprint, hasBall, this.speedScale, clampedDt, this.weather);

        if (decision.action === 'gk-dive' && p.tackleCooldown <= 0) {
          p.actionAnim = 'dive';
          p.actionTimer = 0.55;
          p.tackleCooldown = 1.2;
          p.diveDirZ = decision.diveDirZ ?? 1;
          p.vz = (decision.diveDirZ ?? 1) * 8.5;
        } else if (decision.action === 'tackle' && p.tackleCooldown <= 0) {
          this.attemptTackle(p);
        } else if (hasBall && p.kickCooldown <= 0 && decision.action !== 'none') {
          const tx = decision.targetX ?? p.x + Math.cos(p.facing) * 15;
          const tz = decision.targetZ ?? p.z + Math.sin(p.facing) * 15;
          const err = decision.action === 'shoot' ? profile.shotErrorRad : profile.passErrorRad;
          const angle = Math.atan2(tz - p.z, tx - p.x) + Math.sin(this.matchClockSeconds * 19 + p.slotIndex) * err;
          const dx = Math.cos(angle);
          const dz = Math.sin(angle);
          this.executeKick(p, decision.action as 'pass' | 'through' | 'loft' | 'shoot', dx, dz, decision.power ?? 0.7);
        }
      }

      if (this.ball.ownerId === p.id) {
        attachBallToDribbler(p, this.ball, clampedDt);
      }
    }

    resolvePlayerCollisions(this.players, this.ball.ownerId);

    const ballEvents = stepBallPhysics(this.ball, clampedDt, false, this.weather);
    if (ballEvents.hitPost) {
      this.pendingSoundEvents.push('post');
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.45);
      this.showBanner('OFF THE WOODWORK!', 1.5);
    }

    this.handleBallPlayerInteractions();

    const boundary = detectPitchBoundary(this.ball.x, this.ball.y, this.ball.z);
    if (boundary.type !== 'none') {
      this.handleBoundaryEvent(boundary);
    }

    this.replaySampleAccum += clampedDt;
    if (this.replaySampleAccum >= 0.05) {
      this.replaySampleAccum = 0;
      this.captureReplayFrame();
    }
  }

  private stepGradedTraining(dt: number): void {
    const drill = this.config.trainingDrill;
    if (!drill) return;

    if (this.trainingTimeLeft > 0) {
      this.trainingTimeLeft = Math.max(0, this.trainingTimeLeft - dt);
      if (this.trainingTimeLeft === 0) {
        this.finishGradedTraining();
        return;
      }
    }

    // Dribbling Slalom gate traversal
    if (drill === 'dribbling-slalom' || drill === 'dribbling') {
      const carrier = this.players.find((p) => p.id === this.controlledId);
      const activeGate = this.trainingTargets[this.slalomGateIndex];
      if (carrier && activeGate && this.ball.ownerId === carrier.id) {
        const d = Math.hypot(carrier.x - activeGate.x, carrier.z - activeGate.z);
        if (d <= activeGate.radius) {
          const skillBonus = carrier.recentSkillTimer > 0 ? 50 : 0;
          const pts = activeGate.points + skillBonus;
          this.trainingScore += pts;
          this.trainingAttempts++;
          this.pendingSoundEvents.push('pass');
          activeGate.active = false;
          this.slalomGateIndex = (this.slalomGateIndex + 1) % this.trainingTargets.length;
          this.trainingTargets[this.slalomGateIndex].active = true;
          this.trainingFeedback =
            skillBonus > 0
              ? `GATE CLEARED +${pts} PTS (SKILL BONUS!)`
              : `Gate Cleared +${pts} pts! Next gate active.`;
          // If finished lap, reset runner back smoothly to start for continuous lap
          if (this.slalomGateIndex === 0) {
            carrier.x = -2;
            carrier.z = 0;
            this.ball.x = -1;
            this.ball.z = 0;
            this.showBanner('LAP COMPLETE! KEEP DRIBBLING!', 1.4);
          }
        }
      }
    }

    // Goal-target precision check for Target Shooting & Free Kick Challenge
    if (
      (drill === 'target-shooting' || drill === 'shooting' || drill === 'free-kick-challenge' || drill === 'set-pieces') &&
      this.ball.isShotInFlight
    ) {
      for (const tgt of this.trainingTargets) {
        if (tgt.kind !== 'goal-target' || !tgt.active) continue;
        const d = Math.hypot(this.ball.x - tgt.x, this.ball.y - tgt.y, this.ball.z - tgt.z);
        if (d <= tgt.radius + 0.35) {
          this.trainingScore += tgt.points;
          this.pendingSoundEvents.push('goal');
          this.cameraTrauma = 0.55;
          this.showBanner(`BULLSEYE TARGET! +${tgt.points}`, 1.6);
          this.trainingFeedback = `Precision Target Hit! Score: ${this.trainingScore}`;
          if (drill === 'free-kick-challenge' || drill === 'set-pieces') {
            if (this.trainingAttempts >= this.trainingMaxAttempts && this.trainingMaxAttempts > 0) {
              this.finishGradedTraining();
            } else {
              this.setupNextFreeKickAttempt();
            }
          } else {
            this.resetShootingSpot();
          }
          return;
        }
      }
    }

    // Free Kick Challenge shot settle timeout
    if ((drill === 'free-kick-challenge' || drill === 'set-pieces') && this.trainingMaxAttempts > 0) {
      if (this.ball.ownerId === null && Math.hypot(this.ball.vx, this.ball.vz) < 1.2) {
        this.fkShotSettlingTimer += dt;
        if (this.fkShotSettlingTimer > 1.1) {
          if (this.trainingAttempts >= this.trainingMaxAttempts) {
            this.finishGradedTraining();
          } else {
            this.setupNextFreeKickAttempt();
          }
        }
      } else {
        this.fkShotSettlingTimer = 0;
      }
    }
  }

  private finishGradedTraining(): void {
    this.trainingCompleted = true;
    this.trainingMedal = computeTrainingMedal(this.config.trainingDrill, this.trainingScore);
    this.pendingSoundEvents.push('whistle-full');
    const medalLabel = this.trainingMedal === 'none' ? 'COMPLETED' : `${this.trainingMedal.toUpperCase()} MEDAL`;
    this.showBanner(`DRILL ${medalLabel}!`, 3.0);
  }

  private stepControlledPlayer(
    p: SimPlayer,
    input: UserMatchInput,
    hasBall: boolean,
    dt: number
  ): void {
    moveSimPlayer(p, input.moveX, input.moveZ, input.sprint, hasBall, this.speedScale, dt, this.weather);

    // Special Feints & Close Control (Body Feint [C] & 360 Roulette [V])
    if (input.feintPressed || input.roulettePressed) {
      const skill = input.roulettePressed ? 'roulette' : 'feint';
      if (triggerPlayerSkill(p, skill, input.moveZ)) {
        this.pendingSoundEvents.push('pass');
        for (const opp of this.players) {
          if (opp.side !== p.side && !opp.redCard && Math.hypot(opp.x - p.x, opp.z - p.z) < 2.6) {
            opp.stunTimer = Math.max(opp.stunTimer, 0.42);
          }
        }
      }
    }

    const aimX = Math.hypot(input.moveX, input.moveZ) > 0.15 ? input.moveX : Math.cos(p.facing);
    const aimZ = Math.hypot(input.moveX, input.moveZ) > 0.15 ? input.moveZ : Math.sin(p.facing);

    if (hasBall && p.kickCooldown <= 0) {
      if (input.shootReleased || (input.shootHeld && this.shotCharge >= 0.98)) {
        const power = Math.max(0.35, this.shotCharge);
        this.shotCharge = 0;
        const goalDirX = HALF_LENGTH - p.x;
        const goalDirZ = -p.z * 0.55 + aimZ * 4.5;
        const dirX = aimX > -0.2 ? goalDirX * 0.55 + aimX * 25 : aimX;
        const dirZ = aimX > -0.2 ? goalDirZ * 0.4 + aimZ * 12 : aimZ;
        this.executeKick(p, 'shoot', dirX, dirZ, power);
        return;
      }

      if (input.shortPassPressed) {
        this.shotCharge = 0;
        const target = this.findBestPassTarget(p, aimX, aimZ);
        if (target) {
          this.executeKick(p, 'pass', target.x - p.x, target.z - p.z, 0.62);
        } else {
          this.executeKick(p, 'pass', aimX, aimZ, 0.55);
        }
        // Give-and-Go: holding Teammate Modifier [E] while passing sends passer sprinting forward!
        if (input.tacticalModHeld && !this.legendPlayerId) {
          this.triggerTeammateControl(1, aimZ, p.id);
        }
        return;
      }

      if (input.throughPassPressed) {
        this.shotCharge = 0;
        const target = this.findBestPassTarget(p, aimX, aimZ);
        if (target) {
          this.executeKick(p, 'through', target.x + 6 - p.x, target.z - p.z, 0.72);
        } else {
          this.executeKick(p, 'through', aimX, aimZ, 0.72);
        }
        if (input.tacticalModHeld && !this.legendPlayerId) {
          this.triggerTeammateControl(1, aimZ, p.id);
        }
        return;
      }

      if (input.loftedPassPressed) {
        this.shotCharge = 0;
        this.executeKick(p, 'loft', aimX, aimZ, 0.76);
        return;
      }
    } else {
      if (input.shootReleased) this.shotCharge = 0;
      if (input.tacklePressed && p.tackleCooldown <= 0) {
        this.attemptTackle(p);
      }
    }
  }

  private findBestPassTarget(passer: SimPlayer, aimX: number, aimZ: number): SimPlayer | null {
    const aimLen = Math.hypot(aimX, aimZ) || 1;
    const ax = aimX / aimLen;
    const az = aimZ / aimLen;

    let best: SimPlayer | null = null;
    let bestScore = -999;

    for (const m of this.players) {
      if (m.side !== passer.side || m.id === passer.id || m.redCard) continue;
      const dx = m.x - passer.x;
      const dz = m.z - passer.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.5 || dist > 48) continue;
      const dot = (dx / dist) * ax + (dz / dist) * az;
      if (dot < 0.25) continue;
      const runnerBonus = m.teammateRunTimer > 0 ? 0.65 : 0;
      const score = dot * 3.0 - dist * 0.04 + runnerBonus;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  private executeKick(
    p: SimPlayer,
    kind: 'pass' | 'through' | 'loft' | 'shoot',
    dirX: number,
    dirZ: number,
    power: number
  ): void {
    const stats = p.side === 'home' ? this.homeStats : this.awayStats;
    p.kickCooldown = 0.35;
    p.actionAnim = 'kick';
    p.actionTimer = 0.28;
    p.facing = Math.atan2(dirZ, dirX);

    if (kind === 'pass' || kind === 'through' || kind === 'loft') {
      stats.passesAttempted++;
      this.cachedPassOriginSide = p.side;
      if (p.side === 'home') this.lastHomePasserId = p.id;
      const receiver = this.findBestPassTarget(p, dirX, dirZ);
      if (receiver) {
        const off = checkOffsideOnPass(p, receiver, this.ball, this.players, this.offsideEnabled);
        if (off.isOffside) {
          this.pendingOffside = { teamSide: off.defendingSide, x: off.restartX, z: off.restartZ };
        } else {
          this.pendingOffside = null;
        }
      }
    }

    if (kind === 'shoot') {
      stats.shots++;
      this.pendingOffside = null;
      const shootSkill = 0.85 + (p.attributes.shooting / 99) * 0.32;
      const hSpeed = (18 + power * 15) * shootSkill;
      const vSpeed = 2.6 + power * 4.4;
      const spin = (p.attributes.shooting / 99) * 1.6 * Math.sign(dirZ || 1);
      launchBall(this.ball, p.id, p.side, dirX, dirZ, hSpeed, vSpeed, spin, true);
      this.pendingSoundEvents.push('kick');
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.18 * power);
      if (this.config.mode === 'training' || this.config.mode === 'practice') this.trainingAttempts++;
    } else if (kind === 'loft') {
      const passSkill = 0.88 + (p.attributes.passing / 99) * 0.22;
      const curl = (p.attributes.passing / 99) * 1.15 * Math.sign(dirZ || 1);
      launchBall(this.ball, p.id, p.side, dirX, dirZ, (15 + power * 9) * passSkill, 7.2 + power * 3.5, curl, false);
      this.pendingSoundEvents.push('pass');
    } else if (kind === 'through') {
      const passSkill = 0.9 + (p.attributes.passing / 99) * 0.2;
      launchBall(this.ball, p.id, p.side, dirX, dirZ, (17 + power * 7) * passSkill, 1.4, 0, false);
      this.pendingSoundEvents.push('pass');
    } else {
      const passSkill = 0.9 + (p.attributes.passing / 99) * 0.2;
      launchBall(this.ball, p.id, p.side, dirX, dirZ, (13 + power * 7) * passSkill, 0.6, 0, false);
      this.pendingSoundEvents.push('pass');
    }
  }

  private executeSetPieceKick(taker: SimPlayer, input: UserMatchInput): void {
    const team = taker.side === 'home' ? this.homeTeam : this.awayTeam;
    const attackDir = taker.side === 'home' ? 1 : -1;
    const aimX = Math.hypot(input.moveX, input.moveZ) > 0.15 ? input.moveX : attackDir;
    const aimZ = Math.hypot(input.moveX, input.moveZ) > 0.15 ? input.moveZ : -taker.z * 0.3;

    if (this.phase === 'penalty-kick') {
      const targetX = attackDir * HALF_LENGTH - taker.x;
      const targetZ = aimZ * 2.8;
      this.executeKick(taker, 'shoot', targetX, targetZ, 0.82);
    } else if (this.phase === 'corner-kick') {
      const routine = team.tactics.cornerRoutine ?? 'standard';
      const cornerSign = Math.sign(taker.z || 1);
      if (routine === 'short-decoy') {
        const decoy = this.findBestPassTarget(taker, -attackDir, -cornerSign);
        if (decoy) {
          this.executeKick(taker, 'pass', decoy.x - taker.x, decoy.z - taker.z, 0.55);
          return;
        }
      }
      const targetZ =
        routine === 'near-post' ? cornerSign * 3.5 : routine === 'far-post' ? -cornerSign * 4.5 : -taker.z * 0.4;
      this.executeKick(taker, 'loft', attackDir * HALF_LENGTH - 8 - taker.x, targetZ - taker.z, 0.8);
    } else if (this.phase === 'free-kick') {
      const fkRoutine = team.tactics.freeKickRoutine ?? 'direct-curl';
      if (fkRoutine === 'two-kicker-layoff') {
        const nearby = this.findBestPassTarget(taker, aimX, aimZ);
        if (nearby) {
          this.executeKick(taker, 'pass', nearby.x - taker.x, nearby.z - taker.z, 0.52);
          return;
        }
      }
      const curlBias = fkRoutine === 'direct-curl' ? 1.1 : 0.6;
      const goalX = attackDir * HALF_LENGTH - taker.x;
      const goalZ = (Math.hypot(input.moveX, input.moveZ) > 0.15 ? aimZ * 4.5 : -taker.z * 0.35) * curlBias;
      this.executeKick(taker, 'shoot', goalX, goalZ, fkRoutine === 'dummy-over' ? 0.86 : 0.78);
    } else {
      this.executeKick(taker, 'pass', aimX, aimZ, 0.65);
    }
  }

  private executeAISetPiece(taker: SimPlayer): void {
    const team = taker.side === 'home' ? this.homeTeam : this.awayTeam;
    const attackDir = taker.side === 'home' ? 1 : -1;
    if (this.phase === 'penalty-kick') {
      this.executeKick(taker, 'shoot', attackDir * HALF_LENGTH - taker.x, 2.2 * attackDir, 0.84);
      return;
    }
    if (this.phase === 'free-kick' && Math.hypot(attackDir * HALF_LENGTH - taker.x, taker.z) < 30) {
      const fkRoutine = team.tactics.freeKickRoutine ?? 'direct-curl';
      if (fkRoutine !== 'two-kicker-layoff') {
        this.executeKick(taker, 'shoot', attackDir * HALF_LENGTH - taker.x, -taker.z * 0.35 + 1.4, 0.8);
        return;
      }
    }
    const teammates = this.players.filter((m) => m.side === taker.side && m.id !== taker.id && !m.redCard);
    const target =
      teammates.sort((a, b) => Math.hypot(a.x - taker.x, a.z - taker.z) - Math.hypot(b.x - taker.x, b.z - taker.z))[1] ??
      teammates[0];
    if (target) {
      const kind = this.phase === 'corner-kick' && team.tactics.cornerRoutine !== 'short-decoy' ? 'loft' : 'pass';
      this.executeKick(taker, kind, target.x - taker.x, target.z - taker.z, 0.7);
    } else {
      this.executeKick(taker, 'pass', attackDir, 0, 0.65);
    }
  }

  private attemptTackle(tackler: SimPlayer): void {
    tackler.tackleCooldown = 1.05;
    tackler.actionAnim = 'tackle';
    tackler.actionTimer = 0.36;
    tackler.vx = Math.cos(tackler.facing) * 10.5;
    tackler.vz = Math.sin(tackler.facing) * 10.5;
    this.pendingSoundEvents.push('tackle');

    const stats = tackler.side === 'home' ? this.homeStats : this.awayStats;
    const oppOwner = this.players.find((p) => p.id === this.ball.ownerId && p.side !== tackler.side);
    const distToBall = Math.hypot(this.ball.x - tackler.x, this.ball.z - tackler.z);

    if (oppOwner && Math.hypot(oppOwner.x - tackler.x, oppOwner.z - tackler.z) < 2.2) {
      const foulCheck = adjudicateFoul(tackler, oppOwner, true);
      if (foulCheck.isFoul && this.config.mode !== 'training') {
        stats.fouls++;
        this.setManagerReaction(tackler.side, 'frustrated', 3.2);
        let issuedCard: 'yellow' | 'red' | null = null;
        if (foulCheck.card === 'yellow') {
          tackler.yellowCards++;
          stats.yellowCards++;
          if (tackler.yellowCards >= 2) {
            tackler.redCard = true;
            stats.redCards++;
            issuedCard = 'red';
            this.showBanner(`RED CARD! ${tackler.shortName} sent off`, 2.5);
          } else {
            issuedCard = 'yellow';
            this.showBanner(`YELLOW CARD: ${tackler.shortName}`, 2.0);
          }
        } else if (foulCheck.card === 'red') {
          tackler.redCard = true;
          stats.redCards++;
          issuedCard = 'red';
          this.showBanner(`STRAIGHT RED CARD! ${tackler.shortName}`, 2.6);
        } else {
          this.showBanner(foulCheck.isPenalty ? 'PENALTY KICK!' : 'FREE KICK!', 2.0);
        }
        this.pendingSoundEvents.push('whistle-short');
        this.restartContext = foulCheck.restart;
        const nextPhase: 'free-kick' | 'penalty-kick' = foulCheck.isPenalty ? 'penalty-kick' : 'free-kick';

        if (issuedCard && this.config.mode !== 'practice') {
          const refX = Math.max(-HALF_LENGTH + 3, Math.min(HALF_LENGTH - 3, tackler.x + 2.1));
          const refZ = Math.max(-HALF_WIDTH + 3, Math.min(HALF_WIDTH - 3, tackler.z + 1.2));
          this.referee.x = refX;
          this.referee.z = refZ;
          this.referee.facing = Math.atan2(tackler.z - refZ, tackler.x - refX);
          tackler.facing = Math.atan2(refZ - tackler.z, refX - tackler.x);
          this.cardCutscene = {
            playerId: tackler.id,
            playerName: tackler.name,
            side: tackler.side,
            card: issuedCard,
            offenderX: tackler.x,
            offenderZ: tackler.z,
            refX,
            refZ,
            nextPhase,
          };
          this.phase = 'card-cutscene';
          this.phaseTimer = 1.85;
          return;
        }

        this.phase = nextPhase;
        this.positionForSetPiece();
        return;
      }

      stats.tackles++;
      if (tackler.id === this.legendPlayerId) this.legendTacklesWon++;
      oppOwner.stunTimer = 0.55;
      this.ball.ownerId = tackler.id;
      this.ball.lastTouchId = tackler.id;
      this.ball.lastTouchSide = tackler.side;
      if (tackler.side === 'home' && !this.legendPlayerId) this.setControlledPlayer(tackler.id);
    } else if (distToBall < 1.9 && this.ball.ownerId === null) {
      stats.tackles++;
      if (tackler.id === this.legendPlayerId) this.legendTacklesWon++;
      this.ball.ownerId = tackler.id;
      this.ball.lastTouchId = tackler.id;
      this.ball.lastTouchSide = tackler.side;
      if (tackler.side === 'home' && !this.legendPlayerId) this.setControlledPlayer(tackler.id);
    }
  }

  private handleBallPlayerInteractions(): void {
    if (this.ball.ownerId !== null || this.ball.pickupCooldown > 0) return;

    for (const p of this.players) {
      if (p.redCard || p.stunTimer > 0) continue;
      const dx = this.ball.x - p.x;
      const dz = this.ball.z - p.z;
      const dist = Math.hypot(dx, dz);

      const reach = p.role === 'GK' ? (p.actionAnim === 'dive' ? 1.85 : 1.25) : PLAYER_RADIUS + BALL_RADIUS + 0.35;
      const maxHeight = p.role === 'GK' ? GOAL_HEIGHT + 0.25 : 1.75 + (p.y || 0);

      if (dist <= reach && this.ball.y <= maxHeight) {
        if (this.pendingOffside && this.pendingOffside.teamSide !== p.side) {
          const offStats = p.side === 'home' ? this.homeStats : this.awayStats;
          offStats.offsides++;
          this.showBanner('OFFSIDE!', 2.0);
          this.pendingSoundEvents.push('whistle-short');
          this.restartContext = this.pendingOffside;
          this.pendingOffside = null;
          this.phase = 'free-kick';
          this.positionForSetPiece();
          return;
        }
        this.pendingOffside = null;

        if (this.cachedPassOriginSide && this.cachedPassOriginSide === p.side) {
          const passStats = p.side === 'home' ? this.homeStats : this.awayStats;
          passStats.passesCompleted++;
          if (this.legendPlayerId && this.lastHomePasserId === this.legendPlayerId) {
            this.legendPassesCompleted++;
          }
          if ((this.config.mode === 'training' || this.config.mode === 'practice') && this.config.trainingDrill === 'passing') {
            this.trainingScore++;
            this.trainingFeedback = `Crisp pass completed! (${this.trainingScore})`;
          }
        }
        this.cachedPassOriginSide = null;

        // GK save & variable parrying angles
        if (p.role === 'GK' && this.ball.isShotInFlight && this.ball.shotBySide !== p.side) {
          const gkStats = p.side === 'home' ? this.homeStats : this.awayStats;
          const shooterStats = p.side === 'home' ? this.awayStats : this.homeStats;
          gkStats.saves++;
          shooterStats.shotsOnTarget++;
          if (this.legendPlayerId && this.ball.lastTouchId === this.legendPlayerId) {
            this.legendShotsOnTarget++;
          }
          this.pendingSoundEvents.push('save');
          this.setManagerReaction(p.side, 'applaud', 2.4);
          this.showBanner(`GREAT SAVE BY ${p.shortName.toUpperCase()}!`, 1.7);

          const speed = Math.hypot(this.ball.vx, this.ball.vz);
          if (speed > 21 && p.attributes.goalkeeping < 86) {
            const outDir = p.side === 'home' ? 1 : -1;
            const parryAngleZ = Math.sign(this.ball.z || 1) * (0.45 + Math.min(0.6, Math.abs(this.ball.vz) * 0.05));
            launchBall(this.ball, p.id, p.side, outDir, parryAngleZ, 9.2, 2.4, parryAngleZ * 0.6, false);
            return;
          }
        }

        // First-touch trapping damping based on player technique/dribbling
        const incomingSpeed = Math.hypot(this.ball.vx, this.ball.vz);
        if (incomingSpeed > 15 && p.attributes.dribbling < 68 && p.role !== 'GK') {
          this.ball.vx *= 0.42;
          this.ball.vz *= 0.42;
          this.ball.pickupCooldown = 0.08;
        }

        this.ball.ownerId = p.id;
        this.ball.lastTouchId = p.id;
        this.ball.lastTouchSide = p.side;
        this.ball.isShotInFlight = false;
        p.teammateRunTimer = 0;
        if (p.side === 'home' && p.role !== 'GK' && !this.legendPlayerId) {
          this.setControlledPlayer(p.id);
        }
        return;
      }
    }
  }

  private handleBoundaryEvent(boundary: ReturnType<typeof detectPitchBoundary>): void {
    if (boundary.type === 'goal') {
      const scoringSide = boundary.scoringSide;
      const scorer =
        this.players.find((p) => p.id === this.ball.lastTouchId) ??
        this.players.find((p) => p.side === scoringSide && p.role === 'ST');
      const minute = Math.max(1, Math.min(120, Math.ceil(this.matchClockSeconds / 60)));

      if (scoringSide === 'home') {
        this.homeScore++;
        this.homeStats.goals++;
        this.homeStats.shotsOnTarget++;
        if (this.legendPlayerId) {
          if (scorer?.id === this.legendPlayerId) {
            this.legendGoals++;
            this.legendShotsOnTarget++;
          } else if (this.lastHomePasserId === this.legendPlayerId) {
            this.legendAssists++;
          }
        }
      } else {
        this.awayScore++;
        this.awayStats.goals++;
        this.awayStats.shotsOnTarget++;
      }

      const assistPlayer =
        scoringSide === 'home' && this.lastHomePasserId && this.lastHomePasserId !== scorer?.id
          ? this.players.find((p) => p.id === this.lastHomePasserId)
          : undefined;

      this.goalEvents.push({
        minute,
        teamSide: scoringSide,
        scorerId: scorer?.id ?? 'unknown',
        scorerName: scorer?.name ?? (scoringSide === 'home' ? this.homeTeam.shortCode : this.awayTeam.shortCode),
        assistName: assistPlayer?.shortName,
      });

      this.pendingSoundEvents.push('goal');
      this.cameraTrauma = 0.7;
      this.crowdIntensity = 1.0;
      this.lastScoringSide = scoringSide;
      this.netWaveTimer = 2.0;
      this.setManagerReaction(scoringSide, 'applaud', 3.5);
      this.setManagerReaction(scoringSide === 'home' ? 'away' : 'home', 'frustrated', 3.5);
      this.showBanner(`GOAL! ${scorer?.shortName?.toUpperCase() ?? 'SCORE'} (${minute}')`, 2.6);

      if (this.config.mode === 'training' || this.config.mode === 'practice') {
        const drill = this.config.trainingDrill;
        const pts = drill === 'free-kick-challenge' || drill === 'set-pieces' ? 120 : drill === 'target-shooting' || drill === 'shooting' ? 100 : 1;
        this.trainingScore += pts;
        this.trainingFeedback = `GOAL! +${pts} pts (Total: ${this.trainingScore})`;
        if (drill === 'free-kick-challenge' || drill === 'set-pieces') {
          if (this.trainingAttempts >= this.trainingMaxAttempts && this.trainingMaxAttempts > 0) {
            this.finishGradedTraining();
          } else {
            this.setupNextFreeKickAttempt();
          }
          return;
        }
        if (drill === 'target-shooting' || drill === 'shooting') {
          this.resetShootingSpot();
          return;
        }
        this.ball = createInitialBall();
        return;
      }

      this.restartContext = { teamSide: scoringSide, x: 0, z: 0 };
      this.phase = 'goal-celebration';
      this.phaseTimer = 2.4;
      return;
    }

    if (this.config.mode === 'training' || this.config.mode === 'practice') {
      const drill = this.config.trainingDrill;
      if (drill === 'free-kick-challenge' || drill === 'set-pieces') {
        if (this.trainingAttempts >= this.trainingMaxAttempts && this.trainingMaxAttempts > 0) {
          this.finishGradedTraining();
        } else {
          this.setupNextFreeKickAttempt();
        }
        return;
      }
      if (drill === 'target-shooting' || drill === 'shooting') {
        this.resetShootingSpot();
        return;
      }
      this.ball.x = Math.max(-HALF_LENGTH + 2, Math.min(HALF_LENGTH - 2, this.ball.x));
      this.ball.z = Math.max(-HALF_WIDTH + 2, Math.min(HALF_WIDTH - 2, this.ball.z));
      this.ball.vx *= -0.35;
      this.ball.vz *= -0.35;
      this.ball.ownerId = null;
      return;
    }

    if (boundary.type === 'touchline' || boundary.type === 'endline') {
      const sp = computeSetPieceSpot(
        boundary.type,
        boundary.x,
        boundary.z,
        this.ball.lastTouchSide,
        boundary.type === 'endline' ? boundary.end : undefined
      );
      this.phase = sp.phase;
      this.restartContext = sp.restart;
      if (sp.phase === 'corner-kick') {
        if (sp.restart.teamSide === 'home') this.homeStats.corners++;
        else this.awayStats.corners++;
        this.showBanner('CORNER KICK', 1.5);
      } else if (sp.phase === 'goal-kick') {
        this.showBanner('GOAL KICK', 1.3);
      } else {
        this.showBanner('THROW-IN', 1.2);
      }
      this.pendingSoundEvents.push('whistle-short');
      this.positionForSetPiece();
    }
  }

  private advanceMatchClock(dt: number): void {
    if (this.config.mode === 'training' || this.config.mode === 'practice') return;

    const totalRealSeconds = Math.max(60, this.config.durationMinutes * 60);
    const rate = 5400 / totalRealSeconds;
    this.matchClockSeconds += dt * rate;

    if (this.half === 1 && this.matchClockSeconds >= 2700) {
      this.matchClockSeconds = 2700;
      this.phase = 'halftime';
      this.pendingSoundEvents.push('whistle-full');
      this.showBanner('HALF TIME', 2.5);
    } else if (this.half === 2 && this.matchClockSeconds >= 5400) {
      this.matchClockSeconds = 5400;
      if (this.homeScore === this.awayScore && this.config.allowExtraTime) {
        this.phase = 'extra-time-break';
        this.pendingSoundEvents.push('whistle-full');
        this.showBanner('EXTRA TIME', 2.5);
      } else if (this.homeScore === this.awayScore && this.config.allowPenalties) {
        this.startPenaltyShootout();
      } else {
        this.phase = 'fulltime';
        this.pendingSoundEvents.push('whistle-full');
        this.showBanner('FULL TIME', 3.0);
      }
    } else if (this.half === 3 && this.matchClockSeconds >= 6300) {
      this.half = 4;
      this.setupKickoff('away');
    } else if (this.half === 4 && this.matchClockSeconds >= 7200) {
      this.matchClockSeconds = 7200;
      if (this.homeScore === this.awayScore && this.config.allowPenalties) {
        this.startPenaltyShootout();
      } else {
        this.phase = 'fulltime';
        this.pendingSoundEvents.push('whistle-full');
        this.showBanner('FULL TIME (AET)', 3.0);
      }
    }
  }

  private switchToBestHomePlayer(): void {
    const candidates = this.players.filter((p) => p.side === 'home' && !p.redCard && p.role !== 'GK');
    if (candidates.length === 0) return;
    candidates.sort(
      (a, b) => Math.hypot(a.x - this.ball.x, a.z - this.ball.z) - Math.hypot(b.x - this.ball.x, b.z - this.ball.z)
    );
    const best = candidates[0].id === this.controlledId && candidates[1] ? candidates[1] : candidates[0];
    this.setControlledPlayer(best.id);
  }

  private findClosestOutfieldPlayer(side: 'home' | 'away'): string | null {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const p of this.players) {
      if (p.side !== side || p.redCard || p.role === 'GK' || p.id === this.controlledId) continue;
      const d = Math.hypot(p.x - this.ball.x, p.z - this.ball.z);
      if (d < bestDist) {
        bestDist = d;
        bestId = p.id;
      }
    }
    return bestId;
  }

  private findSecondClosestOutfieldPlayer(side: 'home' | 'away', excludeId: string | null): string | null {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const p of this.players) {
      if (p.side !== side || p.redCard || p.role === 'GK' || p.id === excludeId || p.id === this.controlledId) continue;
      const d = Math.hypot(p.x - this.ball.x, p.z - this.ball.z);
      if (d < bestDist) {
        bestDist = d;
        bestId = p.id;
      }
    }
    return bestId;
  }

  public getSnapshot(): SimulationSnapshot {
    const controlled = this.players.find((p) => p.id === this.controlledId);
    const legendPlayer = this.legendPlayerId
      ? this.players.find((p) => p.id === this.legendPlayerId)
      : undefined;
    const legendEval: LegendMatchEval | null = legendPlayer
      ? {
          playerId: legendPlayer.id,
          playerName: legendPlayer.name,
          rating: computeLegendMatchRating({
            goals: this.legendGoals,
            assists: this.legendAssists,
            passesCompleted: this.legendPassesCompleted,
            shotsOnTarget: this.legendShotsOnTarget,
            tacklesWon: this.legendTacklesWon,
            teamWon: this.homeScore > this.awayScore,
          }),
          goals: this.legendGoals,
          assists: this.legendAssists,
          passesCompleted: this.legendPassesCompleted,
          shotsOnTarget: this.legendShotsOnTarget,
          tacklesWon: this.legendTacklesWon,
        }
      : null;

    return {
      phase: this.phase,
      half: this.half,
      matchClockSeconds: this.matchClockSeconds,
      displayMinute: Math.min(120, Math.floor(this.matchClockSeconds / 60)),
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      homeStats: { ...this.homeStats },
      awayStats: { ...this.awayStats },
      goalEvents: [...this.goalEvents],
      lastEventBanner: this.lastEventBanner,
      controlledPlayerId: this.controlledId,
      controlledPlayerName: controlled?.shortName ?? '',
      controlledPlayerStamina: controlled?.stamina ?? 1,
      teammateRunnerId: this.teammateRunnerId,
      shielding: controlled?.shielding ?? false,
      weather: this.weather,
      shotCharge: this.shotCharge,
      offsideEnabled: this.offsideEnabled,
      crowdIntensity: this.crowdIntensity,
      walkoutProgress: this.walkoutProgress,
      cardCutscene: this.cardCutscene ? { ...this.cardCutscene } : null,
      homeManagerReaction: this.homeManagerReaction,
      awayManagerReaction: this.awayManagerReaction,
      isDefendingFreeKick:
        this.phase === 'free-kick' &&
        this.restartContext.teamSide === 'away' &&
        Math.hypot(-HALF_LENGTH - this.restartContext.x, this.restartContext.z) < 33,
      replayCount: this.replayBuffer.length,
      trainingDrill: this.config.trainingDrill,
      trainingFeedback: this.trainingFeedback,
      trainingScore: this.trainingScore,
      trainingAttempts: this.trainingAttempts,
      trainingMaxAttempts: this.trainingMaxAttempts,
      trainingTimeLeft: this.trainingTimeLeft,
      trainingCompleted: this.trainingCompleted,
      trainingMedal: this.trainingMedal,
      trainingTargets: this.trainingTargets.map((t) => ({ ...t })),
      legendEval,
      penaltyShootout: this.penaltyShootout ? { ...this.penaltyShootout } : null,
      homePlayers: this.players.filter((p) => p.side === 'home'),
      awayPlayers: this.players.filter((p) => p.side === 'away'),
      ball: { ...this.ball },
    };
  }
}
