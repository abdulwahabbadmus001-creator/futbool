import { FormArrow, Player, PlayerArchetype, PositionRole, WeatherCondition } from '../../types/football';
import {
  BALL_RADIUS,
  HALF_LENGTH,
  HALF_WIDTH,
  PLAYER_RADIUS,
} from '../physics/pitchPhysics';
import { BallState } from '../ball/ballPhysics';

export type PlayerActionAnim =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'kick'
  | 'tackle'
  | 'dive'
  | 'celebrate'
  | 'feint'
  | 'roulette';

export interface SimPlayer {
  id: string;
  name: string;
  shortName: string;
  number: number;
  side: 'home' | 'away';
  slotIndex: number;
  role: PositionRole;
  archetype: PlayerArchetype;
  morale: number;
  formArrow: FormArrow;
  attributes: Player['attributes'];
  appearance: Player['appearance'];
  overall: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  wallJumpVy: number;
  facing: number; // radians, 0 = +X, PI/2 = +Z
  stamina: number; // 0..1
  kickCooldown: number;
  tackleCooldown: number;
  stunTimer: number;
  actionAnim: PlayerActionAnim;
  actionTimer: number;
  walkCycle: number;
  diveDirZ: number;
  yellowCards: number;
  redCard: boolean;
  isControlled: boolean;
  shielding: boolean;
  teammateRunTimer: number;
  teammateRunTargetX: number;
  teammateRunTargetZ: number;
  skillCooldown: number;
  skillSpin: number;
  feintDir: number;
  recentSkillTimer: number;
}

export function getFormMultiplier(arrow: FormArrow): number {
  switch (arrow) {
    case 'up-hot': return 1.05;
    case 'up': return 1.025;
    case 'down': return 0.975;
    case 'down-cold': return 0.94;
    default: return 1.0;
  }
}

export function createSimPlayer(
  player: Player,
  side: 'home' | 'away',
  slotIndex: number,
  role: PositionRole,
  spawnX: number,
  spawnZ: number
): SimPlayer {
  return {
    id: player.id,
    name: player.name,
    shortName: player.shortName,
    number: player.number,
    side,
    slotIndex,
    role,
    archetype: player.archetype ?? 'balanced',
    morale: player.morale ?? 80,
    formArrow: player.formArrow ?? 'flat',
    attributes: { ...player.attributes },
    appearance: { ...player.appearance },
    overall: player.overall,
    x: spawnX,
    y: 0,
    z: spawnZ,
    vx: 0,
    vz: 0,
    wallJumpVy: 0,
    facing: side === 'home' ? 0 : Math.PI,
    stamina: Math.max(0.65, player.fitness / 100),
    kickCooldown: 0,
    tackleCooldown: 0,
    stunTimer: 0,
    actionAnim: 'idle',
    actionTimer: 0,
    walkCycle: 0,
    diveDirZ: 0,
    yellowCards: 0,
    redCard: false,
    isControlled: false,
    shielding: false,
    teammateRunTimer: 0,
    teammateRunTargetX: spawnX,
    teammateRunTargetZ: spawnZ,
    skillCooldown: 0,
    skillSpin: 0,
    feintDir: 1,
    recentSkillTimer: 0,
  };
}

export function triggerPlayerSkill(
  p: SimPlayer,
  skill: 'feint' | 'roulette',
  aimZ = 0
): boolean {
  if (p.redCard || p.stunTimer > 0 || p.skillCooldown > 0) return false;
  p.skillCooldown = 0.72;
  p.recentSkillTimer = 1.6;
  p.actionAnim = skill;
  p.actionTimer = skill === 'roulette' ? 0.42 : 0.32;
  p.feintDir = aimZ !== 0 ? Math.sign(aimZ) : p.feintDir >= 0 ? -1 : 1;

  const techScale = 0.85 + (p.attributes.dribbling / 99) * 0.35;
  const fwdX = Math.cos(p.facing);
  const fwdZ = Math.sin(p.facing);
  const sideX = -fwdZ * p.feintDir;
  const sideZ = fwdX * p.feintDir;

  if (skill === 'feint') {
    p.vx += (sideX * 3.8 + fwdX * 2.1) * techScale;
    p.vz += (sideZ * 3.8 + fwdZ * 2.1) * techScale;
    p.skillSpin = 0;
  } else {
    p.vx = p.vx * 0.65 + fwdX * 4.2 * techScale;
    p.vz = p.vz * 0.65 + fwdZ * 4.2 * techScale;
    p.skillSpin = Math.PI * 2;
  }
  return true;
}

