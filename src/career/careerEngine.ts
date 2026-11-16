import {
  CareerStaffLevels,
  CareerState,
  FormArrow,
  InternationalManagerOffer,
  Player,
  PlayerAttributes,
  PositionRole,
  SponsorContract,
  SponsorTarget,
  Team,
  TransferListing,
} from '../types/football';

export const DEFAULT_STAFF_LEVELS: CareerStaffLevels = {
  coach: 1,
  scout: 1,
  medical: 1,
  youth: 1,
};

export function getStaffUpgradeCost(currentLevel: number): number {
  return Number((currentLevel * 4.5).toFixed(1));
}

export function getScoutDiscountFactor(scoutLevel: number): number {
  return Math.max(0.72, 1 - (Math.max(1, scoutLevel) - 1) * 0.06);
}
import {
  computeLeagueStandings,
  createLeague,
  recordLeagueFixtureResult,
  simulateLeagueRoundAI,
} from '../competitions/leagueEngine';

export function generateSponsorTargets(): SponsorTarget[] {
  return [
    {
      id: 'st-wins-3',
      title: 'Win 3 League Matches',
      targetType: 'wins',
      targetValue: 3,
      currentValue: 0,
      bonusAmount: 4.5,
      claimed: false,
    },
    {
      id: 'st-goals-10',
      title: 'Score 10 Team Goals',
      targetType: 'goals',
      targetValue: 10,
      currentValue: 0,
      bonusAmount: 3.5,
      claimed: false,
    },
    {
      id: 'st-cs-2',
      title: 'Keep 2 Clean Sheets',
      targetType: 'clean-sheets',
      targetValue: 2,
      currentValue: 0,
      bonusAmount: 3.0,
      claimed: false,
    },
  ];
}

export function generateInternationalOffers(): InternationalManagerOffer[] {
  return [
    {
      id: 'intl-esp',
      nationId: 'spain-2012',
      nationName: 'Spain National Team',
      expectation: 'Win European Championship',
      salaryBonus: 2.5,
    },
    {
      id: 'intl-bra',
      nationId: 'brazil-2012',
      nationName: 'Brazil National Team',
      expectation: 'Reach Continental Final',
      salaryBonus: 2.2,
    },
  ];
}

export function generateSponsors(): SponsorContract[] {
  return [
    {
      id: 'sp-apex-air',
      name: 'Apex Global Airways',
      signingBonus: 6.5,
      winBonus: 0.75,
      weeklyIncome: 0.55,
      signed: false,
    },
    {
      id: 'sp-kuro-motors',
      name: 'Kuro Motors Corp.',
      signingBonus: 4.0,
      winBonus: 1.15,
      weeklyIncome: 0.45,
      signed: false,
    },
    {
      id: 'sp-solaris-tech',
      name: 'Solaris Energy Group',
      signingBonus: 9.0,
      winBonus: 0.45,
      weeklyIncome: 0.35,
      signed: false,
    },
  ];
}

const YOUTH_NAMES = [
  ['Mateo Delgado', 'Iberia'],
  ['Noah Lindqvist', 'Nordia'],
  ['Enzo Moreau', 'Gaul'],
  ['Leo Takahashi', 'Nippon'],
  ['Callum Vance', 'Albia'],
  ['Marco Lombardi', 'Azzurra'],
  ['Lukas Neumann', 'Teutonia'],
  ['Diogo Tavares', 'Lusitania'],
];

const YOUTH_ROLES: PositionRole[] = ['ST', 'CAM', 'CM', 'CB', 'LW', 'RB'];

