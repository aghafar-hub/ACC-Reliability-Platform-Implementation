// apps/owner-center/src/components/ui-v2/charts/DonutChart.tsx
// Premium donut — thicker ring, center numeral, compact legend. No chart
// library dependency — hand-rolled SVG, consistent with platform constraint.

import React from 'react';

export interface DonutSlice {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export interface DonutChartProps {
  readonly title: string;
  readonly slices: readonly DonutSlice[];
}

export function DonutChart({ title, slices }: DonutChartProps): React.ReactElement {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const size = 132;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;

  const arcs = slices.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * 360 : 0;
    const start = angle;
    angle += sweep;
    const startRad = (start * Math.PI) / 180;
    const endRad = ((start + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = sweep > 180 ? 1 : 0;
    const d = sweep <= 0 ? '' : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...slice, d };
  });

  return (
    <div className="accv2-chart">
      <h3 className="accv2-chart__title">{title}</h3>
      {total === 0 ? (
        <p className="accv2-chart__empty">No data</p>
      ) : (
        <div className="accv2-chart__body">
          <svg className="accv2-chart__svg accv2-chart__svg--donut" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
            {arcs.map((a) => (a.d ? <path key={a.label} d={a.d} fill={a.color} /> : null))}
            <circle cx={cx} cy={cy} r={r * 0.6} fill="var(--accv2-surface)" />
            <text x={cx} y={cy + 5} className="accv2-chart__center" textAnchor="middle">{total}</text>
          </svg>
          <ul className="accv2-chart__legend">
            {slices.map((s) => (
              <li key={s.label}>
                <span className="accv2-chart__swatch" style={{ background: s.color }} />
                {s.label} <strong>{s.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
