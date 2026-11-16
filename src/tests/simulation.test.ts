import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TEAMS } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import { FootballSimulation, UserMatchInput } from '../game/engine/Simulation';
import { detectPitchBoundary, HALF_LENGTH, PENALTY_SPOT_DIST } from '../game/physics/pitchPhysics';
import { checkOffsideOnPass } from '../game/rules/matchRules';

const idleInput: UserMatchInput = {
  moveX: 0,
  moveZ: 0,
  sprint: false,
  shortPassPressed: false,
  throughPassPressed: false,
  loftedPassPressed: false,
  shootHeld: false,
  shootReleased: false,
  switchPlayerPressed: false,
  tacklePressed: false,
  tacticalModPressed: false,
  tacticalModHeld: false,
  feintPressed: false,
  roulettePressed: false,
};

function makeMatchSim(durationMinutes = 5) {
  return new FootballSimulation({
    mode: 'exhibition',
    homeTeam: INITIAL_TEAMS[0],
    awayTeam: INITIAL_TEAMS[1],
    homeKitType: 'home',
    awayKitType: 'away',
    stadium: STADIUMS[0],
    durationMinutes,
    difficulty: 'regular',
    allowExtraTime: false,
    allowPenalties: false,
  });
}

test('detectPitchBoundary identifies goals vs endline vs touchline accurately', () => {
  assert.deepEqual(detectPitchBoundary(HALF_LENGTH + 0.3, 1.0, 0), {
    type: 'goal',
    scoringSide: 'home',
  });
  assert.deepEqual(detectPitchBoundary(-HALF_LENGTH - 0.3, 1.0, 0), {
    type: 'goal',
    scoringSide: 'away',
  });
  const cornerEnd = detectPitchBoundary(HALF_LENGTH + 0.5, 0.5, 12);
  assert.equal(cornerEnd.type, 'endline');
  const touch = detectPitchBoundary(10, 0.2, 36);
  assert.equal(touch.type, 'touchline');
});

test('keyboard movement moves controlled player and shooting launches ball toward goal', () => {
  const sim = makeMatchSim();
  // Fast-forward kickoff phase
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);
  assert.equal(sim.phase, 'playing');

  const controlled = sim.players.find((p) => p.id === sim.controlledId)!;
  const startX = controlled.x;

  // Hold moveRight
  for (let i = 0; i < 30; i++) {
    sim.step(1 / 60, { ...idleInput, moveX: 1 });
  }
  assert.ok(controlled.x > startX + 1.0, 'Controlled player should advance rightward');

  // Give player the ball and execute shot
  sim.ball.ownerId = controlled.id;
  sim.shotCharge = 0.8;
  sim.step(1 / 60, { ...idleInput, moveX: 1, shootReleased: true });

  assert.equal(sim.ball.ownerId, null);
  assert.ok(sim.ball.vx > 12, 'Shot should propel ball forward with high velocity');
  assert.equal(sim.homeStats.shots, 1);
});

test('scoring a goal updates scoreboard and transitions to goal celebration', () => {
  const sim = makeMatchSim();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  // Place ball crossing away goal line
  sim.ball.ownerId = null;
  sim.ball.lastTouchId = sim.players[9].id;
  sim.ball.lastTouchSide = 'home';
  sim.ball.x = HALF_LENGTH + 0.5;
  sim.ball.y = 1.0;
  sim.ball.z = 0;
  sim.ball.vx = 10;

  sim.step(1 / 60, idleInput);
  assert.equal(sim.homeScore, 1);
  assert.equal(sim.phase, 'goal-celebration');
  assert.equal(sim.goalEvents.length, 1);
});

