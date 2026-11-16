import React, { useEffect, useRef, useState } from 'react';
import {
  CameraPreset,
  GameSettings,
  MatchConfig,
  MatchSummary,
  ReplayCameraPreset,
  Team,
} from '../types/football';
import { FootballSimulation, ReplayFrame, SimulationSnapshot } from '../game/engine/Simulation';
import { InputManager } from '../game/controls/inputManager';
import { StadiumSceneController } from '../game/renderer/StadiumScene';
import { soundEngine } from '../game/audio/soundEngine';
import { MatchHUD } from '../components/MatchHUD';

interface MatchLiveScreenProps {
  config: MatchConfig;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onFinishMatch: (summary: MatchSummary) => void;
  onExitMatch: () => void;
}

export const MatchLiveScreen: React.FC<MatchLiveScreenProps> = ({
  config,
  settings,
  onUpdateSettings,
  onFinishMatch,
  onExitMatch,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<FootballSimulation | null>(null);
  const sceneRef = useRef<StadiumSceneController | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const pausedRef = useRef<boolean>(false);

  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [matchNonce, setMatchNonce] = useState(0);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset>(
    config.preferredCameraPreset ?? settings.cameraPreset
  );

  // Replay Theater state
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayFrames, setReplayFrames] = useState<ReplayFrame[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState<0.25 | 0.5 | 1 | 2>(0.5);
  const [replayCamera, setReplayCamera] = useState<ReplayCameraPreset>('director');

  useEffect(() => {
    setActiveCameraPreset(config.preferredCameraPreset ?? settings.cameraPreset);
  }, [config, settings.cameraPreset]);

  useEffect(() => {
    pausedRef.current = isPaused || replayOpen;
    if (snapshot?.phase === 'fulltime') {
      document.body.dataset.state = 'gameover';
    } else if (isPaused || replayOpen) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [isPaused, replayOpen, snapshot?.phase]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const enableWalkout = config.mode !== 'training' && config.mode !== 'practice';
    const sim = new FootballSimulation(config, {
      offsideRule: settings.offsideRule,
      speedScale: settings.gameSpeed,
      enableWalkout,
    });
    simRef.current = sim;
    setSnapshot(sim.getSnapshot());
    setIsPaused(false);
    setReplayOpen(false);
    setReplayFrames([]);
    pausedRef.current = false;
    document.body.dataset.state = 'playing';

    const inputMgr = new InputManager(settings.keyBindings);
    inputRef.current = inputMgr;
    inputMgr.setPauseHandler(() => {
      setReplayOpen(false);
      setIsPaused((prev) => {
        const next = !prev;
        pausedRef.current = next;
        inputMgr.clearAll();
        return next;
      });
    });
    const detachInput = inputMgr.attach();

    soundEngine.setVolumes(settings.sfxVolume, settings.crowdVolume);

    const initialCam = config.preferredCameraPreset ?? settings.cameraPreset;
    const controller = new StadiumSceneController({
      container,
      stadium: config.stadium,
      weather: config.weather ?? 'clear',
      cursorColor: settings.cursorColor,
      graphicsQuality: settings.graphicsQuality,
      resolutionScale: settings.resolutionScale,
      cameraPreset: initialCam,
      cameraDistance: settings.cameraDistance,
      cameraHeight: settings.cameraHeight,
      simulation: sim,
      inputManager: inputMgr,
      onSnapshot: (snap) => setSnapshot(snap),
      pausedRef,
    });
    sceneRef.current = controller;

    return () => {
      detachInput();
      soundEngine.stopCrowdBed();
      controller.dispose();
      sceneRef.current = null;
      simRef.current = null;
      inputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchNonce, config]);

  useEffect(() => {
    inputRef.current?.updateBindings(settings.keyBindings);
    sceneRef.current?.updateSettings(
      activeCameraPreset,
      settings.cameraDistance,
      settings.cameraHeight,
      settings.cursorColor
    );
    soundEngine.setVolumes(settings.sfxVolume, settings.crowdVolume);
  }, [settings, activeCameraPreset]);

  // Dynamic stadium crowd chant & ambient noise bed
  useEffect(() => {
    if (!snapshot) return;
    soundEngine.updateCrowdBed(
      snapshot.crowdIntensity,
      config.importance ?? 'friendly',
      isPaused || replayOpen || snapshot.phase === 'fulltime'
    );
  }, [snapshot?.crowdIntensity, snapshot?.phase, config.importance, isPaused, replayOpen, muted]);

  // Keyboard shortcuts for walkout skip (Enter) & wall jump (Space)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim || isPaused || replayOpen) return;
      if (e.key === 'Enter' && sim.phase === 'walkout') {
        e.preventDefault();
        sim.skipWalkout();
        setSnapshot(sim.getSnapshot());
      } else if (e.code === 'Space' && sim.phase === 'free-kick') {
        const snap = sim.getSnapshot();
        if (snap.isDefendingFreeKick) {
          e.preventDefault();
          sim.jumpWall();
          setSnapshot(sim.getSnapshot());
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, replayOpen]);

  // Replay Theater frame playback & camera state sync
  useEffect(() => {
    if (!replayOpen) {
      sceneRef.current?.setReplayState({
        active: false,
        frame: null,
        cameraPreset: replayCamera,
        elapsed: 0,
      });
      return;
    }

    const frame = replayFrames[replayIndex] ?? null;
    sceneRef.current?.setReplayState({
      active: true,
      frame,
      cameraPreset: replayCamera,
      elapsed: replayIndex * 0.05,
    });
  }, [replayOpen, replayFrames, replayIndex, replayCamera]);

  useEffect(() => {
    if (!replayOpen || !replayPlaying || replayFrames.length <= 1) return;
    const intervalMs = Math.max(20, Math.round(50 / replaySpeed));
    const id = window.setInterval(() => {
      setReplayIndex((prev) => (prev + 1) % replayFrames.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [replayOpen, replayPlaying, replaySpeed, replayFrames.length]);

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      pausedRef.current = next || replayOpen;
      inputRef.current?.clearAll();
      return next;
    });
  };

  const handleToggleMute = () => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
    if (soundEngine.muted) {
      soundEngine.stopCrowdBed();
    }
  };

  const handleOpenReplay = () => {
    const sim = simRef.current;
    if (!sim) return;
    const frames = sim.getReplayFrames().slice();
    if (frames.length === 0) return;
    setReplayFrames(frames);
    setReplayIndex(0);
    setReplayPlaying(true);
    setIsPaused(false);
    setReplayOpen(true);
    inputRef.current?.clearAll();
  };

  const handleCloseReplay = () => {
    setReplayOpen(false);
    pausedRef.current = isPaused;
  };

  const handleUpdateTeams = (home: Team, _away: Team) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.setTeamFormation('home', home.tactics.formationId);
    sim.setTeamMentality('home', home.tactics.mentality);
    sim.homeTeam.tactics.compactness = home.tactics.compactness;
    sim.homeTeam.tactics.supportRange = home.tactics.supportRange;
    sim.homeTeam.tactics.lineHeight = home.tactics.lineHeight;
    sim.homeTeam.tactics.counterAttack = home.tactics.counterAttack;
    sim.homeTeam.tactics.attackingFormationId = home.tactics.attackingFormationId;
    sim.homeTeam.tactics.defendingFormationId = home.tactics.defendingFormationId;
    sim.homeTeam.tactics.manMarking = { ...(home.tactics.manMarking ?? {}) };
    sim.homeTeam.tactics.cornerRoutine = home.tactics.cornerRoutine;
    sim.homeTeam.tactics.freeKickRoutine = home.tactics.freeKickRoutine;

    for (const sp of sim.players) {
      if (sp.side === 'home') {
        const rp = home.roster.find((r) => r.id === sp.id);
        if (rp && rp.archetype) sp.archetype = rp.archetype;
      }
    }

    // Detect any substitution difference
    const oldXI = sim.homeTeam.startingXI;
    for (let i = 0; i < oldXI.length; i++) {
      if (oldXI[i] !== home.startingXI[i]) {
        const outId = oldXI[i];
        const inId = home.startingXI[i];
        if (sim.homeTeam.substitutes.includes(inId)) {
          sim.makeSubstitution('home', outId, inId);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#080d14] overflow-hidden">
      {/* Isolated WebGL canvas mount */}
      <div
        ref={mountRef}
        data-testid="match-canvas-container"
        className={`relative w-full h-full ${replayOpen ? 'replay-camera-grade' : ''}`}
      />

      {snapshot && inputRef.current && (
        <MatchHUD
          config={config}
          snapshot={snapshot}
          isPaused={isPaused}
          muted={muted}
          settings={settings}
          activeCameraPreset={activeCameraPreset}
          replayOpen={replayOpen}
          replayFrameCount={replayFrames.length || snapshot.replayCount}
          replayIndex={replayIndex}
          replayPlaying={replayPlaying}
          replaySpeed={replaySpeed}
          replayCamera={replayCamera}
          onTogglePause={handleTogglePause}
          onToggleMute={handleToggleMute}
          onRestartMatch={() => setMatchNonce((n) => n + 1)}
          onExitMatch={onExitMatch}
          onFinishMatch={onFinishMatch}
          onStartSecondHalf={() => {
            simRef.current?.startSecondHalf();
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onStartExtraTime={() => {
            simRef.current?.startExtraTime();
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onUpdateTeams={handleUpdateTeams}
          onChangeCamera={(preset: CameraPreset) => {
            setActiveCameraPreset(preset);
            if (!config.preferredCameraPreset) {
              onUpdateSettings({ ...settings, cameraPreset: preset });
            }
          }}
          onShootPenalty={(aimZ, power) => {
            simRef.current?.shootPenaltyShootout(aimZ, power);
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onSkipWalkout={() => {
            simRef.current?.skipWalkout();
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onAdvanceWall={() => {
            simRef.current?.advanceWall();
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onJumpWall={() => {
            simRef.current?.jumpWall();
            setSnapshot(simRef.current?.getSnapshot() ?? null);
          }}
          onOpenReplay={handleOpenReplay}
          onCloseReplay={handleCloseReplay}
          onToggleReplayPlay={() => setReplayPlaying((p) => !p)}
          onSeekReplay={(idx) => {
            setReplayPlaying(false);
            setReplayIndex(idx);
          }}
          onChangeReplaySpeed={setReplaySpeed}
          onChangeReplayCamera={setReplayCamera}
          touchState={inputRef.current.touchState}
        />
      )}
    </div>
  );
};
