import React, { useState } from 'react';
import { Play, Trophy, FastForward, RotateCcw } from 'lucide-react';
import {
  Fixture,
  GameSettings,
  MatchConfig,
  Team,
  TournamentState,
} from '../types/football';
import { getAllTeams } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import {
  advanceTournamentPhase,
  computeGroupStandings,
  createTournament,
  simulateAIFixture,
} from '../competitions/tournamentEngine';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { TeamCrest } from '../components/TeamCrest';

interface TournamentScreenProps {
  tournament: TournamentState | null;
  customTeams: Record<string, Team>;
  settings: GameSettings;
  onUpdateTournament: (t: TournamentState | null) => void;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

export const TournamentScreen: React.FC<TournamentScreenProps> = ({
  tournament,
  customTeams,
  settings,
  onUpdateTournament,
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const teamsMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  const [cupName, setCupName] = useState('Continental Champions Cup');
  const [size, setSize] = useState<8 | 16>(8);
  const [selectedTeamId, setSelectedTeamId] = useState(allTeams[0].id);

  if (!tournament) {
    return (
      <BroadcastLayout title="Tournament Mode" subtitle="Create a Knockout & Group Cup Competition" onBack={onBack} onHome={onBack}>
        <div className="broadcast-panel rounded-lg p-6 max-w-2xl mx-auto space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Tournament Title</label>
            <input
              type="text"
              value={cupName}
              onChange={(e) => setCupName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Tournament Format</label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as 8 | 16)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value={8}>8 Teams (2 Groups → Semifinals → Final)</option>
                <option value={16}>16 Teams (4 Groups → Quarterfinals → Final)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Your Team</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                {allTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (OVR {t.rating.overall})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            data-testid="create-tournament-btn"
            onClick={() => onUpdateTournament(createTournament(cupName || 'World Cup', size, selectedTeamId, allTeams))}
            className="w-full py-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide cursor-pointer"
          >
            Generate Tournament Draw
          </button>
        </div>
      </BroadcastLayout>
    );
  }

  const nextUserFixture: Fixture | undefined = tournament.fixtures.find(
    (f) => !f.played && (f.homeTeamId === tournament.userTeamId || f.awayTeamId === tournament.userTeamId)
  );

  const playFixture = (f: Fixture) => {
    const home = teamsMap[f.homeTeamId] ?? allTeams[0];
    const away = teamsMap[f.awayTeamId] ?? allTeams[1];
    const isKnockout = !f.groupId;
    onStartMatch({
      mode: 'tournament',
      homeTeam: home,
      awayTeam: away,
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[0],
      durationMinutes: settings.matchDurationMinutes,
      difficulty: settings.difficulty,
      allowExtraTime: isKnockout,
      allowPenalties: isKnockout,
      competitionContext: {
        competitionId: tournament.id,
        fixtureId: f.id,
        label: `${tournament.name} · ${f.stageLabel}`,
      },
    });
  };

  const simulateOtherMatches = () => {
    const isKnockout = tournament.phase !== 'group';
    let next: TournamentState = {
      ...tournament,
      fixtures: tournament.fixtures.map((f) => {
        if (f.played) return f;
        if (f.homeTeamId === tournament.userTeamId || f.awayTeamId === tournament.userTeamId) return f;
        // In group phase, simulate current round or all remaining non-user matches
        return simulateAIFixture(f, teamsMap, isKnockout);
      }),
    };
    next = advanceTournamentPhase(next, teamsMap);
    onUpdateTournament(next);
  };

  const simulateAllRemaining = () => {
    const isKnockout = tournament.phase !== 'group';
    let next: TournamentState = {
      ...tournament,
      fixtures: tournament.fixtures.map((f) => (f.played ? f : simulateAIFixture(f, teamsMap, isKnockout))),
    };
    next = advanceTournamentPhase(next, teamsMap);
    onUpdateTournament(next);
  };

  const champion = tournament.championTeamId ? teamsMap[tournament.championTeamId] : null;

  return (
    <BroadcastLayout
      title={tournament.name}
      subtitle={`Stage: ${tournament.phase.toUpperCase()} · User Team: ${teamsMap[tournament.userTeamId]?.name}`}
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => onUpdateTournament(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Tournament
        </button>
      }
    >
      {champion && (
        <div className="broadcast-panel rounded-lg p-6 mb-6 border-amber-400/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase text-amber-400">Tournament Champions</div>
              <div className="font-display text-3xl font-extrabold text-white">{champion.name}</div>
            </div>
          </div>
          <TeamCrest crest={champion.crest} size={64} />
        </div>
      )}

      {/* Action Bar */}
      {tournament.phase !== 'completed' && (
        <div className="broadcast-panel rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          {nextUserFixture ? (
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase">{nextUserFixture.stageLabel}</div>
              <div className="font-display text-xl font-bold text-white">
                {teamsMap[nextUserFixture.homeTeamId]?.name} vs {teamsMap[nextUserFixture.awayTeamId]?.name}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-300">All your matches in this stage are complete. Advance the bracket!</div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {nextUserFixture && (
              <button
                type="button"
                onClick={() => playFixture(nextUserFixture)}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Play Match
              </button>
            )}
            <button
              type="button"
              onClick={nextUserFixture ? simulateOtherMatches : simulateAllRemaining}
              className="flex items-center gap-2 px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold cursor-pointer"
            >
              <FastForward className="w-4 h-4" /> {nextUserFixture ? 'Sim AI Fixtures' : 'Simulate & Advance'}
            </button>
          </div>
        </div>
      )}

      {/* Group Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {tournament.groups.map((grp) => {
          const rows = computeGroupStandings(grp.id, grp.teamIds, tournament.fixtures, teamsMap);
          return (
            <div key={grp.id} className="broadcast-panel rounded-lg p-4">
              <h3 className="font-display text-lg font-bold uppercase text-amber-400 mb-3">{grp.name}</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-left">
                    <th className="py-1.5">Club</th>
                    <th className="py-1.5 text-center">P</th>
                    <th className="py-1.5 text-center">W</th>
                    <th className="py-1.5 text-center">D</th>
                    <th className="py-1.5 text-center">L</th>
                    <th className="py-1.5 text-center">GD</th>
                    <th className="py-1.5 text-right">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {rows.map((r, i) => (
                    <tr
                      key={r.teamId}
                      className={`${r.teamId === tournament.userTeamId ? 'text-amber-300 font-bold' : 'text-slate-200'} ${i < 2 ? 'bg-emerald-500/5' : ''}`}
                    >
                      <td className="py-2 pr-2 truncate max-w-[140px]">
                        {i + 1}. {r.teamName}
                      </td>
                      <td className="text-center font-mono-tabular">{r.played}</td>
                      <td className="text-center font-mono-tabular">{r.won}</td>
                      <td className="text-center font-mono-tabular">{r.drawn}</td>
                      <td className="text-center font-mono-tabular">{r.lost}</td>
                      <td className="text-center font-mono-tabular">{r.goalDifference}</td>
                      <td className="text-right font-mono-tabular font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Knockout & Recent Fixtures */}
      <div className="broadcast-panel rounded-lg p-4">
        <h3 className="font-display text-lg font-bold uppercase text-white mb-3">Tournament Fixtures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {tournament.fixtures.map((f) => (
            <div key={f.id} className="p-3 rounded bg-slate-900/75 border border-slate-800 text-xs">
              <div className="text-[10px] font-bold uppercase text-amber-400/90 mb-1">{f.stageLabel}</div>
              <div className="flex items-center justify-between font-semibold text-white">
                <span className="truncate max-w-[42%]">{teamsMap[f.homeTeamId]?.shortCode}</span>
                <span className="font-mono-tabular text-amber-400 px-2">
                  {f.played ? `${f.homeGoals} - ${f.awayGoals}` : 'vs'}
                </span>
                <span className="truncate max-w-[42%] text-right">{teamsMap[f.awayTeamId]?.shortCode}</span>
              </div>
              {f.penalties && (
                <div className="text-[10px] text-sky-400 text-center mt-1 font-mono-tabular">
                  Pens: {f.penalties.home} - {f.penalties.away}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </BroadcastLayout>
  );
};
