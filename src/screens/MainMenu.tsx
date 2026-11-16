import React, { useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Info,
  Lock,
  Play,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Trophy,
  Unlock,
  X,
} from 'lucide-react';
import { AppScreen, PersistentSaveData, Team } from '../types/football';
import { getAllTeams } from '../data/teams';
import {
  EXTRA_CONTENT_PACKS,
  MASTER_LEAGUE_ORIGINAL_TEAM,
  PES2012_SKILL_CARDS,
} from '../data/pes2012Content';
import { soundEngine } from '../game/audio/soundEngine';
import { BroadcastHudShowcase, ShowcaseViewMode } from '../components/BroadcastHudShowcase';
import { Pes2012EngineStudioModal } from '../components/Pes2012EngineStudioModal';

interface MainMenuProps {
  saveData: PersistentSaveData;
  onNavigate: (screen: AppScreen) => void;
  onContinueGame: () => void;
  onExitToTitle: () => void;
  onQuickStart3DMatch?: () => void;
}

export type RibbonModeId =
  | 'exhibition'
  | 'ucl'
  | 'master-league'
  | 'become-legend'
  | 'football-life'
  | 'edit'
  | 'system-settings';

interface RibbonTileSpec {
  id: RibbonModeId;
  code: string;
  title: string;
  lines: string[];
  subtitle: string;
  badge: string;
  description: string;
  primaryScreen: AppScreen;
  subActions: { label: string; screen: AppScreen; testId?: string }[];
}

/**
 * Circular ring order so that when EXHIBITION (index 0) is selected at center (offset 0):
 *   offset -2 = MASTER LEAGUE
 *   offset -1 = UEFA CHAMPIONS LEAGUE
 *   offset  0 = EXHIBITION
 *   offset +1 = BECOME A LEGEND
 *   offset +2 = EDIT
 *   offset +3 = SYSTEM SETTINGS
 *   offset -3 = FOOTBALL LIFE
 * matching the Western PES 2012 reference layout while cycling all 7 modes smoothly.
 */
const RIBBON_MODES: RibbonTileSpec[] = [
  {
    id: 'exhibition',
    code: '01',
    title: 'EXHIBITION',
    lines: ['EXHIBITION'],
    subtitle: 'SINGLE MATCH KICK-OFF',
    badge: '11v11 MATCHDAY',
    description: 'Play a single match against the CPU or a friend.',
    primaryScreen: 'match-setup',
    subActions: [
      { label: 'Exhibition Match Setup', screen: 'match-setup', testId: 'menu-exhibition' },
      { label: 'Skill Training Drills', screen: 'training', testId: 'menu-training' },
      { label: 'Free Training Arena', screen: 'practice-arena', testId: 'menu-practice-arena' },
    ],
  },
  {
    id: 'become-legend',
    code: '02',
    title: 'BECOME A LEGEND',
    lines: ['BECOME', 'A LEGEND'],
    subtitle: 'SINGLE PLAYER PRO CAREER',
    badge: 'PRO SPOTLIGHT',
    description: 'Step onto the pitch as a single footballer and rise from youth prospect to global legend.',
    primaryScreen: 'become-legend',
    subActions: [
      { label: 'Enter Become a Legend', screen: 'become-legend', testId: 'menu-become-legend' },
      { label: 'Challenge Training', screen: 'training' },
    ],
  },
  {
    id: 'edit',
    code: '03',
    title: 'EDIT',
    lines: ['EDIT'],
    subtitle: 'TEAMS, KITS, PLAYERS & TACTICS',
    badge: 'CUSTOM STUDIO',
    description: 'Customize club emblems, kits, stadium names, formations, and player ability parameters.',
    primaryScreen: 'edit-mode',
    subActions: [
      { label: 'Edit Teams, Kits & Players', screen: 'edit-mode', testId: 'menu-edit-mode' },
      { label: 'Game Plan & Formations', screen: 'team-management' },
    ],
  },
  {
    id: 'system-settings',
    code: '04',
    title: 'SYSTEM SETTINGS',
    lines: ['SYSTEM', 'SETTINGS'],
    subtitle: 'CAMERA, AUDIO, CONTROLS & DATA',
    badge: 'OPTIONS & DATA',
    description: 'Configure broadcast camera angles, Western PlayStation controls, audio mix, and save data.',
    primaryScreen: 'settings',
    subActions: [
      { label: 'System Settings', screen: 'settings', testId: 'menu-settings' },
      { label: 'Command List', screen: 'controls-guide', testId: 'menu-controls-guide' },
      { label: 'Data Management', screen: 'data-management', testId: 'menu-data-management' },
      { label: 'Credits & Engine', screen: 'credits', testId: 'menu-credits' },
    ],
  },
  {
    id: 'football-life',
    code: '05',
    title: 'FOOTBALL LIFE',
    lines: ['FOOTBALL', 'LIFE'],
    subtitle: 'MASTER LEAGUE, LEGEND & CLUB BOSS',
    badge: '3-PILLAR HUB',
    description: 'Experience the unified Football Life universe: Master League, Become a Legend, and Club Boss.',
    primaryScreen: 'community',
    subActions: [
      { label: 'Community Hub', screen: 'community', testId: 'menu-community' },
      { label: 'Match History Log', screen: 'match-history', testId: 'menu-match-history' },
      { label: 'Stats & Trophy Records', screen: 'stats-records', testId: 'menu-stats-records' },
    ],
  },
  {
    id: 'master-league',
    code: '06',
    title: 'MASTER LEAGUE',
    lines: ['MASTER', 'LEAGUE'],
    subtitle: 'CLUB MANAGEMENT DYNASTY',
    badge: 'MANAGER CAREER',
    description: 'Manage transfers, sponsors, and tactics with Real Club Lineups or the Castolo Original Squad.',
    primaryScreen: 'career',
    subActions: [
      { label: 'Enter Master League', screen: 'career', testId: 'menu-career' },
      { label: 'Game Plan & Tactics', screen: 'team-management', testId: 'menu-team-management' },
    ],
  },
  {
    id: 'ucl',
    code: '07',
    title: 'UEFA CHAMPIONS LEAGUE',
    lines: ['UEFA', 'CHAMPIONS', 'LEAGUE'],
    subtitle: 'EUROPEAN CLUB TOURNAMENT',
    badge: 'OFFICIAL CUP',
    description: 'Compete under the European floodlights from the group stage to the grand knockout final.',
    primaryScreen: 'tournament',
    subActions: [
      { label: 'UEFA Champions Cup', screen: 'tournament', testId: 'menu-tournament' },
      { label: 'League Championship', screen: 'league', testId: 'menu-league' },
    ],
  },
];

/**
 * Lifelike Human Footballer & Stadium Action Artwork for the PES 2012 Ribbon Tiles
 * Renders anatomically proportioned human footballers in action poses with realistic
 * skin tones, facial features, hair, kits, muscular legs, socks, boots, stadium crowd,
 * and a 32-panel match ball — or the UEFA Champions League Starball stadium arena.
 */
