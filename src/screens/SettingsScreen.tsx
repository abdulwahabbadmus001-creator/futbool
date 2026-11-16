import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  CameraPreset,
  CursorColorTier,
  DifficultyLevel,
  GameSettings,
  GraphicsQuality,
  KeyBindings,
} from '../types/football';
import { cloneDefaultSettings, formatKeyCode } from '../settings/settingsStore';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onBack: () => void;
}

const BINDING_LABELS: { key: keyof KeyBindings; label: string }[] = [
  { key: 'moveUp', label: 'Move Up' },
  { key: 'moveDown', label: 'Move Down' },
  { key: 'moveLeft', label: 'Move Left' },
  { key: 'moveRight', label: 'Move Right' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'shortPass', label: 'Short Pass' },
  { key: 'throughPass', label: 'Through Pass' },
  { key: 'shoot', label: 'Shoot' },
  { key: 'loftedPass', label: 'Lofted Pass / Cross' },
  { key: 'switchPlayer', label: 'Switch Player' },
  { key: 'tackle', label: 'Tackle / Contain' },
  { key: 'tacticalMod', label: 'Teammate Run / Give-and-Go' },
  { key: 'feint', label: 'Body Feint (1v1)' },
  { key: 'roulette', label: '360° Roulette Turn' },
  { key: 'pause', label: 'Pause Menu' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onBack,
}) => {
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);

  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  const handleCaptureKey = (bindingKey: keyof KeyBindings, e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.code === 'Tab') return;
    onUpdateSettings({
      ...settings,
      keyBindings: {
        ...settings.keyBindings,
        [bindingKey]: e.code,
      },
    });
    setListeningKey(null);
  };

  return (
    <BroadcastLayout
      title="Options & Settings"
      subtitle="All changes automatically persist to local save storage"
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => onUpdateSettings(cloneDefaultSettings())}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Match & Gameplay */}
        <div className="broadcast-panel rounded-lg p-5 space-y-4">
          <h2 className="font-display text-xl font-bold uppercase text-[#FF8C00]">Match & Gameplay</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="opt-duration" className="block text-xs text-slate-400 mb-1">Match Duration</label>
              <select
                id="opt-duration"
                value={settings.matchDurationMinutes}
                onChange={(e) => patch({ matchDurationMinutes: Number(e.target.value) as GameSettings['matchDurationMinutes'] })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                {[3, 5, 7, 10].map((m) => (
                  <option key={m} value={m}>{m} Minutes</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="opt-difficulty" className="block text-xs text-slate-400 mb-1">AI Difficulty</label>
              <select
                id="opt-difficulty"
                value={settings.difficulty}
                onChange={(e) => patch({ difficulty: e.target.value as DifficultyLevel })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                {(['beginner', 'amateur', 'regular', 'professional', 'top-player', 'legend'] as DifficultyLevel[]).map((d) => (
                  <option key={d} value={d}>{d.replace('-', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="opt-speed" className="block text-xs text-slate-400 mb-1">Game Speed</label>
              <select
                id="opt-speed"
                value={settings.gameSpeed}
                onChange={(e) => patch({ gameSpeed: Number(e.target.value) as GameSettings['gameSpeed'] })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                <option value={0.85}>Slow (0.85x)</option>
                <option value={1.0}>Normal (1.0x)</option>
                <option value={1.15}>Fast (1.15x)</option>
              </select>
            </div>

            <div>
              <label htmlFor="opt-mobile" className="block text-xs text-slate-400 mb-1">Touch Controls</label>
              <select
                id="opt-mobile"
                value={settings.mobileControlLayout}
                onChange={(e) => patch({ mobileControlLayout: e.target.value as GameSettings['mobileControlLayout'] })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                <option value="auto">Auto (Touch / Narrow)</option>
                <option value="always-on">Always On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.offsideRule}
                onChange={(e) => patch({ offsideRule: e.target.checked })}
                className="accent-amber-500"
              />
              Offside Rule Active
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.injuriesEnabled}
                onChange={(e) => patch({ injuriesEnabled: e.target.checked })}
                className="accent-amber-500"
              />
              Career Injuries
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={(e) => patch({ vibration: e.target.checked })}
                className="accent-amber-500"
              />
              Gamepad Vibration
            </label>
          </div>
        </div>

        {/* Camera, Graphics & Audio */}
        <div className="broadcast-panel rounded-lg p-5 space-y-4">
          <h2 className="font-display text-xl font-bold uppercase text-sky-400">Camera, Cursor, Graphics & Audio</h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="opt-cam" className="block text-xs text-slate-400 mb-1">Camera Angle</label>
              <select
                id="opt-cam"
                value={settings.cameraPreset}
                onChange={(e) => patch({ cameraPreset: e.target.value as CameraPreset })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                <option value="wide">Wide</option>
                <option value="broadcast">Broadcast</option>
                <option value="dynamic">Dynamic</option>
                <option value="vertical">Vertical</option>
                <option value="stadium">Stadium</option>
                <option value="player-lock">Player Lock (BAL)</option>
              </select>
            </div>

            <div>
              <label htmlFor="opt-cursor" className="block text-xs text-slate-400 mb-1">Player Cursor</label>
              <select
                id="opt-cursor"
                value={settings.cursorColor}
                onChange={(e) => patch({ cursorColor: e.target.value as CursorColorTier })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                <option value="orange">Electric Orange</option>
                <option value="gold">Classic Gold</option>
                <option value="cyan">Cyan</option>
                <option value="emerald">Emerald</option>
                <option value="rose">Crimson Rose</option>
              </select>
            </div>

            <div>
              <label htmlFor="opt-gfx" className="block text-xs text-slate-400 mb-1">Graphics Quality</label>
              <select
                id="opt-gfx"
                value={settings.graphicsQuality}
                onChange={(e) => patch({ graphicsQuality: e.target.value as GraphicsQuality })}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded px-2.5 py-2 text-sm text-white"
              >
                <option value="low">Low (No Shadows)</option>
                <option value="medium">Medium</option>
                <option value="high">High (Soft Shadows)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <label className="block">
              <span className="text-slate-400 flex justify-between">
                <span>Camera Distance</span>
                <span className="font-mono-tabular text-white">{settings.cameraDistance.toFixed(2)}x</span>
              </span>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.05}
                value={settings.cameraDistance}
                onChange={(e) => patch({ cameraDistance: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1"
              />
            </label>

            <label className="block">
              <span className="text-slate-400 flex justify-between">
                <span>Camera Height</span>
                <span className="font-mono-tabular text-white">{settings.cameraHeight.toFixed(2)}x</span>
              </span>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.05}
                value={settings.cameraHeight}
                onChange={(e) => patch({ cameraHeight: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1"
              />
            </label>

            <label className="block">
              <span className="text-slate-400 flex justify-between">
                <span>SFX Volume</span>
                <span className="font-mono-tabular text-white">{Math.round(settings.sfxVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => patch({ sfxVolume: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1"
              />
            </label>

            <label className="block">
              <span className="text-slate-400 flex justify-between">
                <span>Crowd Volume</span>
                <span className="font-mono-tabular text-white">{Math.round(settings.crowdVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.crowdVolume}
                onChange={(e) => patch({ crowdVolume: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1"
              />
            </label>
          </div>
        </div>

        {/* Keyboard Bindings */}
        <div className="lg:col-span-2 broadcast-panel rounded-lg p-5">
          <h2 className="font-display text-xl font-bold uppercase text-emerald-400 mb-3">
            Keyboard Bindings (Click to Rebind)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {BINDING_LABELS.map(({ key, label }) => {
              const isListening = listeningKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setListeningKey(key)}
                  onKeyDown={(e) => {
                    if (isListening) handleCaptureKey(key, e);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded border text-xs cursor-pointer ${
                    isListening
                      ? 'bg-[#FF6B00] text-slate-950 border-white font-bold'
                      : 'bg-[#0A0F1D] border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono-tabular font-bold px-2 py-0.5 rounded bg-slate-950/60 text-[#FF8C00]">
                    {isListening ? 'Press Key...' : formatKeyCode(settings.keyBindings[key])}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BroadcastLayout>
  );
};
