import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Gamepad2,
  Pause,
  Play,
  Sliders,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { Team } from '../types/football';
import { soundEngine } from '../game/audio/soundEngine';
import {
  DEFAULT_LINK_FEINTS,
  DEFAULT_STRATEGY_SLOTS,
  PES2012_SKILL_CARDS,
  StrategySlotAssignment,
} from '../data/pes2012Content';
import { Pes2012EngineStudioModal } from './Pes2012EngineStudioModal';

export type ShowcaseViewMode = 'hud' | 'tactics';

interface BroadcastHudShowcaseProps {
  homeTeam: Team;
  awayTeam: Team;
  initialSubView?: ShowcaseViewMode;
  onBackToMenu: () => void;
  onLaunchPlayable3DMatch: () => void;
  onSaveTeam?: (team: Team) => void;
}

interface PitchPlayerData {
  id: string;
  num: number;
  name: string;
  pos: string;
  x: number; // 0..100
  y: number; // 0..100
  stamina: number;
  form: 'up' | 'diag-up' | 'flat';
  skin: string;
  hair: string;
  boot: string;
  skillCards: string[];
}

const HOME_PLAYERS_BASE: PitchPlayerData[] = [
  { id: 'h1', num: 1, name: 'V. VALDÉS', pos: 'GK', x: 8, y: 50, stamina: 94, form: 'flat', skin: '#e8b896', hair: '#1e1b18', boot: '#111827', skillCards: ['S01'] },
  { id: 'h2', num: 2, name: 'DANI ALVES', pos: 'RB', x: 35, y: 84, stamina: 88, form: 'up', skin: '#c68642', hair: '#111827', boot: '#facc15', skillCards: ['P04', 'P07'] },
  { id: 'h3', num: 3, name: 'G. PIQUÉ', pos: 'CB', x: 24, y: 63, stamina: 86, form: 'diag-up', skin: '#f1c29b', hair: '#3f2e21', boot: '#f8fafc', skillCards: ['P16', 'S01'] },
  { id: 'h4', num: 5, name: 'C. PUYOL', pos: 'CB', x: 23, y: 37, stamina: 85, form: 'up', skin: '#e5b591', hair: '#292018', boot: '#111827', skillCards: ['P02'] },
  { id: 'h5', num: 22, name: 'É. ABIDAL', pos: 'LB', x: 31, y: 16, stamina: 83, form: 'flat', skin: '#7a4b2a', hair: '#0f172a', boot: '#38bdf8', skillCards: ['P02'] },
  { id: 'h6', num: 16, name: 'S. BUSQUETS', pos: 'DMF', x: 43, y: 50, stamina: 89, form: 'diag-up', skin: '#ecc19c', hair: '#1e1b18', boot: '#111827', skillCards: ['P02', 'S01'] },
  { id: 'h7', num: 6, name: 'XAVI', pos: 'CMF', x: 55, y: 65, stamina: 91, form: 'up', skin: '#f1c29b', hair: '#1c1917', boot: '#00E5FF', skillCards: ['P01', 'P06', 'S01'] },
  { id: 'h8', num: 8, name: 'A. INIESTA', pos: 'AMF', x: 58, y: 35, stamina: 87, form: 'up', skin: '#f5d0b5', hair: '#27272a', boot: '#f8fafc', skillCards: ['P03', 'P05', 'S01'] },
  { id: 'h9', num: 17, name: 'PEDRO', pos: 'RWF', x: 73, y: 80, stamina: 82, form: 'diag-up', skin: '#e2b18f', hair: '#1c1917', boot: '#fb923c', skillCards: ['P09', 'S01'] },
  { id: 'h10', num: 10, name: 'L. MESSI', pos: 'SS', x: 66, y: 49, stamina: 86, form: 'up', skin: '#f1c29b', hair: '#291d14', boot: '#f43f5e', skillCards: ['P03', 'P05', 'S01', 'S05'] },
  { id: 'h11', num: 7, name: 'D. VILLA', pos: 'LWF', x: 74, y: 20, stamina: 80, form: 'diag-up', skin: '#e8b896', hair: '#18181b', boot: '#facc15', skillCards: ['P12', 'S02'] },
];

const AWAY_PLAYERS_BASE: PitchPlayerData[] = [
  { id: 'a1', num: 1, name: 'I. CASILLAS', pos: 'GK', x: 92, y: 50, stamina: 95, form: 'up', skin: '#e8b896', hair: '#1c1917', boot: '#f8fafc', skillCards: ['S01'] },
  { id: 'a2', num: 17, name: 'Á. ARBELOA', pos: 'RB', x: 76, y: 18, stamina: 84, form: 'flat', skin: '#e8b896', hair: '#292524', boot: '#111827', skillCards: ['P02'] },
  { id: 'a3', num: 4, name: 'S. RAMOS', pos: 'CB', x: 79, y: 38, stamina: 88, form: 'up', skin: '#e5b591', hair: '#452c1e', boot: '#f8fafc', skillCards: ['P16'] },
  { id: 'a4', num: 3, name: 'PEPE', pos: 'CB', x: 79, y: 62, stamina: 87, form: 'diag-up', skin: '#c68642', hair: '#0f172a', boot: '#ef4444', skillCards: ['P02'] },
  { id: 'a5', num: 12, name: 'MARCELO', pos: 'LB', x: 72, y: 82, stamina: 85, form: 'up', skin: '#b87a4b', hair: '#0f172a', boot: '#38bdf8', skillCards: ['P03', 'P04'] },
  { id: 'a6', num: 14, name: 'XABI ALONSO', pos: 'DMF', x: 64, y: 44, stamina: 89, form: 'up', skin: '#f1c29b', hair: '#5c3a21', boot: '#111827', skillCards: ['P06', 'S06'] },
  { id: 'a7', num: 6, name: 'S. KHEDIRA', pos: 'CMF', x: 65, y: 60, stamina: 86, form: 'flat', skin: '#e0ac69', hair: '#18181b', boot: '#f8fafc', skillCards: ['P08'] },
  { id: 'a8', num: 22, name: 'Á. DI MARÍA', pos: 'RMF', x: 52, y: 22, stamina: 81, form: 'diag-up', skin: '#e5b591', hair: '#0f172a', boot: '#fb923c', skillCards: ['P03', 'S02'] },
  { id: 'a9', num: 10, name: 'M. ÖZIL', pos: 'AMF', x: 50, y: 52, stamina: 79, form: 'up', skin: '#f1c29b', hair: '#18181b', boot: '#00E5FF', skillCards: ['P01', 'P06'] },
  { id: 'a10', num: 7, name: 'C. RONALDO', pos: 'LWF', x: 46, y: 76, stamina: 84, form: 'up', skin: '#d9a17c', hair: '#111827', boot: '#f97316', skillCards: ['P04', 'P09', 'S05', 'S15'] },
  { id: 'a11', num: 9, name: 'K. BENZEMA', pos: 'CF', x: 42, y: 48, stamina: 83, form: 'diag-up', skin: '#e0ac69', hair: '#18181b', boot: '#38bdf8', skillCards: ['P12', 'S01'] },
];

/**
 * Lifelike Human Footballer SVG Figure on the Broadcast Pitch
 */
