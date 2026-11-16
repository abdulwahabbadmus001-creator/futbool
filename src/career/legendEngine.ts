import {
  BecomeLegendOffer,
  BecomeLegendState,
  Player,
  PositionRole,
  Team,
} from '../types/football';
import {
  createLeague,
  recordLeagueFixtureResult,
  simulateLeagueRoundAI,
} from '../competitions/leagueEngine';

export function createLegendCareer(
  name: string,
  position: PositionRole,
  nationality: string,
  clubId: string,
  clubTeams: Team[]
): BecomeLegendState {
  const club = clubTeams.find((t) => t.id === clubId) ?? clubTeams[0];
  const league = createLeague('Continental Premier League', club.id, clubTeams);

  const isAttacker = position === 'ST' || position === 'LW' || position === 'RW';
  const isMid = position === 'CAM' || position === 'CM' || position === 'CDM';

  const player: Player = {
    id: `legend-${Date.now()}`,
    name: name.trim() || 'Alex Mercer',
    shortName: (name.trim().split(' ').pop() || 'Mercer'),
    number: 17,
    position,
    nationality: nationality.trim() || 'Albia',
    age: 18,
    overall: 71,
    attributes: {
      pace: isAttacker ? 77 : isMid ? 72 : 69,
      shooting: isAttacker ? 75 : isMid ? 68 : 56,
      passing: isMid ? 76 : 68,
      dribbling: isAttacker || isMid ? 75 : 64,
      defending: !isAttacker && !isMid ? 75 : 52,
      physical: 71,
      goalkeeping: 18,
    },
    appearance: {
      skinTone: '#e0a984',
      hairColor: '#1c1917',
      hairStyle: 'fade',
      bootColor: '#FF6B00',
    },
    marketValue: 4.5,
    wage: 12,
    contractYears: 2,
    fitness: 98,
    injuredWeeks: 0,
  };

  const rivalOffers: BecomeLegendOffer[] = clubTeams
    .filter((t) => t.id !== club.id)
    .slice(0, 2)
    .map((t, i) => ({
      id: `offer-${t.id}`,
      clubId: t.id,
      clubName: t.name,
      weeklyWage: 16 + i * 5,
      rolePromise: i === 0 ? 'First-Team Rotation' : 'Key Prospect',
    }));

  return {
    id: `bal-${Date.now()}`,
    player,
    clubId: club.id,
    seasonNumber: 1,
    league,
    appearances: 0,
    goals: 0,
    assists: 0,
    avgRating: 6.5,
    xp: 0,
    skillPoints: 2,
    managerTrust: 62,
    releaseClause: 18,
    intlCallUps: 0,
    intlNationName: `${nationality.trim() || 'Albia'} National XI`,
    loanOrTransferStatus: 'none',
    trainingFocus: isAttacker ? 'shooting' : isMid ? 'passing' : 'defense',
    offers: rivalOffers,
    newsFeed: [
      {
        id: 'bal-0',
        week: 1,
        headline: `${player.name} signs first professional contract with ${club.name} (#${player.number}).`,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function trainLegendSkill(
  legend: BecomeLegendState,
  statKey: 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'
): { legend: BecomeLegendState; ok: boolean; message: string } {
  if (legend.skillPoints <= 0) {
    return { legend, ok: false, message: 'No skill points available. Play matches to earn XP!' };
  }
  const next: BecomeLegendState = JSON.parse(JSON.stringify(legend));
  if (next.player.attributes[statKey] >= 99) {
    return { legend, ok: false, message: 'Attribute is already maxed at 99.' };
  }
  next.player.attributes[statKey] = Math.min(99, next.player.attributes[statKey] + 2);
  next.skillPoints--;
  const a = next.player.attributes;
  next.player.overall = Math.min(
    98,
    Math.round((a.pace + a.shooting + a.passing + a.dribbling + a.defending + a.physical) / 6 + 3)
  );
  next.player.marketValue = Number((Math.max(2, (next.player.overall - 62) * 1.35)).toFixed(1));
  next.updatedAt = new Date().toISOString();
  return { legend: next, ok: true, message: `Upgraded ${statKey.toUpperCase()} (+2)! OVR: ${next.player.overall}` };
}

export function computeLegendMatchRating(params: {
  goals: number;
  assists: number;
  passesCompleted?: number;
  shotsOnTarget?: number;
  tacklesWon?: number;
  teamWon: boolean;
}): number {
  const base =
    6.1 +
    params.goals * 1.15 +
    params.assists * 0.75 +
    Math.min(0.6, (params.passesCompleted ?? 0) * 0.04) +
    Math.min(0.5, (params.shotsOnTarget ?? 0) * 0.2) +
    Math.min(0.4, (params.tacklesWon ?? 0) * 0.15) +
    (params.teamWon ? 0.5 : 0);
  return Math.max(4.5, Math.min(10.0, Number(base.toFixed(1))));
}

export function advanceLegendWeek(
  legend: BecomeLegendState,
  userFixtureId: string,
  homeGoals: number,
  awayGoals: number,
  legendGoals: number,
  legendAssists: number,
  teamsMap: Record<string, Team>,
  goalScorers?: { playerId: string; playerName: string; teamId: string; minute: number }[],
  explicitRating?: number
): BecomeLegendState {
  const next: BecomeLegendState = JSON.parse(JSON.stringify(legend));
  next.league = recordLeagueFixtureResult(next.league, userFixtureId, homeGoals, awayGoals, teamsMap, goalScorers);
  next.league = simulateLeagueRoundAI(next.league, teamsMap);

  next.appearances++;
  next.goals += legendGoals;
  next.assists += legendAssists;

  const fixture = next.league.fixtures.find((f) => f.id === userFixtureId);
  const userWon = Boolean(
    fixture &&
      ((fixture.homeTeamId === next.clubId && homeGoals > awayGoals) ||
        (fixture.awayTeamId === next.clubId && awayGoals > homeGoals))
  );
  const matchRating =
    explicitRating ??
    computeLegendMatchRating({
      goals: legendGoals,
      assists: legendAssists,
      teamWon: userWon,
    });
  next.avgRating = Number(
    (((next.avgRating * (next.appearances - 1)) + matchRating) / next.appearances).toFixed(1)
  );

  const earnedXp = 45 + legendGoals * 40 + legendAssists * 25 + Math.round((matchRating - 6.0) * 15) + (userWon ? 30 : 10);
  next.xp += Math.max(25, earnedXp);
  while (next.xp >= 100) {
    next.xp -= 100;
    next.skillPoints++;
  }

  // Apply weekly training focus micro-boost
  const f = next.trainingFocus;
  if (f === 'speed') next.player.attributes.pace = Math.min(99, next.player.attributes.pace + 1);
  if (f === 'shooting') next.player.attributes.shooting = Math.min(99, next.player.attributes.shooting + 1);
  if (f === 'passing') next.player.attributes.passing = Math.min(99, next.player.attributes.passing + 1);
  if (f === 'technique') next.player.attributes.dribbling = Math.min(99, next.player.attributes.dribbling + 1);
  if (f === 'defense') next.player.attributes.defending = Math.min(99, next.player.attributes.defending + 1);

  // Update Manager Trust & International Call-Up progression
  const prevTrust = next.managerTrust ?? 62;
  const trustDelta = matchRating >= 7.5 ? 5 : matchRating >= 6.8 ? 2 : matchRating < 6.0 ? -4 : 0;
  next.managerTrust = Math.max(10, Math.min(100, prevTrust + trustDelta));

  if ((next.managerTrust >= 72 || next.avgRating >= 7.1) && next.appearances % 3 === 0) {
    next.intlCallUps = (next.intlCallUps ?? 0) + 1;
    next.newsFeed.unshift({
      id: `bal-intl-${Date.now()}`,
      week: next.league.currentRound,
      headline: `INTERNATIONAL CALL-UP #${next.intlCallUps}: Selected for ${next.intlNationName ?? 'National Squad'}!`,
    });
  }

  next.newsFeed.unshift({
    id: `bal-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Match Rating ${matchRating.toFixed(1)}: ${legendGoals}G ${legendAssists}A (+${Math.max(25, earnedXp)} XP · Trust ${next.managerTrust}%).`,
  });

  next.updatedAt = new Date().toISOString();
  return next;
}

export function negotiateLegendAgent(
  legend: BecomeLegendState,
  action: 'wage-bump' | 'lower-clause' | 'renew'
): { legend: BecomeLegendState; ok: boolean; message: string } {
  const next: BecomeLegendState = JSON.parse(JSON.stringify(legend));
  const trust = next.managerTrust ?? 62;
  if (action === 'wage-bump') {
    if (trust < 55) {
      return { legend, ok: false, message: 'Manager Trust must reach 55% before requesting a wage raise.' };
    }
    const raise = Math.max(3, Math.round(next.player.wage * 0.2));
    next.player.wage += raise;
    next.managerTrust = Math.max(20, trust - 4);
    next.newsFeed.unshift({
      id: `bal-neg-${Date.now()}`,
      week: next.league.currentRound,
      headline: `AGENT DEAL: Secured +€${raise}K/wk pay rise (New Wage: €${next.player.wage}K/wk).`,
    });
    next.updatedAt = new Date().toISOString();
    return { legend: next, ok: true, message: `Negotiated +€${raise}K/wk wage bump!` };
  }
  if (action === 'lower-clause') {
    const cur = next.releaseClause ?? 18;
    const nextClause = Math.max(5, Number((cur * 0.78).toFixed(1)));
    next.releaseClause = nextClause;
    next.newsFeed.unshift({
      id: `bal-neg-${Date.now()}`,
      week: next.league.currentRound,
      headline: `AGENT DEAL: Release clause lowered to €${nextClause}M.`,
    });
    next.updatedAt = new Date().toISOString();
    return { legend: next, ok: true, message: `Release clause lowered to €${nextClause}M.` };
  }
  next.player.contractYears = Math.min(5, next.player.contractYears + 2);
  next.managerTrust = Math.min(100, trust + 6);
  next.updatedAt = new Date().toISOString();
  return { legend: next, ok: true, message: 'Contract extended +2 yrs (+6% Manager Trust)!' };
}

export function requestLegendMove(
  legend: BecomeLegendState,
  type: 'loan' | 'transfer',
  clubTeams: Team[]
): { legend: BecomeLegendState; ok: boolean; message: string } {
  const next: BecomeLegendState = JSON.parse(JSON.stringify(legend));
  next.loanOrTransferStatus = type === 'loan' ? 'loan-requested' : 'transfer-requested';
  const freshClub = clubTeams.find((t) => t.id !== next.clubId && !next.offers.some((o) => o.clubId === t.id));
  if (freshClub) {
    next.offers.unshift({
      id: `req-${type}-${freshClub.id}-${Date.now()}`,
      clubId: freshClub.id,
      clubName: freshClub.name,
      weeklyWage: next.player.wage + (type === 'transfer' ? 7 : 3),
      rolePromise: type === 'loan' ? 'Season Loan Starter' : 'Immediate Key Transfer',
    });
  }
  next.newsFeed.unshift({
    id: `bal-mov-${Date.now()}`,
    week: next.league.currentRound,
    headline: `AGENT ALERT: Submitted formal ${type.toUpperCase()} request — new club interest registered.`,
  });
  next.updatedAt = new Date().toISOString();
  return { legend: next, ok: true, message: `${type.toUpperCase()} request submitted! Check offers below.` };
}

export function acceptLegendTransfer(
  legend: BecomeLegendState,
  offerId: string,
  clubTeams: Team[]
): { legend: BecomeLegendState; ok: boolean; message: string } {
  const offer = legend.offers.find((o) => o.id === offerId);
  if (!offer) return { legend, ok: false, message: 'Transfer offer unavailable.' };

  const next: BecomeLegendState = JSON.parse(JSON.stringify(legend));
  next.clubId = offer.clubId;
  next.player.wage = offer.weeklyWage;
  next.league = createLeague('Continental Premier League', offer.clubId, clubTeams);
  next.seasonNumber++;
  next.offers = clubTeams
    .filter((t) => t.id !== offer.clubId)
    .slice(0, 2)
    .map((t, i) => ({
      id: `offer-${t.id}-${next.seasonNumber}`,
      clubId: t.id,
      clubName: t.name,
      weeklyWage: offer.weeklyWage + 6 + i * 4,
      rolePromise: 'Star Signing',
    }));
  next.newsFeed.unshift({
    id: `bal-tr-${Date.now()}`,
    week: 1,
    headline: `BREAKING: ${next.player.name} completes transfer to ${offer.clubName} (€${offer.weeklyWage}K/wk)!`,
  });
  next.updatedAt = new Date().toISOString();
  return { legend: next, ok: true, message: `Transferred to ${offer.clubName}!` };
}
