import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center we12-bg-radial text-slate-100 p-6">
      <div className="w-16 h-16 rounded-full border-4 border-[#0B3B8C] border-t-[#00E5FF] animate-spin mb-6 shadow-[0_0_24px_rgba(0,229,255,0.45)]" />
      <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight uppercase text-white">
        WINNING ELEVEN <span className="text-[#00E5FF]">2012</span>
      </h1>
      <p className="text-sm text-cyan-200/80 mt-2">
        Initializing stadium floodlights, 2011/12 club rosters, and broadcast HUD...
      </p>
    </div>
  );
};
