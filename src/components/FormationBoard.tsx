import React, { useState } from 'react';
import { Mentality, Player, PlayerArchetype, Team } from '../types/football';
import { FORMATIONS, getFormationById } from '../data/formations';
import { PlayerCard3D } from './PlayerCard3D';
import { SetPieceEditor } from './SetPieceEditor';

interface FormationBoardProps {
  team: Team;
  onChangeTeam: (updated: Team) => void;
  compact?: boolean;
}

const MENTALITIES: { value: Mentality; label: string }[] = [
  { value: 'ultra-defensive', label: 'Ultra Defensive' },
  { value: 'defensive', label: 'Defensive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'attacking', label: 'Attacking' },
  { value: 'all-out-attack', label: 'All-Out Attack' },
];

const ARCHETYPES: { value: PlayerArchetype; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'goal-poacher', label: 'Goal Poacher' },
  { value: 'target-man', label: 'Target Man' },
  { value: 'classic-10', label: 'Classic No.10' },
  { value: 'box-to-box', label: 'Box-to-Box' },
  { value: 'anchor-man', label: 'Anchor Man' },
];

const MARK_TARGETS = ['', 'ST', 'LW', 'RW', 'CAM'];

export const FormationBoard: React.FC<FormationBoardProps> = ({ team, onChangeTeam, compact = false }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(team.startingXI[9] ?? team.startingXI[0] ?? null);
  const formation = getFormationById(team.tactics.formationId);

  const getPlayer = (id: string): Player | undefined => team.roster.find((p) => p.id === id);
  const inspectedPlayer = inspectedId ? getPlayer(inspectedId) : undefined;

  const updateTactic = (patch: Partial<Team['tactics']>) => {
    const next = JSON.parse(JSON.stringify(team)) as Team;
    next.tactics = { ...next.tactics, ...patch };
    onChangeTeam(next);
  };

  const updateInspectedArchetype = (archetype: PlayerArchetype) => {
    if (!inspectedPlayer) return;
    const next = JSON.parse(JSON.stringify(team)) as Team;
    const target = next.roster.find((p) => p.id === inspectedPlayer.id);
    if (target) {
      target.archetype = archetype;
      onChangeTeam(next);
    }
  };

  const updateManMarking = (defenderRoleOrId: string, oppRole: string) => {
    const next = JSON.parse(JSON.stringify(team)) as Team;
    const map = { ...(next.tactics.manMarking ?? {}) };
    if (!oppRole) delete map[defenderRoleOrId];
    else map[defenderRoleOrId] = oppRole;
    next.tactics.manMarking = map;
    onChangeTeam(next);
  };

  const handlePlayerClick = (playerId: string) => {
    setInspectedId(playerId);
    if (!selectedId) {
      setSelectedId(playerId);
      return;
    }
    if (selectedId === playerId) {
      setSelectedId(null);
      return;
    }

    const next: Team = JSON.parse(JSON.stringify(team));
    const idxA_XI = next.startingXI.indexOf(selectedId);
    const idxB_XI = next.startingXI.indexOf(playerId);
    const idxA_Sub = next.substitutes.indexOf(selectedId);
    const idxB_Sub = next.substitutes.indexOf(playerId);

    if (idxA_XI !== -1 && idxB_XI !== -1) {
      [next.startingXI[idxA_XI], next.startingXI[idxB_XI]] = [next.startingXI[idxB_XI], next.startingXI[idxA_XI]];
    } else if (idxA_XI !== -1 && idxB_Sub !== -1) {
      next.startingXI[idxA_XI] = playerId;
      next.substitutes[idxB_Sub] = selectedId;
    } else if (idxA_Sub !== -1 && idxB_XI !== -1) {
      next.startingXI[idxB_XI] = selectedId;
      next.substitutes[idxA_Sub] = playerId;
    } else if (idxA_Sub !== -1 && idxB_Sub !== -1) {
      [next.substitutes[idxA_Sub], next.substitutes[idxB_Sub]] = [next.substitutes[idxB_Sub], next.substitutes[idxA_Sub]];
    }

    setSelectedId(null);
    onChangeTeam(next);
  };

  const compactness = team.tactics.compactness ?? 0.55;
  const supportRange = team.tactics.supportRange ?? 0.55;
  const counterAttack = team.tactics.counterAttack ?? false;
  const marking = team.tactics.manMarking ?? {};

  return (
    <div className={`grid ${compact ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1 lg:grid-cols-12 gap-5'}`}>
      {/* Tactical Controls & Pitch Diagram */}
      <div className={compact ? '' : 'lg:col-span-7 space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor={`formation-${team.id}`} className="text-xs font-semibold text-slate-300">
              Base
            </label>
            <select
              id={`formation-${team.id}`}
              value={team.tactics.formationId}
              onChange={(e) => updateTactic({ formationId: e.target.value })}
              className="bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            >
              {FORMATIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {!compact && (
            <>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-emerald-400">ATK Shape</label>
                <select
                  data-testid="atk-formation-select"
                  value={team.tactics.attackingFormationId ?? team.tactics.formationId}
                  onChange={(e) => updateTactic({ attackingFormationId: e.target.value })}
                  className="bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {FORMATIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-sky-400">DEF Shape</label>
                <select
                  data-testid="def-formation-select"
                  value={team.tactics.defendingFormationId ?? team.tactics.formationId}
                  onChange={(e) => updateTactic({ defendingFormationId: e.target.value })}
                  className="bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  {FORMATIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor={`mentality-${team.id}`} className="text-xs font-semibold text-slate-300">
              Mentality
            </label>
            <select
              id={`mentality-${team.id}`}
              value={team.tactics.mentality}
              onChange={(e) => updateTactic({ mentality: e.target.value as Mentality })}
              className="bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
            >
              {MENTALITIES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Football Pitch Diagram */}
        <div
          className="relative w-full rounded border border-emerald-500/35 overflow-hidden select-none"
          style={{
            aspectRatio: compact ? '1 / 1.0' : '4 / 4.0',
            background:
              'repeating-linear-gradient(0deg, #1b5e2b 0px, #1b5e2b 36px, #175225 36px, #175225 72px)',
          }}
        >
          <svg viewBox="0 0 100 110" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <rect x="4" y="4" width="92" height="102" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="4" y1="55" x2="96" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
            <circle cx="50" cy="55" r="10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
            <rect x="26" y="4" width="48" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
            <rect x="26" y="90" width="48" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
          </svg>

          {formation.slots.map((slot, idx) => {
            const pid = team.startingXI[idx];
            const player = pid ? getPlayer(pid) : undefined;
            if (!player) return null;

            const topPct = 91 - slot.x * 82;
            const leftPct = 50 + slot.y * 41;
            const isSelected = selectedId === player.id;

            return (
              <button
                key={slot.index}
                type="button"
                onClick={() => handlePlayerClick(player.id)}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-md transition-transform ${
                    isSelected
                      ? 'bg-[#FF6B00] text-slate-950 border-white scale-110'
                      : slot.role === 'GK'
                        ? 'bg-teal-600 text-white border-teal-200 group-hover:scale-105'
                        : 'bg-[#0A0F1D] text-white border-[#FF8C00] group-hover:scale-105'
                  }`}
                >
                  {player.number}
                </div>
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-semibold text-slate-100 whitespace-nowrap leading-none">
                  {player.shortName} · {slot.role}
                </span>
              </button>
            );
          })}
        </div>

        {/* PES 2012 Team Style Tactical Sliders */}
        <div className="broadcast-panel rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="block">
            <span className="flex justify-between text-slate-300 mb-1">
              <span>Player Support Range</span>
              <span className="font-mono-tabular text-[#FF8C00] font-bold">{Math.round(supportRange * 20)}/20</span>
            </span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={supportRange}
              onChange={(e) => updateTactic({ supportRange: Number(e.target.value) })}
              className="w-full accent-[#FF6B00]"
            />
          </label>

          <label className="block">
            <span className="flex justify-between text-slate-300 mb-1">
              <span>Zonal Compactness</span>
              <span className="font-mono-tabular text-[#FF8C00] font-bold">{Math.round(compactness * 20)}/20</span>
            </span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={compactness}
              onChange={(e) => updateTactic({ compactness: Number(e.target.value) })}
              className="w-full accent-[#FF6B00]"
            />
          </label>

          <label className="block">
            <span className="flex justify-between text-slate-300 mb-1">
              <span>Defensive Line Height</span>
              <span className="font-mono-tabular text-[#FF8C00] font-bold">{Math.round(team.tactics.lineHeight * 20)}/20</span>
            </span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={team.tactics.lineHeight}
              onChange={(e) => updateTactic({ lineHeight: Number(e.target.value) })}
              className="w-full accent-[#FF6B00]"
            />
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-slate-300 font-semibold">Attacking Strategy</span>
            <button
              type="button"
              onClick={() => updateTactic({ counterAttack: !counterAttack })}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase cursor-pointer border ${
                counterAttack
                  ? 'bg-[#FF6B00] text-slate-950 border-amber-300'
                  : 'bg-[#0A0F1D] text-slate-200 border-slate-700'
              }`}
            >
              {counterAttack ? 'Counter Attack' : 'Possession Game'}
            </button>
          </div>
        </div>

        {!compact && (
          <SetPieceEditor
            cornerRoutine={team.tactics.cornerRoutine ?? 'standard'}
            freeKickRoutine={team.tactics.freeKickRoutine ?? 'direct-curl'}
            onChangeCorner={(cornerRoutine) => updateTactic({ cornerRoutine })}
            onChangeFreeKick={(freeKickRoutine) => updateTactic({ freeKickRoutine })}
          />
        )}
      </div>

      {/* Squad, Substitutes, Man-Marking & 3D Player Card */}
      <div className={compact ? 'space-y-3' : 'lg:col-span-5 flex flex-col gap-3'}>
        {!compact && inspectedPlayer && (
          <div className="space-y-2.5">
            <PlayerCard3D player={inspectedPlayer} teamColor={team.homeKit.primary} showRadar />
            <div className="broadcast-panel rounded p-2.5 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Player Archetype
                </label>
                <select
                  data-testid="player-archetype-select"
                  value={inspectedPlayer.archetype ?? 'balanced'}
                  onChange={(e) => updateInspectedArchetype(e.target.value as PlayerArchetype)}
                  className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  {ARCHETYPES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Man-Mark Opponent
                </label>
                <select
                  data-testid="man-marking-select"
                  value={marking[inspectedPlayer.id] ?? marking[inspectedPlayer.position] ?? ''}
                  onChange={(e) => updateManMarking(inspectedPlayer.id, e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  {MARK_TARGETS.map((m) => (
                    <option key={m || 'none'} value={m}>
                      {m ? `Mark Opp ${m}` : 'Zonal Defense'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="broadcast-panel rounded p-3">
          <h4 className="font-display text-sm font-bold tracking-wide text-[#FF8C00] uppercase mb-2">
            Starting XI ({team.startingXI.length})
          </h4>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 pr-1">
            {team.startingXI.map((pid, idx) => {
              const p = getPlayer(pid);
              const slot = formation.slots[idx];
              if (!p) return null;
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePlayerClick(p.id)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 text-left text-xs rounded transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#FF6B00]/25 text-amber-200 border border-[#FF6B00]/50' : 'hover:bg-slate-800/70 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-mono-tabular w-6 text-[#FF8C00] font-bold">{slot?.role ?? p.position}</span>
                    <span className="font-mono-tabular w-6 text-slate-400">#{p.number}</span>
                    <span className="font-medium truncate">{p.name}</span>
                  </span>
                  <span className="font-mono-tabular font-bold text-emerald-400 ml-2">{p.overall}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="broadcast-panel rounded p-3">
          <h4 className="font-display text-sm font-bold tracking-wide text-sky-400 uppercase mb-2">
            Substitutes ({team.substitutes.length})
          </h4>
          <div className="max-h-32 overflow-y-auto divide-y divide-slate-800/80 pr-1">
            {team.substitutes.map((pid) => {
              const p = getPlayer(pid);
              if (!p) return null;
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePlayerClick(p.id)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 text-left text-xs rounded transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#FF6B00]/25 text-amber-200 border border-[#FF6B00]/50' : 'hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-mono-tabular w-7 text-sky-400 font-bold">{p.position}</span>
                    <span className="font-mono-tabular w-6 text-slate-500">#{p.number}</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="font-mono-tabular font-bold text-slate-200 ml-2">{p.overall}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
