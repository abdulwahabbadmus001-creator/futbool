import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Shield, Sparkles } from 'lucide-react';
import { FormArrow, Player } from '../types/football';
import { PlayerRadar3D } from './PlayerRadar3D';

interface PlayerCard3DProps {
  player: Player;
  teamColor?: string;
  showRadar?: boolean;
}

export function getFormArrowMeta(arrow: FormArrow = 'flat') {
  switch (arrow) {
    case 'up-hot':
      return { label: 'Peak', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40', Icon: ArrowUp };
    case 'up':
      return { label: 'Good', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-400/40', Icon: ArrowUp };
    case 'down':
      return { label: 'Slump', color: 'text-amber-300 bg-amber-500/20 border-amber-400/40', Icon: ArrowDown };
    case 'down-cold':
      return { label: 'Cold', color: 'text-rose-300 bg-rose-500/20 border-rose-400/40', Icon: ArrowDown };
    default:
      return { label: 'Steady', color: 'text-slate-300 bg-white/10 border-white/15', Icon: ArrowRight };
  }
}

export const PlayerCard3D: React.FC<PlayerCard3DProps> = ({
  player,
  teamColor = '#FF6B00',
  showRadar = true,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const form = getFormArrowMeta(player.formArrow);
  const FormIcon = form.Icon;
  const morale = player.morale ?? 80;
  const archetypeLabel = (player.archetype ?? 'balanced').replace('-', ' ');

  return (
    <div
      data-testid="player-card-3d"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ rx: -ny * 10, ry: nx * 12 });
      }}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      className="relative rounded-md border border-[#FF6B00]/40 bg-gradient-to-br from-[#162038] via-[#0e1526] to-[#090d14] p-3.5 shadow-2xl transition-transform duration-150"
      style={{
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        borderTop: `3px solid ${teamColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-2xl font-black text-[#FF8C00] leading-none tabular-nums">
              {player.overall}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase text-white">
              {player.position}
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-400">#{player.number}</span>
          </div>
          <div className="font-display text-lg font-extrabold text-white uppercase tracking-wide truncate mt-0.5">
            {player.name}
          </div>
          <div className="text-[11px] text-slate-400">
            {player.nationality} • Age {player.age}
          </div>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${form.color}`}>
          <FormIcon className="w-3 h-3" />
          <span>{form.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2.5">
        <div className="px-2 py-1 rounded bg-black/30 border border-white/10 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#FF8C00] shrink-0" />
          <span className="uppercase font-semibold text-slate-200 truncate">{archetypeLabel}</span>
        </div>
        <div className="px-2 py-1 rounded bg-black/30 border border-white/10 flex items-center justify-between gap-1.5">
          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> Morale
          </span>
          <span className="font-mono-tabular font-bold text-white">{morale}%</span>
        </div>
      </div>

      {showRadar && <PlayerRadar3D attributes={player.attributes} overall={player.overall} size={156} />}
    </div>
  );
};
