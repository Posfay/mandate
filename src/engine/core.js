// Simulation core: indicator targets, economy, voter model, seats and parliamentary arithmetic.
import { COUNTRY_MAP } from '../data/countries.js';
import { POLICIES, POLICY_MAP, SPEND_LINES, TAX_LINES } from '../data/policies.js';
import { ISSUES } from '../data/blocs.js';
import { ROLES, BACKGROUND_MAP } from '../data/meta.js';
import { clamp, dist, dist2, softmax, sigmoid, sum, gauss } from './util.js';

export const cfgOf = (s) => COUNTRY_MAP[s.countryId];
// "the United Kingdom", "the Netherlands"…
const ARTICLE = new Set(['USA', 'GBR', 'NLD']);
export const theName = (c, cap = false) => (ARTICLE.has(c.id) ? `${cap ? 'The' : 'the'} ${c.name}` : c.name);
export const partyOf = (s, id) => s.parties.find((p) => p.id === id);
export const playerParty = (s) => partyOf(s, s.player.partyId);
export const blocOf = (s, id) => s.blocs.find((b) => b.id === id);

export const IND_KEYS = ['growth', 'unemp', 'infl', 'gini', 'health', 'edu', 'crime', 'emis', 'liberty', 'democ', 'integ', 'innov', 'mil', 'housing', 'energy', 'conf', 'prestige'];
const SPEED = { growth: 0.16, unemp: 0.09, infl: 0.12, gini: 0.04, health: 0.05, edu: 0.03, crime: 0.06, emis: 0.035, liberty: 0.15, democ: 0.12, integ: 0.08, innov: 0.05, mil: 0.06, housing: 0.05, energy: 0.07, conf: 0.22, prestige: 0.1 };
const BOUNDS = { growth: [-15, 15], unemp: [0.5, 60], infl: [-3, 300], gini: [15, 75], emis: [20, 200] };
// higher-is-worse indicators (used by UI and descriptions)
export const BAD_UP = new Set(['unemp', 'infl', 'gini', 'crime', 'emis', 'debt', 'deficit']);

export const IND_LABELS = {
  growth: 'Growth', unemp: 'Unemployment', infl: 'Inflation', gini: 'Inequality', health: 'Health', edu: 'Education',
  crime: 'Crime', emis: 'Emissions', liberty: 'Civil liberties', democ: 'Democracy', integ: 'Integrity', innov: 'Innovation',
  mil: 'Military strength', housing: 'Housing affordability', energy: 'Energy security', conf: 'Business confidence', prestige: 'Prestige',
  debt: 'Public debt', deficit: 'Deficit', rate: 'Interest rate',
};

