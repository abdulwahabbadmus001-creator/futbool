import React, { useState } from 'react';
import { Medal, Play, Target } from 'lucide-react';
import {
  GameSettings,
  MatchConfig,
  Team,
  TrainingDrillType,
  TrainingMedal,
} from '../types/football';
import { getAllTeams } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import { TRAINING_DRILLS } from '../game/training/trainingDrills';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface TrainingScreenProps {
  mode: 'training' | 'practice';
  customTeams: Record<string, Team>;
  settings: GameSettings;
  trainingMedals?: Record<string, TrainingMedal>;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

const MEDAL_STYLES: Record<Exclude<TrainingMedal, 'none'>, string> = {
  gold: 'bg-amber-400 text-slate-950 border-amber-200',
  silver: 'bg-slate-300 text-slate-950 border-white',
  bronze: 'bg-orange-700 text-amber-100 border-orange-400',
};

export const TrainingScreen: React.FC<TrainingScreenProps> = ({
  mode,
  customTeams,
  settings,
  trainingMedals = {},
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const [teamId, setTeamId] = useState(allTeams[0].id);
  const [drill, setDrill] = useState<TrainingDrillType>(
    mode === 'practice' ? 'free-practice' : 'target-shooting'
  );

  const launchDrill = (chosenDrill: TrainingDrillType) => {
    const team = allTeams.find((t) => t.id === teamId) ?? allTeams[0];
    const opp = allTeams.find((t) => t.id !== team.id) ?? allTeams[1];
    onStartMatch({
      mode,
      homeTeam: team,
      awayTeam: opp,
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[2], // Crisp daylight training pitch
      durationMinutes: 10,
      difficulty: settings.difficulty,
      allowExtraTime: false,
      allowPenalties: false,
      trainingDrill: chosenDrill,
    });
  };

  return (
    <BroadcastLayout
      title={mode === 'practice' ? 'Free Training Arena' : 'Graded Skill Training'}
      subtitle="Complete Timed Challenges & Earn Bronze, Silver, and Gold Medals on the 3D Engine"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="broadcast-panel rounded-lg p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <label htmlFor="train-team" className="block text-xs font-bold uppercase text-slate-400 mb-1">
            Training Squad
          </label>
          <select
            id="train-team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
          >
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          data-testid="launch-drill-btn"
          onClick={() => launchDrill(drill)}
          className="flex items-center gap-2 px-6 py-3 rounded we-accent-btn font-display text-lg uppercase cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" /> Launch Selected Drill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRAINING_DRILLS.map((d) => {
          const bestMedal = trainingMedals[d.id] ?? 'none';
          return (
            <button
              key={d.id}
              type="button"
              data-testid={`drill-${d.id}`}
              onClick={() => {
                setDrill(d.id);
                launchDrill(d.id);
              }}
              className={`broadcast-tile rounded-lg p-5 text-left flex flex-col justify-between gap-3 cursor-pointer ${
                drill === d.id ? 'border-[#FF6B00]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#FF8C00]" />
                  {d.graded && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FF6B00]/20 text-[#FF8C00] border border-[#FF6B00]/40">
                      Graded
                    </span>
                  )}
                </div>
                {bestMedal !== 'none' ? (
                  <span
                    className={`flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${MEDAL_STYLES[bestMedal]}`}
                  >
                    <Medal className="w-3 h-3" /> {bestMedal}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase text-emerald-400">Start Drill</span>
                )}
              </div>

              <div>
                <h3 className="font-display text-xl font-extrabold uppercase text-white">{d.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{d.desc}</p>
              </div>

              {d.graded && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono-tabular">
                  <span className="text-orange-300">BRZ: {d.bronze}</span>
                  <span className="text-slate-200 text-center">SLV: {d.silver}</span>
                  <span className="text-amber-300 text-right font-bold">GLD: {d.gold}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </BroadcastLayout>
  );
};
