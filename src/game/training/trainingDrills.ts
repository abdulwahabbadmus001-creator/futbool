import { TrainingDrillType, TrainingMedal } from '../../types/football';

export interface GradedDrillSpec {
  id: TrainingDrillType;
  title: string;
  desc: string;
  graded: boolean;
  timeLimitSec: number;
  maxAttempts: number;
  bronze: number;
  silver: number;
  gold: number;
}

export const TRAINING_DRILLS: GradedDrillSpec[] = [
  {
    id: 'target-shooting',
    title: 'Target Shooting',
    desc: '45s timed challenge: strike glowing corner targets (+150) and beat the keeper (+100) to earn Gold.',
    graded: true,
    timeLimitSec: 45,
    maxAttempts: 0,
    bronze: 250,
    silver: 500,
    gold: 750,
  },
  {
    id: 'dribbling-slalom',
    title: 'Dribbling Slalom',
    desc: '45s timed slalom: weave through 3D pitch gates (+100) and trigger Feints [C] or 360 Turns [V] (+50 bonus).',
    graded: true,
    timeLimitSec: 45,
    maxAttempts: 0,
    bronze: 300,
    silver: 600,
    gold: 900,
  },
  {
    id: 'free-kick-challenge',
    title: 'Free Kick Challenge',
    desc: '5 dead-ball attempts around a 3-man wall: curl shots [L] into upper corner targets (+200) or goal (+120).',
    graded: true,
    timeLimitSec: 0,
    maxAttempts: 5,
    bronze: 240,
    silver: 480,
    gold: 720,
  },
  {
    id: 'free-practice',
    title: 'Free Pitch Practice',
    desc: 'Full 11v11 scrimmage with continuous play, teammate runs [E], feints [C/V] and zero stoppages.',
    graded: false,
    timeLimitSec: 0,
    maxAttempts: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
  },
  {
    id: 'passing',
    title: 'Passing & Tiki-Taka',
    desc: 'Chain accurate short [J] and through passes [K] through midfield.',
    graded: false,
    timeLimitSec: 0,
    maxAttempts: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
  },
  {
    id: 'goalkeeper',
    title: 'Goalkeeper Reflexes',
    desc: 'Take direct control of your goalkeeper to track shots and organize defense.',
    graded: false,
    timeLimitSec: 0,
    maxAttempts: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
  },
  {
    id: 'penalties',
    title: 'Penalty Kicks',
    desc: 'Step up to the 11-meter spot and place penalties past the keeper.',
    graded: false,
    timeLimitSec: 0,
    maxAttempts: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
  },
];

export function getDrillSpec(drill?: TrainingDrillType): GradedDrillSpec {
  const found = TRAINING_DRILLS.find((d) => d.id === drill);
  if (found) return found;
  if (drill === 'shooting') return TRAINING_DRILLS[0];
  if (drill === 'dribbling') return TRAINING_DRILLS[1];
  if (drill === 'set-pieces') return TRAINING_DRILLS[2];
  return TRAINING_DRILLS[3];
}

export function computeTrainingMedal(drill: TrainingDrillType | undefined, score: number): TrainingMedal {
  const spec = getDrillSpec(drill);
  if (!spec.graded) return 'none';
  if (score >= spec.gold) return 'gold';
  if (score >= spec.silver) return 'silver';
  if (score >= spec.bronze) return 'bronze';
  return 'none';
}