export function generateYouthAcademy(clubId: string, seasonNumber = 1, youthLevel = 1): Player[] {
  const prospects: Player[] = [];
  const youthBoost = Math.max(0, (youthLevel - 1) * 2);
  for (let i = 0; i < 4; i++) {
    const idx = (seasonNumber * 3 + i) % YOUTH_NAMES.length;
    const [name, nat] = YOUTH_NAMES[idx];
    const role = YOUTH_ROLES[(seasonNumber + i) % YOUTH_ROLES.length];
    const overall = Math.min(82, 64 + ((seasonNumber * 2 + i * 3) % 7) + youthBoost);
    const attrs: PlayerAttributes = {
      pace: Math.min(92, overall + (role === 'LW' || role === 'ST' ? 9 : 3)),
      shooting: role === 'ST' || role === 'CAM' ? overall + 4 : overall - 8,
      passing: role === 'CAM' || role === 'CM' ? overall + 5 : overall - 2,
      dribbling: overall + 4,
      defending: role === 'CB' || role === 'RB' ? overall + 6 : 44,
      physical: overall - 3,
      goalkeeping: 18,
    };
    const parts = name.split(' ');
    prospects.push({
      id: `${clubId}-youth-s${seasonNumber}-${i}`,
      name,
      shortName: parts[parts.length - 1],
      number: 30 + i,
      position: role,
      nationality: nat,
      age: 16 + (i % 3),
      overall,
      attributes: attrs,
      appearance: {
        skinTone: '#e0a984',
        hairColor: '#1c1917',
        hairStyle: i % 2 === 0 ? 'fade' : 'short',
        bootColor: '#FF6B00',
      },
      marketValue: Number((1.2 + i * 0.6).toFixed(1)),
      wage: 4 + i,
      contractYears: 3,
      fitness: 98,
      injuredWeeks: 0,
    });
  }
  return prospects;
}

export function buildTransferMarket(clubTeams: Team[], userClubId: string): TransferListing[] {
  const listings: TransferListing[] = [];
  for (const team of clubTeams) {
    if (team.id === userClubId) continue;
    const candidates = [team.roster[3], team.roster[6], team.roster[9], team.roster[13]].filter(Boolean);
    for (const p of candidates) {
      listings.push({
        player: JSON.parse(JSON.stringify(p)),
        sellingTeamId: team.id,
        sellingTeamName: team.name,
        askingPrice: Number((p.marketValue * 1.15).toFixed(1)),
      });
    }
  }
  return listings.sort((a, b) => b.player.overall - a.player.overall);
}

