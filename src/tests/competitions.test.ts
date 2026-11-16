import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TEAMS } from '../data/teams';
import {
  advanceTournamentPhase,
  computeGroupStandings,
  createTournament,
  simulateAIFixture,
} from '../competitions/tournamentEngine';
import {
  computeLeagueStandings,
  createLeague,
  recordLeagueFixtureResult,
} from '../competitions/leagueEngine';
import {
  acceptInternationalOffer,
  buyTransferPlayer,
  claimSponsorTarget,
  createCareer,
  getScoutDiscountFactor,
  promoteYouthPlayer,
  scoutPlayer,
  sellSquadPlayer,
  signSponsor,
  startNextCareerSeason,
  upgradeStaffMember,
} from '../career/careerEngine';
import {
  advanceLegendWeek,
  computeLegendMatchRating,
  createLegendCareer,
  negotiateLegendAgent,
  requestLegendMove,
  trainLegendSkill,
} from '../career/legendEngine';
import { Team } from '../types/football';

const teamsMap: Record<string, Team> = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));

test('tournament generates unique group fixtures and advances qualifiers accurately', () => {
  const t = createTournament('World Masters Cup', 8, INITIAL_TEAMS[0].id, INITIAL_TEAMS);
  assert.equal(t.groups.length, 2);
  assert.equal(t.fixtures.length, 12); // 6 matches per 4-team group

  // Ensure zero duplicate pairings in each group
  const seen = new Set<string>();
  for (const f of t.fixtures) {
    const key = [f.homeTeamId, f.awayTeamId].sort().join(':');
    assert.ok(!seen.has(key), `Duplicate fixture found: ${key}`);
    seen.add(key);
  }

  // Simulate all group matches
  t.fixtures = t.fixtures.map((f) => simulateAIFixture(f, teamsMap, false));
  const grp0Table = computeGroupStandings(t.groups[0].id, t.groups[0].teamIds, t.fixtures, teamsMap);
  assert.equal(grp0Table.length, 4);
  assert.ok(grp0Table[0].points >= grp0Table[1].points);

  const semiStage = advanceTournamentPhase(t, teamsMap);
  assert.equal(semiStage.phase, 'semifinal');
  const sfs = semiStage.fixtures.filter((f) => f.id.startsWith('sf-'));
  assert.equal(sfs.length, 2);
});

test('league double round-robin prevents duplicate home/away pairs and computes standings', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const lg = createLeague('Continental Premier', clubs[0].id, clubs);

  // 12 clubs -> 132 total fixtures (22 rounds * 6 matches)
  assert.equal(clubs.length, 12);
  assert.equal(lg.fixtures.length, 132);
  const directedPairs = new Set<string>();
  for (const f of lg.fixtures) {
    const key = `${f.homeTeamId}->${f.awayTeamId}`;
    assert.ok(!directedPairs.has(key), `Duplicate home/away pairing: ${key}`);
    directedPairs.add(key);
  }

  const first = lg.fixtures[0];
  const updated = recordLeagueFixtureResult(lg, first.id, 3, 1, teamsMap);
  const standings = computeLeagueStandings(updated, teamsMap);
  const winnerRow = standings.find((r) => r.teamId === first.homeTeamId)!;
  assert.equal(winnerRow.points, 3);
  assert.equal(winnerRow.goalDifference, 2);
});

test('career transfer market enforces budget and updates squad roster', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const career = createCareer(clubs[0].id, clubs);
  const initialBudget = career.budget;
  const listing = career.transferMarket.find((l) => l.askingPrice <= initialBudget)!;
  assert.ok(listing);

  const buyRes = buyTransferPlayer(career, listing);
  assert.equal(buyRes.ok, true);
  assert.equal(buyRes.career.squad.length, career.squad.length + 1);
  assert.ok(buyRes.career.budget < initialBudget);

  const sellRes = sellSquadPlayer(buyRes.career, buyRes.career.squad[buyRes.career.squad.length - 1].id);
  assert.equal(sellRes.ok, true);
  assert.equal(sellRes.career.squad.length, career.squad.length);
});

test('Master League sponsors grant signing bonus and youth academy promotes prospects', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const career = createCareer(clubs[0].id, clubs);
  assert.ok(career.sponsors.length >= 2);
  assert.ok(career.youthAcademy.length >= 3);

  const sponsor = career.sponsors[0];
  const spRes = signSponsor(career, sponsor.id);
  assert.equal(spRes.ok, true);
  assert.equal(spRes.career.activeSponsorId, sponsor.id);
  assert.ok(spRes.career.budget > career.budget);

  const dupRes = signSponsor(spRes.career, career.sponsors[1].id);
  assert.equal(dupRes.ok, false);

  const youth = spRes.career.youthAcademy[0];
  const yRes = promoteYouthPlayer(spRes.career, youth.id);
  assert.equal(yRes.ok, true);
  assert.equal(yRes.career.squad.length, career.squad.length + 1);
  assert.equal(yRes.career.youthAcademy.length, career.youthAcademy.length - 1);
});

