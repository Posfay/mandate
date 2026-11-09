// The living electorate: every particle is a slice of the population, placed on the political
// compass by its voter bloc and pulled toward the party it would vote for today. When opinion
// moves, you watch people physically cross the room.
import { useEffect, useRef } from 'react';

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());

function quotas(fracs, n) {
  const raw = fracs.map((f) => f * n);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left-- > 0) out[i]++;
  });
  return out;
}

export default function Swarm({ blocs, parties, polls, govIds = [], mode = 'party', highlight, count = 1500, stamp, onHoverBloc, compact }) {
  const canvasRef = useRef(null);
  const live = useRef({ parts: [], props: null, w: 0, h: 0, dpr: 1, hover: null });
  live.current.props = { blocs, parties, polls, govIds, mode, highlight, compact };

  // (re)build particles when the electorate's structure changes
  useEffect(() => {
    const L = live.current;
    const parts = [];
    blocs.forEach((b, bi) => {
      const n = Math.round(b.size * count);
      for (let i = 0; i < n; i++) {
        parts.push({ bi, ox: gauss() * 0.12, oy: gauss() * 0.12, party: null, appr: false, x: L.w / 2 + gauss() * 40, y: L.h / 2 + gauss() * 40, col: [200, 200, 200], ph: rnd() * 6.28 });
      }
    });
    L.parts = parts;
    assign();
  }, [blocs.length, count]);

  // reassign votes whenever the simulation moves
  useEffect(() => {
    assign();
  }, [stamp, mode]);

  function assign() {
    const L = live.current;
    const { blocs: bl, parties: ps } = L.props;
    bl.forEach((b, bi) => {
      const mine = L.parts.filter((p) => p.bi === bi);
      if (!mine.length) return;
      const want = quotas(ps.map((p) => b.shares?.[p.id] ?? 0), mine.length);
      const target = Object.fromEntries(ps.map((p, i) => [p.id, want[i]]));
      const have = {};
      for (const p of mine) if (p.party) have[p.party] = (have[p.party] || 0) + 1;
      const free = [];
      for (const p of mine) {
        if (!p.party || (have[p.party] || 0) > (target[p.party] || 0)) {
          if (p.party) have[p.party]--;
          p.party = null;
          free.push(p);
        }
      }
      for (const pid of Object.keys(target)) {
        let need = target[pid] - (have[pid] || 0);
        while (need-- > 0 && free.length) free.pop().party = pid;
      }
      for (const p of free) p.party = ps[0].id;
      const ap = Math.round(((b.approval ?? 50) / 100) * mine.length);
      mine.forEach((p, i) => (p.appr = i < ap));
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const L = live.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      L.dpr = Math.min(2, window.devicePixelRatio || 1);
      L.w = r.width;
      L.h = r.height;
      canvas.width = Math.round(r.width * L.dpr);
      canvas.height = Math.round(r.height * L.dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf;
    const draw = (now) => {
      const { blocs: bl, parties: ps, polls: pl, govIds: gov, mode: md, highlight: hl, compact: cp } = L.props;
      const { w, h, dpr } = L;
      const { X, Y } = frame(L);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // compass
      ctx.strokeStyle = 'rgba(201,163,92,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(-1), Y(0));
      ctx.lineTo(X(1), Y(0));
      ctx.moveTo(X(0), Y(-1));
      ctx.lineTo(X(0), Y(1));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(157,180,207,0.06)';
      for (const v of [-0.5, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(X(v), Y(-1));
        ctx.lineTo(X(v), Y(1));
        ctx.moveTo(X(-1), Y(v));
        ctx.lineTo(X(1), Y(v));
        ctx.stroke();
      }
      ctx.font = `italic ${cp ? 11 : 13}px "Bodoni Moda Variable", serif`;
      ctx.fillStyle = 'rgba(168,186,208,0.55)';
      ctx.textAlign = 'left';
      ctx.fillText('Left', X(-1) - (cp ? 4 : 10), Y(0) - 8);
      ctx.textAlign = 'right';
      ctx.fillText('Right', X(1) + (cp ? 4 : 10), Y(0) - 8);
      ctx.textAlign = 'center';
      ctx.fillText('Traditional', X(0), Y(1) - (cp ? 8 : 10));
      ctx.fillText('Progressive', X(0), Y(-1) + (cp ? 18 : 20));

      const pmap = {};
      for (const p of ps) pmap[p.id] = p;
      const t = now / 1000;
      const pull = md === 'party' ? 0.36 : 0;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of L.parts) {
        const b = bl[p.bi];
        if (!b) continue;
        const party = pmap[p.party];
        const bx = b.econ + p.ox * (md === 'party' ? 1 : 1.25);
        const by = b.social + p.oy * (md === 'party' ? 1 : 1.25);
        const tx = party ? bx + (party.econ - bx) * pull : bx;
        const ty = party ? by + (party.social - by) * pull : by;
        const sx = X(tx) + (reduce ? 0 : Math.sin(t * 0.9 + p.ph) * 1.4);
        const sy = Y(ty) + (reduce ? 0 : Math.cos(t * 0.7 + p.ph * 1.3) * 1.4);
        p.x += (sx - p.x) * 0.055;
        p.y += (sy - p.y) * 0.055;
        const target = md === 'party' ? (party ? party.rgb : [180, 180, 180]) : p.appr ? [233, 205, 143] : [72, 92, 120];
        p.col[0] += (target[0] - p.col[0]) * 0.07;
        p.col[1] += (target[1] - p.col[1]) * 0.07;
        p.col[2] += (target[2] - p.col[2]) * 0.07;
        let a = 0.72;
        if (hl) {
          const on = hl === b.id || hl === p.party || (L.hover && L.hover === b.id);
          a = on ? 0.95 : 0.1;
        } else if (L.hover) a = L.hover === b.id ? 0.95 : 0.28;
        ctx.fillStyle = `rgba(${p.col[0] | 0},${p.col[1] | 0},${p.col[2] | 0},${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cp ? 1.25 : 1.55, 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // party anchors
      if (md === 'party') {
        for (const p of ps) {
          const share = pl?.[p.id] ?? 0;
          if (share < 0.8) continue;
          const x = X(p.econ);
          const y = Y(p.social);
          const r = (cp ? 3 : 4) + Math.sqrt(share) * (cp ? 1.6 : 2.3);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.283);
          ctx.fillStyle = `rgba(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]},0.16)`;
          ctx.fill();
          ctx.lineWidth = gov.includes(p.id) ? 2 : 1.2;
          ctx.strokeStyle = gov.includes(p.id) ? '#E9CD8F' : `rgba(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]},0.9)`;
          ctx.stroke();
          ctx.font = `600 ${cp ? 11 : 13}px "Public Sans Variable", sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(7,17,31,0.7)';
          const label = `${p.short} ${share.toFixed(0)}%`;
          const tw = ctx.measureText(label).width;
          // flip the label to the left of the anchor when it would run off the canvas
          const lx = x + r + 6 + tw + 8 > w ? x - r - 6 - tw : x + r + 6;
          ctx.fillRect(lx - 4, y - 9, tw + 8, 17);
          ctx.fillStyle = '#E7EDF5';
          ctx.fillText(label, lx, y + 4);
        }
      }

      // hovered or highlighted bloc label
      const lb = bl.find((b) => b.id === (L.hover || hl));
      if (lb) {
        ctx.font = `italic 600 ${cp ? 13 : 16}px "Bodoni Moda Variable", serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#E9CD8F';
        ctx.fillText(lb.name, X(lb.econ), Y(lb.social) - (cp ? 26 : 38));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const { X, Y } = frame(L);
      let best = null;
      let bd = 60;
      for (const b of L.props.blocs) {
        const d = Math.hypot(X(b.econ) - x, Y(b.social) - y);
        if (d < bd) {
          bd = d;
          best = b.id;
        }
      }
      if (best !== L.hover) {
        L.hover = best;
        onHoverBloc?.(best, e.clientX, e.clientY);
      } else if (best) onHoverBloc?.(best, e.clientX, e.clientY);
    };
    const leave = () => {
      L.hover = null;
      onHoverBloc?.(null);
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} role="img" aria-label="Electorate: each dot is a slice of voters, grouped by bloc and drawn toward the party they support" />;
}

// Map compass coordinates to the canvas, leaving room for the title above and the legend below.
function frame(L) {
  const cp = L.props.compact;
  const mx = cp ? 28 : 56;
  const top = cp ? 34 : 100;
  const bottom = cp ? 30 : 64;
  return {
    X: (e) => mx + ((e + 1) / 2) * (L.w - 2 * mx),
    Y: (s) => top + (1 - (s + 1) / 2) * (L.h - top - bottom),
  };
}

export const withRgb =(parties) => parties.map((p) => ({ ...p, rgb: hexRgb(p.color) }));
