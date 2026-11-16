import React, { useEffect, useRef, useState } from 'react';
import {
  Pause,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  LogOut,
  Sliders,
  Users,
  Medal,
  CloudRain,
  Snowflake,
  Film,
  SkipForward,
  Camera,
  ShieldAlert,
} from 'lucide-react';
import {
  CameraPreset,
  GameSettings,
  MatchConfig,
  MatchSummary,
  ReplayCameraPreset,
  Team,
} from '../types/football';
import { resolveTeamKit } from '../data/teams';
import { SimulationSnapshot } from '../game/engine/Simulation';
import { TouchInputState } from '../game/controls/inputManager';
import { HALF_LENGTH, HALF_WIDTH } from '../game/physics/pitchPhysics';
import { getDrillSpec } from '../game/training/trainingDrills';
import { FormationBoard } from './FormationBoard';

interface MatchHUDProps {
  config: MatchConfig;
  snapshot: SimulationSnapshot;
  isPaused: boolean;
  muted: boolean;
  settings: GameSettings;
  activeCameraPreset?: CameraPreset;
  replayOpen: boolean;
  replayFrameCount: number;
  replayIndex: number;
  replayPlaying: boolean;
  replaySpeed: 0.25 | 0.5 | 1 | 2;
  replayCamera: ReplayCameraPreset;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onRestartMatch: () => void;
  onExitMatch: () => void;
  onFinishMatch: (summary: MatchSummary) => void;
  onStartSecondHalf: () => void;
  onStartExtraTime: () => void;
  onUpdateTeams: (homeTeam: Team, awayTeam: Team) => void;
  onChangeCamera: (preset: CameraPreset) => void;
  onShootPenalty: (aimZ: number, power: number) => void;
  onSkipWalkout: () => void;
  onAdvanceWall: () => void;
  onJumpWall: () => void;
  onOpenReplay: () => void;
  onCloseReplay: () => void;
  onToggleReplayPlay: () => void;
  onSeekReplay: (idx: number) => void;
  onChangeReplaySpeed: (speed: 0.25 | 0.5 | 1 | 2) => void;
  onChangeReplayCamera: (cam: ReplayCameraPreset) => void;
  touchState: TouchInputState;
}

const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'wide', label: 'Wide' },
  { id: 'dynamic', label: 'Dynamic' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'stadium', label: 'Stadium' },
  { id: 'player-lock', label: 'Player Lock' },
];

const REPLAY_CAMERAS: { id: ReplayCameraPreset; label: string }[] = [
  { id: 'director', label: "Director's Cut" },
  { id: 'goalcam', label: 'Goalcam' },
  { id: 'sideline', label: 'Sideline' },
  { id: 'helicopter', label: 'Helicopter' },
];