// ── Indicator targets (with a per-driver breakdown for the UI) ──────────────
export function computeTargets(s, withParts = false) {
  const st = s.start;
  const T = {};
  const parts = withParts ? {} : null;
  const add = (k, label, v) => {
    if (!v || !Number.isFinite(v)) return;
    T[k] = (T[k] ?? 0) + v;
    if (parts) (parts[k] ||= []).push({ label, v });
  };
  for (const k of IND_KEYS) T[k] = s.base[k];
  T.growth = s.econ.trend;
  T.unemp = s.base.unemp;
  T.infl = s.econ.inflAnchor;

  for (const pol of POLICIES) {
    const lv = s.policies[pol.id];
    const lv0 = st.policies[pol.id];
    if (lv === lv0) continue;
    const fx = pol.options[lv].fx;
    const fx0 = pol.options[lv0].fx;
    const keys = new Set([...Object.keys(fx), ...Object.keys(fx0)]);
    for (const k of keys) {
      if (k === 'rev' || k === 'cost') continue;
      add(k, pol.name, (fx[k] || 0) - (fx0[k] || 0));
    }
  }
  for (const line of SPEND_LINES) {
    const d = s.budget.spend[line.id] - st.budget.spend[line.id];
    if (!d) continue;
    // diminishing returns on very large increases
    const eff = d > 0 ? d / (1 + d / 4) : d;
    for (const k in line.fx) add(k, `${line.name} spending`, eff * line.fx[k]);
  }
  for (const t of TAX_LINES) {
    const d = s.budget.tax[t.id] - st.budget.tax[t.id];
    if (!d) continue;
    for (const k in t.fx) add(k, t.name, d * t.fx[k]);
  }
  for (const role of ROLES) {
    const m = s.cabinet[role.id];
    const comp = m ? m.comp - 6 : -3;
    for (const k in role.fx) add(k, `${role.name} minister`, comp * role.fx[k] - (s.calibMin[role.id]?.[k] || 0));
  }
  // dynamic drivers
  const g = s.world.globals;
  const realGap = (s.econ.rate - s.ind.infl) - (st.econ.rate - st.ind.infl);
  // fiscal impulse: a *change* in the deficit stimulates; a permanently high deficit does not
  add('growth', 'Fiscal stance', clamp(0.35 * (s.econ.deficit - (s.econ.defSmooth ?? s.econ.deficit)), -1.2, 1.2));
  add('growth', 'Interest rates', (-0.3 * realGap) / (1 + st.econ.rate / 20));
  add('growth', 'World economy', (g.growth - 3) * 0.5);
  add('growth', 'Business confidence', (s.ind.conf - st.ind.conf) / 40);
  add('growth', 'Bond market stress', -s.econ.stress * 1.4);
  add('growth', 'Energy prices', (s.exporter ? 0.006 : -0.006) * (g.oil - 100));
  add('growth', 'AI boom', (g.ai - 30) * 0.006);
  add('unemp', 'Economic cycle', -0.4 * (s.ind.growth - s.econ.trend));
  add('infl', 'Overheating', 0.35 * (s.ind.growth - s.econ.trend));
  add('infl', 'Interest rates', (-0.25 * (s.econ.rate - st.econ.rate)) / (1 + st.econ.rate / 10));
  add('infl', 'Energy prices', (g.oil - 100) * 0.025);
  add('infl', 'Fiscal stance', 0.15 * (s.econ.deficit - st.econ.deficit));
  add('crime', 'Unemployment', (s.ind.unemp - st.ind.unemp) * 0.8);
  add('crime', 'Inequality', (s.ind.gini - st.ind.gini) * 0.3);
  add('gini', 'Unemployment', (s.ind.unemp - st.ind.unemp) * 0.25);
  add('housing', 'Interest rates', (-0.8 * realGap) / (1 + st.econ.rate / 20));
  add('energy', 'World energy prices', -(g.oil - 100) * 0.08);
  add('conf', 'Growth', (s.ind.growth - s.econ.trend) * 3);
  add('conf', 'Bond market stress', -s.econ.stress * 12);
  add('prestige', 'Democracy', (s.ind.democ - st.ind.democ) * 0.3);
  add('integ', 'Scandals', -s.heat.scandal * 0.12);
  add('emis', 'Cleaner technology', -s.turn * 0.07);
  add('emis', 'Economic activity', (s.ind.growth - s.econ.trend) * 0.6);
  for (const m of s.mods) add(m.key, m.label || 'Recent events', m.value);
  for (const k in s.calib) T[k] = (T[k] ?? 0) + s.calib[k];
  return withParts ? { T, parts } : T;
}

// ── Budget ──────────────────────────────────────────────────────────────────
export function policyFiscal(s) {
  let rev = 0;
  let cost = 0;
  if (!s.start) return { rev, cost };
  for (const pol of POLICIES) {
    const lv = s.policies[pol.id];
    const lv0 = s.start.policies[pol.id];
    if (lv === lv0) continue;
    rev += (pol.options[lv].fx.rev || 0) - (pol.options[lv0].fx.rev || 0);
    cost += (pol.options[lv].fx.cost || 0) - (pol.options[lv0].fx.cost || 0);
  }
  return { rev, cost };
}

