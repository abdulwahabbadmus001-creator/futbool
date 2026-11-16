import { KitDesign, Team } from '../types/football';
import { TEAMS_2012 } from './teams2012';

export const INITIAL_TEAMS: Team[] = TEAMS_2012;

export function resolveTeamKit(team: Team, slot: 'home' | 'away' | 'alt'): KitDesign {
  if (slot === 'away') return team.awayKit;
  if (slot === 'alt') return team.altKit ?? team.awayKit;
  return team.homeKit;
}

export function cloneTeam(team: Team): Team {
  const cloned = JSON.parse(JSON.stringify(team)) as Team;
  if (!cloned.altKit) {
    cloned.altKit = {
      primary: cloned.crest.accent || '#FF6B00',
      secondary: '#f8fafc',
      shorts: '#0f172a',
      socks: cloned.crest.accent || '#FF6B00',
      gkPrimary: '#6d28d9',
      pattern: 'sash',
    };
  }
  if (!cloned.tactics.cornerRoutine) cloned.tactics.cornerRoutine = 'standard';
  if (!cloned.tactics.freeKickRoutine) cloned.tactics.freeKickRoutine = 'direct-curl';
  if (!cloned.tactics.manMarking) cloned.tactics.manMarking = {};
  return cloned;
}

export function getTeamById(id: string, customTeams?: Record<string, Team>): Team {
  if (customTeams && customTeams[id]) return cloneTeam(customTeams[id]);
  const found = INITIAL_TEAMS.find((t) => t.id === id) ?? INITIAL_TEAMS[0];
  return cloneTeam(found);
}

export function getAllTeams(customTeams?: Record<string, Team>): Team[] {
  return INITIAL_TEAMS.map((t) => (customTeams && customTeams[t.id] ? cloneTeam(customTeams[t.id]) : cloneTeam(t)));
}
