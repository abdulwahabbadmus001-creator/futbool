import { DifficultyLevel, TeamTactics } from '../../types/football';
import { getFormationById } from '../../data/formations';
import {
  GOAL_HEIGHT,
  HALF_GOAL_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  PENALTY_AREA_DEPTH,
} from '../physics/pitchPhysics';
import { SimPlayer } from '../players/playerKinematics';
import { BallState } from '../ball/ballPhysics';

export interface AIDecision {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  action: 'none' | 'pass' | 'through' | 'loft' | 'shoot' | 'tackle' | 'gk-dive';
  targetX?: number;
  targetZ?: number;
  power?: number;
  diveDirZ?: number;
}

export interface DifficultyProfile {
  reactionInterval: number;
  passErrorRad: number;
  shotErrorRad: number;
  gkReactionSpeed: number;
  pressAggression: number;
}

export function getDifficultyProfile(level: DifficultyLevel): DifficultyProfile {
  switch (level) {
    case 'beginner':
      return { reactionInterval: 0.56, passErrorRad: 0.30, shotErrorRad: 0.34, gkReactionSpeed: 0.54, pressAggression: 0.35 };
    case 'amateur':
      return { reactionInterval: 0.42, passErrorRad: 0.22, shotErrorRad: 0.26, gkReactionSpeed: 0.68, pressAggression: 0.52 };
    case 'regular':
      return { reactionInterval: 0.28, passErrorRad: 0.14, shotErrorRad: 0.18, gkReactionSpeed: 0.80, pressAggression: 0.70 };
    case 'professional':
      return { reactionInterval: 0.18, passErrorRad: 0.09, shotErrorRad: 0.12, gkReactionSpeed: 0.92, pressAggression: 0.85 };
    case 'top-player':
      return { reactionInterval: 0.12, passErrorRad: 0.05, shotErrorRad: 0.08, gkReactionSpeed: 1.05, pressAggression: 0.96 };
    case 'legend':
    case 'superstar':
      return { reactionInterval: 0.07, passErrorRad: 0.03, shotErrorRad: 0.05, gkReactionSpeed: 1.18, pressAggression: 1.08 };
  }
}

export function resolveFluidFormationId(tactics: TeamTactics, teamHasPossession: boolean): string {
  if (teamHasPossession && tactics.attackingFormationId) {
    return tactics.attackingFormationId;
  }
  if (!teamHasPossession && tactics.defendingFormationId) {
    return tactics.defendingFormationId;
  }
  return tactics.formationId;
}

export function computeFormationHomePos(
  player: SimPlayer,
  tactics: TeamTactics,
  ball: BallState,
  teamHasPossession: boolean
): { x: number; z: number } {
  const activeFormationId = resolveFluidFormationId(tactics, teamHasPossession);
  const formation = getFormationById(activeFormationId);
  const slot = formation.slots[player.slotIndex] ?? formation.slots[0];
  const dir = player.side === 'home' ? 1 : -1;

  if (player.role === 'GK') {
    const goalX = -dir * (HALF_LENGTH - 1.8);
    const ballShiftX = Math.max(-2.5, Math.min(6.5, (ball.x - goalX) * 0.12));
    const goalZ = Math.max(-HALF_GOAL_WIDTH * 0.85, Math.min(HALF_GOAL_WIDTH * 0.85, ball.z * 0.22));
    return { x: goalX + dir * Math.abs(ballShiftX) * 0.5, z: goalZ };
  }

  let mentalityOffset = 0;
  switch (tactics.mentality) {
    case 'ultra-defensive': mentalityOffset = -0.14; break;
    case 'defensive': mentalityOffset = -0.07; break;
    case 'balanced': mentalityOffset = 0; break;
    case 'attacking': mentalityOffset = 0.08; break;
    case 'all-out-attack': mentalityOffset = 0.15; break;
  }

  const compactness = tactics.compactness ?? 0.55;
  const supportRange = tactics.supportRange ?? 0.55;
  const counterShift = tactics.counterAttack && teamHasPossession ? 0.07 : 0;
  const possessionShift = teamHasPossession ? 0.08 + supportRange * 0.06 : -0.08;
  const ballNormalizedX = (ball.x * dir) / HALF_LENGTH;

  // Player Archetype positional tendencies
  let archetypeNormX = 0;
  let archetypeLateralScale = 1.0;
  switch (player.archetype) {
    case 'goal-poacher':
      archetypeNormX = teamHasPossession ? 0.08 : 0.04;
      archetypeLateralScale = 0.72;
      break;
    case 'target-man':
      archetypeNormX = teamHasPossession ? 0.06 : -0.02;
      archetypeLateralScale = 0.5;
      break;
    case 'box-to-box':
      archetypeNormX = teamHasPossession ? 0.11 : -0.09;
      break;
    case 'classic-10':
      archetypeNormX = teamHasPossession ? 0.05 : -0.01;
      archetypeLateralScale = 0.78;
      break;
    case 'anchor-man':
      archetypeNormX = teamHasPossession ? -0.08 : -0.1;
      archetypeLateralScale = 0.65;
      break;
    default:
      break;
  }

  const dynamicShift =
    ballNormalizedX * 0.28 +
    mentalityOffset +
    possessionShift +
    counterShift +
    archetypeNormX +
    (tactics.lineHeight - 0.5) * 0.22;

  let clampedNormX = Math.max(0.08, Math.min(0.93, slot.x + dynamicShift));
  if (player.archetype === 'anchor-man') {
    clampedNormX = Math.min(0.56, clampedNormX);
  }
  const worldX = dir * (clampedNormX * 2 - 1) * (HALF_LENGTH - 5);

  const widthScale =
    (teamHasPossession ? 0.72 + supportRange * 0.26 : 1.0 - compactness * 0.34) * archetypeLateralScale;
  const zonalPull = teamHasPossession ? 0.18 : 0.22 + compactness * 0.18;
  const worldZ = slot.y * (HALF_WIDTH - 4) * dir * widthScale + ball.z * zonalPull;

  return {
    x: Math.max(-HALF_LENGTH + 4, Math.min(HALF_LENGTH - 4, worldX)),
    z: Math.max(-HALF_WIDTH + 3, Math.min(HALF_WIDTH - 3, worldZ)),
  };
}