export function computeBudget(s, budget = s.budget) {
  const e = s.econ;
  const pf = policyFiscal(s);
  const taxes = {};
  let revenue = e.otherRev + pf.rev + (s.ind.growth - e.trend) * 0.12;
  for (const t of TAX_LINES) {
    const v = e.yields[t.id] * budget.tax[t.id];
    taxes[t.id] = v;
    revenue += v;
  }
  const lines = {};
  let spending = e.otherSpend + pf.cost;
  for (const l of SPEND_LINES) {
    lines[l.id] = budget.spend[l.id];
    spending += budget.spend[l.id];
  }
  const interest = (e.debt * e.effRate) / 100;
  spending += interest;
  return { revenue, spending, interest, deficit: spending - revenue, taxes, lines, policyRev: pf.rev, policyCost: pf.cost, otherRev: e.otherRev, otherSpend: e.otherSpend };
}

// ── Economy step (one month) ────────────────────────────────────────────────
export function stepEconomy(s) {
  const e = s.econ;
  const st = s.start;
  const T = computeTargets(s);
  for (const k of IND_KEYS) {
    let v = s.ind[k] + (T[k] - s.ind[k]) * SPEED[k];
    if (k === 'growth') v += gauss(s) * 0.08;
    if (k === 'infl') v += gauss(s) * 0.04;
    const b = BOUNDS[k] || [0, 100];
    s.ind[k] = clamp(v, b[0], b[1]);
  }
  // central bank (Taylor rule with a political bias term)
  const taylor = e.neutral + 1.5 * (s.ind.infl - e.inflGoal) + 0.5 * (s.ind.growth - e.trend) + e.cbBias;
  const step = 0.25 + e.rate * 0.02;
  e.rate = Math.max(0, e.rate + clamp(taylor - e.rate, -step, step));
  e.cbBias *= 0.94;
  e.inflAnchor += (e.inflGoal - e.inflAnchor) * (st.ind.infl > 8 ? 0.017 : 0.03);
  // fiscal
  const b = computeBudget(s);
  e.revenue = b.revenue;
  e.spending = b.spending;
  e.interest = b.interest;
  e.deficit = b.deficit;
  e.defSmooth = (e.defSmooth ?? e.deficit) + (e.deficit - (e.defSmooth ?? e.deficit)) * 0.08;
  // bond market: risk premium relative to the starting position
  const risk = 0.025 * (e.debt - st.econ.debt) + 0.3 * Math.max(0, e.deficit - Math.max(3, st.econ.deficit)) + e.riskMod + Math.max(0, s.ind.infl - st.ind.infl) * 0.05 + (s.bgYield || 0);
  e.risk = risk;
  e.riskMod *= 0.96;
  e.stress = clamp((risk - 1.2) / 3, 0, 1);
  e.yield = e.rate + e.termPremium + Math.max(-1, risk);
  e.effRate += (e.yield - st.econ.yield + st.econ.effRate - e.effRate) / 84;
  // nominal GDP and debt dynamics
  const gNom = s.ind.growth + s.ind.infl;
  e.gdp *= 1 + gNom / 1200;
  e.debt = Math.max(0, e.debt * (1 - gNom / 1200) + e.deficit / 12);
}

// ── Issue satisfaction → bloc approval ─────────────────────────────────────
export function issueSat(s) {
  const x = s.exp;
  const i = s.ind;
  const sat = {
    economy: (i.growth - x.growth) / 2 + (i.conf - s.start.ind.conf) / 60,
    jobs: (x.unemp - i.unemp) / 2.5 - Math.max(0, i.unemp - 9) / 30,
    cost: (x.infl - i.infl) / (3 + x.infl * 0.25) - Math.max(0, i.infl - 4) / 12 - s.econ.stress * 0.3,
    health: (i.health - x.health) / 12,
    education: (i.edu - x.edu) / 12,
    environment: (x.emis - i.emis) / 12 - s.heat.disaster / 80,
    crime: (x.crime - i.crime) / 10,
    immigration: -s.heat.migration / 60,
    housing: (i.housing - x.housing) / 10,
    corruption: (i.integ - x.integ) / 10 - s.heat.scandal / 50,
    security: (i.mil - x.mil) / 20 - (s.world.globals.tension - 40) / 120,
    liberty: (i.liberty - x.liberty) / 10 + (i.democ - x.democ) / 12,
    taxes: (x.tax - s.econ.revenue) / 2.5,
  };
  for (const k in sat) sat[k] = clamp(sat[k], -1, 1);
  return sat;
}

