import {
  Fixture,
  LeagueScorerEntry,
  LeagueState,
  StandingRow,
  Team,
} from '../types/football';

/**
 * Generates a double round-robin (home & away) schedule using the circle algorithm.
 * Guarantees zero duplicate fixtures and balanced home/away rotation.
 */
export function generateDoubleRoundRobinFixtures(teamIds: string[]): Fixture[] {
  const list = [...teamIds];
  if (list.length % 2 !== 0) list.push('BYE');
  const n = list.length;
  const half = n / 2;
  const roundsPerHalf = n - 1;
  const fixtures: Fixture[] = [];

  const rotating = list.slice(1);
  for (let r = 0; r < roundsPerHalf; r++) {
    const roundTeams = [list[0], ...rotating];
    for (let i = 0; i < half; i++) {
      const tA = roundTeams[i];
      const tB = roundTeams[n - 1 - i];
      if (tA === 'BYE' || tB === 'BYE') continue;

      const swap = (r + i) % 2 === 1;
      const home = swap ? tB : tA;
      const away = swap ? tA : tB;

      // First half of season
      fixtures.push({
        id: `lg-r${r + 1}-m${i}`,
        round: r + 1,
        stageLabel: `Matchweek ${r + 1}`,
        homeTeamId: home,
        awayTeamId: away,
        played: false,
      });

      // Reverse fixture in second half of season
      fixtures.push({
        id: `lg-r${r + 1 + roundsPerHalf}-m${i}`,
        round: r + 1 + roundsPerHalf,
        stageLabel: `Matchweek ${r + 1 + roundsPerHalf}`,
        homeTeamId: away,
        awayTeamId: home,
        played: false,
      });
    }

    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return fixtures.sort((a, b) => a.round - b.round);
}

export function createLeague(
  name: string,
  userTeamId: string,
  clubTeams: Team[]
): LeagueState {
  const ids = clubTeams.map((t) => t.id);
  const fixtures = generateDoubleRoundRobinFixtures(ids);
  const totalRounds = Math.max(...fixtures.map((f) => f.round), 1);

  return {
    id: `league-${Date.now()}`,
    name,
    userTeamId,
    teamIds: ids,
    currentRound: 1,
    totalRounds,
    fixtures,
    scorers: [],
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

export function computeLeagueStandings(
  league: LeagueState,
  teamsMap: Record<string, Team>
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const tid of league.teamIds) {
    const t = teamsMap[tid];
    table.set(tid, {
      teamId: tid,
      teamName: t?.name ?? tid,
      shortCode: t?.shortCode ?? tid.slice(0, 3).toUpperCase(),
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const f of league.fixtures) {
    if (!f.played || f.homeGoals === undefined || f.awayGoals === undefined) continue;
    const h = table.get(f.homeTeamId);
    const a = table.get(f.awayTeamId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.goalsFor += f.homeGoals;
    h.goalsAgainst += f.awayGoals;
    a.goalsFor += f.awayGoals;
    a.goalsAgainst += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
    }
    h.goalDifference = h.goalsFor - h.goalsAgainst;
    a.goalDifference = a.goalsFor - a.goalsAgainst;
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function recordLeagueFixtureResult(
  league: LeagueState,
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
  teamsMap: Record<string, Team>,
  goalScorers?: { playerId: string; playerName: string; teamId: string; minute: number }[]
): LeagueState {
  const next: LeagueState = JSON.parse(JSON.stringify(league));
  const f = next.fixtures.find((x) => x.id === fixtureId);
  if (!f || f.played) return next;

  f.played = true;
  f.homeGoals = homeGoals;
  f.awayGoals = awayGoals;
  f.goalScorers = goalScorers;

  // Update scorers table
  const addScorer = (teamId: string, count: number) => {
    const team = teamsMap[teamId];
    if (!team || count <= 0) return;
    const attackers = team.roster.filter((p) => p.position !== 'GK');
    for (let i = 0; i < count; i++) {
      const explicit = goalScorers?.filter((g) => g.teamId === teamId)[i];
      const chosen = explicit
        ? { id: explicit.playerId, name: explicit.playerName }
        : attackers[Math.floor(Math.random() * Math.min(4, attackers.length)) + Math.max(0, attackers.length - 4)] ?? team.roster[9] ?? team.roster[0];
      if (!chosen) continue;
      const existing = next.scorers.find((s: LeagueScorerEntry) => s.playerId === chosen.id);
      if (existing) {
        existing.goals++;
      } else {
        next.scorers.push({
          playerId: chosen.id,
          playerName: chosen.name,
          teamId,
          teamShortCode: team.shortCode,
          goals: 1,
        });
      }
    }
  };

  addScorer(f.homeTeamId, homeGoals);
  addScorer(f.awayTeamId, awayGoals);
  next.scorers.sort((a, b) => b.goals - a.goals);

  // Advance round if all current round fixtures played
  const roundFixtures = next.fixtures.filter((x) => x.round === next.currentRound);
  if (roundFixtures.every((x) => x.played)) {
    if (next.currentRound < next.totalRounds) {
      next.currentRound++;
    } else {
      next.completed = true;
      const standings = computeLeagueStandings(next, teamsMap);
      next.championTeamId = standings[0]?.teamId;
    }
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export function simulateLeagueRoundAI(
  league: LeagueState,
  teamsMap: Record<string, Team>,
  skipFixtureId?: string
): LeagueState {
  let next = league;
  const currentFixtures = next.fixtures.filter((f) => f.round === next.currentRound && !f.played);
  for (const f of currentFixtures) {
    if (f.id === skipFixtureId) continue;
    const hOvr = teamsMap[f.homeTeamId]?.rating.overall ?? 78;
    const aOvr = teamsMap[f.awayTeamId]?.rating.overall ?? 78;
    const diff = (hOvr - aOvr) * 0.045;
    const hg = Math.max(0, Math.round(Math.random() * 2.3 + Math.max(0, diff)));
    const ag = Math.max(0, Math.round(Math.random() * 2.1 + Math.max(0, -diff)));
    next = recordLeagueFixtureResult(next, f.id, hg, ag, teamsMap);
  }
  return next;
}