test('match timer advances and transitions to halftime then fulltime', () => {
  const sim = makeMatchSim(1); // 60s total real duration -> 90 match mins
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  // Step up to 60s of play (pressing pass if user gets a set piece) -> reaches 2700 match seconds (45')
  for (let i = 0; i < 60 * 60; i++) {
    if (sim.phase === 'halftime') break;
    const stepInput =
      sim.phase !== 'playing' && sim.phase !== 'goal-celebration'
        ? { ...idleInput, shortPassPressed: true }
        : idleInput;
    sim.step(1 / 60, stepInput);
  }
  assert.equal(sim.phase, 'halftime');
  assert.equal(sim.matchClockSeconds, 2700);

  sim.startSecondHalf();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  for (let i = 0; i < 60 * 60; i++) {
    const ph = sim.phase as string;
    if (ph === 'fulltime') break;
    const stepInput =
      ph !== 'playing' && ph !== 'goal-celebration'
        ? { ...idleInput, shortPassPressed: true }
        : idleInput;
    sim.step(1 / 60, stepInput);
  }
  assert.equal(sim.phase, 'fulltime');
  assert.equal(sim.matchClockSeconds, 5400);
});

test('offside module detects attacker ahead of second-to-last defender', () => {
  const sim = makeMatchSim();
  const passer = sim.players.find((p) => p.side === 'home' && p.role !== 'GK' && p.role !== 'ST')!;
  const striker = sim.players.find((p) => p.side === 'home' && p.id !== passer.id && p.role !== 'GK')!;
  passer.x = 15;
  sim.ball.x = 15;
  // Push all away defenders behind x=35
  for (const p of sim.players) {
    if (p.side === 'away') p.x = p.role === 'GK' ? 50 : 30;
  }
  striker.x = 40; // Past last outfield defender (30) and ahead of ball (15)
  const off = checkOffsideOnPass(passer, striker, sim.ball, sim.players, true);
  assert.equal(off.isOffside, true);
});

import { createInitialBall, stepBallPhysics } from '../game/ball/ballPhysics';
import { moveSimPlayer, resolvePlayerCollisions } from '../game/players/playerKinematics';
import { computeTrainingMedal } from '../game/training/trainingDrills';

test('penalty shootout settles a tie cleanly', () => {
  const sim = makeMatchSim();
  sim.startPenaltyShootout();
  assert.equal(sim.phase, 'penalty-shootout');
  assert.ok(sim.penaltyShootout);
  sim.shootPenaltyShootout(2.0, 0.7);
  assert.equal(sim.penaltyShootout!.homeResults.length, 1);
  assert.equal(PENALTY_SPOT_DIST, 11);
});

test('collision simulation applies weight-based pushback and ball carrier shielding', () => {
  const sim = makeMatchSim();
  const carrier = sim.players.find((p) => p.side === 'home' && p.role === 'ST')!;
  const challenger = sim.players.find((p) => p.side === 'away' && p.role === 'CB')!;

  carrier.attributes.physical = 92;
  challenger.attributes.physical = 60;
  carrier.x = 0;
  carrier.z = 0;
  challenger.x = 0.5;
  challenger.z = 0;

  const carrierStartX = carrier.x;
  const challengerStartX = challenger.x;
  resolvePlayerCollisions([carrier, challenger], carrier.id);

  assert.equal(carrier.shielding, true);
  assert.ok(
    Math.abs(challenger.x - challengerStartX) > Math.abs(carrier.x - carrierStartX),
    'Lighter defender should absorb greater physical displacement than stronger ball carrier'
  );
});

test('teammate control [E] triggers off-ball sprint run on an attacking teammate', () => {
  const sim = makeMatchSim();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  const controlled = sim.players.find((p) => p.id === sim.controlledId)!;
  sim.ball.ownerId = controlled.id;
  sim.step(1 / 60, { ...idleInput, tacticalModPressed: true });

  assert.ok(sim.teammateRunnerId, 'Teammate runner ID should be assigned');
  assert.notEqual(sim.teammateRunnerId, controlled.id);
  const runner = sim.players.find((p) => p.id === sim.teammateRunnerId)!;
  assert.ok(runner.teammateRunTimer > 1.0, 'Runner should have an active off-ball sprint timer');
});

test('weather conditions alter ball ground friction between rain and snow', () => {
  const rainBall = createInitialBall();
  rainBall.vx = 14;
  const snowBall = createInitialBall();
  snowBall.vx = 14;

  for (let i = 0; i < 60; i++) {
    stepBallPhysics(rainBall, 1 / 60, false, 'rain');
    stepBallPhysics(snowBall, 1 / 60, false, 'snow');
  }

  assert.ok(rainBall.vx > snowBall.vx, 'Wet rain pitch should skim faster than heavy snow pitch');
});

