import React from 'react';
import { Award, BarChart3, Globe, History } from 'lucide-react';
import { AppScreen, PersistentSaveData, Team } from '../types/football';
import { getAllTeams } from '../data/teams';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { TeamCrest } from '../components/TeamCrest';

interface CommunityScreenProps {
  saveData: PersistentSaveData;
  customTeams: Record<string, Team>;
  onNavigate: (screen: AppScreen) => void;
  onBack: () => void;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  saveData,
  customTeams,
  onNavigate,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams).sort((a, b) => b.rating.overall - a.rating.overall);
  const winRate =
    saveData.records.matchesPlayed > 0
      ? Math.round((saveData.records.wins / saveData.records.matchesPlayed) * 100)
      : 0;

  return (
    <BroadcastLayout
      title="Community & Rival Rankings"
      subtitle="Global Club Power Rankings, Player Milestones & Match Archive"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="broadcast-panel rounded-lg p-5">
          <div className="flex items-center gap-2 text-[#FF8C00] mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Manager Profile</span>
          </div>
          <div className="font-display text-3xl font-extrabold text-white">{winRate}% Win Rate</div>
          <p className="text-xs text-slate-400 mt-1">
            {saveData.records.wins}W · {saveData.records.draws}D · {saveData.records.losses}L across{' '}
            {saveData.records.matchesPlayed} matches
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('match-history')}
          className="broadcast-tile rounded-lg p-5 text-left cursor-pointer flex flex-col justify-between"
        >
          <History className="w-5 h-5 text-sky-400" />
          <div>
            <div className="font-display text-2xl font-extrabold uppercase text-white">Match History</div>
            <div className="text-xs text-slate-400">{saveData.matchHistory.length} matches logged</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stats-records')}
          className="broadcast-tile rounded-lg p-5 text-left cursor-pointer flex flex-col justify-between"
        >
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-display text-2xl font-extrabold uppercase text-white">Career Milestones</div>
            <div className="text-xs text-slate-400">
              {saveData.records.tournamentsWon + saveData.records.leaguesWon} major titles won
            </div>
          </div>
        </button>
      </div>

      <div className="broadcast-panel rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[#FF8C00]" />
          <h2 className="font-display text-xl font-extrabold uppercase text-white">World Club & National Power Rankings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allTeams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 rounded bg-[#0A0F1D]/85 border border-slate-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono-tabular font-bold text-sm text-[#FF8C00] w-6">#{idx + 1}</span>
                <TeamCrest crest={team.crest} size={32} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{team.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {team.category.toUpperCase()} · {team.tactics.formationId}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono-tabular">
                <div className="text-sm font-extrabold text-emerald-400">{team.rating.overall} OVR</div>
                <div className="text-[10px] text-slate-400">
                  A:{team.rating.attack} M:{team.rating.midfield} D:{team.rating.defense}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BroadcastLayout>
  );
};
