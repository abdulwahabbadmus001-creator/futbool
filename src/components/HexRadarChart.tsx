import React from 'react';
import { PlayerAttributes } from '../types/football';

interface HexRadarChartProps {
  attributes: PlayerAttributes;
  size?: number;
  accentColor?: string;
}

const AXES: { label: string; getValue: (a: PlayerAttributes) => number }[] = [
  { label: 'SPD', getValue: (a) => a.pace },
  { label: 'ACC', getValue: (a) => Math.min(99, Math.round(a.pace * 0.65 + a.dribbling * 0.35)) },
  { label: 'PWR', getValue: (a) => Math.min(99, Math.round(a.shooting * 0.65 + a.physical * 0.35)) },
  { label: 'TEC', getValue: (a) => a.dribbling },
  { label: 'STA', getValue: (a) => Math.min(99, Math.round(a.physical * 0.7 + a.pace * 0.3)) },
  { label: 'DEF', getValue: (a) => Math.max(a.defending, a.goalkeeping > 50 ? a.goalkeeping : a.defending) },
  { label: 'PAS', getValue: (a) => a.passing },
];

export const HexRadarChart: React.FC<HexRadarChartProps> = ({
  attributes,
  size = 188,
  accentColor = '#FF6B00',
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const count = AXES.length;

  const pointAt = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
      x: cx + Math.cos(angle) * radius * ratio,
      y: cy + Math.sin(angle) * radius * ratio,
    };
  };

  const ringLevels = [0.33, 0.66, 1.0];
  const valuePoints = AXES.map((axis, idx) => {
    const raw = Math.max(20, Math.min(99, axis.getValue(attributes)));
    return pointAt(idx, raw / 99);
  });

  const valuePolygon = valuePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none overflow-visible">
      {ringLevels.map((lvl) => {
        const pts = AXES.map((_, idx) => pointAt(idx, lvl))
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ');
        return (
          <polygon
            key={lvl}
            points={pts}
            fill={lvl === 1 ? 'rgba(15, 23, 42, 0.65)' : 'none'}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth={1}
          />
        );
      })}

      {AXES.map((axis, idx) => {
        const edge = pointAt(idx, 1);
        const labelPt = pointAt(idx, 1.24);
        const val = axis.getValue(attributes);
        return (
          <g key={axis.label}>
            <line
              x1={cx}
              y1={cy}
              x2={edge.x}
              y2={edge.y}
              stroke="rgba(148, 163, 184, 0.22)"
              strokeWidth={1}
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#cbd5e1"
              fontSize={9}
              fontWeight={800}
              fontFamily="Barlow Condensed, sans-serif"
            >
              {axis.label}
            </text>
            <text
              x={labelPt.x}
              y={labelPt.y + 9}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={val >= 85 ? '#FF8C00' : '#94a3b8'}
              fontSize={8}
              fontWeight={700}
            >
              {val}
            </text>
          </g>
        );
      })}

      <polygon
        points={valuePolygon}
        fill={`${accentColor}44`}
        stroke={accentColor}
        strokeWidth={2}
      />

      {valuePoints.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r={2.5} fill="#ffffff" stroke={accentColor} strokeWidth={1.2} />
      ))}
    </svg>
  );
};