test('Become a Legend locks player cursor to the designated legendPlayerId', () => {
  const home = INITIAL_TEAMS[0];
  const legendId = home.startingXI[9];
  const sim = new FootballSimulation({
    mode: 'legend',
    homeTeam: home,
    awayTeam: INITIAL_TEAMS[1],
    homeKitType: 'home',
    awayKitType: 'away',
    stadium: STADIUMS[0],
    durationMinutes: 5,
    difficulty: 'regular',
    allowExtraTime: false,
    allowPenalties: false,
    legendPlayerId: legendId,
  });

  assert.equal(sim.controlledId, legendId);
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);
  sim.step(1 / 60, { ...idleInput, switchPlayerPressed: true });
  assert.equal(sim.controlledId, legendId, 'Player switch must stay locked on Legend player');
});

test('give-and-go [E held + Pass] launches passer on an off-ball forward sprint', () => {
  const sim = makeMatchSim();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  const passer = sim.players.find((p) => p.id === sim.controlledId)!;
  sim.ball.ownerId = passer.id;
  sim.step(1 / 60, { ...idleInput, moveX: 1, shortPassPressed: true, tacticalModHeld: true });

  assert.equal(sim.teammateRunnerId, passer.id, 'Passer should become the active give-and-go runner');
  assert.ok(passer.teammateRunTimer > 1.5, 'Passer should have active off-ball forward run timer');
});

test('special feint [C] and 360 roulette [V] trigger skill anims and stagger nearby defender', () => {
  const sim = makeMatchSim();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  const carrier = sim.players.find((p) => p.id === sim.controlledId)!;
  const defender = sim.players.find((p) => p.side === 'away' && p.role === 'CB')!;
  for (const p of sim.players) {
    if (p.id !== carrier.id && p.id !== defender.id) {
      p.x = p.side === 'home' ? -30 : 30;
      p.z = 20;
    }
  }
  carrier.x = 0;
  carrier.z = 0;
  carrier.stunTimer = 0;
  sim.ball.ownerId = carrier.id;
  defender.x = carrier.x + 1.4;
  defender.z = carrier.z;
  defender.stunTimer = 0;

  sim.step(1 / 60, { ...idleInput, moveX: 1, feintPressed: true });
  assert.equal(carrier.actionAnim, 'feint');
  assert.ok(defender.stunTimer > 0.2, 'Nearby defender should briefly stagger on Body Feint');

  carrier.skillCooldown = 0;
  carrier.actionTimer = 0;
  carrier.stunTimer = 0;
  defender.stunTimer = 0;
  sim.step(1 / 60, { ...idleInput, moveX: 1, roulettePressed: true });
  assert.equal(carrier.actionAnim, 'roulette');
  assert.ok(carrier.skillSpin > 0, '360 Roulette should activate skillSpin rotation');
  assert.ok(defender.stunTimer > 0.2, 'Nearby defender should stagger on 360 Roulette');
});

test('graded skill training scores slalom gates + skill bonus and computes Bronze/Silver/Gold medals', () => {
  assert.equal(computeTrainingMedal('target-shooting', 100), 'none');
  assert.equal(computeTrainingMedal('target-shooting', 250), 'bronze');
  assert.equal(computeTrainingMedal('target-shooting', 520), 'silver');
  assert.equal(computeTrainingMedal('target-shooting', 800), 'gold');

  const sim = new FootballSimulation({
    mode: 'training',
    homeTeam: INITIAL_TEAMS[0],
    awayTeam: INITIAL_TEAMS[1],
    homeKitType: 'home',
    awayKitType: 'away',
    stadium: STADIUMS[2],
    durationMinutes: 10,
    difficulty: 'regular',
    allowExtraTime: false,
    allowPenalties: false,
    trainingDrill: 'dribbling-slalom',
  });

  const carrier = sim.players.find((p) => p.id === sim.controlledId)!;
  const gate0 = sim.trainingTargets[0];
  assert.ok(gate0 && gate0.active);
  carrier.x = gate0.x;
  carrier.z = gate0.z;
  carrier.recentSkillTimer = 1.0;
  sim.ball.ownerId = carrier.id;

  sim.step(1 / 60, idleInput);
  assert.equal(sim.trainingScore, 150, 'Gate clear (100) + recent skill bonus (50) should award 150 pts');
});

