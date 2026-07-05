// apps/owner-center/src/components/ui-v2/charts/LineChart.tsx
// Premium sparkline-style trend chart with filled area under the line.

import React from 'react';

export interface LineChartProps {
  readonly title: string;
  readonly labels: readonly string[];
  readonly values: readonly number[];
}

export function LineChart({ title, labels, values }: LineChartProps): React.ReactElement {
  const width = 260;
  const height = 128;
  const pad = { top: 10, right: 8, bottom: 20, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...values, 1);

  const points = values.map((v, i) => {
    const x = pad.left + (i / Math.max(values.length - 1, 1)) * innerW;
    const y = pad.top + innerH - (v / max) * innerH;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.[0] ?? 0} ${pad.top + innerH} L ${points[0]?.[0] ?? 0} ${pad.top + innerH} Z`;

  return (
    <div className="accv2-chart">
      <h3 className="accv2-chart__title">{title}</h3>
      {values.every((v) => v === 0) ? (
        <p className="accv2-chart__empty">No data</p>
      ) : (
        <svg className="accv2-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <path d={areaPath} fill="var(--accv2-status-info-bg)" stroke="none" />
          <path d={linePath} fill="none" stroke="var(--accv2-status-info)" strokeWidth={2} />
          {points.map(([x, y], i) => (
            <circle key={labels[i]} cx={x} cy={y} r={2.5} fill="var(--accv2-status-info)" />
          ))}
          {labels.map((label, i) => (
            <text key={label} x={points[i][0]} y={height - 4} className="accv2-chart__axis-label" textAnchor="middle">
              {label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
