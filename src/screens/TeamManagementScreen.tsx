import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Team } from '../types/football';
import { getAllTeams } from '../data/teams';
import { BroadcastLayout } from '../components/BroadcastLayout';
import { TeamCrest } from '../components/TeamCrest';
import { FormationBoard } from '../components/FormationBoard';

interface TeamManagementScreenProps {
  customTeams: Record<string, Team>;
  onSaveTeam: (team: Team) => void;
  onBack: () => void;
}

export const TeamManagementScreen: React.FC<TeamManagementScreenProps> = ({
  customTeams,
  onSaveTeam,
  onBack,
}) => {
  const allTeams = getAllTeams(customTeams);
  const [selectedTeam, setSelectedTeam] = useState<Team>(allTeams[0]);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    onSaveTeam(selectedTeam);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <BroadcastLayout
      title="Team Management"
      subtitle="Edit Starting XI, Substitutes, Formations & Tactical Mentality"
      onBack={onBack}
      onHome={onBack}
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
        >
          <Save className="w-4 h-4" /> {savedNotice ? 'Saved!' : 'Save Tactics'}
        </button>
      }
    >
      <div className="broadcast-panel rounded-lg p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamCrest crest={selectedTeam.crest} size={44} />
          <div>
            <label htmlFor="tm-select" className="block text-[11px] uppercase font-bold text-slate-400">
              Active Squad
            </label>
            <select
              id="tm-select"
              value={selectedTeam.id}
              onChange={(e) => {
                const found = allTeams.find((t) => t.id === e.target.value);
                if (found) setSelectedTeam(found);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-bold text-white"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Pressing</span>
            <select
              value={selectedTeam.tactics.pressing}
              onChange={(e) =>
                setSelectedTeam({
                  ...selectedTeam,
                  tactics: { ...selectedTeam.tactics, pressing: e.target.value as Team['tactics']['pressing'] },
                })
              }
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
            >
              <option value="low">Low Block</option>
              <option value="medium">Balanced</option>
              <option value="high">High Press</option>
            </select>
          </div>
          <div>
            <span className="text-slate-400 block">Passing Style</span>
            <select
              value={selectedTeam.tactics.passingStyle}
              onChange={(e) =>
                setSelectedTeam({
                  ...selectedTeam,
                  tactics: { ...selectedTeam.tactics, passingStyle: e.target.value as Team['tactics']['passingStyle'] },
                })
              }
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
            >
              <option value="short">Short Possession</option>
              <option value="mixed">Mixed</option>
              <option value="long">Direct / Long</option>
            </select>
          </div>
        </div>
      </div>

      <div className="broadcast-panel rounded-lg p-5">
        <FormationBoard
          team={selectedTeam}
          onChangeTeam={(updated) => {
            setSelectedTeam(updated);
            onSaveTeam(updated);
          }}
        />
      </div>
    </BroadcastLayout>
  );
};
