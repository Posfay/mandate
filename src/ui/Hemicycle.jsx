// Parliament seating diagram. Seats are laid out in concentric rows and filled left→right by ideology.
import { useEffect, useMemo, useState } from 'react';

const CX = 100;
const CY = 100;
const RAD = 95;

function layout(total) {
  const rows = total <= 160 ? 6 : total <= 360 ? 9 : total <= 520 ? 11 : 13;
  const r0 = 0.36;
  const r1 = 1;
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((r1 - r0) * i) / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.floor((total * r) / sumR));
  let left = total - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; left > 0; i = (i - 1 + rows) % rows, left--) counts[i]++;
  const seats = [];
  radii.forEach((r, ri) => {
    const n = counts[ri];
    for (let j = 0; j < n; j++) {
      const a = Math.PI * (1 - (n === 1 ? 0.5 : j / (n - 1)));
      seats.push({ a, r, x: CX + RAD * r * Math.cos(a), y: CY - RAD * r * Math.sin(a) });
    }
  });
  seats.sort((p, q) => q.a - p.a || p.r - q.r);
  const rowGap = (RAD * (r1 - r0)) / (rows - 1);
  return { seats, dot: rowGap * 0.4 };
}

export default function Hemicycle({ parties, total, result, expected, highlight, govIds = [], centerLabel, centerSub, animate = true, onDone }) {
  const { seats, dot } = useMemo(() => layout(total), [total]);
  const [reveal, setReveal] = useState(result && animate ? 0 : 1);

  useEffect(() => {
    if (!result || !animate) {
      setReveal(1);
      return undefined;
    }
    setReveal(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setReveal(1);
      onDone?.();
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const dur = 2400;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setReveal(k);
      if (k < 1) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  // assign each seat to a party (and a vote)
  const assigned = useMemo(() => {
    const out = [];
    let i = 0;
    for (const p of parties) {
      const yesN = result?.byParty?.[p.id]?.yes ?? 0;
      const expN = expected ? Math.round((expected[p.id] ?? 0) * p.seats) : null;
      for (let k = 0; k < p.seats && i < seats.length; k++, i++) out.push({ ...seats[i], party: p, vote: result ? (k < yesN ? 'yes' : 'no') : null, likely: expN == null ? null : k < expN, idx: i });
    }
    return out;
  }, [parties, seats, result, expected]);

  // reveal votes in a sweeping order from the centre outward, like a division bell count
  const order = useMemo(() => {
    const idx = assigned.map((s, i) => i);
    idx.sort((a, b) => Math.abs(assigned[a].a - Math.PI / 2) - Math.abs(assigned[b].a - Math.PI / 2));
    const rank = new Array(assigned.length);
    idx.forEach((v, k) => (rank[v] = k / Math.max(1, idx.length - 1)));
    return rank;
  }, [assigned]);

  return (
    <svg className="hemi" viewBox="0 0 200 106" role="img" aria-label="Parliament seating diagram">
      {assigned.map((s, i) => {
        let fill = s.party.color;
        let op = 1;
        if (result && order[i] <= reveal) fill = s.vote === 'yes' ? '#5EC3A0' : '#E8656C';
        else if (result) op = 0.3;
        else if (s.likely === false) op = 0.22;
        if (highlight && s.party.id !== highlight) op *= 0.25;
        const gov = govIds.includes(s.party.id);
        return <circle key={i} cx={s.x} cy={s.y} r={dot} fill={fill} opacity={op} stroke={gov && !result ? 'rgba(233,205,143,0.55)' : 'none'} strokeWidth={gov && !result ? 0.35 : 0} />;
      })}
      {centerLabel != null && (
        <>
          <text x={CX} y={CY - 13} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fill: 'var(--text)' }}>{centerLabel}</text>
          {centerSub && <text x={CX} y={CY - 5} textAnchor="middle" style={{ fontSize: 4.4, fill: 'var(--text-3)' }}>{centerSub}</text>}
        </>
      )}
    </svg>
  );
}
