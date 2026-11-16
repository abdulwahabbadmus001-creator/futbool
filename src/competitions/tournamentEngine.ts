import {
  Fixture,
  StandingRow,
  Team,
  TournamentState,
} from '../types/football';

export function createTournament(
  name: string,
  size: 8 | 16,
  userTeamId: string,
  allTeams: Team[]
): TournamentState {
  const userTeam = allTeams.find((t) => t.id === userTeamId) ?? allTeams[0];
  const others = allTeams.filter((t) => t.id !== userTeam.id);
  const selectedIds = [userTeam.id, ...others.slice(0, size - 1).map((t) => t.id)];

  const groupCount = size === 8 ? 2 : 4;
  const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'];
  const groups: { id: string; name: string; teamIds: string[] }[] = [];

  for (let g = 0; g < groupCount; g++) {
    groups.push({
      id: `grp-${g}`,
      name: groupNames[g],
      teamIds: selectedIds.slice(g * 4, g * 4 + 4),
    });
  }

  // Generate unique round-robin fixtures per group (3 rounds, 2 matches per round = 6 unique matches/group)
  const fixtures: Fixture[] = [];
  for (const grp of groups) {
    const [t0, t1, t2, t3] = grp.teamIds;
    const pairings: [number, string, string][] = [
      [1, t0, t1],
      [1, t2, t3],
      [2, t0, t2],
      [2, t1, t3],
      [3, t0, t3],
      [3, t1, t2],
    ];
    pairings.forEach(([round, h, a], idx) => {
      fixtures.push({
        id: `${grp.id}-r${round}-${idx}`,
        round,
        stageLabel: `${grp.name} · Matchday ${round}`,
        groupId: grp.id,
        homeTeamId: h,
        awayTeamId: a,
        played: false,
      });
    });
  }

  return {
    id: `tourn-${Date.now()}`,
    name,
    size,
    userTeamId: userTeam.id,
    teamIds: selectedIds,
    phase: 'group',
    groups,
    fixtures,
    updatedAt: new Date().toISOString(),
  };
}

