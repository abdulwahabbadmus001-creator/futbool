import React, { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { PersistentSaveData } from '../types/football';
import { validateImportedSave } from '../saves/saveSystem';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface DataManagementScreenProps {
  saveData: PersistentSaveData;
  onImportSave: (data: PersistentSaveData) => void;
  onResetAll: () => void;
  onBack: () => void;
}

export const DataManagementScreen: React.FC<DataManagementScreenProps> = ({
  saveData,
  onImportSave,
  onResetAll,
  onBack,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classic-football-13-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Exported save file to downloads.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const validated = validateImportedSave(String(reader.result ?? ''));
      if (validated) {
        onImportSave(validated);
        setStatusMsg('Save data imported and restored successfully.');
      } else {
        setStatusMsg('Invalid save file format. Expected version 1 JSON export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <BroadcastLayout
      title="Data Management"
      subtitle="Export, Import, or Reset Local IndexedDB & Profile Data"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="broadcast-panel rounded-lg p-5 space-y-3 text-xs">
          <h2 className="font-display text-xl font-bold uppercase text-amber-400">Active Profile Summary</h2>
          <div className="grid grid-cols-2 gap-3 text-slate-300">
            <div>Matches Logged: <strong className="text-white">{saveData.matchHistory.length}</strong></div>
            <div>Active Career: <strong className="text-white">{saveData.activeCareer ? saveData.activeCareer.clubId : 'None'}</strong></div>
            <div>Active Tournament: <strong className="text-white">{saveData.activeTournament ? saveData.activeTournament.name : 'None'}</strong></div>
            <div>Active League: <strong className="text-white">{saveData.activeLeague ? `Week ${saveData.activeLeague.currentRound}` : 'None'}</strong></div>
          </div>
        </div>

        {statusMsg && (
          <div className="px-4 py-2.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="broadcast-tile rounded-lg p-4 flex flex-col items-center gap-2 text-center cursor-pointer"
          >
            <Download className="w-6 h-6 text-amber-400" />
            <span className="font-display text-lg font-bold uppercase text-white">Export JSON</span>
            <span className="text-[11px] text-slate-400">Download backup file</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="broadcast-tile rounded-lg p-4 flex flex-col items-center gap-2 text-center cursor-pointer"
          >
            <Upload className="w-6 h-6 text-sky-400" />
            <span className="font-display text-lg font-bold uppercase text-white">Import JSON</span>
            <span className="text-[11px] text-slate-400">Restore from backup</span>
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="broadcast-tile rounded-lg p-4 flex flex-col items-center gap-2 text-center cursor-pointer border-rose-500/30"
          >
            <Trash2 className="w-6 h-6 text-rose-400" />
            <span className="font-display text-lg font-bold uppercase text-rose-200">Clear Save Data</span>
            <span className="text-[11px] text-slate-400">Reset profile & records</span>
          </button>
        </div>

        {confirmClear && (
          <div className="broadcast-panel rounded-lg p-4 border-rose-500/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-rose-200">Erase all competitions, career progress, and settings?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmClear(false);
                  setStatusMsg('All save data cleared to defaults.');
                }}
                className="px-3 py-1.5 rounded bg-rose-600 text-xs font-bold text-white cursor-pointer"
              >
                Confirm Erase
              </button>
            </div>
          </div>
        )}
      </div>
    </BroadcastLayout>
  );
};