export function stepPlayerVerticalJump(p: SimPlayer, dt: number): void {
  if (p.y > 0 || p.wallJumpVy !== 0) {
    p.wallJumpVy -= 15.5 * dt;
    p.y += p.wallJumpVy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.wallJumpVy = 0;
    }
  }
}

export function moveSimPlayer(
  p: SimPlayer,
  dirX: number,
  dirZ: number,
  sprint: boolean,
  hasBall: boolean,
  speedScale: number,
  dt: number,
  weather: WeatherCondition = 'clear'
): void {
  if (p.redCard) {
    p.vx = 0;
    p.vz = 0;
    p.shielding = false;
    return;
  }

  stepPlayerVerticalJump(p, dt);

  if (p.kickCooldown > 0) p.kickCooldown = Math.max(0, p.kickCooldown - dt);
  if (p.tackleCooldown > 0) p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);
  if (p.teammateRunTimer > 0) p.teammateRunTimer = Math.max(0, p.teammateRunTimer - dt);
  if (p.skillCooldown > 0) p.skillCooldown = Math.max(0, p.skillCooldown - dt);
  if (p.recentSkillTimer > 0) p.recentSkillTimer = Math.max(0, p.recentSkillTimer - dt);
  if (p.skillSpin > 0) {
    p.skillSpin = Math.max(0, p.skillSpin - (Math.PI * 2 * dt) / 0.42);
  }

  if (p.stunTimer > 0) {
    p.stunTimer = Math.max(0, p.stunTimer - dt);
    p.shielding = false;
    p.vx *= Math.exp(-5 * dt);
    p.vz *= Math.exp(-5 * dt);
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    return;
  }

  if (p.actionTimer > 0) {
    p.actionTimer = Math.max(0, p.actionTimer - dt);
    if (p.actionAnim === 'tackle') {
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= Math.exp(-3.5 * dt);
      p.vz *= Math.exp(-3.5 * dt);
      return;
    }
    if (p.actionAnim === 'dive') {
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= Math.exp(-4 * dt);
      p.vz *= Math.exp(-4 * dt);
      return;
    }
  }

  const inputLen = Math.hypot(dirX, dirZ);
  const weatherTopSpeed = weather === 'snow' ? 0.90 : weather === 'rain' ? 0.96 : 1.0;
  const weatherTraction = weather === 'rain' ? 0.78 : weather === 'snow' ? 0.82 : 1.0;
  const formFactor = getFormMultiplier(p.formArrow) * (0.98 + (p.morale / 100) * 0.04);

  const baseSpeed = (5.4 + (p.attributes.pace / 99) * 2.5) * formFactor;
  const dribblePenalty = hasBall ? 0.90 + (p.attributes.dribbling / 99) * 0.07 : 1.0;
  const staminaFactor = 0.78 + p.stamina * 0.22;
  const isSprinting = sprint && inputLen > 0.15 && p.stamina > 0.08;
  const sprintMultiplier = isSprinting ? 1.28 : 1.0;

  if (isSprinting) {
    p.stamina = Math.max(0.05, p.stamina - 0.11 * dt);
  } else {
    p.stamina = Math.min(1, p.stamina + (inputLen < 0.1 ? 0.09 : 0.03) * dt);
  }

  const targetSpeed = baseSpeed * dribblePenalty * staminaFactor * sprintMultiplier * speedScale * weatherTopSpeed;
  const targetVx = inputLen > 0.05 ? (dirX / inputLen) * targetSpeed : 0;
  const targetVz = inputLen > 0.05 ? (dirZ / inputLen) * targetSpeed : 0;

  const currentSpeed = Math.hypot(p.vx, p.vz);
  const agility = 0.75 + (p.attributes.dribbling / 99) * 0.35;
  const speedDrag = Math.max(0.58, 1 - (currentSpeed / 12) * 0.35);
  const fatigueAcceleration = p.stamina < 0.3 ? 0.78 + (p.stamina / 0.3) * 0.22 : 1;
  const accel =
    (inputLen > 0.05 ? 13.5 * agility * speedDrag : 10.5) *
    weatherTraction *
    fatigueAcceleration;
  const alpha = 1 - Math.exp(-accel * dt);
  p.vx += (targetVx - p.vx) * alpha;
  p.vz += (targetVz - p.vz) * alpha;

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  p.x = Math.max(-HALF_LENGTH - 3.5, Math.min(HALF_LENGTH + 3.5, p.x));
  p.z = Math.max(-HALF_WIDTH - 3.5, Math.min(HALF_WIDTH + 3.5, p.z));

  const speed = Math.hypot(p.vx, p.vz);
  if (speed > 0.35) {
    const targetFacing = Math.atan2(p.vz, p.vx);
    let diff = targetFacing - p.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnRate = (11.5 + (p.attributes.dribbling / 99) * 3.5) * speedDrag * weatherTraction;
    p.facing += diff * (1 - Math.exp(-turnRate * dt));
    p.walkCycle += speed * dt * 2.4;
    if (p.actionTimer <= 0) {
      p.actionAnim = isSprinting && speed > baseSpeed * 1.05 ? 'sprint' : 'run';
    }
  } else if (p.actionTimer <= 0) {
    p.actionAnim = 'idle';
  }
}

