import React, { useState } from 'react';
import { Award, FastForward, Play, RotateCcw } from 'lucide-react';
import { GameSettings, LeagueState, MatchConfig, Team } from '../types/football';
import { getAllTeams } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import {
  computeLeagueStandings,
  createLeague,
  recordLeagueFixtureResult,
  simulateLeagueRoundAI,
} from '../competitions/leagueEngine';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface LeagueScreenProps {
  league: LeagueState | null;
  customTeams: Record<string, Team>;
  settings: GameSettings;
  onUpdateLeague: (league: LeagueState | null) => void;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

export const LeagueScreen: React.FC<LeagueScreenProps> = ({
  league,
  customTeams,
  settings,
  onUpdateLeague,
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const clubTeams = allTeams.filter((t) => t.category === 'club');
  const teamsMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));
  const [selectedClubId, setSelectedClubId] = useState(clubTeams[0].id);

  if (!league) {
    return (
      <BroadcastLayout title="League Mode" subtitle="Continental Premier League · 10 Clubs · 18 Matchweeks" onBack={onBack} onHome={onBack}>
        <div className="broadcast-panel rounded-lg p-6 max-w-xl mx-auto space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Select Your Club</label>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2.5 text-sm text-white"
            >
              {clubTeams.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (OVR {c.rating.overall})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400">
            Double round-robin season (18 rounds, home & away). Top 2 qualify for Continental Cup; bottom 2 face relegation zone.
          </p>
          <button
            type="button"
            data-testid="start-league-btn"
            onClick={() => onUpdateLeague(createLeague('Continental Premier League', selectedClubId, clubTeams))}
            className="w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide cursor-pointer"
          >
            Begin League Season
          </button>
        </div>
      </BroadcastLayout>
    );
  }

  const standings = computeLeagueStandings(league, teamsMap);
  const roundFixtures = league.fixtures.filter((f) => f.round === league.currentRound);
  const userFixture = roundFixtures.find(
    (f) => !f.played && (f.homeTeamId === league.userTeamId || f.awayTeamId === league.userTeamId)
  );

  const playUserFixture = () => {
    if (!userFixture) return;
    onStartMatch({
      mode: 'league',
      homeTeam: teamsMap[userFixture.homeTeamId] ?? clubTeams[0],
      awayTeam: teamsMap[userFixture.awayTeamId] ?? clubTeams[1],
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[0],
      durationMinutes: settings.matchDurationMinutes,
      difficulty: settings.difficulty,
      allowExtraTime: false,
      allowPenalties: false,
      competitionContext: {
        competitionId: league.id,
        fixtureId: userFixture.id,
        label: `${league.name} · Matchweek ${league.currentRound}`,
      },
    });
  };

  const simMatchweek = () => {
    let next = league;
    if (userFixture) {
      const hOvr = teamsMap[userFixture.homeTeamId]?.rating.overall ?? 80;
      const aOvr = teamsMap[userFixture.awayTeamId]?.rating.overall ?? 80;
      const hg = Math.max(0, Math.round(Math.random() * 2.2 + (hOvr - aOvr) * 0.04));
      const ag = Math.max(0, Math.round(Math.random() * 2.0 + (aOvr - hOvr) * 0.04));
      next = recordLeagueFixtureResult(next, userFixture.id, hg, ag, teamsMap);
    }
    next = simulateLeagueRoundAI(next, teamsMap);
    onUpdateLeague(next);
  };

  return (
    <BroadcastLayout
      title={league.name}
      subtitle={`Matchweek ${league.currentRound} of ${league.totalRounds} · Managing ${teamsMap[league.userTeamId]?.name}`}
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => onUpdateLeague(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Season
        </button>
      }
    >
      {league.completed && league.championTeamId && (
        <div className="broadcast-panel rounded-lg p-5 mb-5 border-amber-400/60 flex items-center gap-4">
          <Award className="w-10 h-10 text-amber-400" />
          <div>
            <div className="text-xs uppercase font-bold text-amber-400">League Champions</div>
            <div className="font-display text-2xl font-extrabold text-white">{teamsMap[league.championTeamId]?.name}</div>
          </div>
        </div>
      )}

      {!league.completed && userFixture && (
        <div className="broadcast-panel rounded-lg p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase text-emerald-400">Next Fixture · Matchweek {league.currentRound}</div>
            <div className="font-display text-2xl font-bold text-white">
              {teamsMap[userFixture.homeTeamId]?.name} vs {teamsMap[userFixture.awayTeamId]?.name}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={playUserFixture}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> Play Match
            </button>
            <button
              type="button"
              onClick={simMatchweek}
              className="flex items-center gap-2 px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm cursor-pointer"
            >
              <FastForward className="w-4 h-4" /> Sim Week
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Standings Table */}
        <div className="lg:col-span-8 broadcast-panel rounded-lg p-4 overflow-x-auto">
          <h3 className="font-display text-lg font-bold uppercase text-amber-400 mb-3">League Standings</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-left">
                <th className="py-2">#</th>
                <th className="py-2">Club</th>
                <th className="py-2 text-center">P</th>
                <th className="py-2 text-center">W</th>
                <th className="py-2 text-center">D</th>
                <th className="py-2 text-center">L</th>
                <th className="py-2 text-center">GF</th>
                <th className="py-2 text-center">GA</th>
                <th className="py-2 text-center">GD</th>
                <th className="py-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {standings.map((row, idx) => (
                <tr
                  key={row.teamId}
                  className={`${row.teamId === league.userTeamId ? 'text-amber-300 font-bold' : 'text-slate-200'} ${
                    idx < 2 ? 'bg-emerald-500/5' : idx >= standings.length - 2 ? 'bg-rose-500/5' : ''
                  }`}
                >
                  <td className="py-2 pr-2 font-mono-tabular">{idx + 1}</td>
                  <td className="py-2 pr-2 font-medium">{row.teamName}</td>
                  <td className="text-center font-mono-tabular">{row.played}</td>
                  <td className="text-center font-mono-tabular">{row.won}</td>
                  <td className="text-center font-mono-tabular">{row.drawn}</td>
                  <td className="text-center font-mono-tabular">{row.lost}</td>
                  <td className="text-center font-mono-tabular">{row.goalsFor}</td>
                  <td className="text-center font-mono-tabular">{row.goalsAgainst}</td>
                  <td className="text-center font-mono-tabular">{row.goalDifference}</td>
                  <td className="text-right font-mono-tabular font-bold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 text-[11px] text-slate-400 mt-3">
            <span className="text-emerald-400">Top 2: Continental Cup</span>
            <span className="text-rose-400">Bottom 2: Relegation Zone</span>
          </div>
        </div>

        {/* Matchweek Fixtures & Top Scorers */}
        <div className="lg:col-span-4 space-y-4">
          <div className="broadcast-panel rounded-lg p-4">
            <h3 className="font-display text-lg font-bold uppercase text-white mb-2.5">
              Matchweek {league.currentRound}
            </h3>
            <div className="space-y-2">
              {roundFixtures.map((f) => (
                <div key={f.id} className="p-2 rounded bg-slate-900/75 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="truncate w-20 font-medium">{teamsMap[f.homeTeamId]?.shortCode}</span>
                  <span className="font-mono-tabular text-amber-400 font-bold">
                    {f.played ? `${f.homeGoals} - ${f.awayGoals}` : 'vs'}
                  </span>
                  <span className="truncate w-20 text-right font-medium">{teamsMap[f.awayTeamId]?.shortCode}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="broadcast-panel rounded-lg p-4">
            <h3 className="font-display text-lg font-bold uppercase text-sky-400 mb-2.5">Top Scorers</h3>
            {league.scorers.length === 0 ? (
              <p className="text-xs text-slate-400">No goals recorded yet this season.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {league.scorers.slice(0, 6).map((s, idx) => (
                  <div key={s.playerId} className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="truncate">
                      {idx + 1}. {s.playerName} <span className="text-slate-400">({s.teamShortCode})</span>
                    </span>
                    <span className="font-mono-tabular font-bold text-amber-400">{s.goals}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BroadcastLayout>
  );
};