const BUDGET_REACT = {
  biz: (d) => -d.corporate * 0.7 - d.income * 0.25 - d.vat * 0.2,
  prof: (d) => -d.income * 0.35 + d.research * 2 + d.green * 1.5,
  pub: (d) => (d.health + d.education + d.welfare) * 2.2,
  poor: (d) => d.welfare * 3 - d.vat * 0.8,
  ret: (d) => d.welfare * 1.6 + d.health * 2,
  work: (d) => d.welfare * 0.8 - d.vat * 0.6 + d.infrastructure * 1,
  trad: (d) => d.defense * 1.5 + d.police * 2 - d.aid * 3,
  youth: (d) => d.education * 2 + d.green * 3,
  rural: (d) => d.infrastructure * 1.5 - d.vat * 0.5 - d.green * 0.5,
  minor: (d) => d.welfare * 1 + d.education * 1,
};

export function budgetDeltas(s) {
  const d = {};
  for (const l of SPEND_LINES) d[l.id] = s.budget.spend[l.id] - s.start.budget.spend[l.id];
  for (const t of TAX_LINES) d[t.id] = s.budget.tax[t.id] - s.start.budget.tax[t.id];
  return d;
}

export function approvalTargets(s, withParts = false) {
  const sat = issueSat(s);
  const N = ISSUES.length;
  const me = playerParty(s);
  const bg = BACKGROUND_MAP[s.player.bg];
  const bd = budgetDeltas(s);
  const out = {};
  for (const b of s.blocs) {
    const parts = [];
    const push = (label, v) => parts.push({ label, v });
    // outcomes weighted by what this bloc cares about and what the country is talking about
    let num = 0;
    let den = 0;
    for (const iss of ISSUES) {
      const w = (b.w[iss.id] || 0.3) * s.sal[iss.id] * N;
      num += w * sat[iss.id];
      den += w;
    }
    const outcome = (32 * num) / den;
    push('Outcomes', outcome);
    // policies: explicit interests plus ideological fit, relative to day one
    let pol = 0;
    for (const p of POLICIES) {
      const lv = s.policies[p.id];
      const lv0 = s.start.policies[p.id];
      if (lv === lv0) continue;
      const o = p.options[lv];
      const o0 = p.options[lv0];
      pol += (o.blocs?.[b.id] || 0) - (o0.blocs?.[b.id] || 0);
      pol += 2.5 * (dist(b.econ, b.social, o0.pos[0], o0.pos[1]) - dist(b.econ, b.social, o.pos[0], o.pos[1]));
    }
    push('Policies', clamp(pol, -30, 30));
    push('Budget', clamp(BUDGET_REACT[b.id](bd), -12, 12));
    push('Party identity', 18 * (0.85 - dist(b.econ, b.social, me.econ, me.social)));
    if (bg?.blocs?.[b.id]) push('Your background', bg.blocs[b.id]);
    push('Trust', (s.trust - 50) * 0.14);
    const honey = Math.max(0, (bg?.honeymoon || 0) + 9 - (s.turn - s.termStart) * 1.1);
    if (honey > 0) push('Honeymoon', honey);
    push('Media', s.media.tone * 3);
    const mods = sum(s.blocMods.filter((m) => m.bloc === b.id), (m) => m.value);
    if (mods) push('Recent decisions', mods);
    push('Baseline', s.approvalBias);
    const total = clamp(50 + sum(parts, (p) => p.v), 3, 97);
    out[b.id] = withParts ? { total, parts } : total;
  }
  return out;
}