const HumanFootballerFigure: React.FC<{
  player: PitchPlayerData;
  side: 'home' | 'away';
  phase: number;
  isControlled?: boolean;
  isNextSwitch?: boolean;
  isTeammateRunner?: boolean;
  onClick?: () => void;
}> = ({ player, side, phase, isControlled, isNextSwitch, isTeammateRunner, onClick }) => {
  const isGK = player.pos === 'GK';
  const stride = Math.sin((phase + player.num * 17) * 0.22) * 3.5;

  const primaryShirt = isGK
    ? side === 'home'
      ? '#10B981'
      : '#F59E0B'
    : side === 'home'
      ? '#A50044'
      : '#FFFFFF';
  const secondaryShirt = isGK
    ? '#061229'
    : side === 'home'
      ? '#004D98'
      : '#FEBE10';
  const shortsColor = isGK ? '#0f172a' : side === 'home' ? '#004D98' : '#FFFFFF';
  const socksColor = isGK ? '#10B981' : side === 'home' ? '#A50044' : '#FFFFFF';

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center cursor-pointer group select-none"
    >
      {/* =====================================================================
          1. ACTIVE PLAYER CURSOR (P1): SOLID BRIGHT RED INVERTED TRIANGLE + NAME TAG
         ===================================================================== */}
      {isControlled && (
        <div
          data-testid="active-player-cursor-p1"
          className="flex flex-col items-center -mt-12 mb-0.5 z-30 pointer-events-none"
        >
          <div className="px-2 py-0.5 rounded-xs bg-[#061229]/95 border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)] flex items-center gap-1">
            <span className="px-1 rounded-[1px] bg-red-600 text-[8px] font-mono-tabular font-black text-white leading-tight">
              P1
            </span>
            <span className="font-display text-[10px] font-extrabold uppercase tracking-tight text-white whitespace-nowrap">
              {player.name}
            </span>
          </div>
          {/* Bright Red Inverted Triangle */}
          <svg viewBox="0 0 24 18" className="w-4 h-3.5 mt-0.5 drop-shadow-[0_0_8px_#EF4444]">
            <polygon
              points="2,2 22,2 12,16"
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
          </svg>
        </div>
      )}

      {/* =====================================================================
          2. NEXT-PLAYER SWITCH INDICATOR: HOLLOW / SEMI-TRANSPARENT RED OUTLINE TRIANGLE
         ===================================================================== */}
      {!isControlled && isNextSwitch && (
        <div
          data-testid="next-player-switch-indicator"
          className="flex flex-col items-center -mt-10 mb-0.5 z-20 pointer-events-none"
        >
          <span className="px-1.5 py-0.2 rounded-xs bg-[#061229]/80 border border-red-400/60 text-[8px] font-display font-bold uppercase text-red-300 whitespace-nowrap">
            [L1] {player.name}
          </span>
          {/* Hollow / Semi-Transparent Red Outline Inverted Triangle */}
          <svg viewBox="0 0 24 18" className="w-4 h-3.5 mt-0.5 drop-shadow-[0_0_6px_rgba(239,68,68,0.75)]">
            <polygon
              points="2,2 22,2 12,16"
              fill="rgba(239, 68, 68, 0.18)"
              stroke="#EF4444"
              strokeWidth="2.4"
            />
          </svg>
        </div>
      )}

      {/* R3 Manual Teammate Control Run Indicator */}
      {!isControlled && !isNextSwitch && isTeammateRunner && (
        <div className="flex flex-col items-center -mt-8 mb-0.5 z-20 pointer-events-none">
          <span className="px-1.5 py-0.2 rounded-xs bg-cyan-500/25 border border-[#00E5FF] text-[8px] font-display font-bold uppercase text-[#00E5FF] whitespace-nowrap">
            [R3] RUN
          </span>
        </div>
      )}

      {/* Human Footballer Anatomical SVG Sprite */}
      <svg viewBox="0 0 44 62" className="w-9 h-12 sm:w-10 sm:h-14 overflow-visible">
        {/* Pitch Contact Shadow */}
        <ellipse cx="22" cy="57" rx="12" ry="4" fill="rgba(0,0,0,0.55)" />

        {/* Active Player Ground Target Ring */}
        {isControlled && (
          <ellipse
            cx="22"
            cy="57"
            rx="15"
            ry="5.2"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
          />
        )}
        {!isControlled && isNextSwitch && (
          <ellipse
            cx="22"
            cy="57"
            rx="14"
            ry="4.8"
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.4"
            strokeDasharray="3 2"
          />
        )}

        {/* Left Leg (Thigh + Calf Sock + Studded Boot) */}
        <g transform={`translate(0, ${stride * 0.4})`}>
          <rect x="14.5" y="36" width="5" height="8" rx="2" fill={player.skin} />
          <rect x="14.5" y="43" width="5" height="10" rx="2" fill={socksColor} stroke="#061229" strokeWidth="0.6" />
          <rect x="14.5" y="44" width="5" height="2" fill={secondaryShirt} />
          <ellipse cx="16.5" cy="54" rx="4" ry="2.2" fill={player.boot} />
        </g>

        {/* Right Leg (Thigh + Calf Sock + Studded Boot) */}
        <g transform={`translate(0, ${-stride * 0.4})`}>
          <rect x="24.5" y="36" width="5" height="8" rx="2" fill={player.skin} />
          <rect x="24.5" y="43" width="5" height="10" rx="2" fill={socksColor} stroke="#061229" strokeWidth="0.6" />
          <rect x="24.5" y="44" width="5" height="2" fill={secondaryShirt} />
          <ellipse cx="27.5" cy="54" rx="4" ry="2.2" fill={player.boot} />
        </g>

        {/* Athletic Shorts */}
        <path
          d="M13 28 H31 L30 38 H23.5 L22 34 L20.5 38 H14 Z"
          fill={shortsColor}
          stroke="#0f172a"
          strokeWidth="0.8"
        />

        {/* Left Arm (Sleeve + Skin Forearm + Hand) */}
        <g transform={`rotate(${stride * 3}, 12, 18)`}>
          <rect x="8" y="16" width="4.8" height="7" rx="2" fill={primaryShirt} />
          <rect x="7.5" y="22" width="4" height="8" rx="1.8" fill={player.skin} />
          <circle cx="9.5" cy="31" r="2.1" fill={player.skin} />
        </g>

        {/* Right Arm (Sleeve + Skin Forearm + Hand) */}
        <g transform={`rotate(${-stride * 3}, 32, 18)`}>
          <rect x="31.2" y="16" width="4.8" height="7" rx="2" fill={primaryShirt} />
          <rect x="32.5" y="22" width="4" height="8" rx="1.8" fill={player.skin} />
          <circle cx="34.5" cy="31" r="2.1" fill={player.skin} />
        </g>

        {/* Contoured Human Torso / Football Jersey */}
        <path
          d="M12 15 C12 13.5 16 13 22 13 C28 13 32 13.5 32 15 L30.5 29 H13.5 Z"
          fill={primaryShirt}
          stroke="#0f172a"
          strokeWidth="0.9"
        />
        {/* Kit Stripe / Trim Detail */}
        {!isGK && side === 'home' && (
          <>
            <rect x="16.5" y="13.5" width="3.5" height="15" fill={secondaryShirt} />
            <rect x="24" y="13.5" width="3.5" height="15" fill={secondaryShirt} />
          </>
        )}
        {!isGK && side === 'away' && (
          <rect x="14" y="15" width="16" height="2" fill={secondaryShirt} />
        )}

        {/* Jersey Number */}
        <text
          x="22"
          y="24.5"
          textAnchor="middle"
          fill={side === 'home' ? '#FACC15' : '#061229'}
          fontSize="8.5"
          fontWeight="900"
          fontFamily="JetBrains Mono, monospace"
        >
          {player.num}
        </text>

        {/* Neck & Sculpted Human Head + Hair */}
        <rect x="19.5" y="10.5" width="5" height="3.5" rx="1" fill={player.skin} />
        <ellipse cx="22" cy="7.2" rx="5.4" ry="6" fill={player.skin} stroke="#0f172a" strokeWidth="0.6" />
        {/* Facial Eyes & Brow */}
        <circle cx="20.2" cy="7" r="0.8" fill="#0f172a" />
        <circle cx="23.8" cy="7" r="0.8" fill="#0f172a" />
        {/* Hair */}
        <path
          d="M16.5 6.8 C16.5 2.2 27.5 2.2 27.5 6.8 C26 4.6 18 4.6 16.5 6.8 Z"
          fill={player.hair}
        />
      </svg>
    </div>
  );
};

/**
 * Curved Shot / Pass Power Gauge Component (PES 2012 Broadcast Arc)
 */
