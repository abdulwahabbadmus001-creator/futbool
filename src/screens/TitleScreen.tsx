import React, { useEffect } from 'react';
import { soundEngine } from '../game/audio/soundEngine';

interface TitleScreenProps {
  onStart: () => void;
  onQuickExhibition: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onQuickExhibition }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundEngine.unlock();
        soundEngine.playMenuClick(740);
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none">
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(6, 18, 41, 0.94) 0%, rgba(11, 59, 140, 0.62) 55%, rgba(6, 18, 41, 0.25) 100%)',
        }}
      />

      <div className="relative z-10 max-w-2xl pt-6 md:pt-12 pointer-events-auto">
        <div className="flex items-center gap-4 mb-3" aria-label="WORLD SOCCER: WINNING ELEVEN 2012">
          <svg viewBox="0 0 96 124" className="w-16 h-20 sm:w-20 sm:h-24 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="we12Cyan" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#0B3B8C" />
              </linearGradient>
            </defs>
            <path
              d="M12 10 H84 V68 C84 100 48 118 48 118 C48 118 12 100 12 68 Z"
              fill="#061229"
              stroke="url(#we12Cyan)"
              strokeWidth="4"
            />
            <circle cx="48" cy="56" r="21" fill="none" stroke="#f8fafc" strokeWidth="2.5" />
            <polygon points="48,39 60,48 55,62 41,62 36,48" fill="#00E5FF" />
          </svg>

          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.26em] text-[#00E5FF] leading-none mb-1.5">
              WORLD SOCCER · PRO EVOLUTION SOCCER
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pb-2 border-b-2 border-[#00E5FF]">
              <h1 className="font-display text-4xl sm:text-6xl font-extrabold uppercase tracking-tight text-white leading-none">
                WINNING ELEVEN <span className="text-[#00E5FF]">2012</span>
              </h1>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-semibold tracking-[0.14em] text-cyan-100/85 uppercase mb-5">
          UEFA Champions League · Master League · Become a Legend · Football Life
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playMenuClick(740);
              onStart();
            }}
            className="px-8 py-3.5 rounded-sm we-accent-btn font-display text-xl tracking-wider uppercase shadow-lg cursor-pointer transition-transform active:scale-95"
          >
            Press [X] / Enter to Start
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playMenuClick(700);
              onQuickExhibition();
            }}
            className="px-6 py-3.5 rounded-sm bg-[#061229]/90 hover:bg-[#0B3B8C]/80 border border-[#00E5FF]/60 text-white font-display text-lg font-bold tracking-wider uppercase cursor-pointer"
          >
            Quick Kick-Off
          </button>
        </div>
      </div>

      <div className="relative z-10 text-xs text-cyan-100/80 tracking-wide pointer-events-auto">
        [X] Select · [O] Back · [L1/R1] Switch Category · [△] Game Plan · [□] In-Match HUD
      </div>
    </div>
  );
};
