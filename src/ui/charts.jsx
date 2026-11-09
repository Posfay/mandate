// Lightweight SVG charts: sparklines, multi-series line charts and the budget flow (Sankey).
import { useMemo } from 'react';
import { fmtDateShort } from '../engine/util.js';

export function Sparkline({ data, width = 96, height = 30, color = 'var(--brass)', fill = true }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;
  const d = data.slice(-24);
  const min = Math.min(...d);
  const max = Math.max(...d);
  const span = max - min || 1;
  const pts = d.map((v, i) => [(i / (d.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {fill && <path d={`${line}L${last[0]} ${height}L2 ${height}Z`} fill={color} opacity="0.1" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

export function LineChart({ series, turns, height = 220, yFormat = (v) => v.toFixed(0), yMin, yMax, refLine }) {
  const W = 720;
  const H = height;
  const pad = { l: 38, r: 64, t: 12, b: 24 };
  const all = series.flatMap((s) => s.data);
  if (!all.length) return null;
  const lo = yMin ?? Math.min(...all, refLine ?? Infinity);
  const hi = yMax ?? Math.max(...all, refLine ?? -Infinity);
  const span = hi - lo || 1;
  const n = Math.max(...series.map((s) => s.data.length));
  const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);
  const ticks = 4;
  const labels = [];
  const step = Math.max(1, Math.ceil(n / 6));
  for (let i = 0; i < n; i += step) labels.push(i);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(', ')}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = lo + (span * i) / ticks;
        return (
          <g key={i}>
            <line className="axis" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end">{yFormat(v)}</text>
          </g>
        );
      })}
      {refLine != null && <line x1={pad.l} x2={W - pad.r} y1={y(refLine)} y2={y(refLine)} stroke="var(--brass)" strokeDasharray="4 4" opacity="0.6" />}
      {turns && labels.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{fmtDateShort(turns[i] ?? i)}</text>)}
      {series.map((s) => {
        const d = s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
        const lv = s.data[s.data.length - 1];
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeLinejoin="round" opacity={s.dim ? 0.45 : 1} />
            {lv != null && (
              <>
                <circle cx={x(s.data.length - 1)} cy={y(lv)} r="3" fill={s.color} />
                <text x={x(s.data.length - 1) + 7} y={y(lv) + 3} style={{ fill: s.color, fontWeight: 600 }}>{s.label ?? s.name}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Revenue sources → treasury → spending lines.
export function BudgetFlow({ sources, uses, height = 320 }) {
  const W = 840;
  const H = height;
  const layout = useMemo(() => {
    const totalIn = sources.reduce((a, b) => a + b.v, 0);
    const totalOut = uses.reduce((a, b) => a + b.v, 0);
    const total = Math.max(totalIn, totalOut);
    const gap = 6;
    const usable = H - 20 - gap * Math.max(sources.length, uses.length);
    const k = usable / total;
    let y = 10;
    const L = sources.map((s) => {
      const h = Math.max(2, s.v * k);
      const n = { ...s, y, h };
      y += h + gap;
      return n;
    });
    y = 10;
    const R = uses.map((s) => {
      const h = Math.max(2, s.v * k);
      const n = { ...s, y, h };
      y += h + gap;
      return n;
    });
    const midH = total * k;
    const midY = (H - midH) / 2;
    // keep labels from colliding: push each one down to at least 13px below the previous
    for (const col of [L, R]) {
      let last = -Infinity;
      for (const n of col) {
        n.ly = Math.max(n.y + n.h / 2 + 4, last + 15);
        last = n.ly;
      }
    }
    return { L, R, midY, midH, k, totalIn, totalOut };
  }, [sources, uses, H]);
  const x0 = 190;
  const x1 = 370;
  const x2 = 470;
  const x3 = 650;
  let accL = layout.midY;
  let accR = layout.midY;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Budget flow from revenue to spending">
      {layout.L.map((s) => {
        const h = s.h;
        const ty = accL;
        accL += h;
        return (
          <g key={s.id}>
            <path d={`M${x0} ${s.y} C${(x0 + x1) / 2} ${s.y} ${(x0 + x1) / 2} ${ty} ${x1} ${ty} L${x1} ${ty + h} C${(x0 + x1) / 2} ${ty + h} ${(x0 + x1) / 2} ${s.y + h} ${x0} ${s.y + h} Z`} fill={s.color} opacity={0.35} />
            <rect x={x0 - 8} y={s.y} width="8" height={h} fill={s.color} rx="2" />
            <text x={x0 - 14} y={s.ly} textAnchor="end" style={{ fill: 'var(--text-2)', fontSize: 13 }}>{s.name} <tspan style={{ fill: 'var(--text-3)' }}>{s.v.toFixed(1)}%</tspan></text>
          </g>
        );
      })}
      <rect x={x1} y={layout.midY} width={x2 - x1} height={layout.midH} fill="var(--brass)" opacity="0.18" rx="4" />
      <text x={(x1 + x2) / 2} y={layout.midY + layout.midH / 2 - 4} textAnchor="middle" style={{ fill: 'var(--brass-hi)', fontFamily: 'var(--font-display)', fontSize: 15 }}>Treasury</text>
      <text x={(x1 + x2) / 2} y={layout.midY + layout.midH / 2 + 12} textAnchor="middle" style={{ fontSize: 10.5 }}>{layout.totalOut.toFixed(1)}% of GDP</text>
      {layout.R.map((s) => {
        const h = s.h;
        const ty = accR;
        accR += h;
        return (
          <g key={s.id}>
            <path d={`M${x2} ${ty} C${(x2 + x3) / 2} ${ty} ${(x2 + x3) / 2} ${s.y} ${x3} ${s.y} L${x3} ${s.y + h} C${(x2 + x3) / 2} ${s.y + h} ${(x2 + x3) / 2} ${ty + h} ${x2} ${ty + h} Z`} fill={s.color} opacity={0.3} />
            <rect x={x3} y={s.y} width="8" height={h} fill={s.color} rx="2" />
            <text x={x3 + 14} y={s.ly} style={{ fill: 'var(--text-2)', fontSize: 13 }}>{s.name} <tspan style={{ fill: 'var(--text-3)' }}>{s.v.toFixed(1)}%</tspan></text>
          </g>
        );
      })}
    </svg>
  );
}
