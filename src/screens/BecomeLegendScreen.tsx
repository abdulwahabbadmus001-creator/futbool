import React, { useState } from 'react';
import { Briefcase, FastForward, Flag, Play, TrendingUp, UserCheck } from 'lucide-react';
import {
  BecomeLegendState,
  GameSettings,
  MatchConfig,
  PositionRole,
  Team,
} from '../types/football';
import { getAllTeams } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import {
  acceptLegendTransfer,
  advanceLegendWeek,
  createLegendCareer,
  negotiateLegendAgent,
  requestLegendMove,
  trainLegendSkill,
} from '../career/legendEngine';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { PlayerCard3D } from '../components/PlayerCard3D';

interface BecomeLegendScreenProps {
  legend: BecomeLegendState | null;
  customTeams: Record<string, Team>;
  settings: GameSettings;
  onUpdateLegend: (legend: BecomeLegendState | null) => void;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

const ROLES: PositionRole[] = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB'];

export const BecomeLegendScreen: React.FC<BecomeLegendScreenProps> = ({
  legend,
  customTeams,
  settings,
  onUpdateLegend,
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const clubTeams = allTeams.filter((t) => t.category === 'club');
  const teamsMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  const [playerName, setPlayerName] = useState('Alex Mercer');
  const [nationality, setNationality] = useState('Albia');
  const [position, setPosition] = useState<PositionRole>('ST');
  const [startingClubId, setStartingClubId] = useState(clubTeams[6]?.id ?? clubTeams[0].id);
  const [usePlayerLockCam, setUsePlayerLockCam] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!legend) {
    return (
      <BroadcastLayout
        title="Football Life · Become a Legend"
        subtitle="Create Your Pro, Lock Single-Player Control on the Pitch & Climb to Stardom"
        onBack={onBack}
        onHome={onBack}
      >
        <div className="broadcast-panel rounded-lg p-6 max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-3 text-[#FF8C00]">
            <UserCheck className="w-6 h-6" />
            <h2 className="font-display text-2xl font-extrabold uppercase text-white">Create Your Legend</h2>
          </div>

          <div>
            <label htmlFor="bal-name" className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Player Name
            </label>
            <input
              id="bal-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bal-pos" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Primary Position
              </label>
              <select
                id="bal-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value as PositionRole)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bal-nat" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Nationality
              </label>
              <input
                id="bal-nat"
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bal-club" className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Starting Club
            </label>
            <select
              id="bal-club"
              value={startingClubId}
              onChange={(e) => setStartingClubId(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
            >
              {clubTeams.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (OVR {c.rating.overall})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            data-testid="start-legend-btn"
            onClick={() => onUpdateLegend(createLegendCareer(playerName, position, nationality, startingClubId, clubTeams))}
            className="w-full py-3 rounded we-accent-btn font-display text-xl uppercase tracking-wide cursor-pointer"
          >
            Begin Legend Career
          </button>
        </div>
      </BroadcastLayout>
    );
  }

  const club = teamsMap[legend.clubId] ?? clubTeams[0];
  const nextFixture = legend.league.fixtures.find(
    (f) => f.round === legend.league.currentRound && !f.played && (f.homeTeamId === legend.clubId || f.awayTeamId === legend.clubId)
  );

  const playNextLegendMatch = () => {
    if (!nextFixture) return;
    const syncedClub: Team = JSON.parse(JSON.stringify(club));
    // Inject Legend into Starting XI replacing slot matching position or slot 9
    const replaceIdx = syncedClub.startingXI.length > 9 ? 9 : syncedClub.startingXI.length - 1;
    syncedClub.roster = [
      ...syncedClub.roster.filter((p) => p.id !== legend.player.id),
      legend.player,
    ];
    syncedClub.startingXI[replaceIdx] = legend.player.id;

    const isHome = nextFixture.homeTeamId === legend.clubId;
    onStartMatch({
      mode: 'legend',
      homeTeam: isHome ? syncedClub : teamsMap[nextFixture.homeTeamId],
      awayTeam: isHome ? teamsMap[nextFixture.awayTeamId] : syncedClub,
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[0],
      durationMinutes: settings.matchDurationMinutes,
      difficulty: settings.difficulty,
      allowExtraTime: false,
      allowPenalties: false,
      legendPlayerId: legend.player.id,
      preferredCameraPreset: usePlayerLockCam ? 'player-lock' : undefined,
      competitionContext: {
        competitionId: legend.id,
        fixtureId: nextFixture.id,
        label: `Become a Legend · Week ${legend.league.currentRound}`,
      },
    });
  };

  const simLegendWeek = () => {
    if (!nextFixture) return;
    const hg = Math.floor(Math.random() * 3);
    const ag = Math.floor(Math.random() * 2);
    const myGoals = Math.random() < 0.45 ? 1 : 0;
    const myAssists = Math.random() < 0.35 ? 1 : 0;
    onUpdateLegend(advanceLegendWeek(legend, nextFixture.id, hg, ag, myGoals, myAssists, teamsMap));
  };

  return (
    <BroadcastLayout
      title={`${legend.player.name} — Become a Legend`}
      subtitle={`${club.name} · Season ${legend.seasonNumber} · Week ${legend.league.currentRound}/${legend.league.totalRounds}`}
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => onUpdateLegend(null)}
          className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          New Legend
        </button>
      }
    >
      {feedback && (
        <div className="mb-4 px-4 py-2 rounded bg-amber-950/60 border border-[#FF6B00]/60 text-xs text-amber-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive 3D Player Card & 3D Wireframe Radar */}
        <div className="lg:col-span-5 space-y-4">
          <PlayerCard3D player={legend.player} teamColor={club.homeKit.primary} showRadar />

          <div className="broadcast-panel rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-[#0A0F1D]">
                <div className="text-slate-400 text-[10px]">APPS</div>
                <div className="font-mono-tabular font-bold text-white text-base">{legend.appearances}</div>
              </div>
              <div className="p-2 rounded bg-[#0A0F1D]">
                <div className="text-slate-400 text-[10px]">GOALS</div>
                <div className="font-mono-tabular font-bold text-[#FF8C00] text-base">{legend.goals}</div>
              </div>
              <div className="p-2 rounded bg-[#0A0F1D]">
                <div className="text-slate-400 text-[10px]">ASSISTS</div>
                <div className="font-mono-tabular font-bold text-sky-400 text-base">{legend.assists}</div>
              </div>
              <div className="p-2 rounded bg-[#0A0F1D]">
                <div className="text-slate-400 text-[10px]">RATING</div>
                <div className="font-mono-tabular font-bold text-emerald-400 text-base">{legend.avgRating}</div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0A0F1D] border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">Manager Trust Meter</span>
                <span className="font-mono-tabular font-bold text-[#FF8C00]">{legend.managerTrust ?? 62}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B00] to-emerald-400"
                  style={{ width: `${legend.managerTrust ?? 62}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0A0F1D] border border-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Flag className="w-3.5 h-3.5 text-sky-400" /> {legend.intlNationName ?? 'National XI'}
              </span>
              <span className="font-mono-tabular font-bold text-sky-300">
                {legend.intlCallUps ?? 0} Call-Ups
              </span>
            </div>
          </div>
        </div>

        {/* Right: Match Action, Skill Training & Transfer Offers */}
        <div className="lg:col-span-7 space-y-4">
          <div className="broadcast-panel rounded-lg p-5">
            {nextFixture ? (
              <div>
                <div className="text-xs font-bold uppercase text-[#FF8C00] mb-1">
                  Next Match · Week {legend.league.currentRound} (Single-Player Cursor Lock)
                </div>
                <div className="font-display text-2xl font-extrabold text-white mb-4">
                  {teamsMap[nextFixture.homeTeamId]?.name} vs {teamsMap[nextFixture.awayTeamId]?.name}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={playNextLegendMatch}
                    className="flex items-center gap-2 px-5 py-2.5 rounded we-accent-btn text-sm cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" /> Play as {legend.player.shortName}
                  </button>
                  <button
                    type="button"
                    onClick={simLegendWeek}
                    className="flex items-center gap-2 px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold cursor-pointer"
                  >
                    <FastForward className="w-4 h-4" /> Sim Week
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-200 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePlayerLockCam}
                    onChange={(e) => setUsePlayerLockCam(e.target.checked)}
                    className="accent-[#FF6B00]"
                  />
                  <span>Use Player-Lock Camera (Follows {legend.player.shortName})</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-2">
                  Tip: On the pitch, press [J] or [K] off the ball to call for a pass, and [C]/[V] for 1v1 skills!
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-300">Season complete! Accept a club transfer offer below to advance.</p>
            )}
          </div>

          <div className="broadcast-panel rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF8C00]" />
                <h3 className="font-display text-lg font-bold uppercase text-white">Skill Points & Training</h3>
              </div>
              <span className="text-xs font-mono-tabular font-bold text-[#FF8C00]">
                {legend.skillPoints} SP · {legend.xp}/100 XP
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const).map((stat) => (
                <button
                  key={stat}
                  type="button"
                  disabled={legend.skillPoints <= 0}
                  onClick={() => {
                    const res = trainLegendSkill(legend, stat);
                    setFeedback(res.message);
                    if (res.ok) onUpdateLegend(res.legend);
                  }}
                  className={`p-2 rounded border text-center cursor-pointer ${
                    legend.skillPoints > 0
                      ? 'bg-[#0A0F1D] border-[#FF6B00]/50 hover:bg-[#FF6B00]/20 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="text-[10px] uppercase text-slate-400">{stat.slice(0, 3)}</div>
                  <div className="font-mono-tabular font-bold text-sm">{legend.player.attributes[stat]}</div>
                  <div className="text-[10px] text-[#FF8C00] font-bold">+2</div>
                </button>
              ))}
            </div>
          </div>

          <div className="broadcast-panel rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#FF8C00]" />
                <h3 className="font-display text-lg font-bold uppercase text-white">Agent Desk & Contract</h3>
              </div>
              <span className="text-xs font-mono-tabular text-slate-300">
                Wage €{legend.player.wage}K/wk · Clause €{legend.releaseClause ?? 18}M · {legend.player.contractYears}y
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = negotiateLegendAgent(legend, 'wage-bump');
                  setFeedback(res.message);
                  if (res.ok) onUpdateLegend(res.legend);
                }}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white cursor-pointer"
              >
                Demand Wage Bump
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = negotiateLegendAgent(legend, 'lower-clause');
                  setFeedback(res.message);
                  if (res.ok) onUpdateLegend(res.legend);
                }}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white cursor-pointer"
              >
                Lower Release Clause
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = requestLegendMove(legend, 'loan', clubTeams);
                  setFeedback(res.message);
                  if (res.ok) onUpdateLegend(res.legend);
                }}
                className="px-3 py-1.5 rounded bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-xs font-semibold text-sky-200 cursor-pointer"
              >
                Request Loan
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = requestLegendMove(legend, 'transfer', clubTeams);
                  setFeedback(res.message);
                  if (res.ok) onUpdateLegend(res.legend);
                }}
                className="px-3 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-[#FF6B00]/50 text-xs font-semibold text-amber-200 cursor-pointer"
              >
                Request Transfer
              </button>
            </div>
          </div>

          <div className="broadcast-panel rounded-lg p-5">
            <h3 className="font-display text-lg font-bold uppercase text-white mb-2.5">Club Transfer Offers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {legend.offers.map((off) => (
                <div key={off.id} className="p-3 rounded bg-[#0A0F1D] border border-slate-700 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-white">{off.clubName}</div>
                    <div className="text-[11px] text-slate-400">
                      {off.rolePromise} · €{off.weeklyWage}K/wk
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = acceptLegendTransfer(legend, off.id, clubTeams);
                      setFeedback(res.message);
                      if (res.ok) onUpdateLegend(res.legend);
                    }}
                    className="px-3 py-1.5 rounded we-accent-btn text-xs cursor-pointer"
                  >
                    Sign
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BroadcastLayout>
  );
};
