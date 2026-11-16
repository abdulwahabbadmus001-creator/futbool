import {
  HALF_LENGTH,
  HALF_WIDTH,
  PENALTY_SPOT_DIST,
  isInsidePenaltyArea,
} from '../physics/pitchPhysics';
import { SimPlayer } from '../players/playerKinematics';
import { BallState } from '../ball/ballPhysics';

export type MatchPhase =
  | 'walkout'
  | 'kickoff'
  | 'playing'
  | 'goal-celebration'
  | 'card-cutscene'
  | 'throw-in'
  | 'goal-kick'
  | 'corner-kick'
  | 'free-kick'
  | 'penalty-kick'
  | 'halftime'
  | 'extra-time-break'
  | 'penalty-shootout'
  | 'fulltime';

export interface RestartContext {
  teamSide: 'home' | 'away';
  x: number;
  z: number;
  takerId?: string;
}

export interface OffsideResult {
  isOffside: boolean;
  restartX: number;
  restartZ: number;
  defendingSide: 'home' | 'away';
}

/**
 * Isolated offside rule module:
 * Checks whether an attacking receiver is in the opponent's half, ahead of the ball,
 * and ahead of the second-to-last defender at the moment a teammate passes.
 */
export function checkOffsideOnPass(
  passer: SimPlayer,
  target: SimPlayer,
  ball: BallState,
  allPlayers: SimPlayer[],
  enabled: boolean
): OffsideResult {
  if (!enabled || target.side !== passer.side) {
    return { isOffside: false, restartX: 0, restartZ: 0, defendingSide: 'away' };
  }

  const attackingRight = passer.side === 'home';
  const defendingSide: 'home' | 'away' = attackingRight ? 'away' : 'home';

  // Must be in opponent half
  if (attackingRight ? target.x <= 0.2 : target.x >= -0.2) {
    return { isOffside: false, restartX: 0, restartZ: 0, defendingSide };
  }

  // Must be ahead of the ball
  if (attackingRight ? target.x <= ball.x + 0.35 : target.x >= ball.x - 0.35) {
    return { isOffside: false, restartX: 0, restartZ: 0, defendingSide };
  }

  const defenders = allPlayers.filter((p) => p.side === defendingSide && !p.redCard);
  const sortedXs = defenders
    .map((d) => d.x)
    .sort((a, b) => (attackingRight ? b - a : a - b));

  const secondLastDefenderX = sortedXs[1] ?? sortedXs[0] ?? (attackingRight ? HALF_LENGTH : -HALF_LENGTH);

  const pastLine = attackingRight
    ? target.x > secondLastDefenderX + 0.45
    : target.x < secondLastDefenderX - 0.45;

  return {
    isOffside: pastLine,
    restartX: target.x,
    restartZ: target.z,
    defendingSide,
  };
}

export function computeSetPieceSpot(
  boundaryType: 'touchline' | 'endline',
  crossX: number,
  crossZ: number,
  lastTouchSide: 'home' | 'away' | null,
  endCrossed?: 'home' | 'away'
): { phase: 'throw-in' | 'goal-kick' | 'corner-kick'; restart: RestartContext } {
  const safeLast = lastTouchSide ?? 'home';
  const awardingSide: 'home' | 'away' = safeLast === 'home' ? 'away' : 'home';

  if (boundaryType === 'touchline') {
    return {
      phase: 'throw-in',
      restart: {
        teamSide: awardingSide,
        x: Math.max(-HALF_LENGTH + 1, Math.min(HALF_LENGTH - 1, crossX)),
        z: crossZ < 0 ? -HALF_WIDTH + 0.3 : HALF_WIDTH - 0.3,
      },
    };
  }

  const end = endCrossed ?? (crossX < 0 ? 'home' : 'away');
  // If defending team touched it last over their own endline -> corner kick
  if (lastTouchSide === end) {
    const cornerX = end === 'home' ? -HALF_LENGTH + 0.7 : HALF_LENGTH - 0.7;
    const cornerZ = crossZ < 0 ? -HALF_WIDTH + 0.7 : HALF_WIDTH - 0.7;
    return {
      phase: 'corner-kick',
      restart: {
        teamSide: end === 'home' ? 'away' : 'home',
        x: cornerX,
        z: cornerZ,
      },
    };
  }

  // Otherwise goal kick for the defending side
  const gkX = end === 'home' ? -HALF_LENGTH + 5.5 : HALF_LENGTH - 5.5;
  const gkZ = crossZ < 0 ? -4.5 : 4.5;
  return {
    phase: 'goal-kick',
    restart: {
      teamSide: end,
      x: gkX,
      z: gkZ,
    },
  };
}

export function adjudicateFoul(
  tackler: SimPlayer,
  victim: SimPlayer,
  hasBall: boolean
): {
  isFoul: boolean;
  card: 'none' | 'yellow' | 'red';
  isPenalty: boolean;
  restart: RestartContext;
} {
  // Determine severity based on angle and whether victim had clear possession
  const dx = victim.x - tackler.x;
  const dz = victim.z - tackler.z;
  const dist = Math.hypot(dx, dz) || 1;
  const attackDir = victim.side === 'home' ? 1 : -1;
  const fromBehind = (dx / dist) * attackDir > 0.35;

  const foulChance = hasBall ? (fromBehind ? 0.32 : 0.14) : 0.42;
  // Deterministic hash-like roll based on coordinates so physics stays reproducible
  const hash = Math.abs(Math.sin(tackler.x * 12.9898 + victim.z * 78.233)) % 1;
  const isFoul = hash < foulChance;

  if (!isFoul) {
    return {
      isFoul: false,
      card: 'none',
      isPenalty: false,
      restart: { teamSide: victim.side, x: victim.x, z: victim.z },
    };
  }

  const defendingSide = tackler.side;
  const isPenalty = isInsidePenaltyArea(victim.x, victim.z, defendingSide);

  let card: 'none' | 'yellow' | 'red' = 'none';
  if (fromBehind && hash < 0.12) {
    card = 'red';
  } else if (hash < 0.24) {
    card = 'yellow';
  }

  const penaltyX = defendingSide === 'home' ? -HALF_LENGTH + PENALTY_SPOT_DIST : HALF_LENGTH - PENALTY_SPOT_DIST;

  return {
    isFoul: true,
    card,
    isPenalty,
    restart: isPenalty
      ? { teamSide: victim.side, x: penaltyX, z: 0 }
      : { teamSide: victim.side, x: victim.x, z: victim.z },
  };
}