export function createCareer(clubId: string, clubTeams: Team[]): CareerState {
  const club = clubTeams.find((t) => t.id === clubId) ?? clubTeams[0];
  const league = createLeague('Continental Premier League', club.id, clubTeams);
  const squad: Player[] = JSON.parse(JSON.stringify(club.roster));
  const weeklyWageBill = squad.reduce((sum, p) => sum + p.wage, 0);

  return {
    id: `career-${Date.now()}`,
    clubId: club.id,
    seasonNumber: 1,
    budget: club.budget || 60,
    weeklyWageBill,
    league,
    squad,
    transferMarket: buildTransferMarket(clubTeams, club.id),
    youthAcademy: generateYouthAcademy(club.id, 1, 1),
    sponsors: generateSponsors(),
    sponsorTargets: generateSponsorTargets(),
    staffLevels: { ...DEFAULT_STAFF_LEVELS },
    revealedPlayerIds: [],
    internationalOffers: generateInternationalOffers(),
    objectives: [
      { id: 'obj-top4', title: 'Finish in Top 4 of Continental League', targetPosition: 4, completed: false },
      { id: 'obj-title', title: 'Challenge for the League Championship', targetPosition: 1, completed: false },
    ],
    trainingFocus: 'attack',
    newsFeed: [
      {
        id: 'n-0',
        week: 1,
        headline: `Board welcomes new manager to ${club.name}. Season budget set at €${club.budget || 60}M.`,
      },
    ],
    trophiesWon: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function signSponsor(
  career: CareerState,
  sponsorId: string
): { career: CareerState; ok: boolean; message: string } {
  if (career.activeSponsorId) {
    return { career, ok: false, message: 'A primary sponsor is already signed for this season.' };
  }
  const next: CareerState = JSON.parse(JSON.stringify(career));
  const sp = next.sponsors.find((s) => s.id === sponsorId);
  if (!sp) return { career, ok: false, message: 'Sponsor offer not found.' };

  sp.signed = true;
  next.activeSponsorId = sp.id;
  next.budget = Number((next.budget + sp.signingBonus).toFixed(1));
  next.newsFeed.unshift({
    id: `sp-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Commercial deal signed with ${sp.name} (+€${sp.signingBonus}M bonus).`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Signed ${sp.name} (+€${sp.signingBonus}M)!` };
}

export function promoteYouthPlayer(
  career: CareerState,
  playerId: string
): { career: CareerState; ok: boolean; message: string } {
  if (career.squad.length >= 24) {
    return { career, ok: false, message: 'First-team squad limit (24 players) reached.' };
  }
  const idx = career.youthAcademy.findIndex((p) => p.id === playerId);
  if (idx === -1) return { career, ok: false, message: 'Youth prospect not found.' };

  const next: CareerState = JSON.parse(JSON.stringify(career));
  const prospect = next.youthAcademy.splice(idx, 1)[0];
  next.squad.push(prospect);
  next.weeklyWageBill = next.squad.reduce((sum, p) => sum + p.wage, 0);
  next.newsFeed.unshift({
    id: `yth-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Youth graduate ${prospect.name} (${prospect.age}yo, ${prospect.overall} OVR) promoted to Senior Squad.`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Promoted ${prospect.name} to Senior Squad!` };
}

export function upgradeStaffMember(
  career: CareerState,
  role: keyof CareerStaffLevels
): { career: CareerState; ok: boolean; message: string } {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  const staff = { ...DEFAULT_STAFF_LEVELS, ...(next.staffLevels ?? {}) };
  const current = staff[role];
  if (current >= 5) {
    return { career, ok: false, message: `${role.toUpperCase()} department is already at Max Level 5.` };
  }
  const cost = getStaffUpgradeCost(current);
  if (next.budget < cost) {
    return { career, ok: false, message: `Insufficient budget (€${cost}M required to upgrade ${role}).` };
  }
  next.budget = Number((next.budget - cost).toFixed(1));
  staff[role] = current + 1;
  next.staffLevels = staff;
  next.newsFeed.unshift({
    id: `stf-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Club upgraded ${role.toUpperCase()} staff to Level ${staff[role]} (-€${cost}M).`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `${role.toUpperCase()} upgraded to Lv.${staff[role]}!` };
}

export function scoutPlayer(
  career: CareerState,
  playerId: string
): { career: CareerState; ok: boolean; message: string } {
  const revealed = career.revealedPlayerIds ?? [];
  if (revealed.includes(playerId)) {
    return { career, ok: false, message: 'Scout report already unlocked for this player.' };
  }
  const scoutFee = 0.5;
  if (career.budget < scoutFee) {
    return { career, ok: false, message: 'Insufficient budget (€0.5M required for scouting dossier).' };
  }
  const next: CareerState = JSON.parse(JSON.stringify(career));
  next.budget = Number((next.budget - scoutFee).toFixed(1));
  next.revealedPlayerIds = [...(next.revealedPlayerIds ?? []), playerId];
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: 'Full Scout Dossier unlocked (-€0.5M)!' };
}

export function claimSponsorTarget(
  career: CareerState,
  targetId: string
): { career: CareerState; ok: boolean; message: string } {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  const targets = next.sponsorTargets ?? generateSponsorTargets();
  const tgt = targets.find((t) => t.id === targetId);
  if (!tgt) return { career, ok: false, message: 'Sponsor target not found.' };
  if (tgt.claimed) return { career, ok: false, message: 'Bonus already claimed.' };
  if (tgt.currentValue < tgt.targetValue) {
    return { career, ok: false, message: 'Objective not yet met.' };
  }
  tgt.claimed = true;
  next.sponsorTargets = targets;
  next.budget = Number((next.budget + tgt.bonusAmount).toFixed(1));
  next.newsFeed.unshift({
    id: `st-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Sponsor Bonus Claimed: ${tgt.title} (+€${tgt.bonusAmount}M)!`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Claimed +€${tgt.bonusAmount}M sponsor bonus!` };
}

export function acceptInternationalOffer(
  career: CareerState,
  offerId: string
): { career: CareerState; ok: boolean; message: string } {
  const offers = career.internationalOffers ?? generateInternationalOffers();
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) return { career, ok: false, message: 'International offer not found.' };
  const next: CareerState = JSON.parse(JSON.stringify(career));
  next.activeNationId = offer.nationId;
  next.budget = Number((next.budget + offer.salaryBonus).toFixed(1));
  next.newsFeed.unshift({
    id: `nat-${Date.now()}`,
    week: next.league.currentRound,
    headline: `DUAL ROLE: Manager appointed Head Coach of ${offer.nationName} (+€${offer.salaryBonus}M signing bonus).`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Appointed ${offer.nationName} Manager!` };
}

export function buyTransferPlayer(
  career: CareerState,
  listing: TransferListing
): { career: CareerState; ok: boolean; message: string } {
  const scoutLevel = career.staffLevels?.scout ?? 1;
  const effectivePrice = Number((listing.askingPrice * getScoutDiscountFactor(scoutLevel)).toFixed(1));
  if (career.budget < effectivePrice) {
    return { career, ok: false, message: 'Insufficient transfer budget.' };
  }
  if (career.squad.length >= 24) {
    return { career, ok: false, message: 'Squad limit (24 players) reached.' };
  }

  const next: CareerState = JSON.parse(JSON.stringify(career));
  next.budget = Number((next.budget - effectivePrice).toFixed(1));
  const signed: Player = {
    ...listing.player,
    id: `${next.clubId}-signed-${Date.now()}`,
    contractYears: 3,
    fitness: 96,
  };
  next.squad.push(signed);
  next.weeklyWageBill = next.squad.reduce((sum, p) => sum + p.wage, 0);
  next.transferMarket = next.transferMarket.filter((l) => l.player.id !== listing.player.id);
  next.newsFeed.unshift({
    id: `n-${Date.now()}`,
    week: next.league.currentRound,
    headline: `${signed.name} (${signed.overall} OVR) signed for €${effectivePrice}M.`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Signed ${signed.name} for €${effectivePrice}M!` };
}

export function sellSquadPlayer(
  career: CareerState,
  playerId: string
): { career: CareerState; ok: boolean; message: string } {
  if (career.squad.length <= 12) {
    return { career, ok: false, message: 'Cannot drop below 12 players.' };
  }
  const idx = career.squad.findIndex((p) => p.id === playerId);
  if (idx === -1) return { career, ok: false, message: 'Player not found.' };

  const next: CareerState = JSON.parse(JSON.stringify(career));
  const sold = next.squad.splice(idx, 1)[0];
  next.budget = Number((next.budget + sold.marketValue).toFixed(1));
  next.weeklyWageBill = next.squad.reduce((sum, p) => sum + p.wage, 0);
  next.newsFeed.unshift({
    id: `n-${Date.now()}`,
    week: next.league.currentRound,
    headline: `Sold ${sold.name} for €${sold.marketValue}M.`,
  });
  next.updatedAt = new Date().toISOString();
  return { career: next, ok: true, message: `Sold ${sold.name} for €${sold.marketValue}M.` };
}

export function renewPlayerContract(
  career: CareerState,
  playerId: string
): { career: CareerState; ok: boolean; message: string } {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  const p = next.squad.find((x) => x.id === playerId);
  if (!p) return { career, ok: false, message: 'Player not found.' };
  const signingFee = Number((p.wage * 0.05).toFixed(1));
  if (next.budget < signingFee) return { career, ok: false, message: 'Insufficient budget for renewal bonus.' };

  next.budget = Number((next.budget - signingFee).toFixed(1));
  p.contractYears = Math.min(5, p.contractYears + 2);
  p.wage = Math.round(p.wage * 1.08);
  next.weeklyWageBill = next.squad.reduce((sum, pl) => sum + pl.wage, 0);
  return { career: next, ok: true, message: `${p.name} extended for +2 years.` };
}

export function advanceCareerWeek(
  career: CareerState,
  userFixtureId: string,
  homeGoals: number,
  awayGoals: number,
  teamsMap: Record<string, Team>,
  injuriesEnabled: boolean,
  goalScorers?: { playerId: string; playerName: string; teamId: string; minute: number }[]
): CareerState {
  const next: CareerState = JSON.parse(JSON.stringify(career));

  next.league = recordLeagueFixtureResult(next.league, userFixtureId, homeGoals, awayGoals, teamsMap, goalScorers);
  next.league = simulateLeagueRoundAI(next.league, teamsMap);

  const fixture = next.league.fixtures.find((f) => f.id === userFixtureId);
  const userWon =
    fixture &&
    ((fixture.homeTeamId === next.clubId && homeGoals > awayGoals) ||
      (fixture.awayTeamId === next.clubId && awayGoals > homeGoals));
  const userDrew = homeGoals === awayGoals;

  const activeSponsor = (next.sponsors ?? []).find((s) => s.id === next.activeSponsorId);
  const sponsorIncome = activeSponsor
    ? activeSponsor.weeklyIncome + (userWon ? activeSponsor.winBonus : 0)
    : 0;

  const prizeMoney = userWon ? 1.8 : userDrew ? 0.9 : 0.4;
  const wageCostM = next.weeklyWageBill / 1000;
  next.budget = Math.max(0, Number((next.budget + prizeMoney + sponsorIncome - wageCostM).toFixed(2)));

  const userIsHome = fixture?.homeTeamId === next.clubId;
  const userGoals = fixture ? (userIsHome ? homeGoals : awayGoals) : 0;
  const userConceded = fixture ? (userIsHome ? awayGoals : homeGoals) : 0;

  // Update Sponsor Targets
  const targets = next.sponsorTargets ?? generateSponsorTargets();
  for (const tgt of targets) {
    if (tgt.targetType === 'wins' && userWon) tgt.currentValue++;
    if (tgt.targetType === 'goals') tgt.currentValue += userGoals;
    if (tgt.targetType === 'clean-sheets' && userConceded === 0) tgt.currentValue++;
  }
  next.sponsorTargets = targets;

  const staff = { ...DEFAULT_STAFF_LEVELS, ...(next.staffLevels ?? {}) };
  const growthChance = 0.25 + (staff.coach - 1) * 0.1;
  const strainRisk = Math.max(0.01, 0.045 - (staff.medical - 1) * 0.008);
  const arrows: FormArrow[] = ['down-cold', 'down', 'flat', 'up', 'up-hot'];

  for (const p of next.squad) {
    if (p.injuredWeeks > 0) {
      const healStep = staff.medical >= 3 ? 2 : 1;
      p.injuredWeeks = Math.max(0, p.injuredWeeks - healStep);
      p.fitness = Math.min(100, p.fitness + 10 + staff.medical * 2);
      p.morale = Math.max(45, (p.morale ?? 80) - 2);
      p.formArrow = 'down';
      continue;
    }

    p.fitness = Math.max(
      68,
      Math.min(100, p.fitness - (next.trainingFocus === 'fitness' ? 1 : 5) + 4 + (staff.medical - 1))
    );

    const moraleDelta = userWon ? 4 : userDrew ? 1 : -3;
    p.morale = Math.max(40, Math.min(99, (p.morale ?? 80) + moraleDelta));
    const formScore = Math.min(
      4,
      Math.max(0, Math.round(((p.morale ?? 80) / 25) + (userWon ? 0.6 : -0.4) + (p.fitness > 86 ? 0.5 : 0)))
    );
    p.formArrow = arrows[formScore] ?? 'flat';

    if (p.age <= 25 && Math.random() < growthChance) {
      if (next.trainingFocus === 'attack') p.attributes.shooting = Math.min(99, p.attributes.shooting + 1);
      if (next.trainingFocus === 'passing') p.attributes.passing = Math.min(99, p.attributes.passing + 1);
      if (next.trainingFocus === 'defense') p.attributes.defending = Math.min(99, p.attributes.defending + 1);
      p.overall = Math.min(96, p.overall + (Math.random() < 0.3 + staff.coach * 0.08 ? 1 : 0));
    }

    if (injuriesEnabled && p.fitness < 74 && Math.random() < strainRisk) {
      p.injuredWeeks = 2;
      next.newsFeed.unshift({
        id: `inj-${Date.now()}-${p.id}`,
        week: next.league.currentRound,
        headline: `Medical update: ${p.name} sidelined for 2 weeks with a muscle strain.`,
      });
    }
  }

  if (next.league.completed) {
    const standings = computeLeagueStandings(next.league, teamsMap);
    const pos = standings.findIndex((s) => s.teamId === next.clubId) + 1;
    next.objectives = next.objectives.map((o) => ({
      ...o,
      completed: pos > 0 && pos <= o.targetPosition,
    }));
    if (pos === 1) {
      next.trophiesWon++;
      next.budget = Number((next.budget + 25).toFixed(1));
      next.newsFeed.unshift({
        id: `champ-${Date.now()}`,
        week: next.league.totalRounds,
        headline: `CHAMPIONS! Finished #1 in the league (+€25M prize bonus).`,
      });
    }
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export function createRegenFromRetired(
  retired: Player,
  clubId: string,
  seasonNumber: number,
  youthLevel = 1
): Player {
  const baseOvr = Math.min(78, Math.max(67, Math.round(retired.overall * 0.78) + (youthLevel - 1) * 2));
  const boost = (val: number) => Math.max(45, Math.min(86, Math.round(val * 0.8) + (youthLevel - 1) * 2));
  return {
    id: `${clubId}-regen-s${seasonNumber}-${retired.id}`,
    name: `${retired.name.split(' ')[0]} ${retired.shortName} Jr.`,
    shortName: retired.shortName,
    number: retired.number,
    position: retired.position,
    nationality: retired.nationality,
    age: 17,
    overall: baseOvr,
    attributes: {
      pace: Math.min(90, boost(retired.attributes.pace) + 6),
      shooting: boost(retired.attributes.shooting),
      passing: boost(retired.attributes.passing),
      dribbling: Math.min(89, boost(retired.attributes.dribbling) + 4),
      defending: boost(retired.attributes.defending),
      physical: Math.max(58, boost(retired.attributes.physical) - 4),
      goalkeeping: retired.position === 'GK' ? baseOvr : 18,
    },
    appearance: {
      ...retired.appearance,
      hairStyle: 'fade',
    },
    marketValue: Number((2.2 + (baseOvr - 66) * 0.45).toFixed(1)),
    wage: 4,
    contractYears: 4,
    fitness: 100,
    injuredWeeks: 0,
    isRegen: true,
    regenFrom: retired.name,
  };
}

export function startNextCareerSeason(career: CareerState, clubTeams: Team[]): CareerState {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  const staff = { ...DEFAULT_STAFF_LEVELS, ...(next.staffLevels ?? {}) };
  next.staffLevels = staff;
  next.seasonNumber++;
  next.league = createLeague('Continental Premier League', next.clubId, clubTeams);

  const agedSquad = next.squad.map((p) => ({
    ...p,
    age: p.age + 1,
    contractYears: Math.max(1, p.contractYears - 1),
    fitness: 98,
    injuredWeeks: 0,
  }));

  // Veteran Retirement & Youth Rebirth (Regen) system
  const regens: Player[] = [];
  const retainedSquad: Player[] = [];
  for (const p of agedSquad) {
    const shouldRetire = p.age >= 34 && agedSquad.length - regens.length > 13;
    if (shouldRetire) {
      const regen = createRegenFromRetired(p, next.clubId, next.seasonNumber, staff.youth);
      regens.push(regen);
      next.newsFeed.unshift({
        id: `ret-${next.seasonNumber}-${p.id}`,
        week: 1,
        headline: `RETIREMENT & REBIRTH: Veteran ${p.name} (Age ${p.age}) retired — reborn in Youth Academy at Age 17 (${regen.overall} OVR)!`,
      });
    } else {
      retainedSquad.push(p);
    }
  }

  next.squad = retainedSquad;
  next.weeklyWageBill = next.squad.reduce((sum, p) => sum + p.wage, 0);
  next.transferMarket = buildTransferMarket(clubTeams, next.clubId);
  next.youthAcademy = [
    ...regens,
    ...generateYouthAcademy(next.clubId, next.seasonNumber, staff.youth),
  ];
  next.sponsors = generateSponsors();
  next.activeSponsorId = undefined;
  next.objectives = next.objectives.map((o) => ({ ...o, completed: false }));
  next.newsFeed.unshift({
    id: `s-${next.seasonNumber}`,
    week: 1,
    headline: `Season ${next.seasonNumber} kicks off! ${regens.length > 0 ? `${regens.length} legend regen(s) & ` : ''}new youth academy intake & sponsors available.`,
  });
  next.updatedAt = new Date().toISOString();
  return next;
}
