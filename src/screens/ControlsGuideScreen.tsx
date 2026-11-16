import React from 'react';
import { GameSettings } from '../types/football';
import { formatKeyCode } from '../settings/settingsStore';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface ControlsGuideScreenProps {
  settings: GameSettings;
  onBack: () => void;
}

export const ControlsGuideScreen: React.FC<ControlsGuideScreenProps> = ({ settings, onBack }) => {
  const b = settings.keyBindings;
  const rows = [
    ['Player Movement', `${formatKeyCode(b.moveUp)} / ${formatKeyCode(b.moveLeft)} / ${formatKeyCode(b.moveDown)} / ${formatKeyCode(b.moveRight)} or Arrow Keys`, 'Left Stick', 'Virtual Joystick'],
    ['Sprint', formatKeyCode(b.sprint), 'RB / RT', 'RUN Button'],
    ['Short Pass', formatKeyCode(b.shortPass), 'A / Cross', 'PASS Button'],
    ['Through Ball', formatKeyCode(b.throughPass), 'Y / Triangle', 'THR Button'],
    ['Lofted Pass / Cross', formatKeyCode(b.loftedPass), 'B / Circle', 'CRS Button'],
    ['Shoot (Hold to Charge)', formatKeyCode(b.shoot), 'X / Square', 'SHT Button'],
    ['Switch Active Player', formatKeyCode(b.switchPlayer), 'LB', 'SWI Button'],
    ['Tackle / Press', formatKeyCode(b.tackle), 'X / Square', 'SHT / Tackle'],
    ['Teammate Run / Give & Go', `${formatKeyCode(b.tacticalMod)} (or Hold + Pass)`, 'LT', 'RUN+ Button'],
    ['Body Feint (1v1)', formatKeyCode(b.feint || 'KeyC'), '—', 'SKL Button'],
    ['360° Roulette Turn', formatKeyCode(b.roulette || 'KeyV'), '—', 'SKL Button'],
    ['Pause Match', formatKeyCode(b.pause), 'Start', 'Top-Right Pause'],
  ];

  return (
    <BroadcastLayout
      title="Controls Guide"
      subtitle="Desktop Keyboard, Browser Gamepad API & Mobile Touch Controls"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="broadcast-panel rounded-lg p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-amber-400 border-b border-slate-700">
              <th className="py-2.5 pr-4">Action</th>
              <th className="py-2.5 pr-4">Keyboard</th>
              <th className="py-2.5 pr-4">Gamepad</th>
              <th className="py-2.5">Touchscreen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs md:text-sm">
            {rows.map(([action, kb, pad, touch]) => (
              <tr key={action} className="text-slate-200">
                <td className="py-3 pr-4 font-semibold text-white">{action}</td>
                <td className="py-3 pr-4 font-mono-tabular text-amber-300">{kb}</td>
                <td className="py-3 pr-4 text-sky-300">{pad}</td>
                <td className="py-3 text-emerald-300">{touch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BroadcastLayout>
  );
};
