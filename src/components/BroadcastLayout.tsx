import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { soundEngine } from '../game/audio/soundEngine';

interface BroadcastLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHome?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export const BroadcastLayout: React.FC<BroadcastLayoutProps> = ({
  title,
  subtitle,
  onBack,
  onHome,
  rightAction,
  children,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col carbon-bg text-slate-100 relative z-10">
      <header className="broadcast-header-bar px-4 md:px-8 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1 basis-full sm:basis-auto">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuClick(540);
                onBack();
              }}
              aria-label="Go Back"
              className="p-2 rounded bg-[#061229]/90 hover:bg-[#0B3B8C]/70 border border-cyan-400/35 hover:border-[#00E5FF] text-cyan-100 transition-colors cursor-pointer shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            >
              <ArrowLeft className="w-4 h-4 text-[#00E5FF]" />
            </button>
          )}
          <div className="min-w-0 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[#00E5FF] to-[#0B3B8C] rounded-sm shrink-0 shadow-[0_0_10px_#00E5FF]" />
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight uppercase text-white leading-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-cyan-200/80 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          {rightAction}
          {onHome && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuClick(580);
                onHome();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#061229]/90 hover:bg-[#0B3B8C]/80 border border-cyan-400/35 hover:border-[#00E5FF] text-xs font-semibold text-cyan-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Ribbon Menu</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
