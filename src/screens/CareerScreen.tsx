import React, { useState } from 'react';
import {
  Briefcase,
  Eye,
  FastForward,
  Flag,
  Play,
  RefreshCw,
  ShoppingBag,
  Users,
  Award,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  CareerStaffLevels,
  CareerState,
  GameSettings,
  MatchConfig,
  Team,
} from '../types/football';
import { getAllTeams } from '../data/teams';
import { STADIUMS } from '../data/stadiums';
import {
  DEFAULT_STAFF_LEVELS,
  acceptInternationalOffer,
  advanceCareerWeek,
  buyTransferPlayer,
  claimSponsorTarget,
  createCareer,
  generateInternationalOffers,
  generateSponsorTargets,
  generateSponsors,
  generateYouthAcademy,
  getScoutDiscountFactor,
  getStaffUpgradeCost,
  promoteYouthPlayer,
  renewPlayerContract,
  scoutPlayer,
  sellSquadPlayer,
  signSponsor,
  startNextCareerSeason,
  upgradeStaffMember,
} from '../career/careerEngine';
import { computeLeagueStandings } from '../competitions/leagueEngine';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { HexRadarChart } from '../components/HexRadarChart';
import { PlayerCard3D, getFormArrowMeta } from '../components/PlayerCard3D';
import { MASTER_LEAGUE_ORIGINAL_TEAM } from '../data/pes2012Content';

interface CareerScreenProps {
  career: CareerState | null;
  customTeams: Record<string, Team>;
  settings: GameSettings;
  onUpdateCareer: (career: CareerState | null) => void;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

export const CareerScreen: React.FC<CareerScreenProps> = ({
  career,
  customTeams,
  settings,
  onUpdateCareer,
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const clubTeams = allTeams.filter((t) => t.category === 'club');
  const teamsMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  const [selectedClubId, setSelectedClubId] = useState(clubTeams[0].id);
  const [squadLineupMode, setSquadLineupMode] = useState<'real' | 'ml-original'>('real');
  const [tab, setTab] = useState<'overview' | 'squad' | 'transfers' | 'youth' | 'sponsors' | 'standings'>('overview');
  const [selectedSquadPlayerId, setSelectedSquadPlayerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!career) {
    return (
      <BroadcastLayout
        title="Football Life · Master League"
        subtitle="Club Management · Budgets, Sponsors, Youth Academy, Transfers & Seasons"
        onBack={onBack}
        onHome={onBack}
      >
        <div className="broadcast-panel rounded-lg p-6 max-w-xl mx-auto space-y-5">
          <div className="flex items-center gap-3 text-[#00E5FF]">
            <Briefcase className="w-6 h-6" />
            <h2 className="font-display text-2xl font-extrabold uppercase text-white">Choose Your Club & Lineup</h2>
          </div>
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="w-full bg-[#061229] border border-cyan-400/40 rounded px-3 py-2.5 text-sm text-white"
          >
            {clubTeams.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · Budget €{c.budget}M · OVR {c.rating.overall}
              </option>
            ))}
          </select>

          <div className="space-y-2">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-cyan-200">
              Starting Squad Composition (PES 2012 Authentic Option)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSquadLineupMode('real')}
                className={`p-3 rounded text-left border cursor-pointer transition-all ${
                  squadLineupMode === 'real'
                    ? 'bg-[#0B3B8C] border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                    : 'bg-[#061229]/80 border-white/15 hover:border-cyan-400/40'
                }`}
              >
                <div className="font-display text-sm font-extrabold uppercase text-white">
                  Club Matchday Lineup
                </div>
                <p className="text-[11px] text-cyan-100/75 mt-0.5">
                  Start with the selected club&apos;s authentic 2011/12 star roster.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSquadLineupMode('ml-original')}
                className={`p-3 rounded text-left border cursor-pointer transition-all ${
                  squadLineupMode === 'ml-original'
                    ? 'bg-[#0B3B8C] border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                    : 'bg-[#061229]/80 border-white/15 hover:border-cyan-400/40'
                }`}
              >
                <div className="font-display text-sm font-extrabold uppercase text-[#00E5FF]">
                  Master League Original Lineup
                </div>
                <p className="text-[11px] text-cyan-100/75 mt-0.5">
                  Start with Castolo, Minanda, Ordaz, Ximelez, Ivarov, Stremer &amp; Ruskin.
                </p>
              </button>
            </div>
          </div>

