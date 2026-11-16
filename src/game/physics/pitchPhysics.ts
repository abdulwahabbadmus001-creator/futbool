export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
export const HALF_LENGTH = PITCH_LENGTH / 2; // 52.5
export const HALF_WIDTH = PITCH_WIDTH / 2;   // 34.0

export const GOAL_WIDTH = 7.32;
export const HALF_GOAL_WIDTH = GOAL_WIDTH / 2; // 3.66
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.2;
export const POST_RADIUS = 0.08;

export const PENALTY_AREA_DEPTH = 16.5;
export const PENALTY_AREA_HALF_WIDTH = 20.16;
export const GOAL_AREA_DEPTH = 5.5;
export const GOAL_AREA_HALF_WIDTH = 9.16;
export const PENALTY_SPOT_DIST = 11.0;
export const CENTER_CIRCLE_RADIUS = 9.15;

export const BALL_RADIUS = 0.22;
export const PLAYER_RADIUS = 0.45;

export type BoundaryCrossResult =
  | { type: 'none' }
  | { type: 'goal'; scoringSide: 'home' | 'away' }
  | { type: 'touchline'; side: 'top' | 'bottom'; x: number; z: number }
  | { type: 'endline'; end: 'home' | 'away'; x: number; z: number };

/**
 * Checks if a coordinate is inside a team's penalty box.
 * Home defends -X (-52.5), Away defends +X (+52.5).
 */
export function isInsidePenaltyArea(x: number, z: number, defendingSide: 'home' | 'away'): boolean {
  if (Math.abs(z) > PENALTY_AREA_HALF_WIDTH) return false;
  if (defendingSide === 'home') {
    return x <= -HALF_LENGTH + PENALTY_AREA_DEPTH && x >= -HALF_LENGTH;
  }
  return x >= HALF_LENGTH - PENALTY_AREA_DEPTH && x <= HALF_LENGTH;
}

export function detectPitchBoundary(x: number, y: number, z: number): BoundaryCrossResult {
  // Check goals first (Home defends -HALF_LENGTH, so crossing -HALF_LENGTH scores for Away)
  if (x < -HALF_LENGTH - BALL_RADIUS * 0.5) {
    if (Math.abs(z) < HALF_GOAL_WIDTH - POST_RADIUS && y < GOAL_HEIGHT) {
      return { type: 'goal', scoringSide: 'away' };
    }
    return { type: 'endline', end: 'home', x: -HALF_LENGTH, z: Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, z)) };
  }

  if (x > HALF_LENGTH + BALL_RADIUS * 0.5) {
    if (Math.abs(z) < HALF_GOAL_WIDTH - POST_RADIUS && y < GOAL_HEIGHT) {
      return { type: 'goal', scoringSide: 'home' };
    }
    return { type: 'endline', end: 'away', x: HALF_LENGTH, z: Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, z)) };
  }

  if (z < -HALF_WIDTH - BALL_RADIUS * 0.5) {
    return { type: 'touchline', side: 'top', x: Math.max(-HALF_LENGTH, Math.min(HALF_LENGTH, x)), z: -HALF_WIDTH };
  }

  if (z > HALF_WIDTH + BALL_RADIUS * 0.5) {
    return { type: 'touchline', side: 'bottom', x: Math.max(-HALF_LENGTH, Math.min(HALF_LENGTH, x)), z: HALF_WIDTH };
  }

  return { type: 'none' };
}

export function clampToPitchPlayable(x: number, z: number, margin = 4): { x: number; z: number } {
  return {
    x: Math.max(-HALF_LENGTH - margin, Math.min(HALF_LENGTH + margin, x)),
    z: Math.max(-HALF_WIDTH - margin, Math.min(HALF_WIDTH + margin, z)),
  };
}