export function computeGroupStandings(
  groupId: string,
  teamIds: string[],
  fixtures: Fixture[],
  teamsMap: Record<string, Team>
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const tid of teamIds) {
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

  for (const f of fixtures) {
    if (f.groupId !== groupId || !f.played || f.homeGoals === undefined || f.awayGoals === undefined) continue;
    const home = table.get(f.homeTeamId);
    const away = table.get(f.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += f.homeGoals;
    home.goalsAgainst += f.awayGoals;
    away.goalsFor += f.awayGoals;
    away.goalsAgainst += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (f.homeGoals < f.awayGoals) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function simulateAIFixture(
  fixture: Fixture,
  teamsMap: Record<string, Team>,
  knockout = false
): Fixture {
  const home = teamsMap[fixture.homeTeamId];
  const away = teamsMap[fixture.awayTeamId];
  const hOvr = home?.rating.overall ?? 78;
  const aOvr = away?.rating.overall ?? 78;
  const diff = (hOvr - aOvr) * 0.045;

  const hGoals = Math.max(0, Math.round(Math.random() * 2.4 + Math.max(0, diff)));
  const aGoals = Math.max(0, Math.round(Math.random() * 2.2 + Math.max(0, -diff)));

  let penalties: { home: number; away: number } | undefined;
  if (knockout && hGoals === aGoals) {
    const homeEdge = hOvr >= aOvr ? 4 : 3;
    const awayEdge = homeEdge === 4 ? 3 : 4;
    penalties = { home: homeEdge, away: awayEdge };
  }

  return {
    ...fixture,
    played: true,
    homeGoals: hGoals,
    awayGoals: aGoals,
    penalties,
  };
}

export function getFixtureWinner(f: Fixture): string | null {
  if (!f.played || f.homeGoals === undefined || f.awayGoals === undefined) return null;
  if (f.homeGoals > f.awayGoals) return f.homeTeamId;
  if (f.awayGoals > f.homeGoals) return f.awayTeamId;
  if (f.penalties) {
    return f.penalties.home > f.penalties.away ? f.homeTeamId : f.awayTeamId;
  }
  return f.homeTeamId;
}

export function advanceTournamentPhase(
  tournament: TournamentState,
  teamsMap: Record<string, Team>
): TournamentState {
  const next: TournamentState = JSON.parse(JSON.stringify(tournament));
  next.updatedAt = new Date().toISOString();

  if (next.phase === 'group') {
    const groupDone = next.fixtures.filter((f) => f.groupId).every((f) => f.played);
    if (!groupDone) return next;

    // Top 2 from each group qualify
    const qualifiers: string[] = [];
    for (const grp of next.groups) {
      const table = computeGroupStandings(grp.id, grp.teamIds, next.fixtures, teamsMap);
      if (table[0]) qualifiers.push(table[0].teamId);
      if (table[1]) qualifiers.push(table[1].teamId);
    }

    if (next.size === 16) {
      // 8 qualifiers -> Quarterfinals (A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2)
      next.phase = 'quarterfinal';
      const qfPairs: [string, string][] = [
        [qualifiers[0], qualifiers[3]],
        [qualifiers[2], qualifiers[1]],
        [qualifiers[4], qualifiers[7]],
        [qualifiers[6], qualifiers[5]],
      ];
      qfPairs.forEach(([h, a], i) => {
        next.fixtures.push({
          id: `qf-${i}`,
          round: 4,
          stageLabel: `Quarterfinal ${i + 1}`,
          homeTeamId: h,
          awayTeamId: a,
          played: false,
        });
      });
    } else {
      // 4 qualifiers -> Semifinals (A1 vs B2, B1 vs A2)
      next.phase = 'semifinal';
      const sfPairs: [string, string][] = [
        [qualifiers[0], qualifiers[3]],
        [qualifiers[2], qualifiers[1]],
      ];
      sfPairs.forEach(([h, a], i) => {
        next.fixtures.push({
          id: `sf-${i}`,
          round: 4,
          stageLabel: `Semifinal ${i + 1}`,
          homeTeamId: h,
          awayTeamId: a,
          played: false,
        });
      });
    }
    return next;
  }

  if (next.phase === 'quarterfinal') {
    const qfs = next.fixtures.filter((f) => f.id.startsWith('qf-'));
    if (!qfs.every((f) => f.played)) return next;
    next.phase = 'semifinal';
    const w0 = getFixtureWinner(qfs[0])!;
    const w1 = getFixtureWinner(qfs[1])!;
    const w2 = getFixtureWinner(qfs[2])!;
    const w3 = getFixtureWinner(qfs[3])!;
    [
      [w0, w2],
      [w1, w3],
    ].forEach(([h, a], i) => {
      next.fixtures.push({
        id: `sf-${i}`,
        round: 5,
        stageLabel: `Semifinal ${i + 1}`,
        homeTeamId: h,
        awayTeamId: a,
        played: false,
      });
    });
    return next;
  }

  if (next.phase === 'semifinal') {
    const sfs = next.fixtures.filter((f) => f.id.startsWith('sf-'));
    if (!sfs.every((f) => f.played)) return next;
    next.phase = 'final';
    const w0 = getFixtureWinner(sfs[0])!;
    const w1 = getFixtureWinner(sfs[1])!;
    next.fixtures.push({
      id: 'final-0',
      round: 6,
      stageLabel: 'Tournament Final',
      homeTeamId: w0,
      awayTeamId: w1,
      played: false,
    });
    return next;
  }

  if (next.phase === 'final') {
    const finalMatch = next.fixtures.find((f) => f.id === 'final-0');
    if (finalMatch?.played) {
      next.phase = 'completed';
      next.championTeamId = getFixtureWinner(finalMatch) ?? undefined;
    }
  }

  return next;
}
