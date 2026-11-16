import React from 'react';
import { CornerRoutine, FreeKickRoutine } from '../types/football';

interface SetPieceEditorProps {
  cornerRoutine: CornerRoutine;
  freeKickRoutine: FreeKickRoutine;
  onChangeCorner: (routine: CornerRoutine) => void;
  onChangeFreeKick: (routine: FreeKickRoutine) => void;
}

const CORNER_OPTIONS: { id: CornerRoutine; label: string; desc: string }[] = [
  { id: 'standard', label: 'Standard Balanced', desc: 'Even box distribution' },
  { id: 'near-post', label: 'Near-Post Flick', desc: 'Runners attack front post' },
  { id: 'far-post', label: 'Far-Post Overload', desc: 'Tall targets back post' },
  { id: 'short-decoy', label: 'Short Corner Decoy', desc: 'Drop short for quick 1-2' },
];

const FK_OPTIONS: { id: FreeKickRoutine; label: string; desc: string }[] = [
  { id: 'direct-curl', label: 'Direct Top-Bin Curl', desc: 'High whip over wall' },
  { id: 'dummy-over', label: 'Dummy Runner', desc: 'Power drive after feint' },
  { id: 'two-kicker-layoff', label: '2-Kicker Layoff', desc: 'Short roll for clear shot' },
];

export const SetPieceEditor: React.FC<SetPieceEditorProps> = ({
  cornerRoutine,
  freeKickRoutine,
  onChangeCorner,
  onChangeFreeKick,
}) => {
  return (
    <div data-testid="set-piece-editor" className="broadcast-panel rounded p-3.5 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-display text-sm font-bold uppercase text-[#FF8C00] tracking-wide">
          Set-Piece Routine Playbook
        </span>
        <span className="text-[10px] text-slate-400 uppercase">Match-Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
            Corner Kick Routine
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CORNER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeCorner(opt.id)}
                className={`p-2 rounded border text-left cursor-pointer ${
                  cornerRoutine === opt.id
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-white'
                    : 'bg-[#0A0F1D] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-[11px]">{opt.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
            Free Kick Routine
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {FK_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeFreeKick(opt.id)}
                className={`p-2 rounded border flex items-center justify-between cursor-pointer ${
                  freeKickRoutine === opt.id
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-white'
                    : 'bg-[#0A0F1D] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="font-bold text-[11px]">{opt.label}</span>
                <span className="text-[10px] text-slate-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