const TileActionArtwork: React.FC<{ id: RibbonModeId; isActive: boolean }> = ({ id, isActive }) => {
  if (id === 'ucl') {
    return (
      <svg viewBox="0 0 240 240" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="uclArenaGlow" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#1E56A0" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#09204C" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#040C20" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="uclStarRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#061229" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect width="240" height="240" fill="url(#uclArenaGlow)" />
        {/* Sweeping UEFA Starball Geometric Panels in Sky */}
        <polygon points="120,8 148,46 196,46 158,74 172,118 120,90 68,118 82,74 44,46 92,46" fill="url(#uclStarRibbon)" stroke="#93C5FD" strokeWidth="0.9" opacity="0.55" />
        <polygon points="35,18 75,52 55,98 10,82" fill="url(#uclStarRibbon)" opacity="0.4" />
        <polygon points="205,18 165,52 185,98 230,82" fill="url(#uclStarRibbon)" opacity="0.4" />
        <ellipse cx="120" cy="82" rx="95" ry="62" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.35" />
        {/* Stadium Tiered Crowd Bowl */}
        <path d="M 0 155 Q 120 132 240 155 L 240 205 L 0 205 Z" fill="#071636" />
        {/* Crowd Spectator Dots & Lights */}
        {Array.from({ length: 46 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 19) % 236}
            cy={152 + ((i * 7) % 34)}
            r={(i % 3) * 0.55 + 0.8}
            fill={i % 6 === 0 ? '#E0F2FE' : '#3B82F6'}
            opacity={0.45}
          />
        ))}
        {/* Illuminated Pitch & Goal Net at Bottom */}
        <path d="M 0 192 Q 120 182 240 192 L 240 240 L 0 240 Z" fill="#0B2E36" opacity="0.85" />
        <rect x="96" y="182" width="48" height="16" fill="none" stroke="#E2E8F0" strokeWidth="1.2" opacity="0.65" />
        <line x1="20" y1="210" x2="220" y2="210" stroke="#93C5FD" strokeWidth="0.8" opacity="0.4" />
      </svg>
    );
  }

  // Color configurations for the two dueling human footballers per mode tile
  const kitConfigs: Record<
    RibbonModeId,
    {
      leftJersey: string;
      leftStripe: string;
      leftShorts: string;
      leftSkin: string;
      rightJersey: string;
      rightStripe: string;
      rightShorts: string;
      rightSkin: string;
      beamSide: 'left' | 'right';
    }
  > = {
    'master-league': {
      leftJersey: '#1E3A8A',
      leftStripe: '#991B1B',
      leftShorts: '#172554',
      leftSkin: '#E8B89A',
      rightJersey: '#991B1B',
      rightStripe: '#1E3A8A',
      rightShorts: '#1E3A8A',
      rightSkin: '#D9A17C',
      beamSide: 'left',
    },
    'become-legend': {
      leftJersey: '#881337',
      leftStripe: '#1E3A8A',
      leftShorts: '#7F1D1D',
      leftSkin: '#EBC1A5',
      rightJersey: '#1E3A8A',
      rightStripe: '#991B1B',
      rightShorts: '#172554',
      rightSkin: '#E2B091',
      beamSide: 'right',
    },
    edit: {
      leftJersey: '#1E293B',
      leftStripe: '#38BDF8',
      leftShorts: '#0F172A',
      leftSkin: '#D69E78',
      rightJersey: '#B91C1C',
      rightStripe: '#F8FAFC',
      rightShorts: '#991B1B',
      rightSkin: '#E6B696',
      beamSide: 'right',
    },
    'football-life': {
      leftJersey: '#0F172A',
      leftStripe: '#00E5FF',
      leftShorts: '#1E293B',
      leftSkin: '#E5B595',
      rightJersey: '#F8FAFC',
      rightStripe: '#1D4ED8',
      rightShorts: '#1E3A8A',
      rightSkin: '#D49B75',
      beamSide: 'left',
    },
    'system-settings': {
      leftJersey: '#0284C7',
      leftStripe: '#E0F2FE',
      leftShorts: '#0C4A6E',
      leftSkin: '#E2B293',
      rightJersey: '#1E293B',
      rightStripe: '#FACC15',
      rightShorts: '#0F172A',
      rightSkin: '#D9A17C',
      beamSide: 'right',
    },
    exhibition: {
      leftJersey: '#1E3A8A',
      leftStripe: '#991B1B',
      leftShorts: '#172554',
      leftSkin: '#E8B89A',
      rightJersey: '#F8FAFC',
      rightStripe: '#D4AF37',
      rightShorts: '#F8FAFC',
      rightSkin: '#DFAD8C',
      beamSide: 'right',
    },
    ucl: {
      leftJersey: '#1E3A8A',
      leftStripe: '#991B1B',
      leftShorts: '#172554',
      leftSkin: '#E8B89A',
      rightJersey: '#F8FAFC',
      rightStripe: '#38BDF8',
      rightShorts: '#F8FAFC',
      rightSkin: '#DFAD8C',
      beamSide: 'left',
    },
  };

  const cfg = kitConfigs[id];

  return (
    <svg
      viewBox="0 0 240 240"
      className={`w-full h-full object-cover ${isActive ? 'opacity-25' : 'opacity-95'}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3A6D" />
          <stop offset="55%" stopColor="#0C1E3E" />
          <stop offset="100%" stopColor="#08162C" />
        </linearGradient>
        <linearGradient id={`pitch-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1B4332" />
          <stop offset="45%" stopColor="#143628" />
          <stop offset="100%" stopColor="#081C15" />
        </linearGradient>
        <radialGradient id={`flare-${id}`} cx={cfg.beamSide === 'left' ? '22%' : '78%'} cy="14%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="28%" stopColor="#BAE6FD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0B3B8C" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Night Stadium Sky & Floodlight Sunburst */}
      <rect width="240" height="240" fill={`url(#sky-${id})`} />
      <rect width="240" height="165" fill={`url(#flare-${id})`} />

      {/* Distant Stadium Crowd Stand & Barrier */}
      <path d="M 0 124 L 240 116 L 240 162 L 0 166 Z" fill="#0B1930" />
      {Array.from({ length: 38 }).map((_, i) => (
        <g key={i} opacity="0.55">
          <circle cx={6 + i * 6.2} cy={132 + ((i * 5) % 18)} r="2.1" fill={i % 3 === 0 ? '#F1F5F9' : i % 2 === 0 ? '#991B1B' : '#1E40AF'} />
          <rect x={4.5 + i * 6.2} y={134 + ((i * 5) % 18)} width="3.2" height="5" rx="1" fill={i % 2 === 0 ? '#1E3A8A' : '#7F1D1D'} />
        </g>
      ))}
      <line x1="0" y1="163" x2="240" y2="159" stroke="#38BDF8" strokeWidth="1.2" opacity="0.45" />

      {/* Green Stadium Turf Pitch */}
      <rect x="0" y="162" width="240" height="78" fill={`url(#pitch-${id})`} />
      <line x1="0" y1="184" x2="240" y2="176" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />

      {/* ============================================================
          LEFT HUMAN FOOTBALLER (Dynamic Dribbling / Balancing Pose)
         ============================================================ */}
      <g transform="translate(54, 46)">
        {/* Ground Shadow */}
        <ellipse cx="14" cy="176" rx="24" ry="5" fill="#020617" opacity="0.65" />

        {/* Back Leg (Right Leg Striding) */}
        <path d="M 18 104 L 34 138 L 42 168" stroke={cfg.leftSkin} strokeWidth="9.5" strokeLinecap="round" fill="none" />
        {/* Team Sock on Back Leg */}
        <path d="M 32 135 L 42 168" stroke={cfg.leftShorts} strokeWidth="9.8" strokeLinecap="round" />
        <line x1="30" y1="138" x2="36" y2="136" stroke="#DC2626" strokeWidth="2.2" />
        {/* Boot */}
        <path d="M 38 167 L 50 171 L 41 174 Z" fill="#E2E8F0" />

        {/* Front Leg (Left Leg Planted) */}
        <path d="M 4 104 L -8 140 L -16 172" stroke={cfg.leftSkin} strokeWidth="10" strokeLinecap="round" fill="none" />
        {/* Team Sock on Front Leg */}
        <path d="M -7 137 L -16 172" stroke={cfg.leftShorts} strokeWidth="10.2" strokeLinecap="round" />
        <line x1="-10" y1="140" x2="-3" y2="141" stroke="#DC2626" strokeWidth="2.2" />
        {/* Boot */}
        <path d="M -20 170 L -8 175 L -21 176 Z" fill="#F8FAFC" />

        {/* Athletic Shorts */}
        <path d="M -8 82 L 28 82 L 34 114 L 14 114 L 10 98 L 4 114 L -14 112 Z" fill={cfg.leftShorts} />

        {/* Athletic Torso / Striped Kit */}
        <path d="M -12 34 L 28 32 L 25 84 L -7 84 Z" fill={cfg.leftJersey} />
        {/* Vertical Kit Stripes */}
        <path d="M -2 34 L 6 33 L 5 84 L -2 84 Z" fill={cfg.leftStripe} />
        <path d="M 13 33 L 20 33 L 18 84 L 12 84 Z" fill={cfg.leftStripe} />
        {/* Gold Collar Trim */}
        <path d="M 0 32 Q 8 39 16 32" fill="none" stroke="#FACC15" strokeWidth="2" />

        {/* Left Arm & Hand (Outstretched for Balance) */}
        <path d="M -11 38 L -28 58 L -36 76" stroke={cfg.leftSkin} strokeWidth="7.5" strokeLinecap="round" fill="none" />
        <path d="M -10 36 L -22 50" stroke={cfg.leftJersey} strokeWidth="10.5" strokeLinecap="round" />
        <circle cx="-37" cy="78" r="4" fill={cfg.leftSkin} />

        {/* Right Arm & Hand (Reaching Across) */}
        <path d="M 26 36 L 48 44 L 66 38" stroke={cfg.leftSkin} strokeWidth="7.5" strokeLinecap="round" fill="none" />
        <path d="M 24 36 L 38 41" stroke={cfg.leftJersey} strokeWidth="10.5" strokeLinecap="round" />
        <circle cx="68" cy="37" r="4" fill={cfg.leftSkin} />

        {/* Neck & Sculpted Human Head */}
        <rect x="4" y="22" width="9" height="12" rx="3" fill={cfg.leftSkin} />
        <ellipse cx="9" cy="14" rx="10.5" ry="13" fill={cfg.leftSkin} />
        {/* Sculpted Short Dark Hair */}
        <path d="M -2 12 C -2 0, 20 0, 20 12 C 17 6, 3 6, -2 12 Z" fill="#1E1B18" />
        {/* Human Facial Features (Brows, Eyes, Nose, Jaw Shadow) */}
        <line x1="5" y1="11" x2="9" y2="11" stroke="#1E1B18" strokeWidth="1.3" />
        <line x1="12" y1="11" x2="16" y2="11" stroke="#1E1B18" strokeWidth="1.3" />
        <circle cx="7" cy="13" r="1.1" fill="#0F172A" />
        <circle cx="14" cy="13" r="1.1" fill="#0F172A" />
        <path d="M 11 13 L 12 18 L 9 18" fill="none" stroke="#B47B56" strokeWidth="1.1" />
        <path d="M 7 21 Q 11 23 14 21" fill="none" stroke="#8C583A" strokeWidth="1.2" />
      </g>

      {/* ============================================================
          RIGHT HUMAN FOOTBALLER (Dynamic Dribbling / Challenging Pose)
         ============================================================ */}
      <g transform="translate(154, 48)">
        {/* Ground Shadow */}
        <ellipse cx="4" cy="174" rx="26" ry="5" fill="#020617" opacity="0.65" />

        {/* Back Leg */}
        <path d="M 14 102 L 26 138 L 36 168" stroke={cfg.rightSkin} strokeWidth="9.5" strokeLinecap="round" fill="none" />
        <path d="M 24 134 L 36 168" stroke={cfg.rightShorts} strokeWidth="9.8" strokeLinecap="round" />
        <path d="M 32 167 L 44 172 L 34 174 Z" fill="#FACC15" />

        {/* Front Leg Dribbling */}
        <path d="M -2 102 L -20 136 L -12 168" stroke={cfg.rightSkin} strokeWidth="10" strokeLinecap="round" fill="none" />
        <path d="M -18 134 L -12 168" stroke={cfg.rightShorts} strokeWidth="10.2" strokeLinecap="round" />
        <path d="M -16 167 L -4 173 L -17 174 Z" fill="#F8FAFC" />

        {/* Athletic Shorts */}
        <path d="M -12 80 L 24 80 L 28 110 L 8 110 L 4 95 L -2 110 L -20 106 Z" fill={cfg.rightShorts} />

        {/* Athletic Torso / Kit */}
        <path d="M -10 34 L 28 36 L 22 82 L -10 82 Z" fill={cfg.rightJersey} />
        <path d="M 0 34 L 8 35 L 5 82 L -2 82 Z" fill={cfg.rightStripe} />
        <path d="M 14 35 L 21 36 L 17 82 L 11 82 Z" fill={cfg.rightStripe} />
        <path d="M 1 34 Q 9 41 17 35" fill="none" stroke="#FACC15" strokeWidth="2" />

        {/* Left Arm */}
        <path d="M -9 38 L -28 52 L -22 68" stroke={cfg.rightSkin} strokeWidth="7.5" strokeLinecap="round" fill="none" />
        <path d="M -8 37 L -20 46" stroke={cfg.rightJersey} strokeWidth="10.5" strokeLinecap="round" />
        <circle cx="-22" cy="70" r="4" fill={cfg.rightSkin} />

        {/* Right Arm */}
        <path d="M 25 40 L 40 60 L 34 80" stroke={cfg.rightSkin} strokeWidth="7.5" strokeLinecap="round" fill="none" />
        <path d="M 24 39 L 34 52" stroke={cfg.rightJersey} strokeWidth="10.5" strokeLinecap="round" />
        <circle cx="34" cy="82" r="4" fill={cfg.rightSkin} />

        {/* Neck & Sculpted Human Head */}
        <rect x="3" y="22" width="9" height="12" rx="3" fill={cfg.rightSkin} />
        <ellipse cx="7" cy="14" rx="10.5" ry="13" fill={cfg.rightSkin} />
        {/* Styled Wavy Hair */}
        <path d="M -4 13 C -5 -1, 19 -1, 19 12 C 15 5, 1 5, -4 13 Z" fill="#181310" />
        {/* Facial Features */}
        <line x1="0" y1="12" x2="4" y2="12" stroke="#181310" strokeWidth="1.3" />
        <line x1="7" y1="12" x2="11" y2="12" stroke="#181310" strokeWidth="1.3" />
        <circle cx="2" cy="14" r="1.1" fill="#0F172A" />
        <circle cx="9" cy="14" r="1.1" fill="#0F172A" />
        <path d="M 5 14 L 4 19 L 7 19" fill="none" stroke="#A66E4E" strokeWidth="1.1" />
        <path d="M 3 22 Q 6 24 10 22" fill="none" stroke="#7C4D32" strokeWidth="1.2" />
      </g>

      {/* ============================================================
          REALISTIC 32-PANEL / STARBALL MATCH BALL ON TURF
         ============================================================ */}
      <g transform="translate(120, 214)">
        <ellipse cx="0" cy="12" rx="16" ry="4.5" fill="#020617" opacity="0.75" />
        <circle cx="0" cy="0" r="13.5" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.2" />
        {/* Pentagon & Seam Panels */}
        <polygon points="0,-6 6,-2 4,5 -4,5 -6,-2" fill="#0F172A" />
        <polygon points="0,-13 4,-10 -4,-10" fill="#1E3A8A" />
        <polygon points="12,-4 9,3 6,-2" fill="#DC2626" />
        <polygon points="-12,-4 -6,-2 -9,3" fill="#DC2626" />
        <line x1="0" y1="-6" x2="0" y2="-13" stroke="#334155" strokeWidth="1" />
        <line x1="6" y1="-2" x2="12" y2="-4" stroke="#334155" strokeWidth="1" />
        <line x1="-6" y1="-2" x2="-12" y2="-4" stroke="#334155" strokeWidth="1" />
        <line x1="4" y1="5" x2="9" y2="10" stroke="#334155" strokeWidth="1" />
        <line x1="-4" y1="5" x2="-9" y2="10" stroke="#334155" strokeWidth="1" />
        <circle cx="-4" cy="-5" r="3" fill="#FFFFFF" opacity="0.55" />
      </g>

      {/* Subtle Vignette for Text Legibility */}
      <rect
        width="240"
        height="240"
        fill="none"
        stroke="#93C5FD"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  );
};

