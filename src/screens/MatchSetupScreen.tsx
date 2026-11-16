import React, { useState } from 'react';
import { Play, Shuffle } from 'lucide-react';
import {
  DifficultyLevel,
  GameSettings,
  KitSlot,
  MatchConfig,
  MatchImportance,
  Team,
  TeamCategory,
  WeatherCondition,
} from '../types/football';
import { getAllTeams, resolveTeamKit } from '../data/teams';
import { STADIUMS, getStadiumById } from '../data/stadiums';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { TeamCrest } from '../components/TeamCrest';
import { FormationBoard } from '../components/FormationBoard';
import { Matchup3DPreview } from '../components/Matchup3DPreview';

interface MatchSetupScreenProps {
  customTeams: Record<string, Team>;
  settings: GameSettings;
  onStartMatch: (config: MatchConfig) => void;
  onBack: () => void;
}

const DIFFICULTIES: DifficultyLevel[] = [
  'beginner',
  'amateur',
  'regular',
  'professional',
  'top-player',
  'legend',
];

const KIT_SLOTS: { id: KitSlot; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'away', label: 'Away' },
  { id: 'alt', label: '3rd Alt' },
];

export const MatchSetupScreen: React.FC<MatchSetupScreenProps> = ({
  customTeams,
  settings,
  onStartMatch,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const [categoryFilter, setCategoryFilter] = useState<'all' | TeamCategory>('all');
  const [homeTeam, setHomeTeam] = useState<Team>(allTeams[0]);
  const [awayTeam, setAwayTeam] = useState<Team>(allTeams[1]);
  const [homeKitType, setHomeKitType] = useState<KitSlot>('home');
  const [awayKitType, setAwayKitType] = useState<KitSlot>('away');
  const [stadiumId, setStadiumId] = useState(STADIUMS[0].id);
  const [weather, setWeather] = useState<WeatherCondition>('clear');
  const [importance, setImportance] = useState<MatchImportance>('derby');
  const [durationMinutes, setDurationMinutes] = useState<number>(settings.matchDurationMinutes);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(settings.difficulty);
  const [allowPenalties, setAllowPenalties] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'tactics' | 'conditions'>('teams');

  const clubCount = allTeams.filter((t) => t.category === 'club').length;
  const nationalCount = allTeams.filter((t) => t.category === 'national').length;

  const filteredTeams =
    categoryFilter === 'all' ? allTeams : allTeams.filter((t) => t.category === categoryFilter);

  const handleRandomize = () => {
    const idx1 = Math.floor(Math.random() * allTeams.length);
    let idx2 = Math.floor(Math.random() * allTeams.length);
    if (idx2 === idx1) idx2 = (idx1 + 1) % allTeams.length;
    setHomeTeam(allTeams[idx1]);
    setAwayTeam(allTeams[idx2]);
  };

  const launchMatch = () => {
    onStartMatch({
      mode: 'exhibition',
      homeTeam,
      awayTeam,
      homeKitType,
      awayKitType,
      stadium: getStadiumById(stadiumId),
      weather,
      importance,
      durationMinutes,
      difficulty,
      allowExtraTime: false,
      allowPenalties,
    });
  };

  const homeActiveKit = resolveTeamKit(homeTeam, homeKitType);
  const awayActiveKit = resolveTeamKit(awayTeam, awayKitType);

  return (
    <BroadcastLayout
      title="Exhibition Match Setup"
      subtitle="Select Teams, Home/Away/Alt Kits, Weather, Game Plan & Stadium Conditions"
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          data-testid="kickoff-btn"
          onClick={launchMatch}
          className="flex items-center gap-2 px-5 py-2.5 rounded we-accent-btn font-display text-lg uppercase tracking-wide cursor-pointer shadow-lg"
        >
          <Play className="w-4 h-4 fill-current" /> Kick Off
        </button>
      }
    >
      {/* Matchup Banner & Live 3D Crests + Kit Showcase */}
      <div className="broadcast-panel rounded-lg p-5 mb-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="flex items-center gap-4">
            <TeamCrest crest={homeTeam.crest} size={52} />
            <div>
              <div className="text-[11px] font-bold uppercase text-[#FF8C00] flex items-center gap-2">
                <span>Home · User</span>
                <span className="inline-block w-3 h-3 rounded-sm border border-white/30" style={{ backgroundColor: homeActiveKit.primary }} />
              </div>
              <div className="font-display text-2xl font-extrabold text-white">{homeTeam.name}</div>
              <div className="text-xs text-slate-400 font-mono-tabular">
                OVR {homeTeam.rating.overall} · ATK {homeTeam.rating.attack} · DEF {homeTeam.rating.defense}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <span className="font-display text-3xl font-extrabold text-[#FF8C00]">VS</span>
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" /> Random Matchup
            </button>
          </div>

          <div className="flex items-center justify-end gap-4 text-right">
            <div>
              <div className="text-[11px] font-bold uppercase text-rose-400 flex items-center justify-end gap-2">
                <span className="inline-block w-3 h-3 rounded-sm border border-white/30" style={{ backgroundColor: awayActiveKit.primary }} />
                <span>Away · CPU</span>
              </div>
              <div className="font-display text-2xl font-extrabold text-white">{awayTeam.name}</div>
              <div className="text-xs text-slate-400 font-mono-tabular">
                OVR {awayTeam.rating.overall} · ATK {awayTeam.rating.attack} · DEF {awayTeam.rating.defense}
              </div>
            </div>
            <TeamCrest crest={awayTeam.crest} size={52} />
          </div>
        </div>

        <Matchup3DPreview
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeKitType={homeKitType}
          awayKitType={awayKitType}
          height={176}
        />
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { id: 'teams', label: '1. Team & Kit Selection' },
          { id: 'tactics', label: '2. Game Plan & Tactics' },
          { id: 'conditions', label: '3. Stadium, Weather & Rules' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded text-sm font-semibold cursor-pointer ${
              activeTab === tab.id
                ? 'we-tab-active'
                : 'bg-[#0A0F1D] border border-slate-700 text-slate-200 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'club', 'national'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-200 text-slate-950'
                    : 'bg-[#0A0F1D] border border-slate-700 text-slate-300'
                }`}
              >
                {cat === 'all'
                  ? `All Teams (${allTeams.length})`
                  : cat === 'club'
                    ? `Clubs (${clubCount})`
                    : `National Teams (${nationalCount})`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Home Picker */}
            <div className="broadcast-panel rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-lg font-bold uppercase text-[#FF8C00]">Select Home Team</h3>
                <div className="flex items-center gap-1.5">
                  {KIT_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setHomeKitType(slot.id)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        homeKitType === slot.id ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {filteredTeams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHomeTeam(t)}
                    className={`p-2.5 rounded border text-left flex items-center gap-3 cursor-pointer ${
                      homeTeam.id === t.id
                        ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-white'
                        : 'bg-[#0A0F1D]/80 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <TeamCrest crest={t.crest} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono-tabular">
                        OVR {t.rating.overall} · {t.tactics.formationId}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Away Picker */}
            <div className="broadcast-panel rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-lg font-bold uppercase text-rose-400">Select Away Team</h3>
                <div className="flex items-center gap-1.5">
                  {KIT_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setAwayKitType(slot.id)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        awayKitType === slot.id ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {filteredTeams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAwayTeam(t)}
                    className={`p-2.5 rounded border text-left flex items-center gap-3 cursor-pointer ${
                      awayTeam.id === t.id
                        ? 'bg-rose-500/20 border-rose-400 text-white'
                        : 'bg-[#0A0F1D]/80 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <TeamCrest crest={t.crest} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono-tabular">
                        OVR {t.rating.overall} · {t.tactics.formationId}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tactics' && (
        <div className="broadcast-panel rounded-lg p-5">
          <h3 className="font-display text-xl font-bold uppercase text-white mb-3">
            {homeTeam.name} — Pre-Match Squad & Game Plan
          </h3>
          <FormationBoard team={homeTeam} onChangeTeam={setHomeTeam} />
        </div>
      )}

      {activeTab === 'conditions' && (
        <div className="broadcast-panel rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="stadium-select" className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Stadium & Time of Day
              </label>
              <select
                id="stadium-select"
                value={stadiumId}
                onChange={(e) => setStadiumId(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                {STADIUMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city}) — {s.timeOfDay.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="weather-select" className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Pitch Weather Conditions
              </label>
              <select
                id="weather-select"
                data-testid="weather-select"
                value={weather}
                onChange={(e) => setWeather(e.target.value as WeatherCondition)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="clear">Clear Skies (Standard Pitch)</option>
                <option value="rain">Rain (Fast Skidding Grass)</option>
                <option value="snow">Snow (Heavy Ball Drag)</option>
              </select>
              <div className="mt-2 p-2.5 rounded bg-[#0A0F1D]/90 border border-slate-800 text-[11px] text-slate-300">
                {weather === 'clear' && (
                  <span>
                    <strong className="text-emerald-400">Clear Turf:</strong> Standard ball roll friction & full sprint/turn traction.
                  </span>
                )}
                {weather === 'rain' && (
                  <span>
                    <strong className="text-sky-400">Rain Turf:</strong> Wet grass causes faster skidding passes & lower lateral turn traction.
                  </span>
                )}
                {weather === 'snow' && (
                  <span>
                    <strong className="text-amber-300">Snow Turf:</strong> Heavy snow increases ball drag & reduces sprint/cutting speed by ~10%.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="duration-select" className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Match Duration
              </label>
              <select
                id="duration-select"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                {[3, 5, 7, 10].map((m) => (
                  <option key={m} value={m}>
                    {m} Minutes (Full Match)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="difficulty-select" className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                AI Difficulty Level
              </label>
              <select
                id="difficulty-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="importance-select" className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Match Atmosphere & Importance
              </label>
              <select
                id="importance-select"
                value={importance}
                onChange={(e) => setImportance(e.target.value as MatchImportance)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="friendly">Friendly Exhibition</option>
                <option value="league">League Clash</option>
                <option value="derby">Rivalry Derby (Charged Crowd)</option>
                <option value="cup">Cup Knockout</option>
                <option value="final">Championship Final</option>
              </select>
            </div>

            <label className="flex items-center gap-3 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPenalties}
                onChange={(e) => setAllowPenalties(e.target.checked)}
                className="w-4 h-4 accent-[#FF6B00]"
              />
              <span className="text-sm text-slate-200">Decide drawn matches via Penalty Shootout</span>
            </label>
          </div>
        </div>
      )}
    </BroadcastLayout>
  );
};