export function attachBallToDribbler(p: SimPlayer, ball: BallState, dt: number): void {
  const reach = PLAYER_RADIUS + BALL_RADIUS + (p.shielding ? 0.08 : 0.14);
  const targetX = p.x + Math.cos(p.facing) * reach;
  const targetZ = p.z + Math.sin(p.facing) * reach;
  const controlRate = 21 + (p.attributes.dribbling / 99) * 8;
  const alpha = 1 - Math.exp(-controlRate * dt);
  ball.x += (targetX - ball.x) * alpha;
  ball.z += (targetZ - ball.z) * alpha;
  ball.y = BALL_RADIUS;
  ball.vx = p.vx;
  ball.vz = p.vz;
  ball.vy = 0;
  ball.rotZ -= (p.vx * dt) / BALL_RADIUS;
  ball.rotX += (p.vz * dt) / BALL_RADIUS;
}

export function resolvePlayerCollisions(players: SimPlayer[], ballOwnerId: string | null = null): void {
  const minDist = PLAYER_RADIUS * 2.1;
  for (const p of players) {
    p.shielding = false;
  }

  for (let i = 0; i < players.length; i++) {
    const a = players[i];
    if (a.redCard) continue;
    for (let j = i + 1; j < players.length; j++) {
      const b = players[j];
      if (b.redCard) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        const massA = 0.65 + (a.attributes.physical / 99) * 0.7;
        const massB = 0.65 + (b.attributes.physical / 99) * 0.7;
        const totalMass = massA + massB;
        const shareA = massB / totalMass;
        const shareB = massA / totalMass;

        a.x -= nx * overlap * shareA;
        a.z -= nz * overlap * shareA;
        b.x += nx * overlap * shareB;
        b.z += nz * overlap * shareB;

        if (a.side !== b.side) {
          const speedA = Math.hypot(a.vx, a.vz);
          const speedB = Math.hypot(b.vx, b.vz);
          const momentumA = massA * (1 + speedA * 0.12);
          const momentumB = massB * (1 + speedB * 0.12);

          if (ballOwnerId === a.id && a.attributes.physical >= b.attributes.physical - 6) {
            a.shielding = true;
          } else if (ballOwnerId === b.id && b.attributes.physical >= a.attributes.physical - 6) {
            b.shielding = true;
          }

          const pushImpulse = 0.35;
          a.vx -= nx * pushImpulse * shareA;
          a.vz -= nz * pushImpulse * shareA;
          b.vx += nx * pushImpulse * shareB;
          b.vz += nz * pushImpulse * shareB;

          if (momentumB > momentumA * 1.48 && speedB > 5.5 && a.stunTimer <= 0) {
            a.stunTimer = 0.22;
          } else if (momentumA > momentumB * 1.48 && speedA > 5.5 && b.stunTimer <= 0) {
            b.stunTimer = 0.22;
          }
        }
      }
    }
  }
}