export function stepApproval(s, immediate = false) {
  const T = approvalTargets(s);
  for (const b of s.blocs) {
    b.target = T[b.id];
    b.approval = immediate ? T[b.id] : b.approval + (T[b.id] - b.approval) * 0.24;
  }
  s.approval = sum(s.blocs, (b) => b.size * b.approval);
}

// ── Voter model ─────────────────────────────────────────────────────────────
const ALPHA = 1.6;
export function partyUtility(s, b, p) {
  let u = p.base - ALPHA * dist2(b.econ, b.social, p.econ, p.social);
  const gi = s.gov.indexOf(p.id);
  if (gi === 0) u += (2.3 * (b.approval - 50)) / 50;
  else if (gi > 0) u += (0.9 * (b.approval - 50)) / 50;
  if (p.populist) u += p.populist * (((50 - s.trust) / 50) * 0.5 + s.heat.scandal / 160 + s.heat.unrest / 200);
  u += p.mom || 0;
  return u;
}

export function computeShares(s) {
  for (const b of s.blocs) {
    const sh = softmax(s.parties.map((p) => partyUtility(s, b, p)));
    b.shares = {};
    s.parties.forEach((p, i) => (b.shares[p.id] = sh[i]));
  }
  const polls = {};
  let tot = 0;
  for (const p of s.parties) polls[p.id] = 0;
  for (const b of s.blocs) {
    const w = b.size * b.turnout;
    tot += w;
    for (const p of s.parties) polls[p.id] += w * b.shares[p.id];
  }
  for (const p of s.parties) polls[p.id] = (polls[p.id] / tot) * 100;
  s.polls = polls;
  return polls;
}

export function calibrateParties(s, targets) {
  const tot = sum(Object.values(targets));
  for (let it = 0; it < 120; it++) {
    const polls = computeShares(s);
    for (const p of s.parties) {
      const t = Math.max(0.05, (targets[p.id] / tot) * 100);
      p.base += 0.9 * Math.log(t / Math.max(0.05, polls[p.id]));
    }
  }
  computeShares(s);
}

// ── Seats ───────────────────────────────────────────────────────────────────
function largestRemainder(weights, total) {
  const W = sum(weights);
  if (W <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / W) * total);
  const seats = raw.map(Math.floor);
  let left = total - sum(seats);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) seats[order[k][1]]++;
  return seats;
}

export function allocateSeats(s, shares) {
  const c = cfgOf(s);
  const E = c.electoral;
  const ps = s.parties;
  const norm = (a) => {
    const t = sum(a);
    return t > 0 ? a.map((x) => x / t) : a;
  };
  const pr = () => ps.map((p) => ((shares[p.id] >= (E.threshold || 0) || p.regional) ? shares[p.id] * (p.regional ? p.eff || 1 : 1) : 0));
  const fp = (k) => ps.map((p) => Math.pow(Math.max(0, shares[p.id]) / 100, k) * (p.eff || 1));
  let w;
  if (E.type === 'pr') w = pr().map((x) => Math.pow(x, E.k || 1));
  else if (E.type === 'fptp') w = fp(E.k);
  else {
    const a = norm(pr());
    const b = norm(fp(E.k));
    w = a.map((x, i) => E.mix * x + (1 - E.mix) * b[i]);
  }
  const seats = largestRemainder(norm(w), c.seats);
  const out = {};
  ps.forEach((p, i) => (out[p.id] = seats[i]));
  return out;
}

export const govSeats = (s) => sum(s.gov, (id) => s.seats[id] || 0);
export const majorityOf = (s) => Math.floor(cfgOf(s).seats / 2) + 1;

// ── Parliament votes ────────────────────────────────────────────────────────
export function billPositions(bill) {
  if (bill.kind !== 'policy') return null;
  const pol = POLICY_MAP[bill.policy];
  return [pol.options[bill.from].pos, pol.options[bill.to].pos];
}