export const MatchHUD: React.FC<MatchHUDProps> = ({
  config,
  snapshot,
  isPaused,
  muted,
  settings,
  activeCameraPreset,
  replayOpen,
  replayFrameCount,
  replayIndex,
  replayPlaying,
  replaySpeed,
  replayCamera,
  onTogglePause,
  onToggleMute,
  onRestartMatch,
  onExitMatch,
  onFinishMatch,
  onStartSecondHalf,
  onStartExtraTime,
  onUpdateTeams,
  onChangeCamera,
  onShootPenalty,
  onSkipWalkout,
  onAdvanceWall,
  onJumpWall,
  onOpenReplay,
  onCloseReplay,
  onToggleReplayPlay,
  onSeekReplay,
  onChangeReplaySpeed,
  onChangeReplayCamera,
  touchState,
}) => {
  const currentCam = activeCameraPreset ?? settings.cameraPreset;
  const drillSpec = getDrillSpec(config.trainingDrill);
  const [pauseTab, setPauseTab] = useState<'menu' | 'tactics' | 'camera'>('menu');
  const [halftimeTab, setHalftimeTab] = useState<'summary' | 'tactics'>('summary');
  const [editableHome, setEditableHome] = useState<Team>(config.homeTeam);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setEditableHome(config.homeTeam);
  }, [config.homeTeam]);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 820;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const showTouchControls =
    settings.mobileControlLayout === 'always-on' ||
    (settings.mobileControlLayout === 'auto' && isTouchDevice);

  const formatClock = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const totalPoss = snapshot.homeStats.possessionTicks + snapshot.awayStats.possessionTicks;
  const homePossPct = totalPoss > 0 ? Math.round((snapshot.homeStats.possessionTicks / totalPoss) * 100) : 50;
  const awayPossPct = 100 - homePossPct;
  const controlledStaminaCritical = snapshot.controlledPlayerStamina < 0.3;

  const homeKit = resolveTeamKit(config.homeTeam, config.homeKitType);
  const awayKit = resolveTeamKit(config.awayTeam, config.awayKitType);

  const buildSummary = (): MatchSummary => {
    const winnerScorers = snapshot.goalEvents;
    const motm =
      winnerScorers[0]?.scorerName ??
      config.homeTeam.roster[9]?.name ??
      config.homeTeam.roster[0]?.name ??
      'Captain';

    return {
      id: `match-${Date.now()}`,
      playedAt: new Date().toISOString(),
      mode: config.mode,
      competitionLabel: config.competitionContext?.label,
      homeTeamId: config.homeTeam.id,
      homeTeamName: config.homeTeam.name,
      homeShortCode: config.homeTeam.shortCode,
      awayTeamId: config.awayTeam.id,
      awayTeamName: config.awayTeam.name,
      awayShortCode: config.awayTeam.shortCode,
      homeGoals: snapshot.homeScore,
      awayGoals: snapshot.awayScore,
      penalties: snapshot.penaltyShootout
        ? { home: snapshot.penaltyShootout.homeScore, away: snapshot.penaltyShootout.awayScore }
        : undefined,
      homeStats: snapshot.homeStats,
      awayStats: snapshot.awayStats,
      goalEvents: snapshot.goalEvents,
      manOfTheMatch: motm,
      durationMinutes: config.durationMinutes,
      difficulty: config.difficulty,
      trainingResult:
        (config.mode === 'training' || config.mode === 'practice') && config.trainingDrill
          ? {
              drill: config.trainingDrill,
              score: snapshot.trainingScore,
              medal: snapshot.trainingMedal,
            }
          : undefined,
      legendEval: snapshot.legendEval ? { ...snapshot.legendEval } : undefined,
    };
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setStickOffset({ x: dx, y: dy });
    touchState.moveX = dx / maxR;
    touchState.moveZ = dy / maxR;
  };

  const resetJoystick = () => {
    setStickOffset({ x: 0, y: 0 });
    touchState.moveX = 0;
    touchState.moveZ = 0;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-3 md:p-5">
      {/* Top Row: FUTBOLL Broadcast Scorebug + Utility Controls */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex flex-col items-start gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="pointer-events-auto flex items-stretch rounded-sm overflow-hidden shadow-2xl border border-[#00E5FF]/65 shrink-0"
              style={{ backgroundColor: 'rgba(6, 18, 41, 0.94)' }}
              data-testid="match-scorebug"
            >
              <div className="hidden sm:flex items-center px-2.5 bg-gradient-to-b from-[#0B3B8C] to-[#061229] border-r border-white/15 text-[#00E5FF] font-display text-xs font-extrabold tracking-wider uppercase">
                WE12
              </div>
              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 bg-[#081938]">
                <span className="w-2.5 h-4 sm:w-3 sm:h-5 rounded-[2px] border border-white/35 shrink-0" style={{ backgroundColor: homeKit.primary }} />
                <span className="font-display text-sm sm:text-lg font-extrabold tracking-tight text-white">
                  {config.homeTeam.shortCode}
                </span>
              </div>

              {/* White Score Box */}
              <div
                className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-2 font-mono-tabular text-lg sm:text-2xl font-extrabold text-[#061229] bg-gradient-to-b from-white via-slate-50 to-slate-200 border-x border-slate-300"
              >
                <span data-testid="home-score">{snapshot.homeScore}</span>
                <span className="text-slate-400 text-sm sm:text-lg">-</span>
                <span data-testid="away-score">{snapshot.awayScore}</span>
              </div>

              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 bg-[#081938]">
                <span className="font-display text-sm sm:text-lg font-extrabold tracking-tight text-white">
                  {config.awayTeam.shortCode}
                </span>
                <span className="w-2.5 h-4 sm:w-3 sm:h-5 rounded-[2px] border border-white/35 shrink-0" style={{ backgroundColor: awayKit.primary }} />
              </div>

              {config.mode !== 'training' && config.mode !== 'practice' ? (
                <div className="flex items-stretch border-l border-emerald-400/50">
                  <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#050A0E] border-t-2 border-t-emerald-400 text-white flex items-center gap-1 sm:gap-1.5 font-mono-tabular text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    <span className="text-emerald-400">{snapshot.half <= 2 ? `${snapshot.half}H` : `ET${snapshot.half - 2}`}</span>
                    <span data-testid="match-clock">{formatClock(snapshot.matchClockSeconds)}</span>
                  </div>
                  <div className="px-2 py-1 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#04120B] font-mono-tabular text-xs font-extrabold flex items-center">
                    +2
                  </div>
                </div>
              ) : (
                <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500 text-slate-950 flex items-center font-display text-xs sm:text-sm font-bold uppercase whitespace-nowrap">
                  {drillSpec.graded ? `${drillSpec.title} · ${snapshot.trainingScore}` : `Training · ${snapshot.trainingScore}`}
                </div>
              )}
            </div>

            {snapshot.weather !== 'clear' && (
              <div
                data-testid="hud-weather-badge"
                className="pointer-events-auto px-2.5 py-1 rounded border border-sky-400/40 bg-[#0A0F1D]/90 flex items-center gap-1.5 text-[11px] font-bold uppercase text-sky-300"
              >
                {snapshot.weather === 'rain' ? <CloudRain className="w-3.5 h-3.5" /> : <Snowflake className="w-3.5 h-3.5" />}
                <span>{snapshot.weather}</span>
              </div>
            )}
          </div>

          {(config.mode === 'training' || config.mode === 'practice') && drillSpec.graded && (
            <div
              data-testid="training-hud-bar"
              className="pointer-events-auto rounded px-3 py-1.5 border border-[#FF6B00]/50 flex flex-wrap items-center gap-3 text-xs"
              style={{ backgroundColor: 'rgba(10, 15, 29, 0.92)' }}
            >
              <span className="font-mono-tabular font-bold text-[#FF8C00]">
                {snapshot.trainingMaxAttempts > 0
                  ? `Attempts: ${snapshot.trainingAttempts}/${snapshot.trainingMaxAttempts}`
                  : `Time: ${Math.ceil(snapshot.trainingTimeLeft)}s`}
              </span>
              <span className="font-mono-tabular font-bold text-white">Score: {snapshot.trainingScore}</span>
              <span className="font-mono-tabular text-[11px] text-slate-300">
                BRZ {drillSpec.bronze} · SLV {drillSpec.silver} · GLD {drillSpec.gold}
              </span>
            </div>
          )}

          {showTouchControls && (
            <div
              className="pointer-events-auto rounded px-2.5 py-1 border border-[#FF6B00]/45 min-w-[168px]"
              style={{ backgroundColor: 'rgba(10, 15, 29, 0.9)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-white truncate">
                  {snapshot.controlledPlayerName || 'Player'}
                </span>
                <span className="text-[10px] font-mono-tabular text-[#FF8C00] font-bold">
                  {Math.round(snapshot.controlledPlayerStamina * 100)}%
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-100 ${
                    controlledStaminaCritical ? 'bg-red-500 stamina-critical' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.round(snapshot.controlledPlayerStamina * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {snapshot.replayCount > 2 && !replayOpen && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Replay Theater"
              data-testid="open-replay-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenReplay();
              }}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded flex items-center gap-1.5 border border-[#FF6B00]/55 hover:border-[#FF8C00] text-[#FF8C00] hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer"
              style={{ backgroundColor: 'rgba(10, 15, 29, 0.92)' }}
            >
              <Film className="w-4 h-4" />
              <span className="hidden sm:inline">Replay</span>
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded flex items-center justify-center border border-white/15 hover:border-[#FF6B00] text-slate-200 hover:text-white cursor-pointer"
            style={{ backgroundColor: 'rgba(10, 15, 29, 0.9)' }}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Match"
            data-testid="pause-button"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded flex items-center justify-center border border-white/15 hover:border-[#FF6B00] text-slate-200 hover:text-white cursor-pointer"
            style={{ backgroundColor: 'rgba(10, 15, 29, 0.9)' }}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Broadcast Banner / Cutscenes / Set Piece & Wall Controls */}
      <div className="flex flex-col items-center justify-center gap-2.5">
        {!isPaused &&
          !replayOpen &&
          (snapshot.homeManagerReaction !== 'calm' || snapshot.awayManagerReaction !== 'calm') && (
            <div
              data-testid="manager-reaction-toast"
              className="px-4 py-1.5 rounded border border-amber-400/50 text-xs font-bold uppercase tracking-wider text-amber-200 shadow-lg"
              style={{ backgroundColor: 'rgba(10, 15, 29, 0.9)' }}
            >
              {snapshot.homeManagerReaction !== 'calm'
                ? `${config.homeTeam.shortCode} Manager: ${
                    snapshot.homeManagerReaction === 'applaud' ? 'Applauds From Touchline' : 'Frustrated on Touchline'
                  }`
                : `${config.awayTeam.shortCode} Manager: ${
                    snapshot.awayManagerReaction === 'applaud' ? 'Applauds From Touchline' : 'Frustrated on Touchline'
                  }`}
            </div>
          )}

        {snapshot.phase === 'walkout' && !isPaused && !replayOpen && (
          <div
            data-testid="walkout-banner"
            className="pointer-events-auto rounded-lg border border-[#FF6B00]/70 px-6 py-4 shadow-2xl flex flex-col sm:flex-row items-center gap-4"
            style={{ backgroundColor: 'rgba(10, 15, 29, 0.94)' }}
          >
            <div className="text-center sm:text-left">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#FF8C00]">
                FUTBOLL Matchday Broadcast · {config.stadium.name}
              </div>
              <div className="font-display text-2xl font-extrabold uppercase text-white mt-0.5">
                {config.homeTeam.name} vs {config.awayTeam.name}
              </div>
            </div>
            <button
              type="button"
              data-testid="skip-walkout-btn"
              onClick={onSkipWalkout}
              className="flex items-center gap-1.5 px-4 py-2 rounded we-accent-btn text-xs cursor-pointer shrink-0"
            >
              <SkipForward className="w-4 h-4" /> Skip Walkout [Enter]
            </button>
          </div>
        )}

        {snapshot.phase === 'card-cutscene' && snapshot.cardCutscene && !isPaused && !replayOpen && (
          <div
            data-testid="card-cutscene-banner"
            className="px-6 py-3 rounded-lg border border-white/25 shadow-2xl flex items-center gap-4"
            style={{ backgroundColor: 'rgba(10, 15, 29, 0.95)' }}
          >
            <div
              className={`w-6 h-8 rounded-sm border border-white/40 shadow-md ${
                snapshot.cardCutscene.card === 'red' ? 'bg-rose-500' : 'bg-amber-400'
              }`}
            />
            <div>
              <div
                className={`text-[11px] font-extrabold uppercase tracking-widest ${
                  snapshot.cardCutscene.card === 'red' ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {snapshot.cardCutscene.card === 'red' ? 'Red Card · Sent Off' : 'Yellow Card · Caution'}
              </div>
              <div className="font-display text-xl font-extrabold uppercase text-white">
                {snapshot.cardCutscene.playerName} (
                {snapshot.cardCutscene.side === 'home' ? config.homeTeam.shortCode : config.awayTeam.shortCode})
              </div>
            </div>
          </div>
        )}

        {snapshot.lastEventBanner && snapshot.phase !== 'walkout' && !replayOpen && (
          <div
            className="px-6 py-2 rounded border border-[#FF6B00] shadow-2xl"
            style={{ backgroundColor: 'rgba(10, 15, 29, 0.95)' }}
          >
            <span className="font-display text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-[#FF8C00]">
              {snapshot.lastEventBanner}
            </span>
          </div>
        )}

        {snapshot.trainingFeedback && (config.mode === 'training' || config.mode === 'practice') && (
          <div
            className="px-4 py-1.5 rounded border border-emerald-400/40 text-xs md:text-sm font-semibold text-emerald-200"
            style={{ backgroundColor: 'rgba(10, 20, 18, 0.88)' }}
          >
            {snapshot.trainingFeedback}
          </div>
        )}

        {!isPaused &&
          !replayOpen &&
          (snapshot.phase === 'free-kick' ||
            snapshot.phase === 'corner-kick' ||
            snapshot.phase === 'throw-in' ||
            snapshot.phase === 'goal-kick' ||
            snapshot.phase === 'penalty-kick') && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="px-4 py-1.5 rounded border border-[#FF6B00]/50 text-xs font-semibold text-slate-100"
                style={{ backgroundColor: 'rgba(10, 15, 29, 0.9)' }}
              >
                {snapshot.isDefendingFreeKick
                  ? 'Defending Free Kick · Time Your Wall Jump or Inch Forward'
                  : 'Set Piece Ready · Press Pass [J] or Shoot [L]'}
              </div>
              {snapshot.isDefendingFreeKick && (
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="wall-advance-btn"
                    onClick={onAdvanceWall}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-slate-900/95 hover:bg-slate-800 border border-amber-400/60 text-amber-200 text-xs font-bold uppercase cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Inch Wall Forward
                  </button>
                  <button
                    type="button"
                    data-testid="wall-jump-btn"
                    onClick={onJumpWall}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded we-accent-btn text-xs cursor-pointer"
                  >
                    Jump Wall [Space]
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Penalty Shootout Interactive Overlay */}
      {snapshot.phase === 'penalty-shootout' && snapshot.penaltyShootout && !snapshot.penaltyShootout.finished && (
        <div
          className="pointer-events-auto self-center w-full max-w-md rounded-lg border border-[#FF6B00]/60 p-4 shadow-2xl"
          style={{ backgroundColor: 'rgba(10, 15, 29, 0.95)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-bold uppercase text-[#FF8C00]">Penalty Shootout</span>
            <span className="font-mono-tabular text-sm font-bold text-white">
              {config.homeTeam.shortCode} {snapshot.penaltyShootout.homeScore} - {snapshot.penaltyShootout.awayScore}{' '}
              {config.awayTeam.shortCode}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{config.homeTeam.shortCode}:</span>
              {snapshot.penaltyShootout.homeResults.map((r, i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                    r === 'goal' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}
                >
                  {r === 'goal' ? 'O' : 'X'}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{config.awayTeam.shortCode}:</span>
              {snapshot.penaltyShootout.awayResults.map((r, i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                    r === 'goal' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}
                >
                  {r === 'goal' ? 'O' : 'X'}
                </span>
              ))}
            </div>
          </div>

          {snapshot.penaltyShootout.turn === 'home' ? (
            <div>
              <p className="text-xs text-slate-300 mb-2">Choose shot target:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onShootPenalty(-2.7, 0.82)}
                  className="py-2 rounded we-accent-btn text-xs cursor-pointer"
                >
                  Left Corner
                </button>
                <button
                  type="button"
                  onClick={() => onShootPenalty(0, 0.78)}
                  className="py-2 rounded we-accent-btn text-xs cursor-pointer"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => onShootPenalty(2.7, 0.82)}
                  className="py-2 rounded we-accent-btn text-xs cursor-pointer"
                >
                  Right Corner
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#FF8C00] text-center py-2">Opponent stepping up to the spot...</p>
          )}
        </div>
      )}

      {/* Bottom Row: Active Player Plates + Tactical Radar Minimap */}
      <div className="flex items-end justify-between gap-4">
        <div
          className={`${showTouchControls ? 'hidden' : 'block'} pointer-events-auto rounded-sm px-3.5 py-2.5 border border-[#00E5FF]/65 min-w-[252px] shadow-2xl`}
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 40%), linear-gradient(180deg, rgba(11, 59, 140, 0.92) 0%, rgba(6, 18, 41, 0.96) 100%)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-red-600 text-white font-mono-tabular text-[9px] font-black shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                ▼ P1
              </span>
              <span className="font-display text-base font-extrabold uppercase tracking-tight text-white truncate">
                {snapshot.controlledPlayerName || 'Player'}
              </span>
            </div>
            <span className={`text-[11px] font-mono-tabular font-extrabold shrink-0 ${
              controlledStaminaCritical ? 'text-red-400 stamina-critical' : 'text-[#00E5FF]'
            }`}>
              {Math.round(snapshot.controlledPlayerStamina * 100)}% STM
            </span>
          </div>
          {/* Stamina Bar (Green-to-Yellow Gradient) */}
          <div className="w-full h-2 bg-[#040B1A] border border-white/20 rounded-xs overflow-hidden mt-1.5 p-[1px]">
            <div
              className={`h-full transition-all duration-100 ${
                controlledStaminaCritical ? 'stamina-critical' : ''
              }`}
              style={{
                width: `${Math.round(snapshot.controlledPlayerStamina * 100)}%`,
                background: controlledStaminaCritical
                  ? '#ef4444'
                  : 'linear-gradient(90deg, #FACC15 0%, #84CC16 45%, #22C55E 100%)',
              }}
            />
          </div>
          {/* Curved Shot/Pass Power Gauge */}
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[9px] font-display font-bold uppercase text-cyan-200/90">
              <span>POWER GAUGE</span>
              <span className="font-mono-tabular text-[#00E5FF]">
                {Math.round((snapshot.shotCharge > 0.02 ? snapshot.shotCharge : 0.48) * 100)}%
              </span>
            </div>
            <svg viewBox="0 0 180 26" className="w-full h-6 overflow-visible">
              <path
                d="M 4 22 Q 88 4 176 14"
                fill="none"
                stroke="rgba(6, 18, 41, 0.9)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 4 22 Q 88 4 176 14"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={176}
                strokeDashoffset={
                  176 - 176 * (snapshot.shotCharge > 0.02 ? snapshot.shotCharge : 0.48)
                }
              />
            </svg>
          </div>
          {/* Subtle [L1] Change Player Prompt Indicator */}
          <div className="mt-1 pt-1 border-t border-white/15 flex items-center justify-between text-[9px] font-display font-bold uppercase text-cyan-100/90">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded-xs bg-slate-200 text-[#061229] font-mono-tabular font-black text-[8px]">
                L1
              </span>
              <span>Change Player</span>
            </span>
            <span className="text-red-300 font-mono-tabular">▽ Next Teammate</span>
          </div>
          {(snapshot.shielding || snapshot.teammateRunnerId) && (
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              {snapshot.shielding ? 'Shielding Ball' : 'R3 Teammate Run Active'}
            </div>
          )}
        </div>

        {/* Bottom-Center Tactical Radar Minimap */}
        <div
          className="hidden md:block relative w-52 h-32 rounded-sm border-2 border-[#00E5FF]/60 overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'rgba(8, 44, 34, 0.84)' }}
          aria-hidden="true"
        >
          <div className="absolute inset-1.5 border border-white/35 pointer-events-none">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/35" />
          </div>
          {snapshot.homePlayers.map((p) => {
            if (p.redCard) return null;
            const left = ((p.x + HALF_LENGTH) / (HALF_LENGTH * 2)) * 100;
            const top = ((p.z + HALF_WIDTH) / (HALF_WIDTH * 2)) * 100;
            return (
              <div
                key={p.id}
                className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                  p.isControlled
                    ? 'bg-red-500 ring-2 ring-white shadow-[0_0_8px_#EF4444]'
                    : p.teammateRunTimer > 0
                      ? 'bg-[#00E5FF] ring-1 ring-white'
                      : 'bg-white border border-[#061229]'
                }`}
                style={{ left: `${left}%`, top: `${top}%` }}
              />
            );
          })}
          {snapshot.awayPlayers.map((p) => {
            if (p.redCard) return null;
            const left = ((p.x + HALF_LENGTH) / (HALF_LENGTH * 2)) * 100;
            const top = ((p.z + HALF_WIDTH) / (HALF_WIDTH * 2)) * 100;
            return (
              <div
                key={p.id}
                className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 bg-amber-300 border border-[#061229]"
                style={{ left: `${left}%`, top: `${top}%` }}
              />
            );
          })}
          <div
            className="absolute w-3 h-3 rounded-full bg-yellow-300 border border-black -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_#FEF08A]"
            style={{
              left: `${((snapshot.ball.x + HALF_LENGTH) / (HALF_LENGTH * 2)) * 100}%`,
              top: `${((snapshot.ball.z + HALF_WIDTH) / (HALF_WIDTH * 2)) * 100}%`,
            }}
          />
        </div>

        {/* Bottom-Right Rival Player Plate + Key Hint */}
        <div
          className="hidden lg:flex flex-col items-end gap-1.5 rounded-sm px-3.5 py-2.5 border border-[#00E5FF]/65 min-w-[252px] shadow-2xl"
          style={{
            background:
              'linear-gradient(225deg, rgba(255,255,255,0.14) 0%, transparent 40%), linear-gradient(180deg, rgba(11, 59, 140, 0.92) 0%, rgba(6, 18, 41, 0.96) 100%)',
          }}
        >
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono-tabular text-amber-300 font-extrabold">
              84% STM
            </span>
            <span className="font-display text-base font-extrabold uppercase tracking-tight text-white truncate">
              {config.awayTeam.roster[9]?.shortName || config.awayTeam.shortCode}
            </span>
          </div>
          <div className="w-full h-2 bg-[#040B1A] border border-white/20 rounded-xs overflow-hidden p-[1px] flex justify-end">
            <div
              className="h-full"
              style={{
                width: '84%',
                background: 'linear-gradient(90deg, #22C55E 0%, #84CC16 55%, #FACC15 100%)',
              }}
            />
          </div>
          <div className="w-full">
            <svg viewBox="0 0 180 22" className="w-full h-5 overflow-visible scale-x-[-1]">
              <path
                d="M 4 18 Q 88 3 176 12"
                fill="none"
                stroke="rgba(6, 18, 41, 0.9)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 4 18 Q 88 3 176 12"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={176}
                strokeDashoffset={176 * 0.42}
              />
            </svg>
          </div>
          <div className="w-full pt-1 border-t border-white/15 flex items-center justify-between text-[9px] font-display font-bold uppercase text-cyan-100/90">
            <span className="text-cyan-300 font-mono-tabular">[R-STICK] Manual Switch</span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded-xs bg-slate-200 text-[#061229] font-mono-tabular font-black text-[8px]">
                L1
              </span>
              <span>Change Player</span>
            </span>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Touch Controls */}
      {showTouchControls &&
        !isPaused &&
        !snapshot.trainingCompleted &&
        snapshot.phase !== 'halftime' &&
        snapshot.phase !== 'extra-time-break' &&
        snapshot.phase !== 'fulltime' &&
        snapshot.phase !== 'penalty-shootout' &&
        snapshot.phase !== 'goal-celebration' && (
        <div
          className="fixed inset-x-0 px-4 flex items-end justify-between pointer-events-none z-30"
          style={{
            left: 'max(1rem, env(safe-area-inset-left))',
            right: 'max(1rem, env(safe-area-inset-right))',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          <div
            ref={joystickRef}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) handleJoystickMove(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) handleJoystickMove(t.clientX, t.clientY);
            }}
            onTouchEnd={resetJoystick}
            onTouchCancel={resetJoystick}
            aria-label="Directional analog stick"
            className="pointer-events-auto w-28 h-28 rounded-full border-2 border-white/30 flex items-center justify-center relative touch-none bg-slate-950/60 shadow-[0_0_18px_rgba(125,211,252,0.2)]"
            style={{ borderColor: 'rgba(186, 230, 253, 0.48)' }}
          >
            <div
              className="w-11 h-11 rounded-full bg-slate-500/90 border-2 border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.28)]"
              style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }}
            />
          </div>

          <div className="pointer-events-auto grid grid-cols-2 gap-2 touch-none">
            <button
              type="button"
              onTouchStart={() => (touchState.shortPass = true)}
              onTouchEnd={() => (touchState.shortPass = false)}
              onTouchCancel={() => (touchState.shortPass = false)}
              aria-label="Pass (J)"
              className="w-[58px] h-[58px] rounded-full border border-white/45 bg-slate-800/80 text-white text-[10px] font-extrabold tracking-wide shadow-[0_0_14px_rgba(125,211,252,0.28)] active:scale-90 active:bg-slate-500/90 touch-none"
            >
              <span className="block">PASS</span><span className="text-[8px] text-slate-300">J · X</span>
            </button>
            <button
              type="button"
              onTouchStart={() => {
                touchState.shoot = true;
                touchState.tackle = true;
              }}
              onTouchEnd={() => {
                touchState.shoot = false;
                touchState.tackle = false;
              }}
              onTouchCancel={() => {
                touchState.shoot = false;
                touchState.tackle = false;
              }}
              aria-label="Shoot (L)"
              className="w-[58px] h-[58px] rounded-full border border-white/45 bg-slate-800/80 text-white text-[10px] font-extrabold tracking-wide shadow-[0_0_14px_rgba(125,211,252,0.28)] active:scale-90 active:bg-slate-500/90 touch-none"
            >
              <span className="block">SHOOT</span><span className="text-[8px] text-slate-300">L · □</span>
            </button>
            <button
              type="button"
              onTouchStart={() => (touchState.throughPass = true)}
              onTouchEnd={() => (touchState.throughPass = false)}
              onTouchCancel={() => (touchState.throughPass = false)}
              aria-label="Through pass (I)"
              className="w-[58px] h-[58px] rounded-full border border-white/45 bg-slate-800/80 text-white text-[10px] font-extrabold tracking-wide shadow-[0_0_14px_rgba(125,211,252,0.28)] active:scale-90 active:bg-slate-500/90 touch-none"
            >
              <span className="block">THROUGH</span><span className="text-[8px] text-slate-300">I · △</span>
            </button>
            <button
              type="button"
              onTouchStart={() => (touchState.sprint = true)}
              onTouchEnd={() => (touchState.sprint = false)}
              onTouchCancel={() => (touchState.sprint = false)}
              aria-label="Sprint (K)"
              className="w-[58px] h-[58px] rounded-full border border-white/45 bg-slate-800/80 text-white text-[10px] font-extrabold tracking-wide shadow-[0_0_14px_rgba(125,211,252,0.28)] active:scale-90 active:bg-slate-500/90 touch-none"
            >
              <span className="block">SPRINT</span><span className="text-[8px] text-slate-300">K · R2</span>
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {isPaused && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 15, 0.8)' }}
        >
          <div className="broadcast-panel rounded-lg w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 pb-3 mb-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold uppercase text-white">Match Paused</h2>
                <p className="text-xs text-slate-400">
                  {config.homeTeam.name} {snapshot.homeScore} - {snapshot.awayScore} {config.awayTeam.name} ·{' '}
                  {formatClock(snapshot.matchClockSeconds)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPauseTab('menu')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                    pauseTab === 'menu' ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Menu
                </button>
                <button
                  type="button"
                  onClick={() => setPauseTab('tactics')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    pauseTab === 'tactics' ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Game Plan
                </button>
                <button
                  type="button"
                  onClick={() => setPauseTab('camera')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    pauseTab === 'camera' ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Camera
                </button>
              </div>
            </div>

            {pauseTab === 'menu' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="resume-match-btn"
                  onClick={onTogglePause}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded we-accent-btn text-sm cursor-pointer"
                >
                  <Play className="w-4 h-4" /> Resume Match
                </button>
                <button
                  type="button"
                  data-testid="pause-replay-btn"
                  disabled={replayFrameCount === 0}
                  onClick={onOpenReplay}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-[#FF6B00]/50 text-[#FF8C00] font-semibold text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  <Film className="w-4 h-4" /> Replay Theater ({replayFrameCount})
                </button>
                <button
                  type="button"
                  onClick={onRestartMatch}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Restart Match
                </button>
                <button
                  type="button"
                  data-testid="exit-match-btn"
                  onClick={onExitMatch}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-100 font-semibold text-sm cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Return to Top Menu
                </button>
              </div>
            )}

            {pauseTab === 'tactics' && (
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <FormationBoard
                  team={editableHome}
                  compact
                  onChangeTeam={(updated) => {
                    setEditableHome(updated);
                    onUpdateTeams(updated, config.awayTeam);
                  }}
                />
              </div>
            )}

            {pauseTab === 'camera' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeCamera(preset.id)}
                    className={`py-2.5 px-3 rounded text-xs font-bold uppercase border cursor-pointer ${
                      currentCam === preset.id
                        ? 'bg-[#FF6B00] text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {pauseTab !== 'menu' && (
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-end">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="flex items-center gap-2 py-2 px-5 rounded we-accent-btn text-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume Match
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HALFTIME REPORT MODAL */}
      {snapshot.phase === 'halftime' && !isPaused && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 15, 0.84)' }}
        >
          <div className="broadcast-panel rounded-lg w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold uppercase text-[#FF8C00]">Half-Time Report</h2>
                <p className="text-sm font-semibold text-white">
                  {config.homeTeam.name} {snapshot.homeScore} - {snapshot.awayScore} {config.awayTeam.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHalftimeTab('summary')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                    halftimeTab === 'summary' ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Match Stats
                </button>
                <button
                  type="button"
                  onClick={() => setHalftimeTab('tactics')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                    halftimeTab === 'tactics' ? 'we-tab-active' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Game Plan
                </button>
              </div>
            </div>

            {halftimeTab === 'summary' ? (
              <div className="space-y-2.5 text-sm">
                {[
                  ['Possession', `${homePossPct}%`, `${awayPossPct}%`],
                  [
                    'Shots (On Target)',
                    `${snapshot.homeStats.shots} (${snapshot.homeStats.shotsOnTarget})`,
                    `${snapshot.awayStats.shots} (${snapshot.awayStats.shotsOnTarget})`,
                  ],
                  [
                    'Passes Completed',
                    `${snapshot.homeStats.passesCompleted}/${snapshot.homeStats.passesAttempted}`,
                    `${snapshot.awayStats.passesCompleted}/${snapshot.awayStats.passesAttempted}`,
                  ],
                  ['Tackles Won', `${snapshot.homeStats.tackles}`, `${snapshot.awayStats.tackles}`],
                  [
                    'Fouls / Cards',
                    `${snapshot.homeStats.fouls} (${snapshot.homeStats.yellowCards}Y)`,
                    `${snapshot.awayStats.fouls} (${snapshot.awayStats.yellowCards}Y)`,
                  ],
                ].map(([label, hv, av]) => (
                  <div key={label} className="grid grid-cols-3 items-center py-1.5 border-b border-slate-800/80">
                    <span className="font-mono-tabular font-bold text-white">{hv}</span>
                    <span className="text-center text-xs text-slate-400 uppercase">{label}</span>
                    <span className="font-mono-tabular font-bold text-white text-right">{av}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto pr-1">
                <FormationBoard
                  team={editableHome}
                  compact
                  onChangeTeam={(updated) => {
                    setEditableHome(updated);
                    onUpdateTeams(updated, config.awayTeam);
                  }}
                />
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onStartSecondHalf}
                className="px-6 py-2.5 rounded we-accent-btn text-sm cursor-pointer"
              >
                Kick Off Second Half
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTRA TIME BREAK MODAL */}
      {snapshot.phase === 'extra-time-break' && !isPaused && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 15, 0.84)' }}
        >
          <div className="broadcast-panel rounded-lg w-full max-w-md p-6 text-center shadow-2xl">
            <h2 className="font-display text-3xl font-extrabold uppercase text-[#FF8C00] mb-2">Scores Level at 90&apos;</h2>
            <p className="text-sm text-slate-300 mb-5">
              {config.homeTeam.shortCode} {snapshot.homeScore} - {snapshot.awayScore} {config.awayTeam.shortCode}. Extra
              Time will now decide this contest.
            </p>
            <button type="button" onClick={onStartExtraTime} className="w-full py-3 rounded we-accent-btn text-sm cursor-pointer">
              Start Extra Time
            </button>
          </div>
        </div>
      )}

      {/* GRADED SKILL TRAINING COMPLETE MODAL */}
      {snapshot.trainingCompleted && !isPaused && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 15, 0.88)' }}
        >
          <div className="broadcast-panel rounded-lg w-full max-w-md p-6 text-center shadow-2xl space-y-4">
            <div className="flex justify-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                  snapshot.trainingMedal === 'gold'
                    ? 'bg-amber-400 text-slate-950 border-amber-200'
                    : snapshot.trainingMedal === 'silver'
                      ? 'bg-slate-300 text-slate-950 border-white'
                      : snapshot.trainingMedal === 'bronze'
                        ? 'bg-orange-700 text-amber-100 border-orange-400'
                        : 'bg-slate-800 text-slate-400 border-slate-600'
                }`}
              >
                <Medal className="w-8 h-8" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF8C00]">{drillSpec.title}</p>
              <h2 className="font-display text-3xl font-extrabold uppercase text-white mt-1">
                {snapshot.trainingMedal !== 'none'
                  ? `${snapshot.trainingMedal.toUpperCase()} MEDAL EARNED`
                  : 'DRILL COMPLETE'}
              </h2>
              <p className="font-mono-tabular text-2xl font-extrabold text-[#FF8C00] mt-2">
                Score: {snapshot.trainingScore}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular bg-[#0A0F1D] p-3 rounded border border-slate-800">
              <div>
                <div className="text-orange-300 font-bold">BRONZE</div>
                <div className="text-slate-300">{drillSpec.bronze}</div>
              </div>
              <div>
                <div className="text-slate-200 font-bold">SILVER</div>
                <div className="text-slate-300">{drillSpec.silver}</div>
              </div>
              <div>
                <div className="text-amber-300 font-bold">GOLD</div>
                <div className="text-slate-300">{drillSpec.gold}</div>
              </div>
            </div>
            <div className="flex gap-3 justify-center pt-1">
              <button
                type="button"
                onClick={onRestartMatch}
                className="px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold cursor-pointer"
              >
                Retry Drill
              </button>
              <button
                type="button"
                data-testid="training-finish-btn"
                onClick={() => onFinishMatch(buildSummary())}
                className="px-6 py-2.5 rounded we-accent-btn text-sm cursor-pointer"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-TIME RESULTS MODAL */}
      {snapshot.phase === 'fulltime' && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 15, 0.88)' }}
        >
          <div className="broadcast-panel rounded-lg w-full max-w-xl p-6 shadow-2xl">
            <div className="text-center border-b border-slate-700 pb-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF8C00] mb-1">Full Time Result</p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-right">
                  <div className="font-display text-2xl font-extrabold text-white">{config.homeTeam.name}</div>
                </div>
                <div className="font-display text-4xl font-extrabold text-[#FF8C00] tabular-nums px-4 py-1 rounded bg-[#0A0F1D] border border-[#FF6B00]/50">
                  {snapshot.homeScore} - {snapshot.awayScore}
                </div>
                <div className="text-left">
                  <div className="font-display text-2xl font-extrabold text-white">{config.awayTeam.name}</div>
                </div>
              </div>
              {snapshot.penaltyShootout && (
                <p className="text-xs text-sky-300 mt-2 font-mono-tabular">
                  Penalties: {snapshot.penaltyShootout.homeScore} - {snapshot.penaltyShootout.awayScore}
                </p>
              )}
            </div>

            {snapshot.legendEval && (
              <div
                data-testid="bal-match-eval"
                className="mb-4 p-3.5 rounded bg-[#0A0F1D] border border-[#FF6B00]/60 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase text-[#FF8C00]">Become a Legend Evaluation</div>
                  <div className="font-display text-lg font-extrabold text-white">{snapshot.legendEval.playerName}</div>
                  <div className="text-[11px] text-slate-300 font-mono-tabular mt-0.5">
                    {snapshot.legendEval.goals}G · {snapshot.legendEval.assists}A · {snapshot.legendEval.passesCompleted} Passes · {snapshot.legendEval.shotsOnTarget} SOT · {snapshot.legendEval.tacklesWon} Tackles
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded bg-gradient-to-b from-[#FF8C00] to-[#FF6B00] text-slate-950 text-center">
                  <div className="text-[10px] font-extrabold uppercase leading-none">Rating</div>
                  <div className="font-display text-2xl font-extrabold leading-tight font-mono-tabular">
                    {snapshot.legendEval.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            )}

            {snapshot.goalEvents.length > 0 && (
              <div className="mb-4 max-h-24 overflow-y-auto bg-slate-900/70 rounded p-2.5 text-xs space-y-1">
                {snapshot.goalEvents.map((g, i) => (
                  <div key={i} className="flex justify-between text-slate-200">
                    <span>
                      {g.teamSide === 'home' ? config.homeTeam.shortCode : config.awayTeam.shortCode} · {g.scorerName}
                    </span>
                    <span className="font-mono-tabular text-[#FF8C00]">{g.minute}&apos;</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 text-xs mb-5">
              {[
                ['Possession', `${homePossPct}%`, `${awayPossPct}%`],
                [
                  'Shots (On Target)',
                  `${snapshot.homeStats.shots} (${snapshot.homeStats.shotsOnTarget})`,
                  `${snapshot.awayStats.shots} (${snapshot.awayStats.shotsOnTarget})`,
                ],
                [
                  'Passes',
                  `${snapshot.homeStats.passesCompleted}/${snapshot.homeStats.passesAttempted}`,
                  `${snapshot.awayStats.passesCompleted}/${snapshot.awayStats.passesAttempted}`,
                ],
                [
                  'Corners / Fouls',
                  `${snapshot.homeStats.corners} / ${snapshot.homeStats.fouls}`,
                  `${snapshot.awayStats.corners} / ${snapshot.awayStats.fouls}`,
                ],
              ].map(([label, hv, av]) => (
                <div key={label} className="grid grid-cols-3 py-1 border-b border-slate-800/70">
                  <span className="font-mono-tabular font-bold text-white">{hv}</span>
                  <span className="text-center text-slate-400">{label}</span>
                  <span className="font-mono-tabular font-bold text-white text-right">{av}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              {config.mode === 'exhibition' && (
                <button
                  type="button"
                  onClick={onRestartMatch}
                  className="px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold cursor-pointer"
                >
                  Rematch
                </button>
              )}
              <button
                type="button"
                data-testid="fulltime-continue-btn"
                onClick={() => onFinishMatch(buildSummary())}
                className="px-6 py-2.5 rounded we-accent-btn text-sm cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* REPLAY THEATER BROADCAST OVERLAY */}
      {replayOpen && (
        <div
          data-testid="replay-theater-modal"
          className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 md:p-6"
        >
          <div className="absolute left-5 bottom-24 md:left-7 text-2xl md:text-3xl font-display font-black italic tracking-[0.18em] text-sky-100/85 drop-shadow-[0_0_12px_rgba(96,165,250,0.8)] [text-shadow:1px_1px_0_#334155,-1px_-1px_0_#e2e8f0]">
            REPLAY
          </div>
          {/* Top Broadcast Header */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 broadcast-panel rounded-lg px-4 py-2.5 border border-[#FF6B00]/60 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <Film className="w-5 h-5 text-[#FF8C00]" />
              <div>
                <div className="font-display text-lg font-extrabold uppercase tracking-wider text-white">
                  FUTBOLL Replay Theater
                </div>
                <div className="text-[11px] font-mono-tabular text-slate-300">
                  Frame {replayIndex + 1} / {Math.max(1, replayFrameCount)} · Speed {replaySpeed}x
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {REPLAY_CAMERAS.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  data-testid={`replay-cam-${cam.id}`}
                  onClick={() => onChangeReplayCamera(cam.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold uppercase border cursor-pointer ${
                    replayCamera === cam.id
                      ? 'bg-[#FF6B00] text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <Camera className="w-3 h-3" /> {cam.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Scrubber & Transport Controls */}
          <div className="pointer-events-auto broadcast-panel rounded-lg px-4 py-3 border border-slate-700/80 shadow-2xl space-y-2.5">
            <div className="flex items-center gap-3">
              <label htmlFor="replay-scrubber" className="sr-only">
                Replay Timeline
              </label>
              <input
                id="replay-scrubber"
                type="range"
                min={0}
                max={Math.max(0, replayFrameCount - 1)}
                value={replayIndex}
                onChange={(e) => onSeekReplay(Number(e.target.value))}
                className="w-full accent-[#FF6B00] cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="replay-play-toggle"
                  onClick={onToggleReplayPlay}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded we-accent-btn text-xs cursor-pointer"
                >
                  {replayPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {replayPlaying ? 'Pause' : 'Play'}
                </button>

                {([
                  { speed: 0.25, label: 'Slow-Mo' },
                  { speed: 0.5, label: '0.5x' },
                  { speed: 1, label: 'Play 1x' },
                  { speed: 2, label: 'Fast Forward' },
                ] as const).map(({ speed, label }) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => onChangeReplaySpeed(speed)}
                    className={`px-2.5 py-1.5 rounded text-xs font-mono-tabular font-bold border cursor-pointer ${
                      replaySpeed === speed
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                data-testid="close-replay-btn"
                onClick={onCloseReplay}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Exit Replay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