test('Become a Legend engine tracks pro creation, skill training, and match progression', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const legend = createLegendCareer('Kenji Sato', 'CAM', 'Japan', clubs[0].id, clubs);
  assert.equal(legend.player.position, 'CAM');
  assert.equal(legend.skillPoints, 2);

  const tr = trainLegendSkill(legend, 'passing');
  assert.equal(tr.ok, true);
  assert.equal(tr.legend.skillPoints, 1);
  assert.equal(tr.legend.player.attributes.passing, legend.player.attributes.passing + 2);

  const nextFixture = tr.legend.league.fixtures.find(
    (f) => !f.played && (f.homeTeamId === tr.legend.clubId || f.awayTeamId === tr.legend.clubId)
  )!;
  const afterMatch = advanceLegendWeek(tr.legend, nextFixture.id, 2, 0, 1, 1, teamsMap);
  assert.equal(afterMatch.appearances, 1);
  assert.equal(afterMatch.goals, 1);
  assert.equal(afterMatch.assists, 1);
  assert.ok(afterMatch.xp > 0 || afterMatch.skillPoints > tr.legend.skillPoints);
});

test('Master League staff upgrades apply scout transfer discounts and cap at Lv.5', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  let career = createCareer(clubs[0].id, clubs);
  career.budget = 200;

  const upg = upgradeStaffMember(career, 'scout');
  assert.equal(upg.ok, true);
  assert.equal(upg.career.staffLevels?.scout, 2);
  assert.ok(upg.career.budget < 200);
  assert.ok(getScoutDiscountFactor(2) < 1.0);

  career = upg.career;
  const listing = career.transferMarket[0];
  const expectedPrice = Number((listing.askingPrice * getScoutDiscountFactor(2)).toFixed(1));
  const beforeBuy = career.budget;
  const buy = buyTransferPlayer(career, listing);
  assert.equal(buy.ok, true);
  assert.equal(Number((beforeBuy - buy.career.budget).toFixed(1)), expectedPrice);
});

test('Master League veteran retirement at Age 34+ spawns Age-17 regen in Youth Academy', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const career = createCareer(clubs[0].id, clubs);
  career.squad[0].age = 34;
  const retiredName = career.squad[0].name;

  const nextSeason = startNextCareerSeason(career, clubs);
  const regen = nextSeason.youthAcademy.find((p) => p.isRegen && p.regenFrom === retiredName);
  assert.ok(regen, 'Retired veteran should be reborn in Youth Academy');
  assert.equal(regen!.age, 17);
});

test('computeLegendMatchRating calculates clamped 4.5-10.0 performance scores', () => {
  const low = computeLegendMatchRating({ goals: 0, assists: 0, teamWon: false });
  const high = computeLegendMatchRating({
    goals: 2,
    assists: 2,
    passesCompleted: 20,
    shotsOnTarget: 4,
    tacklesWon: 3,
    teamWon: true,
  });
  assert.ok(low >= 4.5 && low <= 7.0);
  assert.equal(high, 10.0);
});

test('2011/2012 database includes 12 clubs and 9 national squads with authentic stars', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const nations = INITIAL_TEAMS.filter((t) => t.category === 'national');
  assert.equal(INITIAL_TEAMS.length, 21);
  assert.equal(clubs.length, 12);
  assert.equal(nations.length, 9);

  for (const team of INITIAL_TEAMS) {
    assert.ok(team.roster.length >= 18, `${team.name} should have at least 18 squad players`);
  }

  const barca = clubs.find((t) => t.id === 'barcelona-12');
  const madrid = clubs.find((t) => t.id === 'real-madrid-12');
  assert.ok(barca?.roster.some((p) => p.name.includes('Messi')));
  assert.ok(madrid?.roster.some((p) => p.name.includes('Ronaldo')));
});

test('Master League supports scouting dossiers, sponsor bonus claims, and international offers', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  let career = createCareer(clubs[0].id, clubs);
  career.budget = 100;

  const target = career.transferMarket[0];
  const scoutRes = scoutPlayer(career, target.player.id);
  assert.equal(scoutRes.ok, true);
  assert.ok(scoutRes.career.revealedPlayerIds?.includes(target.player.id));

  career = scoutRes.career;
  const bonusTarget = career.sponsorTargets![0];
  bonusTarget.currentValue = bonusTarget.targetValue;
  const beforeBudget = career.budget;
  const claimRes = claimSponsorTarget(career, bonusTarget.id);
  assert.equal(claimRes.ok, true);
  assert.ok(claimRes.career.budget > beforeBudget);

  const offer = claimRes.career.internationalOffers![0];
  const intlRes = acceptInternationalOffer(claimRes.career, offer.id);
  assert.equal(intlRes.ok, true);
  assert.equal(intlRes.career.activeNationId, offer.nationId);
});

test('Become a Legend supports agent wage/clause negotiations and loan/transfer requests', () => {
  const clubs = INITIAL_TEAMS.filter((t) => t.category === 'club');
  const legend = createLegendCareer('Kenji Sato', 'CAM', 'Japan', clubs[0].id, clubs);
  const startWage = legend.player.wage;

  const wageRes = negotiateLegendAgent(legend, 'wage-bump');
  assert.equal(wageRes.ok, true);
  assert.ok(wageRes.legend.player.wage > startWage);

  const clauseRes = negotiateLegendAgent(wageRes.legend, 'lower-clause');
  assert.equal(clauseRes.ok, true);
  assert.ok((clauseRes.legend.releaseClause ?? 99) < (legend.releaseClause ?? 18));

  const moveRes = requestLegendMove(clauseRes.legend, 'transfer', clubs);
  assert.equal(moveRes.ok, true);
  assert.equal(moveRes.legend.loanOrTransferStatus, 'transfer-requested');
});