test('weather traction reduces sprint speed on snow and acceleration on rain vs clear turf', () => {
  const baseSim = makeMatchSim();
  const clearP = { ...baseSim.players[9], vx: 0, vz: 0, stamina: 1 };
  const rainP = { ...baseSim.players[9], vx: 0, vz: 0, stamina: 1 };
  const snowP = { ...baseSim.players[9], vx: 0, vz: 0, stamina: 1 };

  for (let i = 0; i < 45; i++) {
    moveSimPlayer(clearP, 1, 0, true, false, 1, 1 / 60, 'clear');
    moveSimPlayer(rainP, 1, 0, true, false, 1, 1 / 60, 'rain');
    moveSimPlayer(snowP, 1, 0, true, false, 1, 1 / 60, 'snow');
  }

  assert.ok(clearP.vx > rainP.vx, 'Clear turf sprint speed should exceed wet rain turf');
  assert.ok(rainP.vx > snowP.vx, 'Rain sprint speed should exceed heavy snow turf');
});

test('low stamina reduces player acceleration', () => {
  const sim = makeMatchSim();
  const freshPlayer = { ...sim.players[9], vx: 0, vz: 0, stamina: 0.8 };
  const tiredPlayer = { ...sim.players[9], vx: 0, vz: 0, stamina: 0.2 };

  moveSimPlayer(freshPlayer, 1, 0, false, false, 1, 1 / 60, 'clear');
  moveSimPlayer(tiredPlayer, 1, 0, false, false, 1, 1 / 60, 'clear');

  assert.ok(tiredPlayer.vx < freshPlayer.vx);
});

import { resolveFluidFormationId } from '../game/ai/teamAI';

test('resolveFluidFormationId switches between attacking and defending formations based on possession', () => {
  const baseTactics = {
    ...INITIAL_TEAMS[0].tactics,
    formationId: '4-3-3',
    attackingFormationId: '3-4-3',
    defendingFormationId: '5-4-1',
  };
  assert.equal(resolveFluidFormationId(baseTactics, true), '3-4-3');
  assert.equal(resolveFluidFormationId(baseTactics, false), '5-4-1');
});

test('walkout phase can be skipped cleanly and replay buffer captures frames in open play', () => {
  const sim = new FootballSimulation(
    {
      mode: 'exhibition',
      homeTeam: INITIAL_TEAMS[0],
      awayTeam: INITIAL_TEAMS[1],
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[0],
      durationMinutes: 5,
      difficulty: 'regular',
      allowExtraTime: false,
      allowPenalties: false,
    },
    { enableWalkout: true }
  );

  assert.equal(sim.phase, 'walkout');
  sim.skipWalkout();
  assert.equal(sim.phase, 'kickoff');

  for (let i = 0; i < 80; i++) sim.step(1 / 60, idleInput);
  assert.equal(sim.phase, 'playing');
  assert.ok(sim.getReplayFrames().length >= 3, 'Replay buffer should capture open-play frames');
});

test('defending free-kick wall can inch forward once and jump vertically', () => {
  const sim = makeMatchSim();
  for (let i = 0; i < 70; i++) sim.step(1 / 60, idleInput);

  sim.phase = 'free-kick';
  sim.restartContext = { teamSide: 'away', x: -HALF_LENGTH + 22, z: 2 };
  (sim as unknown as { positionForSetPiece: () => void }).positionForSetPiece();

  assert.equal(sim.getSnapshot().isDefendingFreeKick, true);
  assert.equal(sim.advanceWall(), true);
  assert.equal(sim.advanceWall(), false, 'Wall should only inch forward once per free kick');

  assert.equal(sim.jumpWall(), true);
  for (let i = 0; i < 8; i++) sim.step(1 / 60, idleInput);
  const jumpedDefender = sim.players.some((p) => p.side === 'home' && p.y > 0.1);
  assert.equal(jumpedDefender, true, 'Wall defenders should jump upward');
});