          <button
            type="button"
            data-testid="start-career-btn"
            onClick={() => {
              const created = createCareer(selectedClubId, clubTeams);
              if (squadLineupMode === 'ml-original') {
                created.squad = JSON.parse(JSON.stringify(MASTER_LEAGUE_ORIGINAL_TEAM.roster));
              }
              onUpdateCareer(created);
            }}
            className="w-full py-3 rounded we-accent-btn font-display text-xl uppercase tracking-wide cursor-pointer"
          >
            Sign Master League Contract
          </button>
        </div>
      </BroadcastLayout>
    );
  }

  // Ensure legacy saves safely hydrate sponsors, staffLevels, targets, intl offers & youthAcademy
  const sponsorsList = career.sponsors && career.sponsors.length > 0 ? career.sponsors : generateSponsors();
  const sponsorTargets =
    career.sponsorTargets && career.sponsorTargets.length > 0
      ? career.sponsorTargets
      : generateSponsorTargets();
  const intlOffers =
    career.internationalOffers && career.internationalOffers.length > 0
      ? career.internationalOffers
      : generateInternationalOffers();
  const revealedIds = career.revealedPlayerIds ?? [];
  const staffLevels: CareerStaffLevels = { ...DEFAULT_STAFF_LEVELS, ...(career.staffLevels ?? {}) };
  const youthList = career.youthAcademy ?? generateYouthAcademy(career.clubId, career.seasonNumber, staffLevels.youth);

  const hydratedCareer: CareerState = {
    ...career,
    sponsors: sponsorsList,
    sponsorTargets,
    internationalOffers: intlOffers,
    revealedPlayerIds: revealedIds,
    staffLevels,
    youthAcademy: youthList,
  };

  const userClub = teamsMap[career.clubId] ?? clubTeams[0];
  const standings = computeLeagueStandings(career.league, teamsMap);
  const position = standings.findIndex((s) => s.teamId === career.clubId) + 1;
  const nextFixture = career.league.fixtures.find(
    (f) => f.round === career.league.currentRound && !f.played && (f.homeTeamId === career.clubId || f.awayTeamId === career.clubId)
  );
  const inspectedPlayer =
    career.squad.find((p) => p.id === selectedSquadPlayerId) ?? career.squad[9] ?? career.squad[0];

  const playNextCareerMatch = () => {
    if (!nextFixture) return;
    const syncedClub: Team = {
      ...userClub,
      roster: career.squad,
      startingXI: career.squad.filter((p) => p.injuredWeeks === 0).slice(0, 11).map((p) => p.id),
      substitutes: career.squad.filter((p) => p.injuredWeeks === 0).slice(11, 18).map((p) => p.id),
    };
    const isHome = nextFixture.homeTeamId === career.clubId;
    onStartMatch({
      mode: 'career',
      homeTeam: isHome ? syncedClub : teamsMap[nextFixture.homeTeamId],
      awayTeam: isHome ? teamsMap[nextFixture.awayTeamId] : syncedClub,
      homeKitType: 'home',
      awayKitType: 'away',
      stadium: STADIUMS[0],
      durationMinutes: settings.matchDurationMinutes,
      difficulty: settings.difficulty,
      allowExtraTime: false,
      allowPenalties: false,
      competitionContext: {
        competitionId: career.id,
        fixtureId: nextFixture.id,
        label: `Master League S${career.seasonNumber} · Week ${career.league.currentRound}`,
      },
    });
  };

  const simCareerWeek = () => {
    if (!nextFixture) return;
    const hOvr = teamsMap[nextFixture.homeTeamId]?.rating.overall ?? 80;
    const aOvr = teamsMap[nextFixture.awayTeamId]?.rating.overall ?? 80;
    const hg = Math.max(0, Math.round(Math.random() * 2.2 + (hOvr - aOvr) * 0.04));
    const ag = Math.max(0, Math.round(Math.random() * 2.0 + (aOvr - hOvr) * 0.04));
    const hydrated: CareerState = { ...career, sponsors: sponsorsList, staffLevels, youthAcademy: youthList };
    const updated = advanceCareerWeek(hydrated, nextFixture.id, hg, ag, teamsMap, settings.injuriesEnabled);
    onUpdateCareer(updated);
  };

  return (
    <BroadcastLayout
      title={`${userClub.name} — Master League`}
      subtitle={`Season ${career.seasonNumber} · Week ${career.league.currentRound}/${career.league.totalRounds} · Pos #${position}`}
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => onUpdateCareer(null)}
          className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          Resign / New Club
        </button>
      }
    >
      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="broadcast-panel rounded p-3.5">
          <div className="text-[11px] text-slate-400 uppercase">Club Budget</div>
          <div className="font-display text-2xl font-extrabold text-emerald-400 font-mono-tabular">€{career.budget}M</div>
        </div>
        <div className="broadcast-panel rounded p-3.5">
          <div className="text-[11px] text-slate-400 uppercase">Weekly Wage Bill</div>
          <div className="font-display text-2xl font-extrabold text-white font-mono-tabular">€{career.weeklyWageBill}K</div>
        </div>
        <div className="broadcast-panel rounded p-3.5">
          <div className="text-[11px] text-slate-400 uppercase">Senior / Youth</div>
          <div className="font-display text-2xl font-extrabold text-sky-400 font-mono-tabular">
            {career.squad.length} / {youthList.length}
          </div>
        </div>
        <div className="broadcast-panel rounded p-3.5">
          <div className="text-[11px] text-slate-400 uppercase">Trophies Won</div>
          <div className="font-display text-2xl font-extrabold text-[#FF8C00] font-mono-tabular">{career.trophiesWon}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { id: 'overview', label: 'Club Office' },
          { id: 'squad', label: 'Squad & Radar' },
          { id: 'transfers', label: 'Scout & Transfers' },
          { id: 'youth', label: `Youth Academy (${youthList.length})` },
          { id: 'sponsors', label: 'Sponsors' },
          { id: 'standings', label: 'Standings' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-3.5 py-2 rounded text-xs sm:text-sm font-semibold cursor-pointer ${
              tab === t.id ? 'we-tab-active' : 'bg-[#0A0F1D] border border-slate-700 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 rounded bg-amber-950/60 border border-[#FF6B00]/60 text-xs text-amber-200">
          {feedback}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="broadcast-panel rounded-lg p-5">
              {career.league.completed ? (
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-[#FF8C00] uppercase mb-2">Season Complete</h3>
                  <p className="text-sm text-slate-300 mb-4">Final League Position: #{position}</p>
                  <button
                    type="button"
                    onClick={() => onUpdateCareer(startNextCareerSeason(career, clubTeams))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Start Season {career.seasonNumber + 1}
                  </button>
                </div>
              ) : nextFixture ? (
                <div>
                  <div className="text-xs font-bold uppercase text-[#FF8C00] mb-1">
                    Next Match · Week {career.league.currentRound}
                  </div>
                  <div className="font-display text-2xl font-extrabold text-white mb-4">
                    {teamsMap[nextFixture.homeTeamId]?.name} vs {teamsMap[nextFixture.awayTeamId]?.name}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={playNextCareerMatch}
                      className="flex items-center gap-2 px-5 py-2.5 rounded we-accent-btn text-sm cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" /> Play Match
                    </button>
                    <button
                      type="button"
                      onClick={simCareerWeek}
                      className="flex items-center gap-2 px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm cursor-pointer"
                    >
                      <FastForward className="w-4 h-4" /> Simulate Matchweek
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="broadcast-panel rounded-lg p-5">
              <h3 className="font-display text-lg font-bold uppercase text-white mb-3">Weekly Training Focus</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['attack', 'passing', 'defense', 'fitness'] as const).map((focus) => (
                  <button
                    key={focus}
                    type="button"
                    onClick={() => onUpdateCareer({ ...career, trainingFocus: focus })}
                    className={`py-2 px-3 rounded text-xs font-bold uppercase border cursor-pointer ${
                      career.trainingFocus === focus
                        ? 'bg-[#FF6B00] text-slate-950 border-amber-300'
                        : 'bg-[#0A0F1D] border-slate-700 text-slate-300'
                    }`}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            <div className="broadcast-panel rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-[#FF8C00]" />
                <h3 className="font-display text-lg font-bold uppercase text-white">Club Staff & Facilities</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    { key: 'coach', label: 'Head Coach', perk: 'Weekly player growth' },
                    { key: 'scout', label: 'Chief Scout', perk: 'Transfer fee discount' },
                    { key: 'medical', label: 'Medical Team', perk: 'Faster injury recovery' },
                    { key: 'youth', label: 'Youth Director', perk: 'Higher Academy & Regen OVR' },
                  ] as const
                ).map((item) => {
                  const lvl = staffLevels[item.key];
                  const cost = getStaffUpgradeCost(lvl);
                  const maxed = lvl >= 5;
                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded bg-[#0A0F1D]/90 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{item.label}</span>
                          <span className="font-mono-tabular text-[#FF8C00]">Lv.{lvl}/5</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{item.perk}</div>
                      </div>
                      <button
                        type="button"
                        data-testid={`upgrade-staff-${item.key}`}
                        disabled={maxed || career.budget < cost}
                        onClick={() => {
                          const hydrated: CareerState = {
                            ...career,
                            sponsors: sponsorsList,
                            staffLevels,
                            youthAcademy: youthList,
                          };
                          const res = upgradeStaffMember(hydrated, item.key);
                          setFeedback(res.message);
                          if (res.ok) onUpdateCareer(res.career);
                        }}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-bold shrink-0 ${
                          maxed
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : career.budget < cost
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'we-accent-btn cursor-pointer'
                        }`}
                      >
                        {maxed ? 'MAX' : `€${cost}M`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="broadcast-panel rounded-lg p-4">
              <h3 className="font-display text-lg font-bold uppercase text-[#FF8C00] mb-2">Board Objectives</h3>
              <div className="space-y-2 text-xs">
                {career.objectives.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded bg-[#0A0F1D]/80">
                    <span>{o.title}</span>
                    <span className={o.completed ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {o.completed ? 'Completed' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="broadcast-panel rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-display text-lg font-bold uppercase text-sky-400 flex items-center gap-1.5">
                  <Flag className="w-4 h-4" /> International Management Offers
                </h3>
                {career.activeNationId && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold uppercase text-emerald-300">
                    Active Dual Role
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                {intlOffers.map((offer) => {
                  const isActive = career.activeNationId === offer.nationId;
                  return (
                    <div
                      key={offer.id}
                      className="p-2.5 rounded bg-[#0A0F1D]/85 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-white">{offer.nationName}</div>
                        <div className="text-[11px] text-slate-400">
                          {offer.expectation} · +€{offer.salaryBonus}M Bonus
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(career.activeNationId)}
                        onClick={() => {
                          const res = acceptInternationalOffer(hydratedCareer, offer.id);
                          setFeedback(res.message);
                          if (res.ok) onUpdateCareer(res.career);
                        }}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-bold ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950'
                            : career.activeNationId
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'we-accent-btn cursor-pointer'
                        }`}
                      >
                        {isActive ? 'Appointed' : 'Accept'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="broadcast-panel rounded-lg p-4">
              <h3 className="font-display text-lg font-bold uppercase text-white mb-2">Club News Feed</h3>
              <div className="space-y-2 max-h-44 overflow-y-auto text-xs">
                {career.newsFeed.map((n) => (
                  <div key={n.id} className="p-2 rounded bg-[#0A0F1D]/70 border border-slate-800/80 text-slate-300">
                    <span className="text-[#FF8C00] font-bold mr-2">W{n.week}</span>
                    {n.headline}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'squad' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 broadcast-panel rounded-lg p-4 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#FF8C00]" />
              <h3 className="font-display text-lg font-bold uppercase text-white">First Team Squad</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-left">
                  <th className="py-2">Player</th>
                  <th className="py-2">Pos</th>
                  <th className="py-2 text-center">Form</th>
                  <th className="py-2 text-center">Morale</th>
                  <th className="py-2 text-center">OVR</th>
                  <th className="py-2 text-center">Fit</th>
                  <th className="py-2 text-center">Contract</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {career.squad.map((p) => {
                  const formMeta = getFormArrowMeta(p.formArrow);
                  const FormIcon = formMeta.Icon;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedSquadPlayerId(p.id)}
                      className={`cursor-pointer ${
                        inspectedPlayer?.id === p.id ? 'bg-[#FF6B00]/15 text-white' : 'text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 font-semibold">
                        {p.name}
                        {p.injuredWeeks > 0 && <span className="ml-2 text-rose-400">(Inj {p.injuredWeeks}w)</span>}
                      </td>
                      <td className="py-2 font-mono-tabular text-[#FF8C00]">{p.position}</td>
                      <td className="py-2 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${formMeta.color}`}>
                          <FormIcon className="w-2.5 h-2.5" />
                        </span>
                      </td>
                      <td className="text-center font-mono-tabular text-sky-300">{p.morale ?? 80}%</td>
                      <td className="text-center font-mono-tabular font-bold text-emerald-400">{p.overall}</td>
                      <td className="text-center font-mono-tabular">{p.fitness}%</td>
                      <td className="text-center font-mono-tabular">
                        {p.contractYears}y · €{p.wage}K
                      </td>
                      <td className="text-right space-x-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const res = renewPlayerContract(career, p.id);
                            setFeedback(res.message);
                            if (res.ok) onUpdateCareer(res.career);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
                        >
                          Renew
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const res = sellSquadPlayer(career, p.id);
                            setFeedback(res.message);
                            if (res.ok) onUpdateCareer(res.career);
                          }}
                          className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-200 text-[11px] cursor-pointer"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inspectedPlayer && (
            <div className="lg:col-span-4">
              <PlayerCard3D player={inspectedPlayer} teamColor={userClub.homeKit.primary} showRadar />
            </div>
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div className="broadcast-panel rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-lg font-bold uppercase text-white">Scouting & Transfer Market</h3>
            </div>
            {staffLevels.scout > 1 && (
              <span className="text-xs font-bold text-emerald-400">
                Chief Scout Lv.{staffLevels.scout} Discount Active (-{Math.round((1 - getScoutDiscountFactor(staffLevels.scout)) * 100)}%)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto pr-1">
            {career.transferMarket.map((listing) => {
              const effectiveFee = Number(
                (listing.askingPrice * getScoutDiscountFactor(staffLevels.scout)).toFixed(1)
              );
              const isRevealed = staffLevels.scout >= 2 || revealedIds.includes(listing.player.id);
              return (
                <div
                  key={listing.player.id}
                  className="p-3.5 rounded bg-[#0A0F1D]/85 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{listing.player.name}</div>
                      <div className="text-xs text-slate-400">
                        {listing.player.position} · {listing.sellingTeamName} · Age {listing.player.age}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-slate-300 mt-1">
                        {isRevealed
                          ? `PAC ${listing.player.attributes.pace} · SHT ${listing.player.attributes.shooting} · PAS ${listing.player.attributes.passing}`
                          : 'PAC ?? · SHT ?? · PAS ?? (Scout to Reveal)'}
                      </div>
                    </div>
                    <span className="font-mono-tabular font-extrabold text-lg text-emerald-400">
                      {isRevealed ? listing.player.overall : '??'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <span className="font-mono-tabular text-xs text-[#FF8C00] font-bold">
                      Fee: €{effectiveFee}M
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isRevealed && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = scoutPlayer(hydratedCareer, listing.player.id);
                            setFeedback(res.message);
                            if (res.ok) onUpdateCareer(res.career);
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-semibold text-sky-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Scout (€0.5M)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const res = buyTransferPlayer(hydratedCareer, listing);
                          setFeedback(res.message);
                          if (res.ok) onUpdateCareer(res.career);
                        }}
                        className="px-3 py-1.5 rounded we-accent-btn text-xs cursor-pointer"
                      >
                        Sign Player
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'youth' && (
        <div className="broadcast-panel rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#FF8C00]" />
            <h3 className="font-display text-xl font-bold uppercase text-white">Youth Academy Prospects</h3>
          </div>
          {youthList.length === 0 ? (
            <p className="text-xs text-slate-400">All current prospects promoted. New intake arrives next season.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {youthList.map((y) => (
                <div
                  key={y.id}
                  className={`p-4 rounded bg-[#0A0F1D]/85 border flex items-center justify-between gap-4 ${
                    y.isRegen ? 'border-[#FF6B00]/80' : 'border-slate-700/80'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[#FF8C00]">
                      <span>
                        {y.position} · Age {y.age} · {y.nationality}
                      </span>
                      {y.isRegen && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FF6B00] text-slate-950 text-[10px] font-extrabold">
                          17YO REGEN
                        </span>
                      )}
                    </div>
                    <div className="font-display text-xl font-extrabold text-white">{y.name}</div>
                    {y.isRegen && y.regenFrom && (
                      <div className="text-[11px] text-amber-300 mt-0.5">Reborn from {y.regenFrom}</div>
                    )}
                    <div className="text-xs text-slate-400 font-mono-tabular mt-1">
                      OVR {y.overall} · Wage €{y.wage}K/wk
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const hydrated: CareerState = {
                          ...career,
                          youthAcademy: youthList,
                          sponsors: sponsorsList,
                          staffLevels,
                        };
                        const res = promoteYouthPlayer(hydrated, y.id);
                        setFeedback(res.message);
                        if (res.ok) onUpdateCareer(res.career);
                      }}
                      className="mt-3 px-3.5 py-1.5 rounded we-accent-btn text-xs cursor-pointer"
                    >
                      Promote to First Team
                    </button>
                  </div>
                  <HexRadarChart attributes={y.attributes} size={116} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sponsors' && (
        <div className="space-y-5">
          <div className="broadcast-panel rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#FF8C00]" />
              <h3 className="font-display text-xl font-bold uppercase text-white">Commercial Sponsor Negotiations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sponsorsList.map((sp) => {
                const isSigned = career.activeSponsorId === sp.id || sp.signed;
                return (
                  <div
                    key={sp.id}
                    className={`p-4 rounded border flex flex-col justify-between gap-4 ${
                      isSigned ? 'bg-[#FF6B00]/15 border-[#FF6B00]' : 'bg-[#0A0F1D]/85 border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-display text-xl font-extrabold text-white">{sp.name}</div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-300 font-mono-tabular">
                        <div className="flex justify-between">
                          <span>Signing Bonus:</span>
                          <span className="text-emerald-400 font-bold">+€{sp.signingBonus}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weekly Income:</span>
                          <span className="text-white">+€{sp.weeklyIncome}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Match Win Bonus:</span>
                          <span className="text-[#FF8C00]">+€{sp.winBonus}M</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(career.activeSponsorId)}
                      onClick={() => {
                        const res = signSponsor(hydratedCareer, sp.id);
                        setFeedback(res.message);
                        if (res.ok) onUpdateCareer(res.career);
                      }}
                      className={`w-full py-2 rounded text-xs font-bold uppercase ${
                        isSigned
                          ? 'bg-emerald-500 text-slate-950'
                          : career.activeSponsorId
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'we-accent-btn cursor-pointer'
                      }`}
                    >
                      {isSigned ? 'Active Partner' : career.activeSponsorId ? 'Contract Locked' : 'Sign Sponsor Deal'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="broadcast-panel rounded-lg p-5">
            <h3 className="font-display text-lg font-bold uppercase text-[#FF8C00] mb-3">
              Sponsor Performance Bonus Targets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sponsorTargets.map((tgt) => {
                const ready = tgt.currentValue >= tgt.targetValue && !tgt.claimed;
                return (
                  <div key={tgt.id} className="p-3.5 rounded bg-[#0A0F1D]/85 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{tgt.title}</span>
                      <span className="font-mono-tabular text-emerald-400 font-bold">+€{tgt.bonusAmount}M</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF6B00]"
                        style={{ width: `${Math.min(100, (tgt.currentValue / tgt.targetValue) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-mono-tabular text-slate-400">
                        {Math.min(tgt.currentValue, tgt.targetValue)} / {tgt.targetValue}
                      </span>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => {
                          const res = claimSponsorTarget(hydratedCareer, tgt.id);
                          setFeedback(res.message);
                          if (res.ok) onUpdateCareer(res.career);
                        }}
                        className={`px-2.5 py-1 rounded font-bold ${
                          tgt.claimed
                            ? 'bg-emerald-950/70 text-emerald-300'
                            : ready
                              ? 'we-accent-btn cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {tgt.claimed ? 'Claimed' : ready ? 'Claim Bonus' : 'In Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'standings' && (
        <div className="broadcast-panel rounded-lg p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-left">
                <th className="py-2">#</th>
                <th className="py-2">Club</th>
                <th className="py-2 text-center">P</th>
                <th className="py-2 text-center">W</th>
                <th className="py-2 text-center">D</th>
                <th className="py-2 text-center">L</th>
                <th className="py-2 text-center">GD</th>
                <th className="py-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {standings.map((r, i) => (
                <tr key={r.teamId} className={r.teamId === career.clubId ? 'text-[#FF8C00] font-bold' : 'text-slate-200'}>
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{r.teamName}</td>
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
      )}
    </BroadcastLayout>
  );
};
