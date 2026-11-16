import React, { useEffect, useMemo, useRef } from 'react';
import { CursorColorTier, GraphicsQuality, StadiumConfig } from '../types/football';
import { StadiumSceneController } from '../game/renderer/StadiumScene';

interface StadiumBackgroundProps {
  stadium: StadiumConfig;
  cursorColor: CursorColorTier;
  graphicsQuality: GraphicsQuality;
  resolutionScale: number;
  blurred?: boolean;
}

export const StadiumBackground: React.FC<StadiumBackgroundProps> = ({
  stadium,
  cursorColor,
  graphicsQuality,
  resolutionScale,
  blurred = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, idx) => ({
        id: idx,
        left: `${(idx * 37 + 9) % 96 + 2}%`,
        top: `${(idx * 53 + 5) % 86 + 6}%`,
        size: (idx % 4) + 2,
        delay: `${(idx * 0.42).toFixed(2)}s`,
        duration: `${4.8 + (idx % 5) * 1.1}s`,
        isCyan: idx % 3 !== 0,
      })),
    []
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let controller: StadiumSceneController | null = null;
    try {
      controller = new StadiumSceneController({
        container,
        stadium,
        cursorColor,
        graphicsQuality,
        resolutionScale,
        cameraPreset: 'wide',
        cameraDistance: 1,
        cameraHeight: 1,
        simulation: null,
        inputManager: null,
        pausedRef,
      });
    } catch {
      // Fallback if WebGL context is unavailable
    }

    return () => {
      controller?.dispose();
    };
  }, [stadium, cursorColor, graphicsQuality, resolutionScale]);

  return (
    <div
      data-testid="global-stadium-bg"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse 95% 75% at 50% 34%, #0B3B8C 0%, #072257 46%, #061229 86%, #030814 100%)',
      }}
    >
      {/* Live 3D WebGL Stadium Layer */}
      <div
        ref={mountRef}
        className={`absolute inset-0 transition-opacity duration-500 ${
          blurred ? 'opacity-30 blur-[5px]' : 'opacity-70 blur-[1px]'
        }`}
      />

      {/* PES 2012 Authentic Night Stadium Architecture & Turf Pitch */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          blurred ? 'blur-[2.5px] scale-[1.01]' : 'blur-0 scale-100'
        }`}
      >
        {/* Deep Midnight Sky & Stadium Roof Overhang */}
        <div
          className="absolute inset-x-0 top-0 h-[56%]"
          style={{
            background:
              'radial-gradient(ellipse 85% 65% at 50% 32%, rgba(11, 59, 140, 0.72) 0%, rgba(6, 18, 41, 0.96) 72%, #020712 100%)',
          }}
        />

        {/* Curved Stadium Upper Canopy Silhouette */}
        <svg
          viewBox="0 0 1920 420"
          className="absolute inset-x-0 top-0 w-full h-[38%] opacity-85"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 0 L 1920 0 L 1920 190 Q 960 95 0 190 Z"
            fill="#030917"
          />
          <path
            d="M 0 188 Q 960 93 1920 188"
            fill="none"
            stroke="rgba(148, 197, 255, 0.22)"
            strokeWidth="2"
          />
        </svg>

        {/* Left Multi-Bulb Rectangular Stadium Floodlight Bank */}
        <div
          className="absolute top-[17%] left-[23%] sm:left-[25%] -translate-x-1/2 animate-floodlight"
          style={{ transform: 'perspective(500px) rotateY(14deg) rotateZ(-6deg)' }}
        >
          {/* Volumetric Floodlight Bloom */}
          <div
            className="absolute -inset-24 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.65) 0%, rgba(0,229,255,0.35) 32%, rgba(11,59,140,0.12) 62%, transparent 78%)',
            }}
          />
          {/* Rectangular 3x8 Bulb Matrix */}
          <div className="relative px-2.5 py-1.5 rounded-xs bg-white/90 border border-cyan-200 shadow-[0_0_32px_#FFFFFF,0_0_64px_#00E5FF] grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#00E5FF]"
              />
            ))}
          </div>
        </div>

        {/* Right Multi-Bulb Rectangular Stadium Floodlight Bank */}
        <div
          className="absolute top-[17%] right-[23%] sm:right-[25%] translate-x-1/2 animate-floodlight"
          style={{
            transform: 'perspective(500px) rotateY(-14deg) rotateZ(6deg)',
            animationDelay: '1.8s',
          }}
        >
          <div
            className="absolute -inset-24 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.68) 0%, rgba(0,229,255,0.38) 32%, rgba(11,59,140,0.14) 62%, transparent 78%)',
            }}
          />
          <div className="relative px-2.5 py-1.5 rounded-xs bg-white/90 border border-cyan-200 shadow-[0_0_32px_#FFFFFF,0_0_64px_#00E5FF] grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#00E5FF]"
              />
            ))}
          </div>
        </div>

        {/* Top-Right Corner Floodlight Sunburst & Diagonal Bokeh Lens Flare Orbs (Matches Reference Image) */}
        <div
          className="absolute -top-24 -right-24 w-[460px] h-[420px]"
          style={{
            background:
              'radial-gradient(circle at 65% 35%, rgba(255,255,255,0.92) 0%, rgba(186,230,253,0.58) 22%, rgba(0,229,255,0.24) 45%, transparent 72%)',
          }}
        />
        {/* Lens Flare Bokeh Circles along the diagonal from top-right floodlight */}
        <div className="absolute top-[20%] right-[16.5%] w-6 h-6 rounded-full bg-[#00E5FF]/45 border border-cyan-200/60 blur-[0.5px] shadow-[0_0_14px_#00E5FF]" />
        <div className="absolute top-[23.5%] right-[19.5%] w-3.5 h-3.5 rounded-full bg-cyan-200/55 blur-[0.5px]" />
        <div className="absolute top-[28%] right-[24%] w-10 h-10 rounded-full bg-[#00E5FF]/18 border border-cyan-300/30" />
        <div className="absolute top-[19%] left-[31%] w-8 h-8 rounded-full bg-[#00E5FF]/22 border border-cyan-300/30" />

        {/* Distant Human Supporter Crowd Tiers & Horizon Flashbulbs */}
        <div
          className="absolute inset-x-0 top-[44%] h-[14%]"
          style={{
            background:
              'radial-gradient(ellipse 90% 90% at 50% 80%, rgba(11, 59, 140, 0.55) 0%, rgba(6, 18, 41, 0.92) 100%)',
          }}
        />

        {/* Perspective Blurred Night Stadium Grass Pitch (Bottom 42% of Viewport) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[43%]"
          style={{
            background: `
              radial-gradient(ellipse 80% 70% at 50% 15%, rgba(42, 118, 58, 0.72) 0%, rgba(21, 71, 36, 0.85) 52%, rgba(7, 24, 22, 0.96) 100%),
              repeating-linear-gradient(
                180deg,
                #1d5b2d 0px,
                #1d5b2d 28px,
                #164823 28px,
                #164823 56px
              )
            `,
          }}
        >
          {/* Perspective Pitch Chalk Lines: Vertical Halfway Line & Center Circle (Exact Reference Match) */}
          <svg
            viewBox="0 0 1920 460"
            className="w-full h-full opacity-75"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chalkLineFade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.78" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Horizon Touchline */}
            <line
              x1="0"
              y1="18"
              x2="1920"
              y2="18"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="2"
            />
            {/* Perspective Center Circle Ellipse */}
            <ellipse
              cx="960"
              cy="155"
              rx="430"
              ry="52"
              fill="none"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="5"
            />
            {/* Center Kickoff Spot */}
            <ellipse
              cx="960"
              cy="155"
              rx="14"
              ry="5"
              fill="rgba(255,255,255,0.65)"
            />
            {/* Iconic Vertical Chalk Halfway Line Running Down Center */}
            <polygon
              points="956,18 964,18 978,460 942,460"
              fill="url(#chalkLineFade)"
            />
          </svg>
        </div>
      </div>

      {/* Subtle Floating Stadium Light Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full animate-particle"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              backgroundColor: p.isCyan ? '#00E5FF' : '#FFFFFF',
              boxShadow: p.isCyan
                ? '0 0 10px 2px rgba(0, 229, 255, 0.72)'
                : '0 0 8px 2px rgba(255, 255, 255, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Dark Blue / Midnight Navy Vignette Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 88% 80% at 50% 48%, transparent 48%, rgba(6, 18, 41, 0.62) 80%, rgba(3, 9, 22, 0.92) 100%)',
        }}
      />
    </div>
  );
};
