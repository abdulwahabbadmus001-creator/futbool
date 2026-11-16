import { WeatherCondition } from '../../types/football';
import {
  BALL_RADIUS,
  GOAL_DEPTH,
  GOAL_HEIGHT,
  HALF_GOAL_WIDTH,
  HALF_LENGTH,
  POST_RADIUS,
} from '../physics/pitchPhysics';

export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinY: number;
  rotX: number;
  rotZ: number;
  ownerId: string | null;
  lastTouchId: string | null;
  lastTouchSide: 'home' | 'away' | null;
  pickupCooldown: number;
  isShotInFlight: boolean;
  shotBySide: 'home' | 'away' | null;
}

export function createInitialBall(): BallState {
  return {
    x: 0,
    y: BALL_RADIUS,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spinY: 0,
    rotX: 0,
    rotZ: 0,
    ownerId: null,
    lastTouchId: null,
    lastTouchSide: null,
    pickupCooldown: 0,
    isShotInFlight: false,
    shotBySide: null,
  };
}

const GRAVITY = -19.6;
const AIR_DRAG = 0.28;

export interface BallStepEvents {
  bounced: boolean;
  hitPost: boolean;
}

export function stepBallPhysics(
  ball: BallState,
  dt: number,
  inGoalNet = false,
  weather: WeatherCondition = 'clear'
): BallStepEvents {
  const events: BallStepEvents = { bounced: false, hitPost: false };

  const groundDrag = weather === 'rain' ? 1.15 : weather === 'snow' ? 2.35 : 1.65;
  const bounceRestitution = weather === 'rain' ? 0.44 : weather === 'snow' ? 0.48 : 0.56;

  if (ball.pickupCooldown > 0) {
    ball.pickupCooldown = Math.max(0, ball.pickupCooldown - dt);
  }

  // If controlled by a player, position is driven by player dribble anchor
  if (ball.ownerId !== null) {
    ball.isShotInFlight = false;
    return events;
  }

  const onGround = ball.y <= BALL_RADIUS + 0.015 && Math.abs(ball.vy) < 0.45;

  // Apply Magnus-like lateral curve from spin when moving in air
  if (!onGround && Math.abs(ball.spinY) > 0.01) {
    const speedXZ = Math.hypot(ball.vx, ball.vz);
    if (speedXZ > 2) {
      const nx = -ball.vz / speedXZ;
      const nz = ball.vx / speedXZ;
      ball.vx += nx * ball.spinY * 2.4 * dt;
      ball.vz += nz * ball.spinY * 2.4 * dt;
    }
  }

  // Integrate position
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  // Gravity & air/ground drag
  if (!onGround || ball.y > BALL_RADIUS + 0.01) {
    ball.vy += GRAVITY * dt;
    const airFactor = Math.exp(-AIR_DRAG * dt);
    ball.vx *= airFactor;
    ball.vz *= airFactor;
  } else {
    ball.y = BALL_RADIUS;
    ball.vy = 0;
    const groundFactor = Math.exp(-groundDrag * dt);
    ball.vx *= groundFactor;
    ball.vz *= groundFactor;
    ball.spinY *= Math.exp(-3.0 * dt);
    if (Math.hypot(ball.vx, ball.vz) < 0.08) {
      ball.vx = 0;
      ball.vz = 0;
      ball.isShotInFlight = false;
    }
  }

  // Ground bounce
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS;
    if (ball.vy < -1.1) {
      ball.vy = -ball.vy * bounceRestitution;
      ball.vx *= weather === 'rain' ? 0.94 : 0.88;
      ball.vz *= weather === 'rain' ? 0.94 : 0.88;
      events.bounced = true;
    } else {
      ball.vy = 0;
    }
  }

  // Goal post collisions (4 vertical posts + 2 crossbars)
  const postRadiusSum = BALL_RADIUS + POST_RADIUS;
  const posts = [
    { x: -HALF_LENGTH, z: -HALF_GOAL_WIDTH },
    { x: -HALF_LENGTH, z: HALF_GOAL_WIDTH },
    { x: HALF_LENGTH, z: -HALF_GOAL_WIDTH },
    { x: HALF_LENGTH, z: HALF_GOAL_WIDTH },
  ];

  if (ball.y < GOAL_HEIGHT + BALL_RADIUS) {
    for (const post of posts) {
      const dx = ball.x - post.x;
      const dz = ball.z - post.z;
      const dist = Math.hypot(dx, dz);
      if (dist < postRadiusSum && dist > 0.0001) {
        const nx = dx / dist;
        const nz = dz / dist;
        ball.x = post.x + nx * postRadiusSum;
        ball.z = post.z + nz * postRadiusSum;
        const vn = ball.vx * nx + ball.vz * nz;
        if (vn < 0) {
          ball.vx -= 1.75 * vn * nx;
          ball.vz -= 1.75 * vn * nz;
          events.hitPost = true;
        }
      }
    }

    // Crossbar check
    for (const goalX of [-HALF_LENGTH, HALF_LENGTH]) {
      if (Math.abs(ball.z) <= HALF_GOAL_WIDTH + POST_RADIUS) {
        const dx = ball.x - goalX;
        const dy = ball.y - GOAL_HEIGHT;
        const dist = Math.hypot(dx, dy);
        if (dist < postRadiusSum && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = goalX + nx * postRadiusSum;
          ball.y = GOAL_HEIGHT + ny * postRadiusSum;
          const vn = ball.vx * nx + ball.vy * ny;
          if (vn < 0) {
            ball.vx -= 1.7 * vn * nx;
            ball.vy -= 1.7 * vn * ny;
            events.hitPost = true;
          }
        }
      }
    }
  }

  // Net containment after goal scored
  if (inGoalNet) {
    const netDamp = Math.exp(-6.5 * dt);
    ball.vx *= netDamp;
    ball.vz *= netDamp;
    if (ball.x < -HALF_LENGTH - GOAL_DEPTH + BALL_RADIUS) {
      ball.x = -HALF_LENGTH - GOAL_DEPTH + BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * 0.2;
    }
    if (ball.x > HALF_LENGTH + GOAL_DEPTH - BALL_RADIUS) {
      ball.x = HALF_LENGTH + GOAL_DEPTH - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.2;
    }
    if (Math.abs(ball.z) > HALF_GOAL_WIDTH - BALL_RADIUS) {
      ball.z = Math.sign(ball.z) * (HALF_GOAL_WIDTH - BALL_RADIUS);
      ball.vz *= -0.25;
    }
    if (ball.y > GOAL_HEIGHT - BALL_RADIUS) {
      ball.y = GOAL_HEIGHT - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy) * 0.2;
    }
  }

  // Visual ball roll rotation
  ball.rotZ -= (ball.vx * dt) / BALL_RADIUS;
  ball.rotX += (ball.vz * dt) / BALL_RADIUS;

  return events;
}

export function launchBall(
  ball: BallState,
  kickerId: string,
  kickerSide: 'home' | 'away',
  dirX: number,
  dirZ: number,
  horizontalSpeed: number,
  verticalSpeed: number,
  spinY = 0,
  isShot = false
): void {
  const len = Math.hypot(dirX, dirZ) || 1;
  ball.ownerId = null;
  ball.lastTouchId = kickerId;
  ball.lastTouchSide = kickerSide;
  ball.pickupCooldown = 0.16;
  ball.vx = (dirX / len) * horizontalSpeed;
  ball.vz = (dirZ / len) * horizontalSpeed;
  ball.vy = verticalSpeed;
  ball.spinY = spinY;
  ball.isShotInFlight = isShot;
  ball.shotBySide = isShot ? kickerSide : null;
}