export function partyStance(s, p, bill) {
  let ideo = 0;
  if (bill.kind === 'policy') {
    const [a, b] = billPositions(bill);
    ideo = 1.6 * (dist(p.econ, p.social, a[0], a[1]) - dist(p.econ, p.social, b[0], b[1]));
  } else if (bill.kind === 'budget') {
    const d = bill.delta;
    const size = (d.spendTotal || 0) + (d.revTotal || 0);
    ideo = -p.econ * size * 0.22 - (Math.max(0, p.econ) + 0.3) * Math.max(0, d.deficit || 0) * 0.25 + p.social * (d.defense || 0) * 0.4 - p.social * (d.green || 0) * 0.5;
    ideo = clamp(ideo, -2, 2);
  }
  const gi = s.gov.indexOf(p.id);
  let st;
  if (gi === 0) st = 0.9 + (s.unity - 50) / 60 + 0.7 * ideo;
  else if (gi > 0) st = 0.45 + (p.sat - 50) / 70 + 1.1 * ideo;
  else st = -0.3 - (p.populist || 0) * 0.2 + ideo;
  st += (p.rel - 50) / 140;
  st += (bill.lobby?.[p.id] || 0) * 0.32;
  return st;
}

export function whipCount(s, bill) {
  const c = cfgOf(s);
  const k = 2.5 + 7 * c.discipline;
  const rows = s.parties
    .filter((p) => (s.seats[p.id] || 0) > 0)
    .map((p) => {
      const stance = partyStance(s, p, bill);
      const yes = sigmoid(k * stance);
      const seats = s.seats[p.id];
      return { id: p.id, seats, stance, yesFrac: yes, expYes: seats * yes };
    });
  const expYes = sum(rows, (r) => r.expYes);
  const total = c.seats;
  const need = bill.constitutional ? Math.ceil((total * 2) / 3) : Math.floor(total / 2) + 1;
  return { rows, expYes, total, need };
}

export function runVote(s, bill) {
  const w = whipCount(s, bill);
  let yes = 0;
  const byParty = {};
  for (const r of w.rows) {
    const mean = r.seats * r.yesFrac;
    const sd = Math.sqrt(r.seats * r.yesFrac * (1 - r.yesFrac)) * 0.8;
    const y = clamp(Math.round(mean + gauss(s) * sd), 0, r.seats);
    byParty[r.id] = { yes: y, no: r.seats - y };
    yes += y;
  }
  const no = w.total - yes;
  return { yes, no, need: w.need, passed: yes >= w.need, byParty };
}

// ── Coalitions ──────────────────────────────────────────────────────────────
export function willingness(s, p) {
  const me = playerParty(s);
  const radical = (x) => Math.abs(x.econ) > 0.7 || x.social > 0.78;
  const fringe = (x) => (x.populist || 0) >= 0.5 || radical(x);
  let w = 82 - 34 * dist(p.econ, p.social, me.econ, me.social) + (p.rel - 50) * 0.4;
  // mainstream parties of left and right can do business; the fringe is harder to bring in
  if (!fringe(p) && !fringe(me)) w += 8;
  if (fringe(p) && !fringe(me)) w -= 10 * Math.max(p.populist || 0, radical(p) ? 1 : 0);
  const largest = Object.entries(s.seats).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (largest && largest !== me.id) w -= 10;
  if (s.approval < 40) w -= (40 - s.approval) * 0.5;
  return clamp(w, 0, 100);
}

export function partnerDemands(s, p, max = 2) {
  const cands = [];
  for (const pol of POLICIES) {
    if (pol.cat === 'institutions' && pol.id !== 'courts') continue;
    const cur = s.policies[pol.id];
    let best = cur;
    let bestD = Infinity;
    pol.options.forEach((o, i) => {
      const d = dist(p.econ, p.social, o.pos[0], o.pos[1]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best === cur) continue;
    const to = cur + Math.sign(best - cur);
    const curO = pol.options[cur].pos;
    const toO = pol.options[to].pos;
    const gain = dist(p.econ, p.social, curO[0], curO[1]) - dist(p.econ, p.social, toO[0], toO[1]);
    if (gain > 0.12) cands.push({ policy: pol.id, from: cur, to, gain });
  }
  cands.sort((a, b) => b.gain - a.gain);
  return cands.slice(0, max);
}
