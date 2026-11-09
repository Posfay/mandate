// Small math helpers and a deterministic RNG stored in game state (multiplayer/replay friendly).

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sum = (arr, f = (x) => x) => arr.reduce((acc, x) => acc + f(x), 0);
export const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const sigmoid = (x) => 1 / (1 + Math.exp(-x));

export function softmax(us) {
  const m = Math.max(...us);
  const ex = us.map((u) => Math.exp(u - m));
  const s = sum(ex);
  return ex.map((e) => e / s);
}

// ── Deterministic RNG (mulberry32). State lives in s.rng so every outcome is replayable. ──
export function rand(s) {
  let a = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const chance = (s, p) => rand(s) < p;
export const rint = (s, a, b) => a + Math.floor(rand(s) * (b - a + 1));
export const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
export function gauss(s) {
  const u = Math.max(1e-9, rand(s));
  const v = rand(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function weighted(s, items, w) {
  const ws = items.map(w);
  const tot = sum(ws);
  if (tot <= 0) return null;
  let r = rand(s) * tot;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
export function shuffle(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Formatting ──
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const START_YEAR = 2027;
export const dateOf = (turn) => ({ year: START_YEAR + Math.floor(turn / 12), month: turn % 12 });
export const fmtDate = (turn) => {
  const d = dateOf(turn);
  return `${MONTHS[d.month]} ${d.year}`;
};
export const fmtDateShort = (turn) => {
  const d = dateOf(turn);
  return `${MONTHS_SHORT[d.month]} ${String(d.year).slice(2)}`;
};
export const signed = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(round(v, d)).toFixed(d);
export const pct = (v, d = 1) => `${round(v, d).toFixed(d)}%`;
export function money(bn) {
  if (bn >= 1000) return `$${round(bn / 1000, 2).toFixed(bn >= 10000 ? 1 : 2)} tn`;
  return `$${Math.round(bn)} bn`;
}
export function monthsLabel(m) {
  if (m <= 0) return 'now';
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${r} month${r === 1 ? '' : 's'}`;
  if (r === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y}y ${r}m`;
}
