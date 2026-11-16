import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppScreen,
  CareerState,
  GameSettings,
  LeagueState,
  MatchConfig,
  MatchSummary,
  PersistentSaveData,
  Team,
  TournamentState,
} from './types/football';
import { getAllTeams } from './data/teams';
import { STADIUMS } from './data/stadiums';
import {
  applyMatchSummaryToSave,
  clearAllSaveData,
  createInitialSaveData,
  loadSaveData,
  persistSaveData,
} from './saves/saveSystem';
import {
  advanceTournamentPhase,
  getFixtureWinner,
  simulateAIFixture,
} from './competitions/tournamentEngine';
import {
  recordLeagueFixtureResult,
  simulateLeagueRoundAI,
} from './competitions/leagueEngine';
import { advanceCareerWeek } from './career/careerEngine';
import { advanceLegendWeek } from './career/legendEngine';
import { StadiumBackground } from './components/StadiumBackground';
import { LoadingScreen } from './screens/LoadingScreen';
import { TitleScreen } from './screens/TitleScreen';
import { MainMenu } from './screens/MainMenu';
import { MatchSetupScreen } from './screens/MatchSetupScreen';
import { MatchLiveScreen } from './screens/MatchLiveScreen';
import { TournamentScreen } from './screens/TournamentScreen';
import { LeagueScreen } from './screens/LeagueScreen';
import { CareerScreen } from './screens/CareerScreen';
import { BecomeLegendScreen } from './screens/BecomeLegendScreen';
import { TeamManagementScreen } from './screens/TeamManagementScreen';
import { EditModeScreen } from './screens/EditModeScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { MatchHistoryScreen } from './screens/MatchHistoryScreen';
import { StatsRecordsScreen } from './screens/StatsRecordsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ControlsGuideScreen } from './screens/ControlsGuideScreen';
import { DataManagementScreen } from './screens/DataManagementScreen';
import { CreditsScreen } from './screens/CreditsScreen';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('main-menu');
  const [saveData, setSaveData] = useState<PersistentSaveData>(createInitialSaveData);
  const [activeMatch, setActiveMatch] = useState<MatchConfig | null>(null);

  // Load persisted data & support ?autostart=1
  useEffect(() => {
    let mounted = true;
    loadSaveData().then((loaded) => {
      if (!mounted) return;
      setSaveData(loaded);

      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const teams = getAllTeams(loaded.customTeams);
        setActiveMatch({
          mode: 'exhibition',
          homeTeam: teams[0],
          awayTeam: teams[1],
          homeKitType: 'home',
          awayKitType: 'away',
          stadium: STADIUMS[0],
          durationMinutes: loaded.settings.matchDurationMinutes,
          difficulty: loaded.settings.difficulty,
          allowExtraTime: false,
          allowPenalties: true,
        });
        setScreen('match-live');
      } else {
        setScreen('main-menu');
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync body state attribute for testability
  useEffect(() => {
    if (screen === 'title') {
      document.body.dataset.state = 'title';
    } else if (screen !== 'match-live') {
      document.body.dataset.state = 'menu';
    }
  }, [screen]);

  const commitSave = useCallback((updater: (prev: PersistentSaveData) => PersistentSaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleStartMatch = (config: MatchConfig) => {
    setActiveMatch(config);
    setScreen('match-live');
  };

  const handleFinishMatch = (summary: MatchSummary) => {
    const allTeams = getAllTeams(saveData.customTeams);
    const teamsMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));
    const ctx = activeMatch?.competitionContext;

    if (summary.mode === 'tournament' && saveData.activeTournament && ctx) {
      let nextT: TournamentState = JSON.parse(JSON.stringify(saveData.activeTournament));
      const isKnockout = nextT.phase !== 'group';
      nextT.fixtures = nextT.fixtures.map((f) => {
        if (f.id === ctx.fixtureId) {
          return {
            ...f,
            played: true,
            homeGoals: summary.homeGoals,
            awayGoals: summary.awayGoals,
            penalties: summary.penalties,
          };
        }
        if (!f.played && f.round === nextT.fixtures.find((x) => x.id === ctx.fixtureId)?.round) {
          return simulateAIFixture(f, teamsMap, isKnockout);
        }
        return f;
      });
      nextT = advanceTournamentPhase(nextT, teamsMap);
      const userWonCup = nextT.phase === 'completed' && nextT.championTeamId === nextT.userTeamId;
      commitSave((prev) => {
        const updated = applyMatchSummaryToSave(prev, summary);
        updated.activeTournament = nextT;
        updated.lastMode = 'tournament';
        if (userWonCup) updated.records.tournamentsWon++;
        return updated;
      });
      setActiveMatch(null);
      setScreen('tournament');
      return;
    }

    if (summary.mode === 'league' && saveData.activeLeague && ctx) {
      let nextL: LeagueState = recordLeagueFixtureResult(
        saveData.activeLeague,
        ctx.fixtureId,
        summary.homeGoals,
        summary.awayGoals,
        teamsMap,
        summary.goalEvents.map((g) => ({
          playerId: g.scorerId,
          playerName: g.scorerName,
          teamId: g.teamSide === 'home' ? summary.homeTeamId : summary.awayTeamId,
          minute: g.minute,
        }))
      );
      nextL = simulateLeagueRoundAI(nextL, teamsMap);
      const userWonLeague = nextL.completed && nextL.championTeamId === nextL.userTeamId;
      commitSave((prev) => {
        const updated = applyMatchSummaryToSave(prev, summary);
        updated.activeLeague = nextL;
        updated.lastMode = 'league';
        if (userWonLeague) updated.records.leaguesWon++;
        return updated;
      });
      setActiveMatch(null);
      setScreen('league');
      return;
    }

    if (summary.mode === 'career' && saveData.activeCareer && ctx) {
      const nextC: CareerState = advanceCareerWeek(
        saveData.activeCareer,
        ctx.fixtureId,
        summary.homeGoals,
        summary.awayGoals,
        teamsMap,
        saveData.settings.injuriesEnabled,
        summary.goalEvents.map((g) => ({
          playerId: g.scorerId,
          playerName: g.scorerName,
          teamId: g.teamSide === 'home' ? summary.homeTeamId : summary.awayTeamId,
          minute: g.minute,
        }))
      );
      commitSave((prev) => {
        const updated = applyMatchSummaryToSave(prev, summary);
        updated.activeCareer = nextC;
        updated.lastMode = 'career';
        return updated;
      });
      setActiveMatch(null);
      setScreen('career');
      return;
    }

    if (summary.mode === 'legend' && saveData.activeLegend && ctx) {
      const legendGoals =
        summary.legendEval?.goals ??
        summary.goalEvents.filter((g) => g.scorerId === saveData.activeLegend?.player.id).length;
      const legendAssists =
        summary.legendEval?.assists ??
        summary.goalEvents.filter((g) => g.assistName === saveData.activeLegend?.player.shortName).length;
      const nextLegend = advanceLegendWeek(
        saveData.activeLegend,
        ctx.fixtureId,
        summary.homeGoals,
        summary.awayGoals,
        legendGoals,
        legendAssists,
        teamsMap,
        summary.goalEvents.map((g) => ({
          playerId: g.scorerId,
          playerName: g.scorerName,
          teamId: g.teamSide === 'home' ? summary.homeTeamId : summary.awayTeamId,
          minute: g.minute,
        })),
        summary.legendEval?.rating
      );
      commitSave((prev) => {
        const updated = applyMatchSummaryToSave(prev, summary);
        updated.activeLegend = nextLegend;
        updated.lastMode = 'legend';
        return updated;
      });
      setActiveMatch(null);
      setScreen('become-legend');
      return;
    }

    // Exhibition or Training
    commitSave((prev) => applyMatchSummaryToSave(prev, summary));
    setActiveMatch(null);
    if (summary.mode === 'training') {
      setScreen('training');
    } else if (summary.mode === 'practice') {
      setScreen('practice-arena');
    } else {
      setScreen('main-menu');
    }
  };

  const handleExitMatch = () => {
    const mode = activeMatch?.mode;
    setActiveMatch(null);
    if (mode === 'tournament') setScreen('tournament');
    else if (mode === 'league') setScreen('league');
    else if (mode === 'career') setScreen('career');
    else if (mode === 'legend') setScreen('become-legend');
    else if (mode === 'training') setScreen('training');
    else if (mode === 'practice') setScreen('practice-arena');
    else setScreen('main-menu');
  };

  const handleContinueGame = () => {
    if (saveData.lastMode === 'career' && saveData.activeCareer) {
      setScreen('career');
    } else if (saveData.lastMode === 'legend' && saveData.activeLegend) {
      setScreen('become-legend');
    } else if (saveData.lastMode === 'tournament' && saveData.activeTournament) {
      setScreen('tournament');
    } else if (saveData.lastMode === 'league' && saveData.activeLeague) {
      setScreen('league');
    } else if (saveData.activeCareer) {
      setScreen('career');
    } else if (saveData.activeLegend) {
      setScreen('become-legend');
    } else if (saveData.activeTournament) {
      setScreen('tournament');
    } else if (saveData.activeLeague) {
      setScreen('league');
    }
  };

  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full relative bg-[#061229]">
      {/* Persistent Global Blurred Stadium Pitch & Floodlight Backdrop across all menu screens */}
      {screen !== 'match-live' && (
        <StadiumBackground
          stadium={STADIUMS[0]}
          cursorColor={saveData.settings.cursorColor}
          graphicsQuality={saveData.settings.graphicsQuality}
          resolutionScale={saveData.settings.resolutionScale}
          blurred={screen === 'main-menu'}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          onStart={() => setScreen('main-menu')}
          onQuickExhibition={() => {
            const teams = getAllTeams(saveData.customTeams);
            handleStartMatch({
              mode: 'exhibition',
              homeTeam: teams[0],
              awayTeam: teams[1],
              homeKitType: 'home',
              awayKitType: 'away',
              stadium: STADIUMS[0],
              durationMinutes: saveData.settings.matchDurationMinutes,
              difficulty: saveData.settings.difficulty,
              allowExtraTime: false,
              allowPenalties: true,
            });
          }}
        />
      )}

      {screen === 'main-menu' && (
        <MainMenu
          saveData={saveData}
          onNavigate={setScreen}
          onContinueGame={handleContinueGame}
          onExitToTitle={() => setScreen('title')}
          onQuickStart3DMatch={() => {
            const teams = getAllTeams(saveData.customTeams);
            handleStartMatch({
              mode: 'exhibition',
              homeTeam: teams[0],
              awayTeam: teams[1],
              homeKitType: 'home',
              awayKitType: 'away',
              stadium: STADIUMS[0],
              durationMinutes: saveData.settings.matchDurationMinutes,
              difficulty: saveData.settings.difficulty,
              allowExtraTime: false,
              allowPenalties: true,
            });
          }}
        />
      )}

      {screen === 'match-setup' && (
        <MatchSetupScreen
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'match-live' && activeMatch && (
        <MatchLiveScreen
          config={activeMatch}
          settings={saveData.settings}
          onUpdateSettings={(nextSettings: GameSettings) =>
            commitSave((prev) => ({ ...prev, settings: nextSettings }))
          }
          onFinishMatch={handleFinishMatch}
          onExitMatch={handleExitMatch}
        />
      )}

      {screen === 'tournament' && (
        <TournamentScreen
          tournament={saveData.activeTournament}
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          onUpdateTournament={(t) =>
            commitSave((prev) => ({
              ...prev,
              activeTournament: t,
              lastMode: t ? 'tournament' : prev.lastMode,
            }))
          }
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'league' && (
        <LeagueScreen
          league={saveData.activeLeague}
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          onUpdateLeague={(lg) =>
            commitSave((prev) => ({
              ...prev,
              activeLeague: lg,
              lastMode: lg ? 'league' : prev.lastMode,
            }))
          }
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'career' && (
        <CareerScreen
          career={saveData.activeCareer}
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          onUpdateCareer={(cr) =>
            commitSave((prev) => ({
              ...prev,
              activeCareer: cr,
              lastMode: cr ? 'career' : prev.lastMode,
            }))
          }
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'become-legend' && (
        <BecomeLegendScreen
          legend={saveData.activeLegend}
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          onUpdateLegend={(lg) =>
            commitSave((prev) => ({
              ...prev,
              activeLegend: lg,
              lastMode: lg ? 'legend' : prev.lastMode,
            }))
          }
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'team-management' && (
        <TeamManagementScreen
          customTeams={saveData.customTeams}
          onSaveTeam={(team: Team) =>
            commitSave((prev) => ({
              ...prev,
              customTeams: { ...prev.customTeams, [team.id]: team },
            }))
          }
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'edit-mode' && (
        <EditModeScreen
          customTeams={saveData.customTeams}
          onSaveTeam={(team: Team) =>
            commitSave((prev) => ({
              ...prev,
              customTeams: { ...prev.customTeams, [team.id]: team },
            }))
          }
          onResetTeam={(teamId: string) =>
            commitSave((prev) => {
              const nextCustom = { ...prev.customTeams };
              delete nextCustom[teamId];
              return { ...prev, customTeams: nextCustom };
            })
          }
          onBack={() => setScreen('main-menu')}
        />
      )}

      {(screen === 'training' || screen === 'practice-arena') && (
        <TrainingScreen
          mode={screen === 'practice-arena' ? 'practice' : 'training'}
          customTeams={saveData.customTeams}
          settings={saveData.settings}
          trainingMedals={saveData.trainingMedals}
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'community' && (
        <CommunityScreen
          saveData={saveData}
          customTeams={saveData.customTeams}
          onNavigate={setScreen}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'match-history' && (
        <MatchHistoryScreen
          history={saveData.matchHistory}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'stats-records' && (
        <StatsRecordsScreen
          saveData={saveData}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={saveData.settings}
          onUpdateSettings={(next) =>
            commitSave((prev) => ({ ...prev, settings: next }))
          }
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'controls-guide' && (
        <ControlsGuideScreen
          settings={saveData.settings}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'data-management' && (
        <DataManagementScreen
          saveData={saveData}
          onImportSave={(imported) => commitSave(() => imported)}
          onResetAll={async () => {
            const fresh = await clearAllSaveData();
            setSaveData(fresh);
          }}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'credits' && (
        <CreditsScreen onBack={() => setScreen('main-menu')} />
      )}
    </div>
  );
}
