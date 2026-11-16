import React from 'react';
import { BroadcastLayout } from '../components/BroadcastLayout';

interface CreditsScreenProps {
  onBack: () => void;
}

export const CreditsScreen: React.FC<CreditsScreenProps> = ({ onBack }) => {
  return (
    <BroadcastLayout
      title="Credits & System Info"
      subtitle="World Soccer: Winning Eleven 2012 · 16:9 Broadcast UI/UX & 3D Match Engine"
      onBack={onBack}
      onHome={onBack}
    >
      <div className="max-w-3xl mx-auto space-y-5 text-sm text-cyan-100/90">
        <div className="broadcast-panel rounded-sm p-6 space-y-3">
          <h2 className="font-display text-2xl font-extrabold uppercase text-[#00E5FF]">
            World Soccer: Winning Eleven 2012 (PES 2012) UI/UX & Engine
          </h2>
          <p>
            Designed for a 16:9 widescreen (1920×1080) broadcast display inspired by early-2010s Japanese sports
            broadcast aesthetics and World Soccer: Winning Eleven 2012 (PES 2012). Built with TypeScript, React,
            Tailwind CSS, Three.js, and Web Audio API synthesis.
          </p>
        </div>

        <div className="broadcast-panel rounded-sm p-6 space-y-2.5">
          <h3 className="font-display text-xl font-bold uppercase text-white">
            Implemented Systems & Visual Specifications
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm text-cyan-100/85">
            <li>
              <strong>Color Palette & Theme:</strong> Deep midnight navy (<span className="text-[#00E5FF] font-mono-tabular">#061229</span>) to royal electric blue (<span className="text-[#00E5FF] font-mono-tabular">#0B3B8C</span>) radial gradients, glowing cyan (<span className="text-[#00E5FF] font-mono-tabular">#00E5FF</span>) selection borders, glossy glassmorphism highlights, and stadium floodlight lens flares.
            </li>
            <li>
              <strong>Main Menu (Ribbon UX):</strong> Arching curved horizontal ribbon carousel with 7 mode tiles (Exhibition, UEFA Champions League, Master League, Become a Legend, Football Life, Edit, System Settings), active tile scale-up with diagonal sheen, 1-line mode description bar, user profile GP pill, and console button legend footer.
            </li>
            <li>
              <strong>In-Match Broadcast HUD & Game Plan Toggle:</strong> Top-left TV-style scorebug with team color swatches, 3-letter abbreviations, white score box, and green/black match timer (<span className="text-emerald-400 font-mono-tabular">45:00 +2</span>); bottom-center semi-transparent 2D pitch radar; and bottom-left/right player plates with green-to-yellow stamina bars and curved shot/pass power gauges.
            </li>
          </ul>
        </div>
      </div>
    </BroadcastLayout>
  );
};