const CurvedPowerGauge: React.FC<{
  power: number; // 0..100
  label: string;
  align: 'left' | 'right';
}> = ({ power, label, align }) => {
  const clamped = Math.max(0, Math.min(100, power));
  const arcLength = 196;
  const dashOffset = arcLength - (arcLength * clamped) / 100;
  const gradId = `powerGrad-${align}`;

  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'} mt-1.5`}>
      <div className="w-full flex items-center justify-between text-[10px] font-display font-bold uppercase tracking-wider text-cyan-200/90 mb-0.5">
        <span>{label}</span>
        <span className="font-mono-tabular text-[#00E5FF] font-extrabold">{Math.round(clamped)}%</span>
      </div>
      <div className="relative w-[210px] h-[34px]">
        <svg
          viewBox="0 0 210 36"
          className={`w-full h-full overflow-visible ${align === 'right' ? 'scale-x-[-1]' : ''}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="45%" stopColor="#22C55E" />
              <stop offset="78%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <filter id={`glow-${align}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M 8 28 Q 102 4 202 17"
            fill="none"
            stroke="rgba(6, 18, 41, 0.95)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 8 28 Q 102 4 202 17"
            fill="none"
            stroke="rgba(148, 197, 255, 0.2)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M 8 28 Q 102 4 202 17"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            filter={`url(#glow-${align})`}
            style={{ transition: 'stroke-dashoffset 80ms linear' }}
          />
          {[42, 82, 122, 162].map((xPos, idx) => (
            <line
              key={idx}
              x1={xPos}
              y1={11 + idx * 1.1}
              x2={xPos}
              y2={22 + idx * 1.1}
              stroke="rgba(6, 18, 41, 0.85)"
              strokeWidth="1.6"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export const BroadcastHudShowcase: React.FC<BroadcastHudShowcaseProps> = ({
  homeTeam,
  awayTeam,
  initialSubView = 'hud',
  onBackToMenu,
  onLaunchPlayable3DMatch,
}) => {
  const [subView, setSubView] = useState<ShowcaseViewMode>(initialSubView);
  const [broadcastStyle, setBroadcastStyle] = useState<'pes2012' | 'ucl' | 'libertadores'>('pes2012');
  const [homeScore, setHomeScore] = useState(2);
  const [awayScore, setAwayScore] = useState(1);
  const [clockRunning, setClockRunning] = useState(false);
  const [extraSeconds, setExtraSeconds] = useState(0);
  const [stoppageMinutes] = useState(2);

  // Active Controlled Player (P1) & Next-Player Switch Indicator ([L1] / Right Stick)
  const [homePlayerIdx, setHomePlayerIdx] = useState(9); // #10 L. MESSI
  const [teammateRunnerIdx, setTeammateRunnerIdx] = useState(8); // #17 PEDRO (R3 Teammate Control)
  const [teammateMode, setTeammateMode] = useState<'ASSISTED' | 'MANUAL'>('ASSISTED');
  const [awayPlayerIdx, setAwayPlayerIdx] = useState(9); // #7 C. RONALDO

  const [homePower, setHomePower] = useState(74);
  const [awayPower, setAwayPower] = useState(58);
  const [isCharging, setIsCharging] = useState(false);
  const [actionLabel, setActionLabel] = useState<'SHOT POWER GAUGE' | 'THROUGH PASS GAUGE' | 'PANENKA CHIP L1'>(
    'SHOT POWER GAUGE'
  );
  const [goalToast, setGoalToast] = useState<string | null>(null);
  const [commentaryLine, setCommentaryLine] = useState<string>(
    "Jon Champion: \"Messi picks it up in space—Xavi is showing for the return pass just ahead of him!\""
  );
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [tickPhase, setTickPhase] = useState(0);

  // PES 2012 Locomotion, Overlap AI, Jockey & PS3 Shader States
  const [knockOnBoost, setKnockOnBoost] = useState(0);
  const [overlapRunActive, setOverlapRunActive] = useState(true);
  const [jockeyContainActive, setJockeyContainActive] = useState(true);
  const [goldenHourLighting, setGoldenHourLighting] = useState(false);
  const [engineStudioOpen, setEngineStudioOpen] = useState(false);

  // Game Plan / Tactics interactive state
  const [lineup, setLineup] = useState<PitchPlayerData[]>(HOME_PLAYERS_BASE);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(9);
  const [swapSourceIdx, setSwapSourceIdx] = useState<number | null>(null);
  const [formationPreset, setFormationPreset] = useState<'4-3-3' | '4-2-3-1' | '3-4-3'>('4-3-3');
  const [strategySlots, setStrategySlots] = useState<StrategySlotAssignment[]>(DEFAULT_STRATEGY_SLOTS);
  const [supportRange, setSupportRange] = useState(76);
  const [compactness, setCompactness] = useState(82);
  const [defensiveLine, setDefensiveLine] = useState(68);

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTickPhase((p) => (p + 1) % 360);
      if (clockRunning) {
        setExtraSeconds((s) => (s + 1) % 120);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [clockRunning]);

  useEffect(() => {
    if (!isCharging) return;
    const id = window.setInterval(() => {
      setHomePower((prev) => (prev >= 98 ? 18 : prev + 6));
    }, 45);
    return () => window.clearInterval(id);
  }, [isCharging]);

  // Dynamic animated positions
  const animatedHomePlayers = HOME_PLAYERS_BASE.map((p, idx) => {
    const wave = (tickPhase + idx * 29) * 0.08;
    const dx = p.pos === 'GK' ? Math.sin(wave) * 0.7 : Math.sin(wave) * 2.5;
    const dy = p.pos === 'GK' ? Math.cos(wave) * 1.0 : Math.cos(wave * 0.9) * 2.2;
    return {
      ...p,
      x: Math.max(5, Math.min(93, p.x + dx)),
      y: Math.max(10, Math.min(90, p.y + dy)),
    };
  });

  const animatedAwayPlayers = AWAY_PLAYERS_BASE.map((p, idx) => {
    const wave = (tickPhase + idx * 33) * 0.08;
    const dx = p.pos === 'GK' ? Math.cos(wave) * 0.7 : Math.cos(wave) * 2.4;
    const dy = p.pos === 'GK' ? Math.sin(wave) * 1.0 : Math.sin(wave * 0.85) * 2.1;
    return {
      ...p,
      x: Math.max(7, Math.min(95, p.x + dx)),
      y: Math.max(10, Math.min(90, p.y + dy)),
    };
  });

  const activeHomePlayer = animatedHomePlayers[homePlayerIdx] ?? animatedHomePlayers[9];
  const activeAwayPlayer = animatedAwayPlayers[awayPlayerIdx] ?? animatedAwayPlayers[9];

  // Compute nearest teammate to Active Controlled Player (P1) for the Hollow Red Next-Player Switch Indicator
  const nextSwitchPlayerIdx = React.useMemo(() => {
    let bestIdx = (homePlayerIdx + 1) % animatedHomePlayers.length;
    let bestDist = Infinity;
    animatedHomePlayers.forEach((candidate, idx) => {
      if (idx === homePlayerIdx || candidate.pos === 'GK') return;
      const dist = Math.hypot(candidate.x - activeHomePlayer.x, candidate.y - activeHomePlayer.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [animatedHomePlayers, activeHomePlayer.x, activeHomePlayer.y, homePlayerIdx]);

  const nextSwitchPlayer = animatedHomePlayers[nextSwitchPlayerIdx] ?? animatedHomePlayers[6];

  const handlePressL1ChangePlayer = () => {
    soundEngine.unlock();
    soundEngine.playMenuClick(700);
    const target = nextSwitchPlayer;
    setHomePlayerIdx(nextSwitchPlayerIdx);
    const line = `Cursor switched to #${target.num} ${target.name} (${target.pos}) via [L1] Change Player!`;
    setCommentaryLine(`Jon Champion: "${target.name} takes control in midfield—looking for an opening!"`);
    if (voiceEnabled) {
      soundEngine.announceEvent(line);
    }
  };

  const handleTriggerR3TeammateRun = () => {
    soundEngine.unlock();
    soundEngine.playMenuClick(740);
    const nextRunner = (teammateRunnerIdx + 1) % HOME_PLAYERS_BASE.length;
    const validRunner = nextRunner === homePlayerIdx || nextRunner === 0 ? 10 : nextRunner;
    setTeammateRunnerIdx(validRunner);
    const runner = HOME_PLAYERS_BASE[validRunner];
    setCommentaryLine(
      `Jim Beglin: "Look at that off-the-ball dart from ${runner.name}! Classic PES 2012 R3 Teammate Control (${teammateMode})."`
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyL') {
        setIsCharging(true);
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        handlePressL1ChangePlayer();
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        handleTriggerR3TeammateRun();
      } else if (e.code === 'Escape') {
        onBackToMenu();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyL') {
        setIsCharging(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSwitchPlayerIdx, homePlayerIdx, teammateRunnerIdx, onBackToMenu]);

  const ballX = activeHomePlayer.x + 2.4 + knockOnBoost + Math.cos(tickPhase * 0.14) * 1.4;
  const ballY = activeHomePlayer.y + 1.2 + Math.sin(tickPhase * 0.14) * 1.2;

  const handleKnockOnSprint = () => {
    soundEngine.unlock();
    soundEngine.playMenuClick(780);
    setKnockOnBoost(7.5);
    setCommentaryLine(
      `Jon Champion: "${activeHomePlayer.name} hits the Knock-On Sprint [Double R1]—pushing the ball well ahead into space!"`
    );
    window.setTimeout(() => setKnockOnBoost(0), 1600);
  };

  const formattedClock = clockRunning
    ? `${45 + Math.floor(extraSeconds / 60)}:${String(extraSeconds % 60).padStart(2, '0')}`
    : '45:00';

  const handleTriggerGoal = (side: 'home' | 'away') => {
    soundEngine.unlock();
    soundEngine.playMenuClick(840);
    if (side === 'home') {
      setHomeScore((s) => s + 1);
      const msg = `GOAL! ${activeHomePlayer.num} ${activeHomePlayer.name} (BAR) — 45'+2`;
      setGoalToast(msg);
      setCommentaryLine(
        `Jon Champion: "GOOOAL! ${activeHomePlayer.name} buries it into the top corner in stoppage time!"`
      );
      if (voiceEnabled) soundEngine.announceEvent('goal', activeHomePlayer.name);
    } else {
      setAwayScore((s) => s + 1);
      const msg = `GOAL! ${activeAwayPlayer.num} ${activeAwayPlayer.name} (RMA) — 45'+2`;
      setGoalToast(msg);
      setCommentaryLine(
        `Jon Champion: "What a thunderbolt from ${activeAwayPlayer.name}! Real Madrid strike back!"`
      );
      if (voiceEnabled) soundEngine.announceEvent('goal', activeAwayPlayer.name);
    }
    window.setTimeout(() => setGoalToast(null), 3200);
  };

  const applyFormationPreset = (preset: '4-3-3' | '4-2-3-1' | '3-4-3') => {
    soundEngine.playMenuClick(660);
    setFormationPreset(preset);
    if (preset === '4-3-3') {
      setLineup(HOME_PLAYERS_BASE);
    } else if (preset === '4-2-3-1') {
      setLineup(
        HOME_PLAYERS_BASE.map((p, idx) => {
          if (idx === 6) return { ...p, pos: 'DMF', x: 42, y: 66 };
          if (idx === 7) return { ...p, pos: 'AMF', x: 60, y: 50 };
          if (idx === 9) return { ...p, pos: 'CF', x: 78, y: 50 };
          return p;
        })
      );
    } else {
      setLineup(
        HOME_PLAYERS_BASE.map((p, idx) => {
          if (idx === 1) return { ...p, pos: 'RMF', x: 52, y: 84 };
          if (idx === 4) return { ...p, pos: 'LMF', x: 52, y: 16 };
          if (idx === 2) return { ...p, pos: 'CB', x: 25, y: 70 };
          if (idx === 3) return { ...p, pos: 'CB', x: 24, y: 50 };
          if (idx === 5) return { ...p, pos: 'CB', x: 25, y: 30 };
          return p;
        })
      );
    }
  };

  const handlePlayerSlotClick = (idx: number) => {
    soundEngine.playMenuClick(620);
    setSelectedSlotIdx(idx);
    if (swapSourceIdx === null) {
      setSwapSourceIdx(idx);
    } else if (swapSourceIdx === idx) {
      setSwapSourceIdx(null);
    } else {
      setLineup((prev) => {
        const next = [...prev];
        const a = { ...next[swapSourceIdx] };
        const b = { ...next[idx] };
        next[swapSourceIdx] = { ...b, pos: a.pos, x: a.x, y: a.y };
        next[idx] = { ...a, pos: b.pos, x: b.x, y: b.y };
        return next;
      });
      setSwapSourceIdx(null);
    }
  };

  const inspectedTacticsPlayer = lineup[selectedSlotIdx] ?? lineup[9];

  return (
    <div
      data-testid="in-match-hud-view"
      className="fixed inset-0 z-30 flex flex-col justify-between overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 35%, #0B3B8C 0%, #061229 75%, #030917 100%)',
      }}
    >
      {/* =====================================================================
          LIVE STADIUM BROADCAST TURF PITCH, HUMAN FANS & HUMAN PLAYERS
         ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Night Sky & Twin Rectangular Stadium Floodlights */}
        <div
          className="absolute inset-x-0 top-0 h-[32%]"
          style={{
            background:
              'radial-gradient(ellipse 85% 75% at 50% 10%, rgba(11, 59, 140, 0.85) 0%, rgba(6, 18, 41, 0.98) 85%)',
          }}
        />
        <div
          className="absolute -top-10 left-[18%] w-96 h-44 animate-floodlight"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.58) 0%, rgba(0,229,255,0.3) 35%, transparent 72%)',
          }}
        />
        <div
          className="absolute -top-10 right-[18%] w-96 h-44 animate-floodlight"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.58) 0%, rgba(0,229,255,0.3) 35%, transparent 72%)',
          }}
        />

        {/* Animated Human Supporters in the Lower Stadium Bowl */}
        <div className="absolute inset-x-0 top-[18%] h-[12.5%] bg-[#050E22] overflow-hidden flex flex-col justify-end">
          <svg viewBox="0 0 1200 90" className="w-full h-full opacity-90" preserveAspectRatio="none">
            {Array.from({ length: 68 }).map((_, i) => {
              const cx = i * 17.8 + 8;
              const rowY = (i % 3) * 18 + 24;
              const bounce = Math.sin((tickPhase + i * 7) * 0.25) * 2.5;
              const jersey =
                i % 4 === 0
                  ? '#A50044'
                  : i % 4 === 1
                    ? '#004D98'
                    : i % 4 === 2
                      ? '#FFFFFF'
                      : '#FEBE10';
              const skin = i % 3 === 0 ? '#f1c29b' : i % 3 === 1 ? '#d9a17c' : '#8d5524';
              return (
                <g key={i} transform={`translate(${cx}, ${rowY + bounce})`}>
                  {/* Cheering Arms & Scarf */}
                  {i % 3 === 0 && (
                    <>
                      <rect x="-6" y="-8" width="12" height="2.5" fill={i % 6 === 0 ? '#00E5FF' : '#E11D48'} />
                      <line x1="-5" y1="-6" x2="-3" y2="2" stroke={skin} strokeWidth="2" />
                      <line x1="5" y1="-6" x2="3" y2="2" stroke={skin} strokeWidth="2" />
                    </>
                  )}
                  {/* Human Shoulders & Torso */}
                  <rect x="-4.5" y="1" width="9" height="12" rx="2.5" fill={jersey} />
                  {/* Human Head & Hair */}
                  <circle cx="0" cy="-2.5" r="3.2" fill={skin} />
                  <path d="M-3.2 -3 C-3.2 -6 3.2 -6 3.2 -3 Z" fill="#0f172a" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Electronic LED Perimeter Ad-Board Strip */}
        <div
          className={`absolute inset-x-0 top-[30.2%] h-6 border-y flex items-center justify-around text-[10px] font-display font-extrabold tracking-[0.26em] uppercase shadow-[0_0_20px_rgba(0,229,255,0.35)] ${
            broadcastStyle === 'libertadores'
              ? 'bg-[#1F0909] border-amber-400/70 text-amber-200'
              : 'bg-[#051026] border-[#00E5FF]/60 text-cyan-200/85'
          }`}
        >
          <span>PRO EVOLUTION SOCCER 2012</span>
          <span className={broadcastStyle === 'libertadores' ? 'text-amber-400' : 'text-[#00E5FF]'}>
            {broadcastStyle === 'ucl'
              ? 'UEFA CHAMPIONS LEAGUE · OFFICIAL BROADCAST'
              : broadcastStyle === 'libertadores'
                ? 'COPA SANTANDER LIBERTADORES'
                : 'WORLD SOCCER: WINNING ELEVEN 2012'}
          </span>
          <span className="hidden lg:inline">FOOTBALL LIFE · TEAMMATE CONTROL</span>
        </div>

        {/* 16:9 Broadcast Perspective Turf Pitch */}
        <div
          className="absolute inset-x-[-10%] bottom-[-8%] top-[32%]"
          style={{
            background: `
              repeating-linear-gradient(
                90deg,
                #166534 0%,
                #166534 5.5%,
                #115029 5.5%,
                #115029 11%
              )
            `,
            boxShadow: 'inset 0 28px 60px rgba(4, 12, 28, 0.72)',
          }}
        >
          {/* Perspective Pitch Chalk Lines */}
          <svg viewBox="0 0 1600 700" className="w-full h-full opacity-60" preserveAspectRatio="none">
            <polygon
              points="180,45 1420,45 1560,660 40,660"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
            />
            <line x1="800" y1="45" x2="800" y2="660" stroke="#FFFFFF" strokeWidth="3.5" />
            <ellipse cx="800" cy="335" rx="155" ry="72" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
            <circle cx="800" cy="335" r="5.5" fill="#FFFFFF" />
            <polygon points="180,150 380,150 340,520 75,520" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
            <polygon points="1420,150 1220,150 1260,520 1525,520" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
          </svg>

          {/* On-Pitch Human Footballers + Active P1 Cursor & Next-Player Switch Indicator */}
          {subView === 'hud' && (
            <div className="absolute inset-0 pointer-events-auto">
              {/* Visual Switch-Target Vector Line between Active P1 and Next-Player [L1] */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-65">
                <line
                  x1={`${10 + activeHomePlayer.x * 0.8}%`}
                  y1={`${8 + activeHomePlayer.y * 0.78}%`}
                  x2={`${10 + nextSwitchPlayer.x * 0.8}%`}
                  y2={`${8 + nextSwitchPlayer.y * 0.78}%`}
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                {/* Diagonal Overlapping Teammate AI Run Vector into Open Space */}
                {overlapRunActive && animatedHomePlayers[teammateRunnerIdx] && (
                  <g>
                    <line
                      x1={`${10 + animatedHomePlayers[teammateRunnerIdx].x * 0.8}%`}
                      y1={`${8 + animatedHomePlayers[teammateRunnerIdx].y * 0.78}%`}
                      x2={`${Math.min(92, 10 + (animatedHomePlayers[teammateRunnerIdx].x + 14) * 0.8)}%`}
                      y2={`${Math.max(12, Math.min(86, 8 + (animatedHomePlayers[teammateRunnerIdx].y - 8) * 0.78))}%`}
                      stroke="#00E5FF"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                    />
                  </g>
                )}
                {/* Defensive Jockeying 2.8m Fixed-Distance Contain Ring */}
                {jockeyContainActive && (
                  <ellipse
                    cx={`${10 + activeAwayPlayer.x * 0.8}%`}
                    cy={`${8 + activeAwayPlayer.y * 0.78 + 2.5}%`}
                    rx="34"
                    ry="14"
                    fill="rgba(250, 204, 21, 0.12)"
                    stroke="#FACC15"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                  />
                )}
              </svg>

              {animatedHomePlayers.map((p, idx) => {
                const isControlled = idx === homePlayerIdx;
                const isNextSwitch = idx === nextSwitchPlayerIdx;
                const isRunner = idx === teammateRunnerIdx;
                return (
                  <div
                    key={p.id}
                    style={{
                      left: `${10 + p.x * 0.8}%`,
                      top: `${8 + p.y * 0.78}%`,
                      zIndex: isControlled ? 25 : isNextSwitch ? 20 : 12,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                  >
                    <HumanFootballerFigure
                      player={p}
                      side="home"
                      phase={tickPhase}
                      isControlled={isControlled}
                      isNextSwitch={isNextSwitch}
                      isTeammateRunner={isRunner}
                      onClick={() => {
                        soundEngine.playMenuClick(680);
                        setHomePlayerIdx(idx);
                      }}
                    />
                  </div>
                );
              })}

              {animatedAwayPlayers.map((p, idx) => {
                return (
                  <div
                    key={p.id}
                    style={{
                      left: `${10 + p.x * 0.8}%`,
                      top: `${8 + p.y * 0.78}%`,
                      zIndex: 11,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                  >
                    <HumanFootballerFigure
                      player={p}
                      side="away"
                      phase={tickPhase}
                      onClick={() => setAwayPlayerIdx(idx)}
                    />
                  </div>
                );
              })}

              {/* High-Detail 32-Panel / UEFA Finale Starball Match Ball */}
              <div
                style={{
                  left: `${10 + ballX * 0.8}%`,
                  top: `${8 + ballY * 0.78 + 3.2}%`,
                  zIndex: 28,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100 pointer-events-none"
              >
                <svg viewBox="0 0 28 28" className="w-5 h-5 overflow-visible">
                  <ellipse cx="14" cy="24" rx="7" ry="2.5" fill="rgba(0,0,0,0.55)" />
                  <circle cx="14" cy="14" r="8.5" fill="#FFFFFF" stroke="#061229" strokeWidth="1.2" />
                  <polygon points="14,8 17.5,11 16,15.5 12,15.5 10.5,11" fill="#0B3B8C" stroke="#00E5FF" strokeWidth="0.6" />
                  <circle cx="11.5" cy="10.5" r="2" fill="rgba(255,255,255,0.75)" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Dark Blue Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 82% at 50% 50%, transparent 58%, rgba(6, 18, 41, 0.78) 100%)',
          }}
        />
      </div>

      {/* =====================================================================
          TOP ROW: TV BROADCAST SCOREBOARD BUG (LEFT) + VIEW SWITCHER (RIGHT)
         ===================================================================== */}
      <div className="relative z-20 flex flex-wrap items-start justify-between gap-4 px-5 pt-4 md:px-8 md:pt-5">
        {/* TOP-LEFT SCOREBOARD: COMPACT TV-STYLE BUG */}
        <div className="flex flex-col items-start gap-1.5">
          <div
            data-testid="tv-broadcast-scorebug"
            className={`flex items-stretch rounded-xs overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.8)] border ${
              broadcastStyle === 'libertadores' ? 'border-amber-400/80' : 'border-[#00E5FF]/70'
            }`}
            style={{
              background:
                broadcastStyle === 'libertadores'
                  ? 'linear-gradient(180deg, #450A0A 0%, #1C0404 100%)'
                  : 'linear-gradient(180deg, #102A56 0%, #061229 100%)',
            }}
          >
            {/* Broadcast Competition Emblem */}
            <button
              type="button"
              title="Click to switch Broadcast Package (PES 2012 / UEFA CL / Copa Libertadores)"
              onClick={() => {
                const next =
                  broadcastStyle === 'pes2012'
                    ? 'ucl'
                    : broadcastStyle === 'ucl'
                      ? 'libertadores'
                      : 'pes2012';
                setBroadcastStyle(next);
              }}
              className="px-2.5 py-1.5 bg-gradient-to-b from-[#0B3B8C] to-[#061229] border-r border-white/15 flex items-center gap-1.5 cursor-pointer hover:brightness-125"
            >
              <Trophy className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="font-display text-[11px] font-extrabold tracking-wider uppercase text-cyan-200">
                {broadcastStyle === 'ucl' ? 'UCL' : broadcastStyle === 'libertadores' ? 'LIB' : 'PES 12'}
              </span>
            </button>

            {/* HOME TEAM: Color Swatch + 3-Letter Abbreviation */}
            <div className="px-3 py-1.5 flex items-center gap-2 bg-gradient-to-b from-[#0D254C] to-[#061229] relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[42%] bg-white/10 pointer-events-none" />
              <div className="flex items-center h-5 rounded-[1px] overflow-hidden border border-white/45 shadow-sm shrink-0">
                <span className="w-1.5 h-full bg-[#A50044]" />
                <span className="w-1.5 h-full bg-[#004D98]" />
              </div>
              <span
                data-testid="hud-home-abbr"
                className="font-display text-lg sm:text-xl font-extrabold tracking-tight uppercase text-white"
              >
                {homeTeam.shortCode || 'BAR'}
              </span>
            </div>

            {/* WHITE SCORE BOX */}
            <div
              data-testid="hud-white-scorebox"
              className="px-3.5 py-1 flex items-center justify-center gap-1.5 bg-gradient-to-b from-white via-slate-50 to-slate-200 text-[#061229] font-mono-tabular text-xl sm:text-2xl font-extrabold shadow-inner border-x border-slate-300"
            >
              <span>{homeScore}</span>
              <span className="text-slate-400 text-base font-bold">-</span>
              <span>{awayScore}</span>
            </div>

            {/* AWAY TEAM: 3-Letter Abbreviation + Color Swatch */}
            <div className="px-3 py-1.5 flex items-center gap-2 bg-gradient-to-b from-[#0D254C] to-[#061229] relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[42%] bg-white/10 pointer-events-none" />
              <span
                data-testid="hud-away-abbr"
                className="font-display text-lg sm:text-xl font-extrabold tracking-tight uppercase text-white"
              >
                {awayTeam.shortCode || 'RMA'}
              </span>
              <div className="flex items-center h-5 rounded-[1px] overflow-hidden border border-white/45 shadow-sm shrink-0">
                <span className="w-1.5 h-full bg-[#FFFFFF]" />
                <span className="w-1.5 h-full bg-[#FEBE10]" />
              </div>
            </div>

            {/* GREEN / BLACK MATCH TIMER (e.g., 45:00 +2) */}
            <div
              data-testid="hud-match-timer"
              className="flex items-stretch border-l border-emerald-400/50"
            >
              <div className="px-3 py-1.5 bg-[#050A0E] border-t-2 border-t-emerald-400 flex items-center gap-1.5 font-mono-tabular text-base sm:text-lg font-bold text-white tracking-tight">
                <span className="text-[10px] font-display font-extrabold text-emerald-400 uppercase mr-0.5">
                  1H
                </span>
                <span>{formattedClock}</span>
              </div>
              <div className="px-2.5 py-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#04120B] font-mono-tabular text-sm sm:text-base font-extrabold flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                +{stoppageMinutes}
              </div>
            </div>
          </div>

          {/* 4-Slot On-the-Fly Strategy Plan Indicator Strip (× ○ △ □) */}
          <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-xs bg-[#061229]/90 border border-cyan-400/35 text-[10px] font-display font-bold uppercase tracking-wider text-cyan-100 backdrop-blur-md">
            <span className="text-[#00E5FF]">STRATEGY PLAN:</span>
            {strategySlots.map((slot, idx) => (
              <button
                key={slot.button}
                type="button"
                onClick={() => {
                  setStrategySlots((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, active: !s.active } : s))
                  );
                }}
                className={`px-1.5 py-0.2 rounded-xs border flex items-center gap-1 cursor-pointer transition-all ${
                  slot.active
                    ? 'bg-[#0B3B8C] border-[#00E5FF] text-white shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'bg-[#040B18] border-white/15 text-slate-400'
                }`}
              >
                <span style={{ color: slot.color }} className="font-extrabold">
                  {slot.symbol}
                </span>
                <span>{slot.strategyName.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TOP-RIGHT VIEW TOGGLE & INTERACTIVE CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xs p-0.5 bg-[#061229]/90 border border-[#00E5FF]/50 shadow-[0_0_20px_rgba(0,229,255,0.2)] backdrop-blur-md">
            <button
              type="button"
              data-testid="subview-hud-btn"
              onClick={() => {
                soundEngine.playMenuClick(660);
                setSubView('hud');
              }}
              className={`px-3 py-1.5 rounded-xs font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'hud'
                  ? 'bg-gradient-to-b from-[#00E5FF] to-[#0099CC] text-[#041024] shadow-[0_0_14px_rgba(0,229,255,0.6)]'
                  : 'text-cyan-100 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>In-Match HUD</span>
            </button>
            <button
              type="button"
              data-testid="subview-tactics-btn"
              onClick={() => {
                soundEngine.playMenuClick(680);
                setSubView('tactics');
              }}
              className={`px-3 py-1.5 rounded-xs font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'tactics'
                  ? 'bg-gradient-to-b from-[#00E5FF] to-[#0099CC] text-[#041024] shadow-[0_0_14px_rgba(0,229,255,0.6)]'
                  : 'text-cyan-100 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Game Plan / Skill Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            title="Toggle Spoken Play-by-Play Commentary"
            className="px-2.5 py-2 rounded-xs bg-[#061229]/90 hover:bg-[#0B3B8C] border border-cyan-400/40 text-xs font-display font-bold uppercase text-cyan-100 flex items-center gap-1 cursor-pointer"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden xl:inline">{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuClick(760);
              onLaunchPlayable3DMatch();
            }}
            className="px-3 py-2 rounded-xs bg-gradient-to-b from-[#0B3B8C] to-[#061229] hover:from-[#124EB5] hover:to-[#092047] border border-cyan-300/50 hover:border-[#00E5FF] text-xs font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Play 3D Match</span>
          </button>

          <button
            type="button"
            data-testid="toggle-to-main-menu-btn"
            onClick={() => {
              soundEngine.playMenuClick(600);
              onBackToMenu();
            }}
            className="px-4 py-2 rounded-xs we-accent-btn font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Main Menu (Ribbon UX)</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          CENTER CONTENT: INTERACTIVE HUD CONTROLS OR GAME PLAN / SKILL CARDS
         ===================================================================== */}
      {subView === 'hud' ? (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-between py-2 px-6 pointer-events-none">
          {/* Interactive Broadcast HUD Controls Pill */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-[#061229]/88 border border-[#00E5FF]/45 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-md">
            <button
              type="button"
              data-testid="hud-l1-change-cursor-btn"
              onClick={handlePressL1ChangePlayer}
              className="px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-500 border border-white/70 text-[11px] font-display font-extrabold uppercase text-white flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.6)]"
            >
              <span className="px-1 rounded-xs bg-black/50 font-mono-tabular text-[10px]">L1</span>
              <span>Change Cursor → #{nextSwitchPlayer.num} {nextSwitchPlayer.name}</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerR3TeammateRun}
              className="px-2.5 py-1 rounded-full bg-[#081C3E] hover:bg-[#0B3B8C] border border-[#00E5FF]/50 text-[11px] font-display font-bold uppercase text-cyan-100 cursor-pointer"
            >
              [R3] Teammate Run ({teammateMode})
            </button>

            <button
              type="button"
              onClick={() => setTeammateMode((m) => (m === 'ASSISTED' ? 'MANUAL' : 'ASSISTED'))}
              className="px-2.5 py-1 rounded-full bg-[#081C3E] hover:bg-[#0B3B8C] border border-cyan-400/35 text-[11px] font-display font-bold uppercase text-[#00E5FF] cursor-pointer"
            >
              R3 Mode: {teammateMode}
            </button>

            <button
              type="button"
              onMouseDown={() => setIsCharging(true)}
              onMouseUp={() => setIsCharging(false)}
              onMouseLeave={() => setIsCharging(false)}
              onClick={() => setHomePower((p) => (p >= 92 ? 32 : p + 14))}
              className="px-2.5 py-1 rounded-full bg-[#0B3B8C] hover:bg-[#134EB0] border border-[#00E5FF] text-[11px] font-display font-bold uppercase text-white flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-[#00E5FF]" />
              <span>Charge Power ({homePower}%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerGoal('home')}
              className="px-2.5 py-1 rounded-full bg-emerald-600/85 hover:bg-emerald-500 border border-emerald-300/60 text-[11px] font-display font-bold uppercase text-white cursor-pointer"
            >
              +1 Goal (BAR)
            </button>

            <button
              type="button"
              onClick={() => setClockRunning((c) => !c)}
              className="px-2.5 py-1 rounded-full bg-[#081C3E] hover:bg-[#0B3B8C] border border-cyan-400/35 text-[11px] font-display font-bold uppercase text-cyan-100 flex items-center gap-1 cursor-pointer"
            >
              {clockRunning ? <Pause className="w-3 h-3 text-[#00E5FF]" /> : <Play className="w-3 h-3 text-[#00E5FF]" />}
              <span>{clockRunning ? '45:00 +2 Snapshot' : 'Live Timer'}</span>
            </button>

            <button
              type="button"
              onClick={handleKnockOnSprint}
              className="px-2.5 py-1 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400 text-[11px] font-display font-bold uppercase text-amber-200 cursor-pointer"
            >
              [R1×2] Knock-On Sprint
            </button>

            <button
              type="button"
              onClick={() => setOverlapRunActive((v) => !v)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-display font-bold uppercase cursor-pointer ${
                overlapRunActive
                  ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                  : 'bg-[#081C3E] border-white/20 text-slate-400'
              }`}
            >
              Overlap Run AI: {overlapRunActive ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setJockeyContainActive((v) => !v)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-display font-bold uppercase cursor-pointer ${
                jockeyContainActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-[#081C3E] border-white/20 text-slate-400'
              }`}
            >
              Jockey Strafe (2.8m): {jockeyContainActive ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setGoldenHourLighting((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-[#081C3E] hover:bg-[#0B3B8C] border border-amber-300/60 text-[11px] font-display font-bold uppercase text-amber-200 cursor-pointer"
            >
              {goldenHourLighting ? 'Shader: Golden-Hour Sun' : 'Shader: Floodlight Bloom'}
            </button>

            <button
              type="button"
              onClick={() => setEngineStudioOpen(true)}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#041024] text-[11px] font-display font-extrabold uppercase cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.65)]"
            >
              3D PS3 Character & C#/C++ SDK
            </button>
          </div>

          {/* Goal Broadcast Lower-Third Banner */}
          {goalToast && (
            <div className="px-8 py-3 rounded-xs bg-gradient-to-r from-[#061229]/95 via-[#0B3B8C]/95 to-[#061229]/95 border-2 border-[#00E5FF] shadow-[0_0_40px_rgba(0,229,255,0.65)] flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-[#00E5FF]" />
              <div>
                <div className="text-[10px] font-display font-bold uppercase tracking-[0.25em] text-[#00E5FF]">
                  GOAL SCORED · OFFICIAL BROADCAST REPLAY
                </div>
                <div className="font-display text-2xl font-extrabold uppercase text-white tracking-tight">
                  {goalToast}
                </div>
              </div>
            </div>
          )}

          {/* Live Play-by-Play Commentary Caption Ticker */}
          <div className="px-4 py-1 rounded-full bg-[#061229]/85 border border-cyan-400/30 text-xs text-cyan-100 font-medium shadow-lg backdrop-blur-md">
            {commentaryLine}
          </div>
        </div>
      ) : (
        /* ===================================================================
           GAME PLAN / TACTICS / SKILL CARDS / LINK FEINTS VIEW
           =================================================================== */
        <div
          data-testid="game-plan-tactics-panel"
          className="relative z-20 flex-1 max-w-[1560px] w-full mx-auto px-5 md:px-8 py-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch overflow-y-auto"
        >
          {/* Left Column: Squad Lineup List */}
          <div className="lg:col-span-4 broadcast-panel rounded-xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-400/30 pb-2 mb-2.5">
                <div>
                  <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[#00E5FF]">
                    STARTING XI · SQUAD LIST
                  </div>
                  <h2 className="font-display text-xl font-extrabold uppercase text-white">
                    {homeTeam.name || 'FC BARCELONA'}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-[#00E5FF]/15 border border-[#00E5FF]/50 font-mono-tabular text-xs font-extrabold text-[#00E5FF]">
                  {formationPreset}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {lineup.map((p, idx) => {
                  const isSel = idx === selectedSlotIdx;
                  const isSwap = idx === swapSourceIdx;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePlayerSlotClick(idx)}
                      className={`w-full px-3 py-1.5 rounded-xs flex items-center justify-between border text-left transition-all cursor-pointer ${
                        isSwap
                          ? 'bg-[#00E5FF]/25 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.45)]'
                          : isSel
                            ? 'bg-[#0B3B8C]/85 border-[#00E5FF]/80'
                            : 'bg-[#061229]/80 border-white/10 hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-9 text-center py-0.5 rounded-xs bg-[#0B3B8C] border border-cyan-300/40 font-display text-[11px] font-extrabold text-[#00E5FF]">
                          {p.pos}
                        </span>
                        <span className="w-6 font-mono-tabular text-xs font-bold text-cyan-200">
                          #{p.num}
                        </span>
                        <span className="font-display text-sm font-bold uppercase text-white truncate">
                          {p.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono-tabular text-[#00E5FF]">
                          {p.skillCards.join('·')}
                        </span>
                        <div className="w-12 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/15">
                          <div
                            className="h-full"
                            style={{
                              width: `${p.stamina}%`,
                              background: 'linear-gradient(90deg, #EAB308 0%, #84CC16 45%, #22C55E 100%)',
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Link Feints Preset Strip */}
            <div className="mt-3 pt-2.5 border-t border-cyan-400/25">
              <div className="text-[10px] font-display font-bold uppercase tracking-wider text-[#00E5FF] mb-1.5">
                PES 2012 LINK FEINTS (R-STICK COMBOS)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_LINK_FEINTS.map((lf) => (
                  <div
                    key={lf.id}
                    className="px-2 py-1 rounded-xs bg-[#061229]/85 border border-cyan-400/25 text-[10px]"
                  >
                    <div className="font-display font-bold text-cyan-300">{lf.direction}</div>
                    <div className="text-white font-semibold truncate">{lf.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Interactive 2D Formation Board */}
          <div className="lg:col-span-5 broadcast-panel rounded-xs p-4 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/30 pb-2 mb-2.5">
              <div>
                <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[#00E5FF]">
                  PES 2012 TACTICAL BOARD
                </div>
                <h3 className="font-display text-lg font-extrabold uppercase text-white">
                  FORMATION & POSITIONAL STRUCTURE
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {(['4-3-3', '4-2-3-1', '3-4-3'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyFormationPreset(preset)}
                    className={`px-2.5 py-1 rounded-xs font-mono-tabular text-xs font-extrabold border cursor-pointer transition-all ${
                      formationPreset === preset
                        ? 'bg-[#00E5FF] text-[#061229] border-white shadow-[0_0_12px_rgba(0,229,255,0.6)]'
                        : 'bg-[#061229]/90 text-cyan-100 border-cyan-400/35 hover:border-[#00E5FF]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="relative w-full flex-1 min-h-[250px] rounded-xs border-2 border-[#00E5FF]/60 overflow-hidden shadow-inner"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(12, 82, 54, 0.9) 0%, rgba(12, 82, 54, 0.9) 10%, rgba(9, 64, 42, 0.92) 10%, rgba(9, 64, 42, 0.92) 20%)',
              }}
            >
              <div className="absolute inset-3 border border-white/40 pointer-events-none">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/40" />
              </div>

              {lineup.map((p, idx) => {
                const isSel = idx === selectedSlotIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePlayerSlotClick(idx)}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-tabular text-xs font-extrabold transition-transform ${
                        isSel
                          ? 'bg-[#00E5FF] text-[#061229] ring-2 ring-white scale-115 shadow-[0_0_16px_#00E5FF]'
                          : 'bg-[#0B3B8C] text-white ring-1 ring-[#00E5FF] group-hover:scale-110'
                      }`}
                    >
                      {p.num}
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.2 rounded bg-[#061229]/90 border border-cyan-400/40 font-display text-[9px] font-bold uppercase text-white whitespace-nowrap">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="mt-3 grid grid-cols-3 gap-3 pt-2 border-t border-cyan-400/25">
              <div>
                <div className="flex justify-between text-[10px] font-display font-bold uppercase text-cyan-100">
                  <span>Support</span>
                  <span className="font-mono-tabular text-[#00E5FF]">{supportRange}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={supportRange}
                  onChange={(e) => setSupportRange(Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-display font-bold uppercase text-cyan-100">
                  <span>Compactness</span>
                  <span className="font-mono-tabular text-[#00E5FF]">{compactness}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={compactness}
                  onChange={(e) => setCompactness(Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-display font-bold uppercase text-cyan-100">
                  <span>Def. Line</span>
                  <span className="font-mono-tabular text-[#00E5FF]">{defensiveLine}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={defensiveLine}
                  onChange={(e) => setDefensiveLine(Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Player Skill Cards (P01-P18 / S01-S15) & Radar */}
          <div className="lg:col-span-3 broadcast-panel rounded-xs p-4 flex flex-col justify-between">
            <div>
              <div className="border-b border-cyan-400/30 pb-2 mb-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[#00E5FF]">
                    PLAYER SKILL CARDS
                  </div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-white">
                    #{inspectedTacticsPlayer.num} {inspectedTacticsPlayer.name}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-[#00E5FF] text-[#061229] font-mono-tabular text-sm font-extrabold">
                  OVR {90 + (inspectedTacticsPlayer.num % 8)}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {PES2012_SKILL_CARDS.slice(0, 8).map((card) => {
                  const hasCard = inspectedTacticsPlayer.skillCards.includes(card.code);
                  return (
                    <div
                      key={card.code}
                      className={`p-2 rounded-xs border ${
                        hasCard
                          ? 'bg-[#0B3B8C]/90 border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                          : 'bg-[#061229]/65 border-white/10 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-extrabold text-[#00E5FF]">
                          {card.code} · {card.name}
                        </span>
                        {hasCard && (
                          <span className="px-1.5 py-0.2 rounded-xs bg-[#00E5FF] text-[#061229] font-display text-[9px] font-black uppercase">
                            EQUIPPED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-cyan-100/80 mt-0.5">{card.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubView('hud')}
              className="mt-3 w-full py-2.5 rounded-xs we-accent-btn font-display text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              Return to In-Match Broadcast HUD
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM ROW: LEFT PLAYER PLATE + CENTER 2D RADAR + RIGHT PLAYER PLATE
         ===================================================================== */}
      <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end justify-between gap-4 px-5 pb-4 md:px-8 md:pb-5">
        {/* BOTTOM-LEFT PLAYER PLATE (HOME ACTIVE PLAYER + [L1] CHANGE PLAYER PROMPT) */}
        <div
          data-testid="hud-player-plate-left"
          className="w-full md:w-[325px] rounded-xs p-3 relative overflow-hidden border border-[#00E5FF]/75 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(0,229,255,0.22)] backdrop-blur-md"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, transparent 38%), linear-gradient(180deg, rgba(11, 59, 140, 0.92) 0%, rgba(6, 18, 41, 0.97) 100%)',
          }}
        >
          {/* Team Color Left Accent Stripe */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#A50044] via-[#EF4444] to-[#004D98]" />

          <div className="pl-2">
            {/* Top Row: P1 Red Triangle Badge + Player Number + Name + Condition Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded-xs bg-red-600 text-white font-mono-tabular text-[10px] font-black flex items-center gap-0.5">
                  ▼ P1
                </span>
                <span className="px-1.5 py-0.5 rounded-xs bg-[#00E5FF] text-[#061229] font-mono-tabular text-xs font-extrabold">
                  {activeHomePlayer.num}
                </span>
                <span
                  data-testid="hud-left-player-name"
                  className="font-display text-lg font-extrabold uppercase tracking-tight text-white truncate"
                >
                  {activeHomePlayer.name}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-xs bg-rose-500/20 border border-rose-400/50 font-mono-tabular text-xs font-extrabold text-rose-300">
                ↗
              </span>
            </div>

            {/* Stamina Bar (Green-to-Yellow Gradient) */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-display font-bold uppercase tracking-wider text-cyan-100/90 mb-1">
                <span>STAMINA ({activeHomePlayer.pos})</span>
                <span className="font-mono-tabular text-emerald-300 font-extrabold">
                  {activeHomePlayer.stamina}%
                </span>
              </div>
              <div
                data-testid="hud-left-stamina-bar"
                className="w-full h-2.5 rounded-xs bg-[#030916] border border-white/20 p-[1px] overflow-hidden shadow-inner"
              >
                <div
                  className="h-full rounded-[1px] transition-all duration-200"
                  style={{
                    width: `${activeHomePlayer.stamina}%`,
                    background: 'linear-gradient(90deg, #FACC15 0%, #84CC16 45%, #22C55E 100%)',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                  }}
                />
              </div>
            </div>

            {/* Curved Shot / Pass Power Gauge */}
            <CurvedPowerGauge power={homePower} label={actionLabel} align="left" />

            {/* Subtle [L1] Change Player Prompt Indicator */}
            <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px]">
              <button
                type="button"
                data-testid="plate-l1-change-player-prompt"
                onClick={handlePressL1ChangePlayer}
                className="flex items-center gap-1.5 text-cyan-100 hover:text-white cursor-pointer"
              >
                <span className="px-1.5 py-0.2 rounded-xs bg-slate-800 border border-white/40 font-mono-tabular text-[10px] font-extrabold text-white">
                  L1
                </span>
                <span className="font-display font-bold uppercase tracking-wider">
                  Change Player
                </span>
              </button>
              <span className="font-display text-[10px] font-bold uppercase text-red-300 flex items-center gap-1">
                <span>▽ Next:</span>
                <strong className="text-white">#{nextSwitchPlayer.num} {nextSwitchPlayer.name}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER RADAR: SEMI-TRANSPARENT 2D PITCH MINI-MAP SHOWING PLAYER DOTS */}
        <div
          data-testid="hud-bottom-center-radar"
          className="relative w-[276px] sm:w-[318px] h-[156px] rounded-xs border-2 border-[#00E5FF]/65 overflow-hidden shadow-[0_14px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(0,229,255,0.22)] backdrop-blur-md shrink-0"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(8, 48, 38, 0.78) 0px, rgba(8, 48, 38, 0.78) 26px, rgba(6, 36, 30, 0.82) 26px, rgba(6, 36, 30, 0.82) 52px)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

          {/* 2D Pitch Markings */}
          <div className="absolute inset-2 border border-white/45 rounded-[1px] pointer-events-none">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/45" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/45" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/65" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-20 border-r border-y border-white/45" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-20 border-l border-y border-white/45" />
          </div>

          {/* Home Team Player Dots */}
          {animatedHomePlayers.map((dot, idx) => {
            const isControlled = idx === homePlayerIdx;
            const isNext = idx === nextSwitchPlayerIdx;
            return (
              <div
                key={dot.id}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100 ${
                  isControlled
                    ? 'w-3.5 h-3.5 bg-red-500 ring-2 ring-white shadow-[0_0_10px_#EF4444] z-20'
                    : isNext
                      ? 'w-3 h-3 bg-rose-400/40 ring-2 ring-red-400 z-15'
                      : 'w-2.5 h-2.5 bg-[#E11D48] border border-white z-10'
                }`}
              />
            );
          })}

          {/* Away Team Player Dots */}
          {animatedAwayPlayers.map((dot, idx) => {
            const isActiveAway = idx === awayPlayerIdx;
            return (
              <div
                key={dot.id}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100 ${
                  isActiveAway
                    ? 'w-3 h-3 bg-amber-300 ring-2 ring-white shadow-[0_0_8px_#FCD34D] z-20'
                    : 'w-2.5 h-2.5 bg-white border border-[#061229] z-10'
                }`}
              />
            );
          })}

          {/* Ball Dot */}
          <div
            style={{ left: `${ballX}%`, top: `${ballY}%` }}
            className="absolute w-3 h-3 rounded-full bg-yellow-300 border border-black shadow-[0_0_10px_#FEF08A] -translate-x-1/2 -translate-y-1/2 z-30"
          />

          <div className="absolute bottom-1 right-2 text-[9px] font-mono-tabular font-bold uppercase tracking-widest text-cyan-200/80">
            2D PITCH RADAR
          </div>
        </div>

        {/* BOTTOM-RIGHT PLAYER PLATE (AWAY ACTIVE PLAYER + [L1] CHANGE PLAYER PROMPT) */}
        <div
          data-testid="hud-player-plate-right"
          className="w-full md:w-[325px] rounded-xs p-3 relative overflow-hidden border border-[#00E5FF]/75 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(0,229,255,0.22)] backdrop-blur-md"
          style={{
            background:
              'linear-gradient(225deg, rgba(255,255,255,0.16) 0%, transparent 38%), linear-gradient(180deg, rgba(11, 59, 140, 0.92) 0%, rgba(6, 18, 41, 0.97) 100%)',
          }}
        >
          {/* Team Color Right Accent Stripe */}
          <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-[#FFFFFF] via-[#FEBE10] to-[#0B3B8C]" />

          <div className="pr-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-1.5 py-0.5 rounded-xs bg-rose-500/20 border border-rose-400/50 font-mono-tabular text-xs font-extrabold text-rose-300">
                ↗
              </span>
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                <span
                  data-testid="hud-right-player-name"
                  className="font-display text-lg font-extrabold uppercase tracking-tight text-white truncate"
                >
                  {activeAwayPlayer.name}
                </span>
                <span className="px-1.5 py-0.5 rounded-xs bg-[#061229]/90 border border-cyan-400/40 font-display text-[10px] font-bold text-cyan-200">
                  {activeAwayPlayer.pos}
                </span>
                <span className="px-1.5 py-0.5 rounded-xs bg-amber-400 text-[#061229] font-mono-tabular text-xs font-extrabold">
                  {activeAwayPlayer.num}
                </span>
              </div>
            </div>

            {/* Stamina Bar (Green-to-Yellow Gradient) */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-display font-bold uppercase tracking-wider text-cyan-100/90 mb-1">
                <span className="font-mono-tabular text-emerald-300 font-extrabold">
                  {activeAwayPlayer.stamina}%
                </span>
                <span>STAMINA ({activeAwayPlayer.pos})</span>
              </div>
              <div
                data-testid="hud-right-stamina-bar"
                className="w-full h-2.5 rounded-xs bg-[#030916] border border-white/20 p-[1px] overflow-hidden shadow-inner flex justify-end"
              >
                <div
                  className="h-full rounded-[1px] transition-all duration-200"
                  style={{
                    width: `${activeAwayPlayer.stamina}%`,
                    background: 'linear-gradient(90deg, #22C55E 0%, #84CC16 55%, #FACC15 100%)',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                  }}
                />
              </div>
            </div>

            {/* Curved Shot / Pass Power Gauge */}
            <CurvedPowerGauge power={awayPower} label="PASS / SHOT POWER" align="right" />

            {/* Subtle [L1] Change Player / R3 Indicator */}
            <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px]">
              <span className="font-mono-tabular text-cyan-200/80">
                CARDS: <strong className="text-[#00E5FF]">{activeAwayPlayer.skillCards.join(' · ')}</strong>
              </span>
              <button
                type="button"
                onClick={() => setAwayPlayerIdx((i) => (i + 1) % AWAY_PLAYERS_BASE.length)}
                className="flex items-center gap-1.5 text-cyan-100 hover:text-white cursor-pointer"
              >
                <span className="px-1.5 py-0.2 rounded-xs bg-slate-800 border border-white/40 font-mono-tabular text-[10px] font-extrabold text-white">
                  L1
                </span>
                <span className="font-display font-bold uppercase tracking-wider">
                  Change Player
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Golden-Hour Sunlight Overlay when toggled on */}
      {goldenHourLighting && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(ellipse 85% 65% at 75% 18%, rgba(255, 207, 117, 0.34) 0%, rgba(245, 158, 11, 0.14) 48%, transparent 80%)',
          }}
        />
      )}

      {/* 3D PS3 Character Rig, Shaders & C#/C++ SDK Studio Modal */}
      {engineStudioOpen && (
        <Pes2012EngineStudioModal onClose={() => setEngineStudioOpen(false)} />
      )}
    </div>
  );
};
