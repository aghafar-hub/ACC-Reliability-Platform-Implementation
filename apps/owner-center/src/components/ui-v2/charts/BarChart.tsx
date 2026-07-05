// apps/owner-center/src/components/ui-v2/charts/BarChart.tsx
// Grouped bar chart — used for Contractor Comparison (alert/caution/normal per contractor).

import React from 'react';

export interface BarGroup {
  readonly label: string;
  readonly alert: number;
  readonly caution: number;
  readonly normal: number;
}

export interface BarChartProps {
  readonly title: string;
  readonly groups: readonly BarGroup[];
}

export function BarChart({ title, groups }: BarChartProps): React.ReactElement {
  const width = 260;
  const height = 138;
  const pad = { top: 10, right: 8, bottom: 24, left: 8 };
  const max = Math.max(...groups.flatMap((g) => [g.alert, g.caution, g.normal]), 1);
  const groupW = (width - pad.left - pad.right) / Math.max(groups.length, 1);
  const barW = Math.min(12, groupW / 4);

  return (
    <div className="accv2-chart">
      <h3 className="accv2-chart__title">{title}</h3>
      {groups.length === 0 ? (
        <p className="accv2-chart__empty">No data</p>
      ) : (
        <>
          <svg className="accv2-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            {groups.map((g, i) => {
              const gx = pad.left + i * groupW + groupW / 2;
              const series = [
                { v: g.alert, color: 'var(--accv2-status-alert)' },
                { v: g.caution, color: 'var(--accv2-status-caution)' },
                { v: g.normal, color: 'var(--accv2-status-normal)' },
              ];
              return (
                <g key={g.label}>
                  {series.map((s, j) => {
                    const h = (s.v / max) * (height - pad.top - pad.bottom);
                    const x = gx - barW * 1.5 + j * (barW + 2);
                    const y = height - pad.bottom - h;
                    return <rect key={j} x={x} y={y} width={barW} height={h} rx={2} fill={s.color} />;
                  })}
                  <text x={gx} y={height - 6} className="accv2-chart__axis-label" textAnchor="middle">{g.label}</text>
                </g>
              );
            })}
          </svg>
          <ul className="accv2-chart__legend accv2-chart__legend--inline">
            <li><span className="accv2-chart__swatch" style={{ background: 'var(--accv2-status-alert)' }} />Alert</li>
            <li><span className="accv2-chart__swatch" style={{ background: 'var(--accv2-status-caution)' }} />Caution</li>
            <li><span className="accv2-chart__swatch" style={{ background: 'var(--accv2-status-normal)' }} />Normal</li>
          </ul>
        </>
      )}
    </div>
  );
}