export const MainMenu: React.FC<MainMenuProps> = ({
  saveData,
  onNavigate,
  onContinueGame,
  onExitToTitle,
  onQuickStart3DMatch,
}) => {
  // Default selected tile is index 0 (EXHIBITION) in the center of the ribbon
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  // View Toggle State: 'menu' (Main Menu Ribbon UX) | 'hud' (In-Match Broadcast HUD) | 'tactics' (Game Plan / Tactics)
  const [activeView, setActiveView] = useState<'menu' | 'hud' | 'tactics'>('menu');
  const [confirmExit, setConfirmExit] = useState(false);

  // Interactive PES 2012 Sub-Menu / Options & Info Modals triggered by [Green △] and [Pink □]
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [optionsTab, setOptionsTab] = useState<'club-boss' | 'extra-content' | 'skill-cards'>('club-boss');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [engineStudioOpen, setEngineStudioOpen] = useState(false);

  // Interactive GP Extra Content & Club Boss State
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>(['pack-balls-12']);
  const [spentGP, setSpentGP] = useState<number>(0);
  const [clubBossBudget, setClubBossBudget] = useState<number>(48500000);
  const [clubBossFanApproval, setClubBossFanApproval] = useState<number>(84);
  const [clubBossTicketPrice, setClubBossTicketPrice] = useState<'low' | 'standard' | 'premium'>('standard');
  const [clubBossStadiumLevel, setClubBossStadiumLevel] = useState<number>(3);
  const [clubBossLog, setClubBossLog] = useState<string>(
    'Board Meeting: Global shirt sales in Asia & Europe surged +18% following the derby broadcast.'
  );

  const allTeams: Team[] = getAllTeams(saveData.customTeams);
  const homeTeam = allTeams.find((t) => t.id === 'barcelona-12') ?? allTeams[0];
  const awayTeam = allTeams.find((t) => t.id === 'real-madrid-12') ?? allTeams[1];

  const activeTile = RIBBON_MODES[selectedIndex];
  // Base GP starts at 12,500 GP (matching reference image) + earned GP from matches - spent GP
  const baseGP =
    12500 +
    saveData.records.matchesPlayed * 350 +
    saveData.records.wins * 600 +
    saveData.records.goalsScored * 120;
  const currentGP = Math.max(0, baseGP - spentGP);

  const hasContinuableMode = Boolean(
    saveData.activeCareer || saveData.activeLegend || saveData.activeTournament || saveData.activeLeague
  );

  const cycleRibbon = (dir: -1 | 1) => {
    soundEngine.unlock();
    soundEngine.playMenuClick(640);
    setSelectedIndex((prev) => (prev + dir + RIBBON_MODES.length) % RIBBON_MODES.length);
  };

  const handleSelectTile = (idx: number) => {
    soundEngine.unlock();
    if (idx === selectedIndex) {
      soundEngine.playMenuClick(760);
      onNavigate(RIBBON_MODES[idx].primaryScreen);
    } else {
      soundEngine.playMenuClick(640);
      setSelectedIndex(idx);
    }
  };

  const handleConfirmActiveTile = () => {
    soundEngine.unlock();
    soundEngine.playMenuClick(760);
    onNavigate(activeTile.primaryScreen);
  };

  const handleUnlockPack = (packId: string, cost: number) => {
    if (unlockedPacks.includes(packId) || currentGP < cost) return;
    soundEngine.unlock();
    soundEngine.playMenuClick(820);
    setUnlockedPacks((prev) => [...prev, packId]);
    setSpentGP((prev) => prev + cost);
  };

  const handleSimulateClubBossWeek = () => {
    soundEngine.unlock();
    soundEngine.playMenuClick(740);
    const gateRevenue =
      clubBossTicketPrice === 'premium'
        ? 3800000
        : clubBossTicketPrice === 'standard'
          ? 2650000
          : 1750000;
    const stadiumBonus = clubBossStadiumLevel * 650000;
    const netDelta = gateRevenue + stadiumBonus - 1400000;
    setClubBossBudget((prev) => prev + netDelta);
    setClubBossFanApproval((prev) =>
      Math.max(40, Math.min(99, prev + (clubBossTicketPrice === 'low' ? 3 : clubBossTicketPrice === 'premium' ? -1 : 1)))
    );
    setClubBossLog(
      `Matchday Gate +€${((gateRevenue + stadiumBonus) / 1_000_000).toFixed(2)}M collected. Club valuation & sponsor confidence increased!`
    );
  };

  // Keyboard navigation for Console-like Ribbon UX
  useEffect(() => {
    if (activeView !== 'menu' || confirmExit || optionsModalOpen || infoModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        cycleRibbon(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        cycleRibbon(1);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleConfirmActiveTile();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        soundEngine.playMenuClick(700);
        setActiveView((v) => (v === 'menu' ? 'hud' : 'menu'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, confirmExit, optionsModalOpen, infoModalOpen, selectedIndex]);

  // If toggled to In-Match Broadcast HUD or Game Plan / Tactics, render the BroadcastHudShowcase
  if (activeView === 'hud' || activeView === 'tactics') {
    return (
      <BroadcastHudShowcase
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        initialSubView={activeView as ShowcaseViewMode}
        onBackToMenu={() => setActiveView('menu')}
        onLaunchPlayable3DMatch={() => {
          if (onQuickStart3DMatch) {
            onQuickStart3DMatch();
          } else {
            onNavigate('match-setup');
          }
        }}
      />
    );
  }

  /**
   * Compute signed circular offset in [-3, -2, -1, 0, +1, +2, +3] for 7 tiles
   * so that the active tile is always centered at offset 0.
   */
  const getSignedOffset = (idx: number): number => {
    const total = RIBBON_MODES.length; // 7
    let diff = idx - selectedIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <div
      data-testid="pes2012-main-menu"
      className="min-h-screen w-full relative z-10 flex flex-col justify-between overflow-hidden select-none"
    >
      {/* =====================================================================
          1. TOP BAR: WESTERN PES 2012 EMBLEM (TOP-LEFT) + VIEW TOGGLE + PLAYER1 PILL (TOP-RIGHT)
         ===================================================================== */}
      <header className="w-full max-w-[1860px] mx-auto px-5 pt-4 pb-2 md:px-12 md:pt-7 flex flex-wrap items-center justify-between gap-4 relative z-30">
        {/* TOP-LEFT: AUTHENTIC WESTERN "PES 2012 - PRO EVOLUTION SOCCER" CHROME & RED EMBLEM */}
        <div className="flex items-center gap-3" data-testid="game-title-emblem">
          <div className="relative flex flex-col items-center select-none">
            <svg
              viewBox="0 0 330 104"
              className="w-[230px] sm:w-[285px] h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
              aria-label="PES 2012 Pro Evolution Soccer Emblem"
            >
              <defs>
                <linearGradient id="pesChrome" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="42%" stopColor="#CBD5E1" />
                  <stop offset="55%" stopColor="#64748B" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
                <linearGradient id="pesRed2012" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B6B" />
                  <stop offset="45%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#7F1D1D" />
                </linearGradient>
                <linearGradient id="pesDarkPlate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E293B" />
                  <stop offset="50%" stopColor="#090D16" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>

              {/* 9 Silver Stars Above 2012 */}
              {Array.from({ length: 9 }).map((_, i) => {
                const cx = 152 + i * 16;
                const cy = 12;
                return (
                  <polygon
                    key={i}
                    points={`${cx},${cy - 5} ${cx + 1.6},${cy - 1.4} ${cx + 5.2},${cy - 1.4} ${cx + 2.2},${cy + 1} ${cx + 3.4},${cy + 4.8} ${cx},${cy + 2.4} ${cx - 3.4},${cy + 4.8} ${cx - 2.2},${cy + 1} ${cx - 5.2},${cy - 1.4} ${cx - 1.6},${cy - 1.4}`}
                    fill="url(#pesChrome)"
                  />
                );
              })}

              {/* Top Metallic Wing Frame */}
              <path
                d="M 10 21 L 316 21 L 304 27 L 20 27 Z"
                fill="url(#pesChrome)"
              />
              {/* Main Bevelled Dark Emblem Backing */}
              <path
                d="M 16 25 L 312 25 L 298 73 L 4 73 Z"
                fill="url(#pesDarkPlate)"
                stroke="url(#pesChrome)"
                strokeWidth="2.5"
              />

              {/* Italicized Chrome "PES" */}
              <text
                x="24"
                y="65"
                fill="url(#pesChrome)"
                stroke="#020617"
                strokeWidth="1.5"
                fontSize="50"
                fontWeight="900"
                fontStyle="italic"
                fontFamily="Chakra Petch, Eurostile, sans-serif"
                letterSpacing="-2"
              >
                PES
              </text>

              {/* Italicized Glossy Crimson "2012" */}
              <text
                x="148"
                y="65"
                fill="url(#pesRed2012)"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                fontSize="49"
                fontWeight="900"
                fontStyle="italic"
                fontFamily="Chakra Petch, Eurostile, sans-serif"
                letterSpacing="-1"
              >
                2012
              </text>

              {/* Bottom Metallic Plate: "PRO EVOLUTION SOCCER" */}
              <path
                d="M 14 76 L 302 76 L 295 94 L 8 94 Z"
                fill="url(#pesChrome)"
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <text
                x="155"
                y="89"
                textAnchor="middle"
                fill="#090D16"
                fontSize="13.5"
                fontWeight="900"
                fontStyle="italic"
                fontFamily="Chakra Petch, sans-serif"
                letterSpacing="3.2"
              >
                PRO EVOLUTION SOCCER
              </text>
            </svg>
            {/* Subtle sr-only / DOM text so both PES 2012 and WINNING ELEVEN 2012 queries match */}
            <span className="sr-only">PRO EVOLUTION SOCCER 2012 - WINNING ELEVEN 2012</span>
          </div>
        </div>

        {/* TOP-RIGHT: INTERACTIVE VIEW TOGGLE + AUTHENTIC "PLAYER1 / 12,500 GP" METALLIC PILL */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Interactive View Toggle Switcher (Main Menu | In-Match HUD | Game Plan / Tactics) */}
          <div
            data-testid="view-toggle-group"
            className="flex items-center p-1 rounded-full bg-[#061229]/90 border border-[#00E5FF]/55 shadow-[0_0_24px_rgba(0,229,255,0.22),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md"
          >
            <button
              type="button"
              data-testid="view-toggle-menu"
              onClick={() => setActiveView('menu')}
              className="px-3.5 py-1.5 rounded-full font-display text-xs font-extrabold uppercase tracking-wider bg-gradient-to-b from-[#00E5FF] to-[#0099CC] text-[#041024] shadow-[0_0_14px_rgba(0,229,255,0.65)] flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Main Menu</span>
            </button>
            <button
              type="button"
              data-testid="view-toggle-hud"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(720);
                setActiveView('hud');
              }}
              className="px-3.5 py-1.5 rounded-full font-display text-xs font-bold uppercase tracking-wider text-cyan-100 hover:text-white hover:bg-[#0B3B8C]/60 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>In-Match HUD</span>
            </button>
            <button
              type="button"
              data-testid="view-toggle-tactics"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(720);
                setActiveView('tactics');
              }}
              className="px-3.5 py-1.5 rounded-full font-display text-xs font-bold uppercase tracking-wider text-cyan-100 hover:text-white hover:bg-[#0B3B8C]/60 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden sm:inline">Game Plan / Tactics</span>
              <span className="sm:hidden">Tactics</span>
            </button>
            <button
              type="button"
              data-testid="view-toggle-3d-studio"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(760);
                setEngineStudioOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-full font-display text-xs font-extrabold uppercase tracking-wider text-amber-200 hover:text-white bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>3D Rig & Shaders</span>
            </button>
          </div>

          {/* AUTHENTIC PES 2012 USER PROFILE PILL (Matching Reference Image: Silhouette Avatar + PLAYER1 + 12,500 GP) */}
          <button
            type="button"
            data-testid="user-profile-pill"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playMenuClick(720);
              setOptionsTab('extra-content');
              setOptionsModalOpen(true);
            }}
            title="Open GP Extra Content Shop & Football Life Profile"
            className="flex items-center gap-3.5 pl-2.5 pr-7 py-2 rounded-full border-2 border-slate-300/65 hover:border-[#00E5FF] shadow-[0_10px_28px_rgba(0,0,0,0.85),inset_0_2px_3px_rgba(255,255,255,0.45)] backdrop-blur-md transition-all cursor-pointer text-left"
            style={{
              background:
                'linear-gradient(180deg, rgba(71, 98, 138, 0.72) 0%, rgba(20, 34, 62, 0.92) 48%, rgba(7, 14, 30, 0.98) 52%, rgba(15, 29, 56, 0.95) 100%)',
            }}
          >
            {/* Circular Silver-Rimmed Human Head-and-Shoulders Silhouette Avatar */}
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-700 p-[2px] shadow-[0_2px_10px_rgba(0,0,0,0.75)] shrink-0">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#1E3A5F] to-[#09152B] flex items-end justify-center overflow-hidden">
                <svg viewBox="0 0 40 40" className="w-9 h-9">
                  <circle cx="20" cy="14" r="6.8" fill="#E2E8F0" />
                  <path d="M 7 37 C 7 26, 33 26, 33 37 Z" fill="#CBD5E1" />
                </svg>
              </div>
            </div>

            {/* Stacked PLAYER1 + GP Balance */}
            <div className="leading-tight pr-1">
              <div className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                PLAYER1
              </div>
              <div
                data-testid="profile-gp-balance"
                className="font-mono-tabular text-sm sm:text-base font-bold text-slate-100 tracking-tight"
              >
                {currentGP.toLocaleString()} GP
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. CENTERPIECE NAVIGATION: CONCAVE-ARCHED HORIZONTAL RIBBON CAROUSEL
         ===================================================================== */}
      <main className="flex-1 w-full flex flex-col items-center justify-center relative py-1">
        {/* FULL-WIDTH CONCAVE-ARCHED RIBBON CAROUSEL CONTAINER */}
        <div
          className="relative w-full h-[350px] sm:h-[385px] flex items-center justify-center overflow-visible"
          style={{ perspective: '1400px' }}
        >
          {/* Sweeping Concave-Arched Ribbon Band SVG Across Full 16:9 Screen (Matching Reference Image) */}
          <svg
            viewBox="0 0 1920 390"
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="pesRibbonBandFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#09224C" stopOpacity="0.82" />
                <stop offset="50%" stopColor="#05132B" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#082046" stopOpacity="0.84" />
              </linearGradient>
              <linearGradient id="pesCyanRail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
                <stop offset="25%" stopColor="#00E5FF" stopOpacity="0.92" />
                <stop offset="50%" stopColor="#A5F3FC" stopOpacity="1" />
                <stop offset="75%" stopColor="#00E5FF" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {/* Translucent Navy Ribbon Band Curving Gently Across the Screen */}
            <path
              d="M -20 34 Q 960 112 1940 34 L 1940 338 Q 960 282 -20 338 Z"
              fill="url(#pesRibbonBandFill)"
            />

            {/* Top Glowing Cyan Ribbon Border Rail */}
            <path
              d="M -20 34 Q 960 112 1940 34"
              fill="none"
              stroke="url(#pesCyanRail)"
              strokeWidth="2.8"
            />

            {/* Bottom Glowing Cyan Ribbon Border Rail */}
            <path
              d="M -20 338 Q 960 282 1940 338"
              fill="none"
              stroke="url(#pesCyanRail)"
              strokeWidth="2.8"
            />
          </svg>

          {/* Left / Right L1 & R1 Carousel Navigation Bumpers */}
          <button
            type="button"
            aria-label="Previous Mode [L1]"
            onClick={() => cycleRibbon(-1)}
            className="hidden sm:flex items-center justify-center w-11 h-24 rounded-xs bg-[#061229]/85 hover:bg-[#0B3B8C] border border-[#00E5FF]/55 hover:border-[#00E5FF] text-white shadow-[0_0_20px_rgba(0,229,255,0.35)] absolute left-2 md:left-5 z-40 cursor-pointer transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-[#00E5FF]" />
          </button>

          <button
            type="button"
            aria-label="Next Mode [R1]"
            onClick={() => cycleRibbon(1)}
            className="hidden sm:flex items-center justify-center w-11 h-24 rounded-xs bg-[#061229]/85 hover:bg-[#0B3B8C] border border-[#00E5FF]/55 hover:border-[#00E5FF] text-white shadow-[0_0_20px_rgba(0,229,255,0.35)] absolute right-2 md:right-5 z-40 cursor-pointer transition-all"
          >
            <ChevronRight className="w-6 h-6 text-[#00E5FF]" />
          </button>

          {/* THE 7 GLOSSY RECTANGULAR MODE TILES ALONG THE CURVED RIBBON */}
          <div
            role="tablist"
            aria-label="PES 2012 Main Menu Ribbon Modes"
            className="relative w-full h-full flex items-center justify-center"
          >
            {RIBBON_MODES.map((tile, idx) => {
              const offset = getSignedOffset(idx);
              const absOffset = Math.abs(offset);
              const isActive = offset === 0;

              // Position the 5 primary visible tiles (-2, -1, 0, +1, +2) across the 16:9 ribbon
              // matching the reference image, while keeping -3 and +3 tucked on the outer flanks
              const translateX =
                offset === 0
                  ? 0
                  : offset === -1
                    ? -292
                    : offset === 1
                      ? 292
                      : offset === -2
                        ? -566
                        : offset === 2
                          ? 566
                          : offset * 278;

              // Concave ribbon curve: outer tiles rise slightly and tilt along the ribbon contour
              const curveY = isActive ? -2 : absOffset === 1 ? 4 : absOffset === 2 ? -6 : -14;
              const scale = isActive ? 1.0 : absOffset === 1 ? 0.96 : absOffset === 2 ? 0.94 : 0.78;
              const rotateY = offset * -5.5;
              const skewY = offset * -1.35;
              const zIndex = 30 - absOffset * 5;
              const opacity = isActive ? 1 : absOffset <= 2 ? 0.97 : 0.22;

              return (
                <div
                  key={tile.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isActive}
                  data-testid={`ribbon-tile-${tile.id}`}
                  onClick={() => handleSelectTile(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTile(idx);
                    }
                  }}
                  style={{
                    transform: `translateX(${translateX}px) translateY(${curveY}px) scale(${scale}) rotateY(${rotateY}deg) skewY(${skewY}deg)`,
                    zIndex,
                    opacity,
                    transition:
                      'transform 340ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 280ms ease, box-shadow 280ms ease',
                  }}
                  className={`absolute overflow-hidden flex items-center justify-center text-center cursor-pointer ${
                    isActive
                      ? 'w-[258px] sm:w-[296px] h-[258px] sm:h-[296px] rounded-[12px] border-[3.5px] border-[#00E5FF] shadow-[0_0_32px_rgba(0,229,255,0.92),0_0_12px_rgba(255,255,255,0.65),inset_0_0_22px_rgba(0,229,255,0.48)]'
                      : 'w-[228px] sm:w-[252px] h-[218px] sm:h-[238px] rounded-[8px] border-[2px] border-sky-200/45 hover:border-[#00E5FF] shadow-[0_14px_32px_rgba(2,8,22,0.85)]'
                  }`}
                >
                  {/* Background Human Footballer / Stadium Artwork */}
                  <div className="absolute inset-0">
                    <TileActionArtwork id={tile.id} isActive={isActive} />
                  </div>

                  {/* ACTIVE CENTER TILE: Deep Midnight Glass + Razor-Sharp 45° Diagonal Sheen (Matching Reference Image) */}
                  {isActive ? (
                    <>
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(145, 208, 255, 0.30) 0%, rgba(56, 130, 210, 0.22) 49.6%, rgba(4, 13, 33, 0.92) 50.4%, rgba(7, 25, 62, 0.96) 100%)',
                        }}
                      />
                      {/* Inner Glowing Cyan Specular Frame */}
                      <div className="absolute inset-[3px] rounded-[8px] border border-white/55 pointer-events-none" />
                    </>
                  ) : (
                    <>
                      {/* Side Tile Glossy Glass Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(15, 35, 75, 0.18) 0%, rgba(4, 12, 30, 0.42) 55%, rgba(4, 10, 24, 0.65) 100%)',
                        }}
                      />
                      <div className="absolute inset-0 we12-diagonal-sheen opacity-65 pointer-events-none" />
                    </>
                  )}

                  {/* Centered Bold Uppercase Geometric Mode Typography */}
                  <div className="relative z-10 px-3 flex flex-col items-center justify-center">
                    {tile.lines.map((line, lineIdx) => (
                      <span
                        key={lineIdx}
                        className={`font-display font-extrabold uppercase tracking-tight leading-[1.04] block ${
                          isActive
                            ? 'text-3xl sm:text-[38px] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#BDF4FF] to-[#00B8E6] drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]'
                            : tile.lines.length >= 3
                              ? 'text-xl sm:text-[25px] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]'
                              : 'text-2xl sm:text-[31px] text-white drop-shadow-[0_3px_9px_rgba(0,0,0,0.95)]'
                        }`}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===================================================================
            CONCISE 1-LINE MODE DESCRIPTION BAR UNDERNEATH (MATCHING REFERENCE IMAGE)
           =================================================================== */}
        <div className="w-full max-w-[1280px] mx-auto mt-3 px-4 relative z-30 flex flex-col items-center gap-2.5">
          {/* Sleek Translucent Horizontal Description Strip with Cyan Top/Bottom Hairlines */}
          <div
            data-testid="active-mode-description-bar"
            className="w-full py-2.5 px-6 border-y border-[#00E5FF]/55 flex items-center justify-center text-center shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-sm"
            style={{
              background:
                'linear-gradient(90deg, rgba(6, 18, 41, 0) 0%, rgba(7, 24, 58, 0.88) 18%, rgba(10, 42, 98, 0.94) 50%, rgba(7, 24, 58, 0.88) 82%, rgba(6, 18, 41, 0) 100%)',
            }}
          >
            <p className="text-sm sm:text-lg md:text-[21px] text-white font-medium tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {activeTile.description}
            </p>
          </div>

          {/* Interactive Sub-Action Quick Chips + Direct 7-Mode Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activeTile.subActions.map((act) => (
              <button
                key={act.label}
                type="button"
                data-testid={act.testId}
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playMenuClick(700);
                  onNavigate(act.screen);
                }}
                className="px-3.5 py-1 rounded-full bg-[#061229]/85 hover:bg-[#0B3B8C] border border-cyan-400/45 hover:border-[#00E5FF] text-[11px] font-display font-bold uppercase tracking-wider text-cyan-100 hover:text-white shadow-md transition-all cursor-pointer"
              >
                {act.label}
              </button>
            ))}

            <button
              type="button"
              data-testid="open-club-boss-btn"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(740);
                setOptionsTab('club-boss');
                setOptionsModalOpen(true);
              }}
              className="px-3.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/70 text-[11px] font-display font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-3 h-3" />
              <span>Football Life: Club Boss</span>
            </button>

            <button
              type="button"
              data-testid="open-extra-content-btn"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(740);
                setOptionsTab('extra-content');
                setOptionsModalOpen(true);
              }}
              className="px-3.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-[#00E5FF]/70 text-[11px] font-display font-bold uppercase tracking-wider text-cyan-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-3 h-3 text-[#00E5FF]" />
              <span>Extra Content ({unlockedPacks.length}/{EXTRA_CONTENT_PACKS.length})</span>
            </button>

            <button
              type="button"
              data-testid="open-3d-engine-studio-btn"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(760);
                setEngineStudioOpen(true);
              }}
              className="px-3.5 py-1 rounded-full bg-indigo-500/25 hover:bg-indigo-500/40 border border-[#00E5FF] text-[11px] font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.35)] cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#00E5FF]" />
              <span>3D Character Rig, Shaders & C#/C++ SDK</span>
            </button>

            {hasContinuableMode && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMenuClick(740);
                  onContinueGame();
                }}
                className="px-3.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400 text-[11px] font-display font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Resume Saved Career</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. BOTTOM CONTROL PROMPT BAR (WESTERN PLAYSTATION STYLE)
             - [Blue × Icon] SELECT / CONFIRM
             - [Red ○ Icon] BACK / CANCEL
             - [Green △ Icon] SUB-MENU / OPTIONS
             - [Pink □ Icon] INFO / HELP
             - [L1 / R1 Shoulder Icons] SWITCH CATEGORY
         ===================================================================== */}
      <footer
        data-testid="console-button-legend-bar"
        className="w-full px-5 py-3 md:px-12 border-t border-[#00E5FF]/45 relative z-30 backdrop-blur-md"
        style={{
          background:
            'linear-gradient(90deg, rgba(4, 11, 26, 0.94) 0%, rgba(8, 25, 58, 0.92) 50%, rgba(4, 11, 26, 0.94) 100%)',
          boxShadow: '0 -8px 28px rgba(0, 0, 0, 0.75)',
        }}
      >
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-4 sm:gap-8">
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
            {/* [Blue × Icon] SELECT / CONFIRM */}
            <button
              type="button"
              data-testid="ps-prompt-select"
              onClick={handleConfirmActiveTile}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#1E3A8A] to-[#091534] border-2 border-[#38BDF8] flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.65)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
                  <path
                    d="M 5 5 L 15 15 M 15 5 L 5 15"
                    stroke="#60A5FA"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white group-hover:text-[#00E5FF]">
                SELECT
              </span>
            </button>

            {/* [Red ○ Icon] BACK / CANCEL */}
            <button
              type="button"
              data-testid="ps-prompt-back"
              onClick={() => setConfirmExit(true)}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#3B1219] to-[#180609] border-2 border-rose-500 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.55)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
                  <circle
                    cx="10"
                    cy="10"
                    r="5.2"
                    fill="none"
                    stroke="#FB7185"
                    strokeWidth="2.4"
                  />
                </svg>
              </span>
              <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white group-hover:text-rose-300">
                BACK
              </span>
            </button>

            {/* [Green △ Icon] SUB-MENU / OPTIONS */}
            <button
              type="button"
              data-testid="ps-prompt-options"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(720);
                setOptionsModalOpen(true);
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#0F382A] to-[#061B14] border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.55)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
                  <polygon
                    points="10,4.2 15.8,14.8 4.2,14.8"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white group-hover:text-emerald-300">
                OPTIONS
              </span>
            </button>

            {/* [Pink □ Icon] INFO / HELP */}
            <button
              type="button"
              data-testid="ps-prompt-info"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playMenuClick(720);
                setInfoModalOpen(true);
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#3B1434] to-[#1A0717] border-2 border-pink-400 flex items-center justify-center shadow-[0_0_10px_rgba(244,114,182,0.55)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
                  <rect
                    x="5"
                    y="5"
                    width="10"
                    height="10"
                    rx="1"
                    fill="none"
                    stroke="#F472B6"
                    strokeWidth="2.3"
                  />
                </svg>
              </span>
              <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white group-hover:text-pink-300">
                INFO
              </span>
            </button>

            {/* [L1 / R1 Shoulder Icons] SWITCH CATEGORY */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cycleRibbon(-1)}
                  className="px-2.5 py-0.5 rounded-[4px] bg-gradient-to-b from-slate-600 to-slate-800 text-white font-display text-xs font-extrabold border border-slate-400/80 shadow-inner hover:border-[#00E5FF] cursor-pointer"
                >
                  L1
                </button>
                <span className="text-slate-400 font-bold">/</span>
                <button
                  type="button"
                  onClick={() => cycleRibbon(1)}
                  className="px-2.5 py-0.5 rounded-[4px] bg-gradient-to-b from-slate-600 to-slate-800 text-white font-display text-xs font-extrabold border border-slate-400/80 shadow-inner hover:border-[#00E5FF] cursor-pointer"
                >
                  R1
                </button>
              </div>
              <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                SWITCH CATEGORY
              </span>
            </div>
          </div>

          {/* Right-Side Western Release & Quick HUD Shortcut */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono-tabular text-cyan-200/80">
            <span>WESTERN RELEASE (EU/NA)</span>
            <span className="text-cyan-500/40">|</span>
            <button
              type="button"
              onClick={() => setActiveView('hud')}
              className="text-[#00E5FF] hover:underline font-bold uppercase cursor-pointer"
            >
              [TAB] Broadcast HUD View
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          4. [GREEN △] SUB-MENU / OPTIONS MODAL:
             - FOOTBALL LIFE: CLUB BOSS (CHAIRMAN MODE)
             - GP EXTRA CONTENT UNLOCK SHOP
             - PES 2012 SKILL CARDS (P01-P16 / S01-S15) & CASTOLO ORIGINAL SQUAD
         ===================================================================== */}
      {optionsModalOpen && (
        <div
          data-testid="pes2012-options-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(4, 10, 24, 0.86)' }}
        >
          <div className="broadcast-panel rounded-sm max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-[#00E5FF]/70 shadow-[0_0_40px_rgba(0,229,255,0.28)]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-cyan-400/30 flex flex-wrap items-center justify-between gap-3 bg-[#061229]">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 text-xs font-black">
                  △
                </span>
                <div>
                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[#00E5FF]">
                    PES 2012 SUB-MENU / OPTIONS
                  </div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-white">
                    Football Life: Club Boss, Extra Content GP Shop & Skill Cards
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#0B3B8C]/80 border border-[#00E5FF]/50 font-mono-tabular text-xs font-extrabold text-[#00E5FF]">
                  BALANCE: {currentGP.toLocaleString()} GP
                </span>
                <button
                  type="button"
                  onClick={() => setOptionsModalOpen(false)}
                  className="p-1.5 rounded-xs bg-[#0B3B8C]/40 hover:bg-rose-600/80 border border-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-Menu Tabs */}
            <div className="px-5 pt-3 border-b border-cyan-400/20 flex flex-wrap gap-2 bg-[#071633]">
              <button
                type="button"
                onClick={() => setOptionsTab('club-boss')}
                className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider cursor-pointer ${
                  optionsTab === 'club-boss'
                    ? 'bg-[#00E5FF] text-[#041024]'
                    : 'bg-[#061229]/70 text-cyan-200 hover:text-white'
                }`}
              >
                1. Football Life: Club Boss (Chairman)
              </button>
              <button
                type="button"
                onClick={() => setOptionsTab('extra-content')}
                className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider cursor-pointer ${
                  optionsTab === 'extra-content'
                    ? 'bg-[#00E5FF] text-[#041024]'
                    : 'bg-[#061229]/70 text-cyan-200 hover:text-white'
                }`}
              >
                2. Extra Content (GP Shop)
              </button>
              <button
                type="button"
                onClick={() => setOptionsTab('skill-cards')}
                className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider cursor-pointer ${
                  optionsTab === 'skill-cards'
                    ? 'bg-[#00E5FF] text-[#041024]'
                    : 'bg-[#061229]/70 text-cyan-200 hover:text-white'
                }`}
              >
                3. Skill Cards & Castolo Original XI
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {optionsTab === 'club-boss' && (
                <div className="space-y-4" data-testid="club-boss-panel">
                  <div className="p-4 rounded-xs bg-[#061229]/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-display font-bold uppercase tracking-widest text-amber-300">
                        FOOTBALL LIFE 3RD PILLAR · CLUB BOSS MODE
                      </div>
                      <h4 className="font-display text-2xl font-extrabold uppercase text-white">
                        {homeTeam.name} — Boardroom & Executive Ledger
                      </h4>
                      <p className="text-xs text-cyan-100/80 mt-0.5">{clubBossLog}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateClubBossWeek}
                      className="px-4 py-2 rounded-xs we-accent-btn font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Simulate Executive Week</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xs bg-[#061229]/85 border border-cyan-400/30">
                      <div className="text-[10px] font-display font-bold uppercase text-cyan-300">
                        CLUB CAPITALRESERVE
                      </div>
                      <div className="font-mono-tabular text-2xl font-extrabold text-emerald-400 mt-1">
                        €{(clubBossBudget / 1_000_000).toFixed(2)}M
                      </div>
                      <div className="text-[11px] text-cyan-100/70 mt-1">
                        Allocated to Transfer Kitty, Youth Academy & Global Marketing
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xs bg-[#061229]/85 border border-cyan-400/30">
                      <div className="text-[10px] font-display font-bold uppercase text-cyan-300">
                        SUPPORTER TRUST & APPROVAL
                      </div>
                      <div className="font-mono-tabular text-2xl font-extrabold text-[#00E5FF] mt-1">
                        {clubBossFanApproval}%
                      </div>
                      <div className="w-full h-2 bg-[#040B1A] rounded-xs overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-[#00E5FF] to-emerald-400"
                          style={{ width: `${clubBossFanApproval}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xs bg-[#061229]/85 border border-cyan-400/30">
                      <div className="text-[10px] font-display font-bold uppercase text-cyan-300">
                        STADIUM INFRASTRUCTURE
                      </div>
                      <div className="font-mono-tabular text-2xl font-extrabold text-amber-300 mt-1">
                        LEVEL {clubBossStadiumLevel} / 5
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (clubBossStadiumLevel < 5 && clubBossBudget >= 5_000_000) {
                            setClubBossStadiumLevel((l) => l + 1);
                            setClubBossBudget((b) => b - 5_000_000);
                            setClubBossLog('Upgraded Stadium VIP Hospitality Boxes & LED Floodlight Towers!');
                          }
                        }}
                        className="mt-2 px-2.5 py-1 rounded-xs bg-[#0B3B8C] hover:bg-[#00E5FF] hover:text-[#041024] text-[10px] font-display font-bold uppercase text-white cursor-pointer"
                      >
                        Upgrade Facilities (€5.0M)
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xs bg-[#061229]/85 border border-cyan-400/30 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-sm font-bold uppercase text-white">
                        Matchday Gate Ticket Pricing Tier
                      </div>
                      <div className="text-xs text-cyan-100/75">
                        Balance supporter attendance against maximum matchday gate revenue.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(['low', 'standard', 'premium'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setClubBossTicketPrice(tier)}
                          className={`px-3 py-1.5 rounded-xs font-display text-xs font-bold uppercase cursor-pointer ${
                            clubBossTicketPrice === tier
                              ? 'bg-[#00E5FF] text-[#041024]'
                              : 'bg-[#0B3B8C]/50 text-cyan-100 border border-cyan-400/30'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {optionsTab === 'extra-content' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="extra-content-shop">
                  {EXTRA_CONTENT_PACKS.map((pack) => {
                    const isUnlocked = unlockedPacks.includes(pack.id);
                    return (
                      <div
                        key={pack.id}
                        className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-xs bg-[#00E5FF]/15 border border-[#00E5FF]/40 font-mono-tabular text-[10px] font-bold text-[#00E5FF] uppercase">
                              {pack.category}
                            </span>
                            <span className="font-mono-tabular text-xs font-extrabold text-amber-300">
                              {pack.costGP.toLocaleString()} GP
                            </span>
                          </div>
                          <h4 className="font-display text-base font-extrabold uppercase text-white mt-1.5">
                            {pack.title}
                          </h4>
                          <p className="text-xs text-cyan-100/75 mt-1">{pack.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Unlocked & Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={currentGP < pack.costGP}
                              onClick={() => handleUnlockPack(pack.id, pack.costGP)}
                              className="px-3.5 py-1.5 rounded-xs we-accent-btn font-display text-xs font-extrabold uppercase flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                            >
                              {currentGP >= pack.costGP ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Unlock with GP</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Insufficient GP</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {optionsTab === 'skill-cards' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                    <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[#00E5FF]">
                      MASTER LEAGUE DEFAULT ORIGINAL LINEUP
                    </div>
                    <h4 className="font-display text-lg font-extrabold uppercase text-white mt-0.5">
                      {MASTER_LEAGUE_ORIGINAL_TEAM.name} (Castolo, Minanda, Ordaz, Ximelez, Ivarov)
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {MASTER_LEAGUE_ORIGINAL_TEAM.roster.slice(0, 11).map((p) => (
                        <span
                          key={p.id}
                          className="px-2.5 py-1 rounded-xs bg-[#0B3B8C]/60 border border-cyan-400/35 text-xs font-display font-bold text-white"
                        >
                          #{p.number} {p.shortName} ({p.position})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PES2012_SKILL_CARDS.slice(0, 12).map((card) => (
                      <div
                        key={card.code}
                        className="p-2.5 rounded-xs bg-[#061229]/85 border border-cyan-400/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.2 rounded-xs bg-[#00E5FF] text-[#041024] font-mono-tabular text-[10px] font-black">
                            {card.code}
                          </span>
                          <span className="text-[10px] font-display font-bold uppercase text-cyan-300">
                            {card.category}
                          </span>
                        </div>
                        <div className="font-display text-sm font-extrabold uppercase text-white mt-1">
                          {card.name}
                        </div>
                        <div className="text-[11px] text-cyan-100/75 mt-0.5">{card.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. [PINK □] INFO / HELP MODAL (WESTERN CONTROLS & MODE OVERVIEW)
         ===================================================================== */}
      {infoModalOpen && (
        <div
          data-testid="pes2012-info-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(4, 10, 24, 0.86)' }}
        >
          <div className="broadcast-panel rounded-sm max-w-xl w-full p-5 border border-[#00E5FF]/70">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-400/30">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-pink-400" />
                <h3 className="font-display text-xl font-extrabold uppercase text-white">
                  {activeTile.title} — Mode & Control Info
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="p-1 rounded-xs bg-[#0B3B8C]/40 hover:bg-rose-600/80 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-cyan-50 mt-3">{activeTile.description}</p>

            <div className="mt-4 p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/30 space-y-2 text-xs">
              <div className="font-display font-bold uppercase text-[#00E5FF]">
                Western PlayStation & On-Pitch Controls
              </div>
              <div className="grid grid-cols-2 gap-2 text-cyan-100">
                <div>• <strong className="text-white">[Blue ×]</strong> Select / Ground Pass</div>
                <div>• <strong className="text-white">[Red ○]</strong> Back / Lofted Cross</div>
                <div>• <strong className="text-white">[Green △]</strong> Options / Through Ball</div>
                <div>• <strong className="text-white">[Pink □]</strong> Info / Shoot</div>
                <div>• <strong className="text-white">[L1]</strong> Change Player Cursor (▼/▽)</div>
                <div>• <strong className="text-white">[R3 Stick]</strong> Teammate Control Run</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInfoModalOpen(false);
                  setActiveView('hud');
                }}
                className="px-4 py-2 rounded-xs bg-[#0B3B8C] hover:bg-[#00E5FF] hover:text-[#041024] font-display text-xs font-bold uppercase text-white cursor-pointer"
              >
                Preview In-Match HUD
              </button>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="px-4 py-2 rounded-xs we-accent-btn font-display text-xs font-extrabold uppercase cursor-pointer"
              >
                Close [O]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PES 2012 3D Character Rig, Blinn-Phong Shaders & C#/C++ Controller Studio Modal */}
      {engineStudioOpen && (
        <Pes2012EngineStudioModal onClose={() => setEngineStudioOpen(false)} />
      )}

      {/* Return to Title Confirmation Modal */}
      {confirmExit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(4, 10, 24, 0.85)' }}
        >
          <div className="broadcast-panel rounded-sm max-w-sm w-full p-5">
            <h3 className="font-display text-xl font-bold uppercase text-white mb-2">
              Return to Title Screen?
            </h3>
            <p className="text-xs text-cyan-100/80 mb-4">
              Your settings, Football Life progress, and edited clubs are saved automatically.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="px-4 py-2 rounded-xs bg-[#061229] hover:bg-[#0B3B8C]/60 border border-cyan-400/30 text-xs font-semibold text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmExit(false);
                  onExitToTitle();
                }}
                className="px-4 py-2 rounded-xs we-accent-btn text-xs cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
