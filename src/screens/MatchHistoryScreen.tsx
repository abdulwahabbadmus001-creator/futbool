import React from 'react';
import { History } from 'lucide-react';
import { MatchSummary } from '../types/football';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface MatchHistoryScreenProps {
  history: MatchSummary[];
  onBack: () => void;
}

export const MatchHistoryScreen: React.FC<MatchHistoryScreenProps> = ({ history, onBack }) => {
  return (
    <BroadcastLayout
      title="Match History"
      subtitle="Logged Exhibition, Tournament, League & Career Results"
      onBack={onBack}
      onHome={onBack}
    >
      {history.length === 0 ? (
        <div className="broadcast-panel rounded-lg p-10 text-center">
          <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold uppercase text-white">No Matches Recorded Yet</h2>
          <p className="text-sm text-slate-400 mt-1">
            Complete an Exhibition, Tournament, League, or Career match to record full match reports here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((m) => (
            <div key={m.id} className="broadcast-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase text-amber-400">
                  {m.competitionLabel ?? m.mode.toUpperCase()} · {m.difficulty.toUpperCase()} · {new Date(m.playedAt).toLocaleDateString()}
                </div>
                <div className="font-display text-2xl font-extrabold text-white mt-0.5">
                  {m.homeTeamName}{' '}
                  <span className="text-amber-400 mx-2 font-mono-tabular">
                    {m.homeGoals} - {m.awayGoals}
                  </span>{' '}
                  {m.awayTeamName}
                </div>
                {m.penalties && (
                  <div className="text-xs text-sky-400 font-mono-tabular">
                    Penalties: {m.penalties.home} - {m.penalties.away}
                  </div>
                )}
              </div>

              <div className="flex gap-5 text-xs text-slate-300 font-mono-tabular">
                <div>
                  <span className="text-slate-500 block">Shots</span>
                  {m.homeStats.shots} - {m.awayStats.shots}
                </div>
                <div>
                  <span className="text-slate-500 block">Passes</span>
                  {m.homeStats.passesCompleted} - {m.awayStats.passesCompleted}
                </div>
                <div>
                  <span className="text-slate-500 block">MOTM</span>
                  <span className="text-amber-300">{m.manOfTheMatch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BroadcastLayout>
  );
};