function findMarkedOpponent(
  player: SimPlayer,
  allPlayers: SimPlayer[],
  tactics: TeamTactics
): SimPlayer | null {
  const marking = tactics.manMarking;
  if (!marking) return null;
  const markTargetKey = marking[player.id] ?? marking[String(player.slotIndex)];
  if (!markTargetKey || markTargetKey === 'zonal') return null;

  const opponents = allPlayers.filter((o) => o.side !== player.side && !o.redCard && o.role !== 'GK');
  const byId = opponents.find((o) => o.id === markTargetKey);
  if (byId) return byId;

  // Allow role-based marking keys like 'ST', 'LW', 'CAM', etc.
  return opponents.find((o) => o.role === markTargetKey) ?? null;
}

export function decidePlayerAI(
  player: SimPlayer,
  allPlayers: SimPlayer[],
  ball: BallState,
  tactics: TeamTactics,
  teamHasPossession: boolean,
  isPrimaryPresser: boolean,
  isSecondaryCover: boolean,
  difficulty: DifficultyLevel
): AIDecision {
  const profile = getDifficultyProfile(difficulty);
  const attackDir = player.side === 'home' ? 1 : -1;
  const oppGoalX = attackDir * HALF_LENGTH;
  const ownGoalX = -attackDir * HALF_LENGTH;

  // Goalkeeper AI
  if (player.role === 'GK') {
    const incomingToGoal =
      (player.side === 'home' && ball.vx < -4 && ball.x < -HALF_LENGTH + 28) ||
      (player.side === 'away' && ball.vx > 4 && ball.x > HALF_LENGTH - 28);

    if (incomingToGoal && ball.ownerId === null) {
      const timeToLine = Math.max(0.05, Math.abs((ownGoalX - ball.x) / (ball.vx || 0.01)));
      const predictedZ = Math.max(-HALF_GOAL_WIDTH, Math.min(HALF_GOAL_WIDTH, ball.z + ball.vz * Math.min(timeToLine, 0.8)));
      const dz = predictedZ - player.z;
      const distToBall = Math.hypot(ball.x - player.x, ball.z - player.z);

      if (distToBall < 4.8 && Math.abs(dz) > 1.1 && player.tackleCooldown <= 0 && ball.y < GOAL_HEIGHT + 0.4) {
        return {
          moveX: 0,
          moveZ: Math.sign(dz),
          sprint: true,
          action: 'gk-dive',
          diveDirZ: Math.sign(dz),
        };
      }

      const targetX = ownGoalX + attackDir * 2.1;
      const dx = targetX - player.x;
      return {
        moveX: Math.abs(dx) > 0.2 ? Math.sign(dx) : 0,
        moveZ: Math.abs(dz) > 0.15 ? Math.sign(dz) * profile.gkReactionSpeed : 0,
        sprint: Math.abs(dz) > 1.0,
        action: 'none',
      };
    }

    const distBall = Math.hypot(ball.x - player.x, ball.z - player.z);
    if (ball.ownerId === null && distBall < 11 && Math.abs(ball.x - ownGoalX) < PENALTY_AREA_DEPTH - 2) {
      return {
        moveX: ball.x - player.x,
        moveZ: ball.z - player.z,
        sprint: true,
        action: 'none',
      };
    }

    if (ball.ownerId === player.id) {
      const teammates = allPlayers.filter((m) => m.side === player.side && m.id !== player.id && !m.redCard);
      const target = teammates.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[1] ?? teammates[0];
      if (target) {
        return {
          moveX: attackDir,
          moveZ: 0,
          sprint: false,
          action: 'pass',
          targetX: target.x,
          targetZ: target.z,
          power: 0.65,
        };
      }
    }

    const anchor = computeFormationHomePos(player, tactics, ball, teamHasPossession);
    const dx = anchor.x - player.x;
    const dz = anchor.z - player.z;
    return {
      moveX: Math.hypot(dx, dz) > 0.3 ? dx : 0,
      moveZ: Math.hypot(dx, dz) > 0.3 ? dz : 0,
      sprint: false,
      action: 'none',
    };
  }

  // PES 2012 Teammate Control System / Set-Piece Routine Run
  if (player.teammateRunTimer > 0 && ball.ownerId !== player.id) {
    const dx = player.teammateRunTargetX - player.x;
    const dz = player.teammateRunTargetZ - player.z;
    if (Math.hypot(dx, dz) > 1.2) {
      return {
        moveX: dx,
        moveZ: dz,
        sprint: player.stamina > 0.15,
        action: 'none',
      };
    }
  }

  // Ball Carrier AI
  if (ball.ownerId === player.id) {
    const distToGoal = Math.hypot(oppGoalX - player.x, 0 - player.z);
    const opponents = allPlayers.filter((o) => o.side !== player.side && !o.redCard);
    const nearestOppDist = opponents.reduce(
      (min, o) => Math.min(min, Math.hypot(o.x - player.x, o.z - player.z)),
      999
    );

    const maxShootDist = player.archetype === 'classic-10' ? 28 : 24;
    if (distToGoal < maxShootDist && Math.abs(player.z) < 18 && player.kickCooldown <= 0) {
      const shootBias = distToGoal < 17 ? 0.86 : player.archetype === 'goal-poacher' ? 0.55 : 0.35;
      const roll = Math.abs(Math.sin(player.x * 3.1 + player.z * 7.7)) % 1;
      if (roll < shootBias) {
        const aimZ = player.z > 0 ? -HALF_GOAL_WIDTH * 0.55 : HALF_GOAL_WIDTH * 0.55;
        return {
          moveX: oppGoalX - player.x,
          moveZ: aimZ - player.z,
          sprint: false,
          action: 'shoot',
          targetX: oppGoalX,
          targetZ: aimZ,
          power: Math.min(0.95, 0.58 + (maxShootDist - distToGoal) * 0.02),
        };
      }
    }

    if (attackDir * player.x > HALF_LENGTH - 22 && Math.abs(player.z) > 16 && player.kickCooldown <= 0) {
      const striker = allPlayers.find(
        (m) => m.side === player.side && m.id !== player.id && !m.redCard && (m.role === 'ST' || m.role === 'CAM')
      );
      if (striker) {
        return {
          moveX: striker.x - player.x,
          moveZ: striker.z - player.z,
          sprint: false,
          action: 'loft',
          targetX: striker.x + attackDir * 2.5,
          targetZ: striker.z * 0.4,
          power: 0.72,
        };
      }
    }

    const passTrigger =
      nearestOppDist < 4.5 ||
      tactics.passingStyle === 'short' ||
      tactics.counterAttack ||
      player.archetype === 'classic-10' ||
      player.archetype === 'anchor-man';

    if (passTrigger && player.kickCooldown <= 0) {
      const teammates = allPlayers.filter(
        (m) => m.side === player.side && m.id !== player.id && !m.redCard && m.role !== 'GK'
      );
      let bestTarget: SimPlayer | null = null;
      let bestScore = -999;

      for (const m of teammates) {
        const d = Math.hypot(m.x - player.x, m.z - player.z);
        if (d < 5 || d > 38) continue;
        const forwardGain = (m.x - player.x) * attackDir;
        const spaceAround = opponents.reduce((min, o) => Math.min(min, Math.hypot(o.x - m.x, o.z - m.z)), 25);
        const runBonus = m.teammateRunTimer > 0 ? 12 : 0;
        const poacherBonus = m.archetype === 'goal-poacher' && forwardGain > 6 ? 6 : 0;
        const score =
          forwardGain * (tactics.counterAttack ? 1.25 : 0.9) + spaceAround * 1.4 - d * 0.25 + runBonus + poacherBonus;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = m;
        }
      }

      if (bestTarget && (nearestOppDist < 4.0 || bestScore > 10)) {
        const dist = Math.hypot(bestTarget.x - player.x, bestTarget.z - player.z);
        return {
          moveX: bestTarget.x - player.x,
          moveZ: bestTarget.z - player.z,
          sprint: false,
          action: dist > 22 || bestTarget.teammateRunTimer > 0 || player.archetype === 'classic-10' ? 'through' : 'pass',
          targetX: bestTarget.x + bestTarget.vx * 0.35,
          targetZ: bestTarget.z + bestTarget.vz * 0.35,
          power: Math.min(0.95, 0.35 + dist / 40),
        };
      }
    }

    const steerX = oppGoalX - player.x;
    let steerZ = (Math.abs(player.z) > 14 ? -Math.sign(player.z) * 6 : 0) - player.z * 0.2;
    const closestOpp = opponents.sort(
      (a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z)
    )[0];
    if (closestOpp) {
      const od = Math.hypot(closestOpp.x - player.x, closestOpp.z - player.z);
      if (od < 5.5 && od > 0.1) {
        steerZ += Math.sign(player.z - closestOpp.z || 1) * 8;
      }
    }
    return {
      moveX: steerX,
      moveZ: steerZ,
      sprint: nearestOppDist > 6.5 && player.stamina > 0.35,
      action: 'none',
    };
  }

  // Defensive off-ball behavior
  if (!teamHasPossession) {
    if (isPrimaryPresser) {
      const distBall = Math.hypot(ball.x - player.x, ball.z - player.z);
      const shouldTackle =
        distBall < 2.1 &&
        ball.ownerId !== null &&
        player.tackleCooldown <= 0 &&
        profile.pressAggression > 0.6;
      return {
        moveX: ball.x - player.x,
        moveZ: ball.z - player.z,
        sprint: distBall > 4 && player.stamina > 0.25,
        action: shouldTackle ? 'tackle' : 'none',
      };
    }

    // Man-Marking assignment check (goal-side shadow marking)
    const markedOpp = findMarkedOpponent(player, allPlayers, tactics);
    if (markedOpp) {
      const goalSideX = markedOpp.x - attackDir * 1.9;
      const goalSideZ = markedOpp.z * 0.94;
      const dx = goalSideX - player.x;
      const dz = goalSideZ - player.z;
      const d = Math.hypot(dx, dz);
      return {
        moveX: d > 0.7 ? dx : 0,
        moveZ: d > 0.7 ? dz : 0,
        sprint: d > 5.5 && player.stamina > 0.3,
        action: 'none',
      };
    }

    if (isSecondaryCover) {
      const compactness = tactics.compactness ?? 0.55;
      const coverX = ball.x * (0.52 + compactness * 0.12) + ownGoalX * (0.48 - compactness * 0.12);
      const coverZ = ball.z * 0.72;
      return {
        moveX: coverX - player.x,
        moveZ: coverZ - player.z,
        sprint: Math.hypot(coverX - player.x, coverZ - player.z) > 8,
        action: 'none',
      };
    }
  } else {
    // Attacking archetype off-ball movement
    const isForwardRole =
      player.role === 'ST' ||
      player.role === 'LW' ||
      player.role === 'RW' ||
      player.role === 'CAM' ||
      player.archetype === 'goal-poacher' ||
      player.archetype === 'box-to-box';
    if (isForwardRole && Math.abs(ball.x - player.x) < 32) {
      const anchor = computeFormationHomePos(player, tactics, ball, true);
      const archReach =
        player.archetype === 'goal-poacher' ? 1.35 : player.archetype === 'target-man' ? 0.6 : 1.0;
      const runReach =
        (tactics.counterAttack ? 10 : 6.5) * (0.7 + (tactics.supportRange ?? 0.55) * 0.5) * archReach;
      const runX = Math.max(-HALF_LENGTH + 6, Math.min(HALF_LENGTH - 6, anchor.x + attackDir * runReach));
      const diagZ =
        player.archetype === 'target-man'
          ? anchor.z * 0.5
          : anchor.z + (player.z > 0 ? -2.2 : 2.2);
      const dx = runX - player.x;
      const dz = diagZ - player.z;
      return {
        moveX: Math.hypot(dx, dz) > 1.2 ? dx : 0,
        moveZ: Math.hypot(dx, dz) > 1.2 ? dz : 0,
        sprint: Math.hypot(dx, dz) > 8 && player.stamina > 0.35,
        action: 'none',
      };
    }
  }

  const anchor = computeFormationHomePos(player, tactics, ball, teamHasPossession);
  const dx = anchor.x - player.x;
  const dz = anchor.z - player.z;
  const dist = Math.hypot(dx, dz);
  return {
    moveX: dist > 0.8 ? dx : 0,
    moveZ: dist > 0.8 ? dz : 0,
    sprint: dist > 14 && player.stamina > 0.45,
    action: 'none',
  };
}
