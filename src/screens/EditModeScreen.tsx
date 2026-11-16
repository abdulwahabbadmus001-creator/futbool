import React, { useState } from 'react';
import { Check, Paintbrush, RotateCcw } from 'lucide-react';
import { KitDesign, KitPattern, KitSlot, PlayerAttributes, Team } from '../types/football';
import { INITIAL_TEAMS, cloneTeam, getAllTeams } from '../data/teams';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { TeamCrest } from '../components/TeamCrest';
import { HexRadarChart } from '../components/HexRadarChart';

interface EditModeScreenProps {
  customTeams: Record<string, Team>;
  onSaveTeam: (team: Team) => void;
  onResetTeam: (teamId: string) => void;
  onBack: () => void;
}

const PATTERNS: KitPattern[] = ['solid', 'stripes', 'hoops', 'sash', 'halves'];

export const EditModeScreen: React.FC<EditModeScreenProps> = ({
  customTeams,
  onSaveTeam,
  onResetTeam,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const [selectedTeamId, setSelectedTeamId] = useState(allTeams[0].id);
  const [draftTeam, setDraftTeam] = useState<Team>(() => cloneTeam(allTeams[0]));
  const [editTab, setEditTab] = useState<'team-kits' | 'players'>('team-kits');
  const [kitSlot, setKitSlot] = useState<KitSlot>('home');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(allTeams[0].roster[9]?.id ?? allTeams[0].roster[0].id);
  const [savedFlag, setSavedFlag] = useState(false);

  const selectTeam = (id: string) => {
    const found = allTeams.find((t) => t.id === id) ?? allTeams[0];
    setSelectedTeamId(found.id);
    const cloned = cloneTeam(found);
    setDraftTeam(cloned);
    setSelectedPlayerId(cloned.roster[9]?.id ?? cloned.roster[0].id);
  };

  const commitDraft = (next: Team) => {
    setDraftTeam(next);
    onSaveTeam(next);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1400);
  };

  const activeKit: KitDesign =
    kitSlot === 'away' ? draftTeam.awayKit : kitSlot === 'alt' ? draftTeam.altKit ?? draftTeam.awayKit : draftTeam.homeKit;

  const patchKit = (partial: Partial<KitDesign>) => {
    const next = cloneTeam(draftTeam);
    if (kitSlot === 'away') next.awayKit = { ...next.awayKit, ...partial };
    else if (kitSlot === 'alt') next.altKit = { ...(next.altKit ?? next.awayKit), ...partial };
    else next.homeKit = { ...next.homeKit, ...partial };
    commitDraft(next);
  };

  const selectedPlayer = draftTeam.roster.find((p) => p.id === selectedPlayerId) ?? draftTeam.roster[0];

  const patchPlayerAttr = (key: keyof PlayerAttributes, val: number) => {
    const next = cloneTeam(draftTeam);
    const p = next.roster.find((x) => x.id === selectedPlayer.id);
    if (!p) return;
    p.attributes[key] = Math.max(20, Math.min(99, val));
    const a = p.attributes;
    p.overall = Math.min(
      98,
      Math.round((a.pace + a.shooting + a.passing + a.dribbling + a.defending + a.physical) / 6 + 3)
    );
    commitDraft(next);
  };

  return (
    <BroadcastLayout
      title="Edit Mode"
      subtitle="Customize Club Identities, Home/Away/3rd Kits & Player Abilities"
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <div className="flex items-center gap-2">
          {savedFlag && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onResetTeam(selectedTeamId);
              const base = INITIAL_TEAMS.find((t) => t.id === selectedTeamId);
              if (base) setDraftTeam(cloneTeam(base));
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Team
          </button>
        </div>
      }
    >
      {/* Top Team Selector & Mode Tabs */}
      <div className="broadcast-panel rounded-lg p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamCrest crest={draftTeam.crest} size={44} />
          <div>
            <label htmlFor="edit-team-select" className="block text-[10px] uppercase font-bold text-slate-400">
              Team to Edit
            </label>
            <select
              id="edit-team-select"
              value={selectedTeamId}
              onChange={(e) => selectTeam(e.target.value)}
              className="bg-[#0A0F1D] border border-slate-700 rounded px-3 py-1.5 text-sm font-bold text-white"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditTab('team-kits')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer ${
              editTab === 'team-kits' ? 'we-tab-active' : 'bg-[#0A0F1D] border border-slate-700 text-slate-300'
            }`}
          >
            Team Info & Strip Editor
          </button>
          <button
            type="button"
            onClick={() => setEditTab('players')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer ${
              editTab === 'players' ? 'we-tab-active' : 'bg-[#0A0F1D] border border-slate-700 text-slate-300'
            }`}
          >
            Player Editor ({draftTeam.roster.length})
          </button>
        </div>
      </div>

      {editTab === 'team-kits' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 broadcast-panel rounded-lg p-5 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-[#FF8C00]">Team Identity</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Club / Team Name</label>
              <input
                type="text"
                value={draftTeam.name}
                onChange={(e) => commitDraft({ ...draftTeam, name: e.target.value })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">3-Letter Broadcast Code</label>
              <input
                type="text"
                maxLength={3}
                value={draftTeam.shortCode}
                onChange={(e) => commitDraft({ ...draftTeam, shortCode: e.target.value.toUpperCase() })}
                className="w-32 bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm font-mono-tabular uppercase text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-slate-300">
                <Paintbrush className="w-3.5 h-3.5 text-[#FF8C00]" /> Live Kit Preview ({kitSlot.toUpperCase()})
              </div>
              <div className="p-4 rounded bg-[#0A0F1D] border border-slate-800 flex items-center justify-center gap-6">
                {/* Simple SVG Jersey + Shorts + Socks preview */}
                <svg width="96" height="118" viewBox="0 0 96 118">
                  <path
                    d="M24 10 L72 10 L88 28 L76 42 L68 34 L68 68 L28 68 L28 34 L20 42 L8 28 Z"
                    fill={activeKit.primary}
                    stroke="#ffffff"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                  />
                  {activeKit.pattern !== 'solid' && (
                    <rect x="28" y="30" width="40" height="12" fill={activeKit.secondary} />
                  )}
                  <rect x="29" y="71" width="38" height="22" rx="3" fill={activeKit.shorts} />
                  <rect x="31" y="96" width="14" height="18" rx="2" fill={activeKit.socks} />
                  <rect x="51" y="96" width="14" height="18" rx="2" fill={activeKit.socks} />
                </svg>
                <div className="text-xs space-y-1 text-slate-300">
                  <div>Pattern: <strong className="text-white uppercase">{activeKit.pattern}</strong></div>
                  <div>Shirt: <span className="font-mono-tabular">{activeKit.primary}</span></div>
                  <div>Trim: <span className="font-mono-tabular">{activeKit.secondary}</span></div>
                  <div>GK: <span className="font-mono-tabular">{activeKit.gkPrimary}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 broadcast-panel rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold uppercase text-white">Kit Colors & Pattern</h3>
              <div className="flex gap-1.5">
                {(['home', 'away', 'alt'] as KitSlot[]).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setKitSlot(slot)}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase cursor-pointer ${
                      kitSlot === slot ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {slot === 'alt' ? '3rd Alt' : slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              {(
                [
                  ['primary', 'Jersey Primary'],
                  ['secondary', 'Jersey Trim'],
                  ['shorts', 'Shorts'],
                  ['socks', 'Socks'],
                  ['gkPrimary', 'Goalkeeper Kit'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block p-3 rounded bg-[#0A0F1D] border border-slate-800">
                  <span className="block text-slate-300 mb-2">{label}</span>
                  <input
                    type="color"
                    value={activeKit[field]}
                    onChange={(e) => patchKit({ [field]: e.target.value })}
                    className="w-full h-9 rounded cursor-pointer bg-transparent"
                  />
                </label>
              ))}

              <label className="block p-3 rounded bg-[#0A0F1D] border border-slate-800">
                <span className="block text-slate-300 mb-2">Shirt Pattern</span>
                <select
                  value={activeKit.pattern}
                  onChange={(e) => patchKit({ pattern: e.target.value as KitPattern })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white uppercase"
                >
                  {PATTERNS.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {editTab === 'players' && selectedPlayer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 broadcast-panel rounded-lg p-3 max-h-[520px] overflow-y-auto divide-y divide-slate-800/80">
            {draftTeam.roster.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlayerId(p.id)}
                className={`w-full flex items-center justify-between py-2 px-2.5 text-left text-xs rounded cursor-pointer ${
                  selectedPlayer.id === p.id ? 'bg-[#FF6B00]/25 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <span className="truncate">
                  <span className="text-[#FF8C00] font-mono-tabular mr-2">{p.position}</span>
                  #{p.number} {p.name}
                </span>
                <span className="font-mono-tabular text-emerald-400 font-bold">{p.overall}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 broadcast-panel rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Player Name</label>
                <input
                  type="text"
                  value={selectedPlayer.name}
                  onChange={(e) => {
                    const next = cloneTeam(draftTeam);
                    const p = next.roster.find((x) => x.id === selectedPlayer.id);
                    if (p) {
                      p.name = e.target.value;
                      p.shortName = e.target.value.trim().split(' ').pop() || p.name;
                      commitDraft(next);
                    }
                  }}
                  className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Jersey Number</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={selectedPlayer.number}
                    onChange={(e) => {
                      const next = cloneTeam(draftTeam);
                      const p = next.roster.find((x) => x.id === selectedPlayer.id);
                      if (p) {
                        p.number = Math.max(1, Math.min(99, Number(e.target.value) || 1));
                        commitDraft(next);
                      }
                    }}
                    className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-3 py-2 text-sm font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Boot Color</label>
                  <input
                    type="color"
                    value={selectedPlayer.appearance.bootColor}
                    onChange={(e) => {
                      const next = cloneTeam(draftTeam);
                      const p = next.roster.find((x) => x.id === selectedPlayer.id);
                      if (p) {
                        p.appearance.bootColor = e.target.value;
                        commitDraft(next);
                      }
                    }}
                    className="w-full h-9 rounded bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                {(
                  [
                    ['pace', 'Top Speed / Pace'],
                    ['shooting', 'Shot Power / Finishing'],
                    ['passing', 'Passing Accuracy'],
                    ['dribbling', 'Technique / Dribbling'],
                    ['defending', 'Defense / Marking'],
                    ['physical', 'Physical / Stamina'],
                  ] as const
                ).map(([attr, label]) => (
                  <label key={attr} className="block">
                    <span className="flex justify-between text-slate-300">
                      <span>{label}</span>
                      <span className="font-mono-tabular text-[#FF8C00] font-bold">{selectedPlayer.attributes[attr]}</span>
                    </span>
                    <input
                      type="range"
                      min={40}
                      max={99}
                      value={selectedPlayer.attributes[attr]}
                      onChange={(e) => patchPlayerAttr(attr, Number(e.target.value))}
                      className="w-full accent-[#FF6B00]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-[#0A0F1D]/70 rounded-lg p-4 border border-slate-800">
              <div className="text-xs font-bold uppercase text-[#FF8C00]">Live Ability Radar</div>
              <div className="font-display text-2xl font-extrabold text-white mb-2">
                {selectedPlayer.name} · <span className="text-emerald-400">{selectedPlayer.overall}</span>
              </div>
              <HexRadarChart attributes={selectedPlayer.attributes} size={220} />
            </div>
          </div>
        </div>
      )}
    </BroadcastLayout>
  );
};
