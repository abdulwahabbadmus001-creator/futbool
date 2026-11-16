import React from 'react';
import { PersistentSaveData } from '../types/football';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface StatsRecordsScreenProps {
  saveData: PersistentSaveData;
  onBack: () => void;
}

export const StatsRecordsScreen: React.FC<StatsRecordsScreenProps> = ({ saveData, onBack }) => {
  const { records } = saveData;
  const winRate =
    records.matchesPlayed > 0 ? Math.round((records.wins / records.matchesPlayed) * 100) : 0;

  const cards = [
    { label: 'Matches Played', value: records.matchesPlayed, color: 'text-white' },
    { label: 'Wins / Draws / Losses', value: `${records.wins} / ${records.draws} / ${records.losses}`, color: 'text-emerald-400' },
    { label: 'Win Percentage', value: `${winRate}%`, color: 'text-amber-400' },
    { label: 'Goals Scored', value: records.goalsScored, color: 'text-sky-400' },
    { label: 'Goals Conceded', value: records.goalsConceded, color: 'text-rose-400' },
    { label: 'Clean Sheets', value: records.cleanSheets, color: 'text-emerald-300' },
    { label: 'Tournaments Won', value: records.tournamentsWon, color: 'text-amber-400' },
    { label: 'Leagues Won', value: records.leaguesWon, color: 'text-amber-400' },
    { label: 'Biggest Win', value: records.biggestWinLabel, color: 'text-white' },
  ];

  return (
    <BroadcastLayout
      title="Statistics & Records"
      subtitle="All-Time Player Profile Milestones"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="broadcast-panel rounded-lg p-5">
            <div className="text-xs font-bold uppercase text-slate-400">{c.label}</div>
            <div className={`font-display text-4xl font-extrabold mt-2 font-mono-tabular ${c.color}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </BroadcastLayout>
  );
};
