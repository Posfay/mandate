// Game orchestration: creation, the monthly turn, elections, diplomacy and the action dispatcher.
// Every player input goes through dispatch(state, action). Actions are logged with the RNG seed, so a
// game can be replayed deterministically — the foundation for multiplayer lockstep and spectating.
import { COUNTRY_MAP, IDX_KEYS, SPEND_KEYS } from '../data/countries.js';
import { BLOCS, ISSUES } from '../data/blocs.js';
import { POLICIES, POLICY_MAP, SPEND_LINES, TAX_LINES } from '../data/policies.js';
import { ACTORS, ACTOR_MAP, SPECIAL_RELATIONS } from '../data/world.js';
import { CULTURES } from '../data/names.js';
import { EVENTS } from '../data/events.js';
import { BACKGROUND_MAP, DIFFICULTY_MAP, PLEDGE_MAP, ACHIEVEMENTS, ROLES } from '../data/meta.js';
import {
  cfgOf, partyOf, playerParty, computeTargets, computeBudget, stepEconomy, stepApproval, computeShares,
  calibrateParties, allocateSeats, theName, govSeats, majorityOf, whipCount, runVote, willingness, partnerDemands, IND_KEYS,
} from './core.js';
import { formCabinet, replaceMinister, makeMinister, appearance } from './cabinet.js';
import {
  applyOps, resolveOps, getEvent, SYSTEM_EVENTS, pushNews, setPolicy, addMod, blocShock, fill, rivalParty,
  normalizeSal, gameOver, leaveCoalition,
} from './effects.js';
import { clamp, sum, rand, chance, gauss, pick, weighted, shuffle, dist, round, fmtDate } from './util.js';

const EXPORTERS = ['USA', 'CAN', 'BRA', 'MEX', 'AUS', 'ARG', 'NOR', 'SAU', 'RUS'];
const clone = (o) => JSON.parse(JSON.stringify(o));

// ── System events (raised by the engine, never drawn at random) ─────────────
Object.assign(SYSTEM_EVENTS, {
  no_confidence: {
    id: 'no_confidence', cat: 'politics', title: 'Motion of no confidence',
    text: 'The opposition has tabled a motion of no confidence in your government. With your majority gone, every vote counts.',
    choices: [
      { label: 'Face the vote', ops: [['confidenceVote']] },
      { label: 'Call a snap election instead', ops: [['snap', 2], ['pc', -5]] },
    ],
  },
  debate: {
    id: 'debate', cat: 'politics', title: 'The televised debate',
    text: 'Eleven million people will watch you face the leader of {rival} tonight. Your advisers disagree about the strategy.',
    choices: [
      { label: 'Attack their record', ops: [['chance', 0.55, [['party', 'rival', 'mom', -0.12], ['news', '{leader} wins bruising debate', 1]], [['party', 'own', 'mom', -0.06], ['news', 'Debate: {rival} leader lands the killer blow', -1]]]] },
      { label: 'Defend your achievements', ops: (s) => (s.approval > 45 ? [['party', 'own', 'mom', 0.08], ['news', 'Debate: {leader} assured and in command', 1]] : [['party', 'own', 'mom', -0.03], ['news', 'Debate: {leader} struggles to defend record', -1]]) },
      { label: 'Make a bold new promise', ops: [['party', 'own', 'mom', 0.1], ['trust', -3], ['news', '{leader} unveils surprise pledge in debate', 0]] },
    ],
  },
  term_limit: {
    id: 'term_limit', cat: 'politics', title: 'The last year',
    text: 'The constitution allows you no further term. Your party is choosing a successor, and everything you do now is about legacy.',
    choices: [{ label: 'Understood', ops: [] }],
  },
});

// ── Creation ────────────────────────────────────────────────────────────────
export function createGame(setup) {
  const c = COUNTRY_MAP[setup.countryId];
  const diff = DIFFICULTY_MAP[setup.difficulty || 'normal'];
  const bg = BACKGROUND_MAP[setup.bg] || BACKGROUND_MAP.insider;
  const seed = setup.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s = {
    v: 1, seed, rng: seed, turn: 0, termStart: 0, term: 1, phase: 'play',
    setup: { ...setup, seed },
    countryId: c.id, system: c.system, cfgMemberships: c.memberships, southern: c.coords[1] < 0, exporter: EXPORTERS.includes(c.id),
    player: { name: setup.name || 'The Leader', bg: bg.id, partyId: setup.partyId, difficulty: diff.id, female: !!setup.female, seed: (seed % 100000) + 7 },
    usedNames: [], mods: [], blocMods: [], news: [], monthNews: [], echoes: [], inbox: [], policyLog: [], actionLog: [],
    achievements: [], flags: {}, used: {}, decisions: [], billsThisMonth: {},
    stats: { billsPassed: 0, billsFailed: 0, decrees: 0, tradeDeals: 0, electionsWon: 0, survived: 0, allPledgesKept: false, eventsResolved: 0 },
    heat: { scandal: 0, unrest: 0, migration: 10, disaster: 0 },
    trust: clamp(50 + (bg.trust || 0), 0, 100), unity: 70, pc: 30 + diff.pc * 3, agenda: 3, agendaMax: 3,
    media: { tone: 0.1 }, approvalBias: 0, lowApprovalMonths: 0,
    bgYield: bg.yieldBonus || 0,
  };

  Object.assign(s.player, appearance(s, () => ((s.player.seed * 9301 + 49297) % 233280) / 233280));
  s.policies = {};
  for (const pol of POLICIES) s.policies[pol.id] = c.policies[pol.id] ?? pol.def;
  s.budget = { tax: { ...c.tax }, spend: {} };
  SPEND_KEYS.forEach((k, i) => (s.budget.spend[k] = c.spend[i]));

  s.ind = { growth: c.trend, unemp: c.unemp, infl: c.infl, gini: c.gini, emis: 100 };
  IDX_KEYS.forEach((k, i) => (s.ind[k] = c.idx[i]));
  s.base = { ...s.ind };

  // fiscal calibration: today's revenue, spending and deficit reproduce the real figures
  const effRate = c.effRate ?? clamp(c.rate * 0.65 + 0.9, 0.5, 40);
  const R = c.revenue;
  const vatShare = c.vatShare ?? 0.28;
  const yields = { income: (R * 0.52 * 0.5) / c.tax.income, corporate: (R * 0.1) / c.tax.corporate, vat: (R * vatShare * 0.6) / c.tax.vat };
  const taxRev = sum(TAX_LINES, (t) => yields[t.id] * c.tax[t.id]);
  const interest = (c.debt * effRate) / 100;
  const inflGoal = c.infl > 10 ? 5 : 2;
  s.econ = {
    gdp: c.gdp, trend: c.trend, trend0: c.trend, rate: c.rate, inflGoal, inflAnchor: c.infl,
    neutral: c.rate - 1.5 * (c.infl - inflGoal), cbBias: 0, riskMod: 0, debt: c.debt, effRate, yields,
    otherRev: R - taxRev, otherSpend: Math.max(1, R + c.deficit - interest - sum(c.spend)), termPremium: 0.6, stress: 0, risk: 0,
  };
  s.econ.yield = s.econ.rate + s.econ.termPremium;
  const b0 = computeBudget(s);
  Object.assign(s.econ, { revenue: b0.revenue, spending: b0.spending, interest: b0.interest, deficit: b0.deficit });

  s.world = initWorld(s);

  const tot = sum(c.blocs);
  s.blocs = BLOCS.map((B, i) => ({
    id: B.id, name: B.name, short: B.short, size: c.blocs[i] / tot, turnout: B.turnout, w: B.w,
    econ: clamp(B.econ + c.lean[0], -1, 1), social: clamp(B.social + c.lean[1], -1, 1), approval: 50, target: 50, shares: {},
  }));
  s.salBase = {};
  for (const i of ISSUES) s.salBase[i.id] = c.salience?.[i.id] ?? 1;
  const st = sum(Object.values(s.salBase));
  for (const k in s.salBase) s.salBase[k] /= st;
  s.sal = { ...s.salBase };

  s.parties = c.parties.map((p) => ({ ...p, base: 0, mom: 0, rel: 50, sat: 60 }));
  s.gov = [setup.partyId];
  s.exp = { growth: c.trend, unemp: c.unemp, infl: c.infl, health: s.ind.health, edu: s.ind.edu, emis: 100, crime: s.ind.crime, housing: s.ind.housing, integ: s.ind.integ, mil: s.ind.mil, liberty: s.ind.liberty, democ: s.ind.democ, tax: s.econ.revenue };
  s.start = { ind: { ...s.ind }, econ: { ...s.econ }, budget: clone(s.budget), policies: { ...s.policies } };
  s.econ.trend0 = c.trend;

  // calibrate indicator targets so day one is an equilibrium (ministers excluded)
  s.calib = {};
  s.calibMin = {};
  s.cabinet = {};
  const T = computeTargets(s);
  for (const k of IND_KEYS) s.calib[k] = s.ind[k] - T[k];
  if (bg.ind) for (const k in bg.ind) addMod(s, k, bg.ind[k], 0, 'Your background');

  // starting approval, then vote shares calibrated to reality with a what-if victory for your party
  stepApproval(s, true);
  s.approvalBias = diff.approval - s.approval;
  stepApproval(s, true);

  const targets = {};
  for (const p of c.parties) targets[p.id] = p.share;
  const me = setup.partyId;
  const top = Math.max(...c.parties.filter((p) => p.id !== me).map((p) => p.share));
  const mine = targets[me] <= top ? top + diff.seatBonus : targets[me] + diff.seatBonus * 0.5;
  const othersTot = sum(c.parties.filter((p) => p.id !== me), (p) => p.share);
  for (const p of c.parties) targets[p.id] = p.id === me ? mine : (p.share * (100 - mine)) / othersTot;
  calibrateParties(s, targets);
  s.seats = allocateSeats(s, s.polls);
  s.nextElection = c.term;
  s.midterm = c.midterm || null;
  s.history = { approval: [], growth: [], unemp: [], infl: [], debt: [], deficit: [], trust: [], polls: {}, turns: [] };
  for (const p of s.parties) s.history.polls[p.id] = [];

  s.pledges = (setup.pledges || []).map((id) => ({ id, target: PLEDGE_MAP[id].target(s), status: 'active' }));

  pushNews(s, `${setup.name} takes office as ${c.title} of ${theName(c)}`, 1, 'National Broadcaster');
  setupGovernment(s, true);
  recordHistory(s);
  return s;
}

function initWorld(s) {
  const me = ACTOR_MAP[s.countryId];
  const rel = {};
  const baseRel = {};
  for (const a of ACTORS) {
    if (a.id === s.countryId) continue;
    let r = 15;
    const shared = a.blocs.filter((b) => me.blocs.includes(b) && ['EU', 'NATO', 'G7', 'BRICS'].includes(b)).length;
    r += shared * 12;
    if (a.regime === 'dem' && me.regime === 'dem') r += 12;
    if ((a.align === 'west' && me.align === 'east') || (a.align === 'east' && me.align === 'west')) r -= 35;
    if (a.align === me.align && a.align !== 'nonaligned') r += 8;
    const sp = SPECIAL_RELATIONS.find(([x, y]) => (x === me.id && y === a.id) || (y === me.id && x === a.id));
    if (sp) r += sp[2];
    if (dist(a.capital[0], a.capital[1], me.capital[0], me.capital[1]) < 15) r += 6;
    rel[a.id] = clamp(Math.round(r), -95, 95);
    baseRel[a.id] = rel[a.id];
  }
  const elections = {};
  for (const a of ACTORS) if (a.regime !== 'auto' && a.id !== s.countryId) elections[a.id] = 4 + Math.floor(rand(s) * 54);
  return { rel, baseRel, deals: {}, leaders: {}, elections, globals: { oil: 100, growth: 3, tension: 40, climate: 30, ai: 30, pandemic: 0 } };
}

// After an election (or at the start): coalition talks if needed, else form the cabinet.
function setupGovernment(s, initial) {
  const maj = majorityOf(s);
  const mySeats = s.seats[s.player.partyId] || 0;
  const others = s.parties.filter((p) => p.id !== s.player.partyId && (s.seats[p.id] || 0) > 0);
  if (mySeats >= maj || others.length === 0) {
    s.gov = [s.player.partyId];
    finishFormation(s, initial);
    return;
  }
  s.phase = 'coalition';
  s.coalition = {
    initial,
    candidates: others
      .map((p) => ({ id: p.id, seats: s.seats[p.id], willing: Math.round(willingness(s, p)), demands: partnerDemands(s, p, 2) }))
      .sort((a, b) => b.willing - a.willing),
    minorityOk: s.system === 'presidential' || s.system === 'semi' || mySeats >= Math.max(...others.map((p) => s.seats[p.id])),
  };
}

function finishFormation(s, initial) {
  s.phase = 'play';
  s.coalition = null;
  formCabinet(s);
  if (initial) {
    s.calibMin = {};
    for (const r of ROLES) {
      const m = s.cabinet[r.id];
      s.calibMin[r.id] = {};
      for (const k in r.fx) s.calibMin[r.id][k] = (m.comp - 6) * r.fx[k];
    }
    // the calibration absorbed a vacant-post penalty (−3 × fx); remove it now posts are filled
    for (const k of IND_KEYS) s.calib[k] -= ROLES.reduce((acc, r) => acc + (r.fx[k] ? 3 * r.fx[k] : 0), 0);
  }
  stepApproval(s, initial);
  computeShares(s);
  drawEvents(s, initial ? 1 : 2);
}

// ── Monthly turn ────────────────────────────────────────────────────────────
export function endMonth(s) {
  if (s.inbox.length || s.phase !== 'play') return false;
  const before = {
    approval: s.approval, polls: { ...s.polls }, ind: { ...s.ind }, debt: s.econ.debt, deficit: s.econ.deficit,
    trust: s.trust, pc: s.pc, rel: { ...s.world.rel }, blocs: Object.fromEntries(s.blocs.map((b) => [b.id, b.approval])),
  };
  s.monthNews = [];

  stepWorld(s);
  stepEconomy(s);
  s.mods = s.mods.filter((m) => m.until > s.turn + 1);
  for (const m of s.blocMods) m.value *= 0.84;
  s.blocMods = s.blocMods.filter((m) => Math.abs(m.value) > 0.2);
  for (const k in s.heat) s.heat[k] *= k === 'migration' ? 0.95 : 0.86;
  if (s.policies.emergency === 1) s.heat.unrest = clamp(s.heat.unrest + 1.5, 0, 100);

  // salience drifts back to the country's baseline; reality pulls it around
  for (const k in s.sal) s.sal[k] += (s.salBase[k] - s.sal[k]) * 0.15;
  const g = s.ind;
  if (g.infl > 4) s.sal.cost += 0.004 * (g.infl - 4);
  if (g.unemp - before.ind.unemp > 0.05) s.sal.jobs += 0.02;
  if (g.growth < 0.3) s.sal.economy += 0.015;
  if (g.crime > s.start.ind.crime + 4) s.sal.crime += 0.01;
  if (g.housing < 35) s.sal.housing += 0.004;
  s.sal.corruption += s.heat.scandal * 0.0006;
  s.sal.immigration += s.heat.migration * 0.0004;
  s.sal.environment += s.heat.disaster * 0.0005;
  s.sal.security += Math.max(0, s.world.globals.tension - 50) * 0.0004;
  if (s.econ.stress > 0.2) s.sal.economy += 0.02;
  normalizeSal(s);

  for (const k of ['growth', 'unemp', 'infl', 'health', 'edu', 'crime', 'housing', 'integ', 'mil', 'liberty', 'democ']) {
    const cur = k === 'emis' ? s.ind.emis : s.ind[k];
    s.exp[k] += (cur - s.exp[k]) * 0.012;
  }
  s.exp.emis += (s.ind.emis - s.exp.emis) * 0.012;
  s.exp.tax += (s.econ.revenue - s.exp.tax) * 0.012;

  const toneNews = s.news.filter((n) => n.turn === s.turn);
  const tone = toneNews.length ? sum(toneNews, (n) => n.tone) / toneNews.length : 0;
  s.media.tone = clamp(s.media.tone * 0.5 + tone * 0.35 + (s.policies.pubmedia === 1 ? 0.15 : 0) - s.heat.scandal / 200, -1, 1);

  stepApproval(s);
  computeShares(s);

  for (const p of s.parties) {
    p.mom *= 0.9;
    if (s.gov.includes(p.id) && p.id !== s.player.partyId) p.sat = clamp(p.sat + (55 + (s.approval - 45) * 0.4 - p.sat) * 0.06, 0, 100);
  }
  s.unity = clamp(s.unity + (50 + (s.approval - 40) * 0.9 - s.unity) * 0.06, 0, 100);
  for (const r in s.cabinet) {
    const m = s.cabinet[r];
    if (!m) continue;
    m.loyalty = clamp(m.loyalty + (s.approval - 45) * 0.05 + gauss(s) * 1.5, 0, 100);
  }
  for (const id of s.gov.slice(1)) {
    const p = partyOf(s, id);
    if (p && p.sat < 8) leaveCoalition(s, id);
  }

  const c = cfgOf(s);
  const bg = BACKGROUND_MAP[s.player.bg];
  const diff = DIFFICULTY_MAP[s.player.difficulty];
  const seatRatio = govSeats(s) / majorityOf(s);
  const pcGain = Math.max(1, Math.round(3 + (s.approval - 40) / 6 + clamp((seatRatio - 1) * 12, -3, 4) + (bg.pc || 0) + diff.pc + (s.policies.courts === 1 ? 2 : 0) + (s.policies.pubmedia === 1 ? 1 : 0) + (s.policies.emergency === 1 ? 4 : 0)));
  s.pc = clamp(s.pc + pcGain, 0, 100);
  s.agenda = s.agendaMax;
  s.billsThisMonth = {};

  s.turn += 1;
  recordHistory(s);
  monthlyHeadlines(s, before);
  checkPledges(s);
  checkAchievements(s);

  // stays in power?
  if (s.approval < 20) s.lowApprovalMonths++;
  else s.lowApprovalMonths = 0;
  if (s.heat.unrest >= 96 && s.ind.democ < 45) gameOver(s, 'revolution', 'The streets would not empty. The army refused to clear them. You left the capital by night.');
  if (s.lowApprovalMonths >= 4 && s.system !== 'presidential' && !s.echoes.some((e) => e.event === 'leadership_challenge')) {
    s.echoes.push({ at: s.turn, event: 'leadership_challenge', ctx: {}, teaser: 'Your party has lost patience.' });
  }
  if (s.system !== 'presidential' && govSeats(s) < majorityOf(s) && s.approval < 42 && chance(s, 0.12) && !s.echoes.some((e) => e.event === 'no_confidence') && s.nextElection - s.turn > 3) {
    s.echoes.push({ at: s.turn, event: 'no_confidence', ctx: {}, teaser: '' });
  }

  let electionHeld = null;
  if (!s.over) {
    if (s.midterm && s.turn === s.termStart + s.midterm) electionHeld = runElection(s, 'legislative');
    if (s.turn >= s.nextElection) electionHeld = runElection(s, 'general');
    if (s.nextElection - s.turn === 2 && !s.over) s.echoes.push({ at: s.turn, event: 'debate', ctx: {}, teaser: '' });
    if (c.termLimit && s.term >= c.termLimit && s.nextElection - s.turn === 12) s.echoes.push({ at: s.turn, event: 'term_limit', ctx: {}, teaser: '' });
  }

  if (!s.over && s.phase === 'play') drawEvents(s);

  s.lastBriefing = {
    turn: s.turn, pcGain, election: !!electionHeld,
    approval: [before.approval, s.approval], trust: [before.trust, s.trust],
    polls: Object.fromEntries(s.parties.map((p) => [p.id, [before.polls[p.id], s.polls[p.id]]])),
    ind: Object.fromEntries(['growth', 'unemp', 'infl', 'health', 'crime', 'housing', 'emis', 'integ'].map((k) => [k, [before.ind[k], s.ind[k]]])),
    debt: [before.debt, s.econ.debt], deficit: [before.deficit, s.econ.deficit],
    blocs: Object.fromEntries(s.blocs.map((b) => [b.id, [before.blocs[b.id], b.approval]])),
    news: s.monthNews.slice(0, 7),
  };
  return true;
}

function recordHistory(s) {
  const h = s.history;
  h.turns.push(s.turn);
  h.approval.push(round(s.approval, 2));
  h.growth.push(round(s.ind.growth, 2));
  h.unemp.push(round(s.ind.unemp, 2));
  h.infl.push(round(s.ind.infl, 2));
  h.debt.push(round(s.econ.debt, 1));
  h.deficit.push(round(s.econ.deficit, 2));
  h.trust.push(round(s.trust, 1));
  for (const p of s.parties) (h.polls[p.id] ||= []).push(round(s.polls[p.id], 2));
}

// ── Events ──────────────────────────────────────────────────────────────────
function instantiate(s, e, ctx0 = {}) {
  const ctx = { ...ctx0, ...(e.setup ? e.setup(s) : {}) };
  if (ctx.role && s.cabinet[ctx.role]) ctx.minName = ctx.minName || s.cabinet[ctx.role].name;
  s.used[e.id] = s.turn;
  return { uid: `${e.id}_${s.turn}_${Math.floor(rand(s) * 1e6)}`, id: e.id, ctx, turn: s.turn };
}

function drawEvents(s, forceCount) {
  // echoes falling due
  const due = s.echoes.filter((x) => x.at <= s.turn);
  s.echoes = s.echoes.filter((x) => x.at > s.turn);
  for (const d of due) {
    const e = getEvent(d.event);
    if (e) s.inbox.push(instantiate(s, e, d.ctx));
  }
  const diff = DIFFICULTY_MAP[s.player.difficulty];
  let n = forceCount ?? 1 + (rand(s) < 0.45 * diff.events ? 1 : 0) + (rand(s) < 0.08 * diff.events ? 1 : 0);
  n = Math.max(0, n - Math.max(0, due.length - 1));
  let pool = EVENTS.filter((e) => {
    if (e.echo) return false;
    if (e.once && s.used[e.id] != null) return false;
    const cd = e.cooldown ?? 16;
    if (s.used[e.id] != null && s.turn - s.used[e.id] < cd) return false;
    try {
      return !e.when || e.when(s);
    } catch {
      return false;
    }
  });
  for (let i = 0; i < n && pool.length; i++) {
    const e = weighted(s, pool, (x) => (typeof x.weight === 'function' ? x.weight(s) : x.weight ?? 1));
    if (!e) break;
    pool = pool.filter((x) => x !== e);
    s.inbox.push(instantiate(s, e));
  }
}

export function resolveEvent(s, uid, idx) {
  const i = s.inbox.findIndex((x) => x.uid === uid);
  if (i < 0) return false;
  const inst = s.inbox[i];
  const e = getEvent(inst.id);
  const ch = e.choices[idx];
  if (!ch || (ch.req && !ch.req(s))) return false;
  s.inbox.splice(i, 1);
  const ops = resolveOps(s, ch, inst.ctx);
  applyOps(s, ops, inst.ctx, e.title);
  s.decisions.unshift({ turn: s.turn, id: e.id, title: fill(s, e.title, inst.ctx), choice: ch.label });
  s.stats.eventsResolved++;
  refresh(s);
  return true;
}

// Recompute derived numbers after any player action (no time passes).
export function refresh(s) {
  const b = computeBudget(s);
  Object.assign(s.econ, { revenue: b.revenue, spending: b.spending, interest: b.interest, deficit: b.deficit });
  s.approval = sum(s.blocs, (bl) => bl.size * bl.approval);
  computeShares(s);
  checkPledges(s);
  checkAchievements(s);
}

// ── World ───────────────────────────────────────────────────────────────────
const WORLD_EVENTS = [
  { id: 'oil_shock', w: 1, run: (s) => { s.world.globals.oil += 30 + rand(s) * 20; s.world.globals.tension += 8; pushNews(s, 'Oil price jumps as Gulf shipping lanes close', -1, 'Wire services'); } },
  { id: 'oil_glut', w: 0.8, when: (s) => s.world.globals.oil > 95, run: (s) => { s.world.globals.oil -= 20; pushNews(s, 'Oil slumps as producers flood the market', 0, 'Wire services'); } },
  { id: 'slowdown', w: 1, run: (s) => { s.world.globals.growth -= 1.1; pushNews(s, 'IMF slashes global growth forecast', -1, 'Wire services'); } },
  { id: 'boom', w: 0.8, run: (s) => { s.world.globals.growth += 0.8; pushNews(s, 'World trade rebounds strongly', 1, 'Wire services'); } },
  { id: 'contagion', w: 0.6, run: (s) => { s.world.globals.growth -= 0.8; s.econ.riskMod += 0.6; pushNews(s, 'Bank failure abroad sparks global sell-off', -1, 'Wire services'); } },
  { id: 'pandemic', w: 0.35, when: (s) => s.turn > 8 && !s.flags.pandemicSeen, run: (s) => { s.world.globals.pandemic = 1; s.flags.pandemicSeen = true; pushNews(s, 'WHO declares new respiratory virus a global emergency', -1, 'Wire services'); } },
  { id: 'ai_leap', w: 0.9, run: (s) => { s.world.globals.ai = clamp(s.world.globals.ai + 15, 0, 100); pushNews(s, 'New generation of AI models stuns markets', 0, 'Wire services'); } },
  { id: 'war', w: 0.7, run: (s) => {
    const pairs = SPECIAL_RELATIONS.filter(([a, b, v]) => v < -40 && a !== s.countryId && b !== s.countryId);
    const [a, b] = pick(s, pairs);
    s.world.globals.tension += 14; s.world.globals.oil += 12;
    pushNews(s, `Fighting breaks out between ${ACTOR_MAP[a].name} and ${ACTOR_MAP[b].name}`, -1, 'Wire services');
  } },
  { id: 'calm', w: 0.8, when: (s) => s.world.globals.tension > 45, run: (s) => { s.world.globals.tension -= 12; s.world.globals.oil -= 8; pushNews(s, 'Ceasefire holds; markets breathe', 1, 'Wire services'); } },
  { id: 'climate_record', w: 0.6, run: (s) => { s.world.globals.climate += 6; s.heat.disaster += 10; pushNews(s, 'Hottest year ever recorded, scientists confirm', -1, 'Wire services'); } },
];

function stepWorld(s) {
  const gl = s.world.globals;
  gl.oil = clamp(gl.oil + (100 - gl.oil) * 0.04 + gauss(s) * 3, 45, 220);
  gl.growth = clamp(gl.growth + (3 - gl.growth) * 0.07 + gauss(s) * 0.07, -3, 6);
  gl.tension = clamp(gl.tension + (40 - gl.tension) * 0.03 + gauss(s) * 1.5, 0, 100);
  gl.climate = clamp(gl.climate + 0.12, 0, 100);
  gl.ai = clamp(gl.ai + 0.35, 0, 100);
  gl.pandemic = Math.max(0, gl.pandemic - 0.25);
  if (rand(s) < 0.09) {
    const ev = weighted(s, WORLD_EVENTS.filter((w) => !w.when || w.when(s)), (w) => w.w);
    if (ev) ev.run(s);
  }
  // relations drift back toward their structural baseline, adjusted for how you govern
  const dem = s.ind.democ - s.start.ind.democ;
  for (const a of ACTORS) {
    if (a.id === s.countryId) continue;
    const tilt = a.regime === 'dem' ? dem * 0.4 : -dem * 0.15;
    const deal = s.world.deals[a.id] || {};
    const base = s.world.baseRel[a.id] + tilt + (deal.trade ? 10 : 0) + (deal.pact ? 15 : 0) - (deal.sanction ? 40 : 0);
    s.world.rel[a.id] = clamp(s.world.rel[a.id] + (base - s.world.rel[a.id]) * 0.025, -100, 100);
  }
  // foreign elections
  for (const id in s.world.elections) {
    if (s.world.elections[id] !== s.turn) continue;
    const a = ACTOR_MAP[id];
    s.world.elections[id] = s.turn + 48 + Math.floor(rand(s) * 12);
    if (rand(s) < 0.45) {
      const pool = CULTURES[a.culture] || CULTURES.anglo;
      const female = rand(s) < 0.4;
      const name = `${pick(s, female ? pool.f : pool.m)} ${pick(s, pool.s)}`;
      s.world.leaders[id] = name;
      s.world.rel[id] = clamp(s.world.rel[id] + gauss(s) * 10, -100, 100);
      pushNews(s, `${a.name} elects a new ${a.ltitle.toLowerCase()}: ${name}`, 0, 'Wire services');
    } else if (rand(s) < 0.5) {
      pushNews(s, `${a.name}: incumbent government re-elected`, 0, 'Wire services');
    }
  }
}

// ── Headlines ───────────────────────────────────────────────────────────────
function monthlyHeadlines(s, before) {
  const c = cfgOf(s);
  const i = s.ind;
  const h3 = (k) => s.history[k][Math.max(0, s.history[k].length - 4)];
  const me = playerParty(s);
  const rival = rivalParty(s);
  const lead = s.polls[me.id] - (rival ? s.polls[rival.id] : 0);
  const items = [];
  if (i.growth < 0 && before.ind.growth >= 0) items.push([`Economy shrinks: ${theName(c, true)} on the brink of recession`, -1]);
  else if (i.growth > s.econ.trend + 1) items.push([`Boom: economy growing at ${i.growth.toFixed(1)}%`, 1]);
  const du = i.unemp - h3('unemp');
  if (du > 0.25) items.push([`Unemployment climbs to ${i.unemp.toFixed(1)}%`, -1]);
  else if (du < -0.25) items.push([`Jobless rate falls to ${i.unemp.toFixed(1)}%`, 1]);
  if (i.infl > 5 && i.infl > before.ind.infl) items.push([`Prices rising ${i.infl.toFixed(1)}% a year as families feel the squeeze`, -1]);
  else if (h3('infl') - i.infl > 0.4) items.push([`Inflation eases to ${i.infl.toFixed(1)}%`, 1]);
  if (s.econ.stress > 0.3) items.push([`Borrowing costs hit ${s.econ.yield.toFixed(1)}% as markets lose faith`, -1]);
  if (s.econ.debt > 100 && before.debt <= 100) items.push(['Public debt passes 100% of GDP', -1]);
  const da = s.approval - before.approval;
  if (da > 2.5) items.push([`${c.title}’s approval climbs to ${Math.round(s.approval)}%`, 1]);
  else if (da < -2.5) items.push([`${c.title}’s approval slumps to ${Math.round(s.approval)}%`, -1]);
  if (s.turn % 2 === 0 && rival) {
    if (lead < -1) items.push([`Poll: ${rival.short} leads ${me.short} by ${Math.abs(lead).toFixed(0)} points`, -1]);
    else if (lead > 4) items.push([`Poll: ${me.short} holds ${lead.toFixed(0)}-point lead`, 1]);
    else items.push([`Poll: dead heat between ${me.short} and ${rival.short}`, 0]);
  }
  for (const [t, tone] of items.slice(0, 4)) pushNews(s, t, tone);
}

// ── Pledges & achievements ──────────────────────────────────────────────────
function checkPledges(s) {
  for (const p of s.pledges) {
    const def = PLEDGE_MAP[p.id];
    const r = def.check(s, p.target);
    p.progress = r.progress;
    p.label = r.label;
    if (def.breakable && p.status === 'active' && !r.met) {
      p.status = 'broken';
      s.trust = clamp(s.trust - 10, 0, 100);
      pushNews(s, `“Read my lips”: ${cfgOf(s).title} breaks no-new-taxes pledge`, -1, 'Daily Courier');
      blocShock(s, 'all', -2);
    }
  }
}

function checkAchievements(s) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    try {
      if (a.check(s)) {
        s.achievements.push(a.id);
        s.newAchievement = a.id;
      }
    } catch {
      /* ignore */
    }
  }
}

// ── Elections ───────────────────────────────────────────────────────────────
function runElection(s, kind) {
  const c = cfgOf(s);
  const me = playerParty(s);
  const shares = {};
  for (const p of s.parties) shares[p.id] = Math.max(0.1, s.polls[p.id] + gauss(s) * Math.max(0.6, Math.sqrt(s.polls[p.id]) * 0.35));
  const t = sum(Object.values(shares));
  for (const k in shares) shares[k] = (shares[k] / t) * 100;
  const prevSeats = { ...s.seats };
  const seats = allocateSeats(s, shares);
  const res = { kind, turn: s.turn, shares, prevSeats, seats, prevGov: s.gov.slice(), seen: false };

  if (kind === 'legislative') {
    s.seats = seats;
    // partners that lost all seats leave
    s.gov = s.gov.filter((id, i) => i === 0 || seats[id] > 0);
    res.won = govSeats(s) >= majorityOf(s);
    res.outcome = res.won ? 'hold' : 'divided';
    pushNews(s, res.won ? `Midterms: ${me.short} keeps control of ${c.legislature}` : `Midterms: ${me.short} loses ${c.legislature}`, res.won ? 1 : -1);
    s.electionResult = res;
    return res;
  }

  // pledges are judged at every general election
  let kept = 0;
  for (const p of s.pledges) {
    const r = PLEDGE_MAP[p.id].check(s, p.target);
    if (p.status !== 'broken') p.status = r.met ? 'kept' : 'missed';
    if (p.status === 'kept') kept++;
  }
  res.pledges = s.pledges.map((p) => ({ ...p }));
  if (s.pledges.length && kept === s.pledges.length) s.stats.allPledgesKept = true;

  const termLimited = c.termLimit && s.term >= c.termLimit;
  if (s.system === 'presidential' || s.system === 'semi') {
    const rival = s.parties.filter((p) => p.id !== me.id).sort((a, b) => shares[b.id] - shares[a.id])[0];
    let mine = shares[me.id];
    let theirs = shares[rival.id];
    for (const p of s.parties) {
      if (p.id === me.id || p.id === rival.id) continue;
      const dMe = dist(p.econ, p.social, me.econ, me.social);
      const dR = dist(p.econ, p.social, rival.econ, rival.social);
      const toMe = 1 / (1 + Math.exp(3 * (dMe - dR)));
      mine += shares[p.id] * toMe * 0.85;
      theirs += shares[p.id] * (1 - toMe) * 0.85;
    }
    const pct = (mine / (mine + theirs)) * 100;
    res.presidential = { me: me.id, rival: rival.id, pct };
    res.won = pct > 50;
    s.seats = seats;
    if (termLimited) {
      res.successor = true;
      gameOver(s, 'termlimit', res.won ? `Your term is over. Your party’s candidate won with ${pct.toFixed(1)}% — your legacy continues.` : `Your term is over, and your party’s candidate lost with ${pct.toFixed(1)}%.`);
    } else if (!res.won) {
      gameOver(s, 'defeated', `You lost the presidential election with ${pct.toFixed(1)}% of the vote.`);
    } else {
      newTerm(s, res);
      s.gov = s.gov.filter((id, i) => i === 0 || seats[id] > 0);
      if (govSeats(s) < majorityOf(s) && s.parties.some((p) => p.id !== me.id && seats[p.id] > 0 && !s.gov.includes(p.id))) setupGovernment(s, false);
      else formCabinet(s);
    }
    s.electionResult = res;
    return res;
  }

  s.seats = seats;
  const mine = seats[me.id];
  const largest = Object.entries(seats).sort((a, b) => b[1] - a[1])[0][0];
  const maj = majorityOf(s);
  const willingSeats = sum(s.parties.filter((p) => p.id !== me.id && willingness(s, p) >= 40), (p) => seats[p.id] || 0);
  if (termLimited) {
    gameOver(s, 'termlimit', 'You have served the maximum number of terms.');
    res.won = largest === me.id;
  } else if (mine >= maj) {
    res.won = true;
    res.outcome = 'majority';
    newTerm(s, res);
    s.gov = [me.id];
    formCabinet(s);
  } else if (mine + willingSeats >= maj || largest === me.id) {
    res.won = true;
    res.outcome = 'hung';
    newTerm(s, res);
    s.gov = [me.id];
    setupGovernment(s, false);
  } else {
    res.won = false;
    gameOver(s, 'defeated', `${partyOf(s, largest).short} won the most seats. Your party took ${mine} of ${c.seats}.`);
  }
  s.electionResult = res;
  return res;
}

function newTerm(s, res) {
  const c = cfgOf(s);
  s.stats.electionsWon++;
  s.term++;
  s.termStart = s.turn;
  s.nextElection = s.turn + c.term;
  s.flags.caretaker = false;
  s.flags.taxRaised = false;
  s.pc = clamp(s.pc + 15, 0, 100);
  for (const p of s.pledges) {
    if (p.status === 'kept') s.trust = clamp(s.trust + 4, 0, 100);
    else s.trust = clamp(s.trust - (p.status === 'broken' ? 2 : 4), 0, 100);
    p.target = PLEDGE_MAP[p.id].target(s);
    p.status = 'active';
  }
  pushNews(s, `${s.player.name} wins a new mandate`, 1, 'National Broadcaster');
}

// ── Costs ───────────────────────────────────────────────────────────────────
export function billCost(s, policyId, to) {
  const pol = POLICY_MAP[policyId];
  const from = s.policies[policyId];
  const a = pol.options[from];
  const b = pol.options[to];
  let contro = 0;
  for (const bl of s.blocs) {
    const r = Math.abs((b.blocs?.[bl.id] || 0) - (a.blocs?.[bl.id] || 0)) + 2.5 * Math.abs(dist(bl.econ, bl.social, a.pos[0], a.pos[1]) - dist(bl.econ, bl.social, b.pos[0], b.pos[1]));
    contro += bl.size * r;
  }
  return Math.round(5 + 3 * Math.abs(to - from) + contro * 0.9 + (pol.constitutional ? 6 : 0));
}

export function budgetDelta(s, draft) {
  const d = { spendTotal: 0, revTotal: 0 };
  for (const l of SPEND_LINES) {
    d[l.id] = draft.spend[l.id] - s.budget.spend[l.id];
    d.spendTotal += d[l.id];
  }
  for (const t of TAX_LINES) {
    d[t.id] = draft.tax[t.id] - s.budget.tax[t.id];
    d.revTotal += d[t.id] * s.econ.yields[t.id];
  }
  d.deficit = d.spendTotal - d.revTotal;
  return d;
}

export function budgetCost(s, draft) {
  const d = budgetDelta(s, draft);
  let mag = 0;
  for (const l of SPEND_LINES) mag += Math.abs(d[l.id]);
  for (const t of TAX_LINES) mag += Math.abs(d[t.id]) * 0.25;
  return Math.round(4 + mag * 3);
}

export function lobbyCost(s, partyId) {
  const bg = BACKGROUND_MAP[s.player.bg];
  return Math.round((3 + (s.seats[partyId] || 0) / 45) * (bg.lobby || 1));
}

export function canDecree(s, policyId) {
  return (s.system === 'presidential' || s.system === 'semi') && POLICY_MAP[policyId].exec;
}

export function makeBill(s, draft) {
  if (draft.kind === 'policy') {
    const pol = POLICY_MAP[draft.policy];
    return { kind: 'policy', policy: draft.policy, from: s.policies[draft.policy], to: draft.to, constitutional: !!pol.constitutional, lobby: draft.lobby || {} };
  }
  return { kind: 'budget', draft: draft.draft, delta: budgetDelta(s, draft.draft), lobby: draft.lobby || {} };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
export function dispatch(s, action) {
  if (s.over && action.type !== 'ack') return { ok: false, error: 'The game is over.' };
  const r = handle(s, action);
  if (r?.ok !== false) s.actionLog.push({ t: s.turn, a: action });
  return r || { ok: true };
}

function handle(s, a) {
  switch (a.type) {
    case 'resolveEvent':
      return { ok: resolveEvent(s, a.uid, a.choice) };
    case 'endMonth':
      return { ok: endMonth(s) };
    case 'formGovernment': {
      if (s.phase !== 'coalition') return { ok: false };
      const partners = a.partners || [];
      const initial = s.coalition.initial;
      for (const pid of partners) {
        const cand = s.coalition.candidates.find((x) => x.id === pid);
        if (!cand || cand.willing < 40) return { ok: false, error: 'They will not join.' };
      }
      const total = (s.seats[s.player.partyId] || 0) + sum(partners, (pid) => s.seats[pid] || 0);
      if (total < majorityOf(s) && !s.coalition.minorityOk) return { ok: false, error: 'Not enough seats to govern.' };
      s.gov = [s.player.partyId, ...partners];
      const me = playerParty(s);
      for (const pid of partners) {
        const cand = s.coalition.candidates.find((x) => x.id === pid);
        for (const d of cand.demands) setPolicy(s, d.policy, d.to, 'coalition');
        const p = partyOf(s, pid);
        p.sat = 62;
        p.rel = clamp(p.rel + 10, 0, 100);
        // breaking the cordon sanitaire around the radical fringe has a price at home
        if ((p.populist || 0) >= 0.8 && (me.populist || 0) < 0.5) {
          s.unity = clamp(s.unity - 12, 0, 100);
          s.trust = clamp(s.trust - 3, 0, 100);
          blocShock(s, 'prof', -4);
          blocShock(s, 'youth', -3);
          blocShock(s, 'minor', -5);
          pushNews(s, `${me.short} breaks the taboo: ${p.short} enters government`, -1);
        }
      }
      if (partners.length) pushNews(s, `Coalition agreed: ${[playerParty(s).short, ...partners.map((id) => partyOf(s, id).short)].join(', ')}`, 1);
      else pushNews(s, `${playerParty(s).short} to govern as a minority`, 0);
      finishFormation(s, initial);
      refresh(s);
      return { ok: true };
    }
    case 'bill': {
      if (s.phase !== 'play') return { ok: false };
      const bill = makeBill(s, a.draft);
      const key = bill.kind === 'policy' ? bill.policy : '__budget';
      if (s.billsThisMonth[key]) return { ok: false, error: 'Already voted on this month.' };
      const cost = (bill.kind === 'policy' ? billCost(s, bill.policy, bill.to) : budgetCost(s, bill.draft)) + sum(Object.entries(bill.lobby), ([pid, n]) => n * lobbyCost(s, pid));
      if (s.pc < cost) return { ok: false, error: 'Not enough political capital.' };
      s.pc -= cost;
      s.billsThisMonth[key] = true;
      const res = runVote(s, bill);
      res.kind = bill.kind;
      res.bill = bill;
      if (res.passed) {
        s.stats.billsPassed++;
        if (bill.kind === 'policy') {
          setPolicy(s, bill.policy, bill.to, 'law');
          pushNews(s, `${cfgOf(s).legislature} passes ${POLICY_MAP[bill.policy].name.toLowerCase()} reform, ${res.yes}–${res.no}`, 1);
        } else {
          for (const t of TAX_LINES) if (bill.draft.tax[t.id] > s.budget.tax[t.id] + 0.001) s.flags.taxRaised = true;
          s.budget = JSON.parse(JSON.stringify(bill.draft));
          pushNews(s, `Budget passes ${res.yes}–${res.no}`, 1);
        }
        for (const pid of s.gov.slice(1)) {
          const p = partyOf(s, pid);
          const yesFrac = res.byParty[pid] ? res.byParty[pid].yes / Math.max(1, s.seats[pid]) : 0.5;
          p.sat = clamp(p.sat + (yesFrac - 0.6) * 10, 0, 100);
        }
      } else {
        s.stats.billsFailed++;
        blocShock(s, 'all', -1.2);
        s.unity = clamp(s.unity - 3, 0, 100);
        s.trust = clamp(s.trust - 1, 0, 100);
        pushNews(s, `Government defeated in ${cfgOf(s).legislature}, ${res.yes}–${res.no}`, -1);
      }
      s.voteResult = res;
      refresh(s);
      return { ok: true, result: res };
    }
    case 'decree': {
      if (!canDecree(s, a.policy)) return { ok: false };
      if (s.billsThisMonth[a.policy]) return { ok: false, error: 'Already acted on this month.' };
      const cost = Math.round(billCost(s, a.policy, a.to) * 1.3);
      if (s.pc < cost) return { ok: false, error: 'Not enough political capital.' };
      s.pc -= cost;
      s.billsThisMonth[a.policy] = true;
      const prev = s.policies[a.policy];
      setPolicy(s, a.policy, a.to, 'decree');
      s.stats.decrees++;
      s.ind.democ = clamp(s.ind.democ - 0.5, 0, 100);
      pushNews(s, `${cfgOf(s).title} signs executive order on ${POLICY_MAP[a.policy].name.toLowerCase()}`, 0);
      if (s.policies.courts === 0 && rand(s) < 0.4) s.echoes.push({ at: s.turn + 2 + Math.floor(rand(s) * 3), event: 'court_strikes', ctx: { policy: a.policy, prev }, teaser: `Lawyers are challenging your order on ${POLICY_MAP[a.policy].name.toLowerCase()}.` });
      refresh(s);
      return { ok: true };
    }
    case 'agenda':
      return agendaAction(s, a);
    case 'diplomacy':
      return diplomacy(s, a);
    case 'reshuffle': {
      const cost = 6;
      const cur = s.cabinet[a.role];
      if (!cur || cur.party !== s.player.partyId) return { ok: false, error: 'This post belongs to a coalition partner.' };
      if (s.pc < cost) return { ok: false, error: 'Not enough political capital.' };
      const cand = s.bench.find((b) => b.id === a.candidate);
      if (!cand) return { ok: false };
      s.pc -= cost;
      replaceMinister(s, a.role, cand);
      if (cur.ambition > 70) s.unity = clamp(s.unity - 4, 0, 100);
      pushNews(s, `Reshuffle: ${cand.name} replaces ${cur.name}`, 0);
      refresh(s);
      return { ok: true };
    }
    case 'snap': {
      if (s.system === 'presidential' || s.turn - s.termStart < 6 || s.nextElection - s.turn <= 3) return { ok: false };
      s.nextElection = s.turn + 2;
      s.pc = Math.max(0, s.pc - 10);
      pushNews(s, `${cfgOf(s).title} calls snap election`, 0);
      return { ok: true };
    }
    case 'concede':
      gameOver(s, 'defeated', a.text || 'You could not assemble a majority and stood aside for the opposition.');
      return { ok: true };
    case 'resign':
      gameOver(s, 'resigned', 'You resigned and handed over to a successor.');
      return { ok: true };
    case 'ackElection':
      if (s.electionResult) s.electionResult.seen = true;
      return { ok: true };
    case 'ackVote':
      s.voteResult = null;
      return { ok: true };
    case 'ack':
      s.newAchievement = null;
      return { ok: true };
    default:
      return { ok: false, error: `Unknown action ${a.type}` };
  }
}

export const AGENDA_ACTIONS = [
  { id: 'address', name: 'Address the nation', desc: 'Put an issue at the top of the national conversation. Pays off where your record is strong.', target: 'issue' },
  { id: 'rally', name: 'Tour and rally', desc: 'Spend days on the road with one group of voters.', target: 'bloc' },
  { id: 'press', name: 'Press conference', desc: 'Take questions, take the heat out of scandals, lift the media tone.' },
  { id: 'party', name: 'Party meeting', desc: 'Shore up unity and the loyalty of your ministers.' },
  { id: 'partners', name: 'Coalition dinner', desc: 'Keep your partners happy.', needsPartners: true },
  { id: 'woo', name: 'Woo the opposition', desc: 'Build bridges with another party for future votes.', target: 'party' },
];

function agendaAction(s, a) {
  if (s.agenda < 1) return { ok: false, error: 'No agenda slots left this month.' };
  const campaign = s.nextElection - s.turn <= 4;
  switch (a.action) {
    case 'address': {
      if (!s.sal[a.target]) return { ok: false };
      s.sal[a.target] += 0.05;
      normalizeSal(s);
      s.media.tone = clamp(s.media.tone + 0.08, -1, 1);
      s.trust = clamp(s.trust + 0.5, 0, 100);
      pushNews(s, `${cfgOf(s).title} addresses the nation on ${(ISSUES.find((i) => i.id === a.target)?.name || a.target).toLowerCase()}`, 0);
      break;
    }
    case 'rally':
      blocShock(s, a.target, campaign ? 6 : 4);
      if (campaign) playerParty(s).mom += 0.03;
      break;
    case 'press':
      s.media.tone = clamp(s.media.tone + 0.25, -1, 1);
      s.heat.scandal = Math.max(0, s.heat.scandal - 8);
      break;
    case 'party':
      s.unity = clamp(s.unity + 8, 0, 100);
      for (const r in s.cabinet) if (s.cabinet[r]?.party === s.player.partyId) s.cabinet[r].loyalty = clamp(s.cabinet[r].loyalty + 4, 0, 100);
      break;
    case 'partners':
      if (s.gov.length < 2) return { ok: false };
      for (const pid of s.gov.slice(1)) partyOf(s, pid).sat = clamp(partyOf(s, pid).sat + 10, 0, 100);
      break;
    case 'woo': {
      const p = partyOf(s, a.target);
      if (!p) return { ok: false };
      p.rel = clamp(p.rel + 12, 0, 100);
      break;
    }
    case 'visit': {
      if (s.world.rel[a.target] == null) return { ok: false };
      s.world.rel[a.target] = clamp(s.world.rel[a.target] + 10, -100, 100);
      addMod(s, 'prestige', 1, 12, `State visit to ${ACTOR_MAP[a.target].name}`);
      pushNews(s, `${cfgOf(s).title} on state visit to ${ACTOR_MAP[a.target].name}`, 1);
      break;
    }
    case 'aid': {
      if (s.world.rel[a.target] == null) return { ok: false };
      s.world.rel[a.target] = clamp(s.world.rel[a.target] + 12, -100, 100);
      s.econ.debt += 0.03;
      addMod(s, 'prestige', 1, 18, 'Foreign aid');
      pushNews(s, `${theName(cfgOf(s), true)} sends aid package to ${ACTOR_MAP[a.target].name}`, 0);
      break;
    }
    default:
      return { ok: false };
  }
  s.agenda -= 1;
  refresh(s);
  return { ok: true };
}

export const DIPLO_ACTIONS = [
  { id: 'visit', name: 'State visit', cost: { agenda: 1 }, desc: 'Improve relations and raise your profile abroad.' },
  { id: 'aid', name: 'Aid package', cost: { agenda: 1 }, desc: 'Buy goodwill with development money.' },
  { id: 'trade', name: 'Trade agreement', cost: { pc: 12 }, desc: 'A lasting boost to growth. Requires relations of 20 or more.' },
  { id: 'pact', name: 'Defence pact', cost: { pc: 15 }, desc: 'Mutual security guarantees. Requires relations of 45 or more.' },
  { id: 'sanction', name: 'Impose sanctions', cost: { pc: 8 }, desc: 'Punish a hostile government, at a cost to trade.' },
  { id: 'lift', name: 'Lift sanctions', cost: { pc: 5 }, desc: 'Restore normal relations.' },
];

export function diploAvailable(s, id, target) {
  const rel = s.world.rel[target];
  const deal = s.world.deals[target] || {};
  const me = ACTOR_MAP[s.countryId];
  const them = ACTOR_MAP[target];
  const bothEU = me.blocs.includes('EU') && them.blocs.includes('EU');
  switch (id) {
    case 'visit': case 'aid': return s.agenda >= 1 && !deal.sanction ? null : deal.sanction ? 'Lift sanctions first' : 'No agenda slots left';
    case 'trade': return deal.trade ? 'Already signed' : bothEU ? 'Single market already applies' : deal.sanction ? 'Under sanctions' : rel < 20 ? 'Relations too low' : s.pc < 12 ? 'Not enough capital' : null;
    case 'pact': return deal.pact ? 'Already allied' : rel < 45 ? 'Relations too low' : s.pc < 15 ? 'Not enough capital' : null;
    case 'sanction': return deal.sanction ? 'Already sanctioned' : s.pc < 8 ? 'Not enough capital' : null;
    case 'lift': return !deal.sanction ? 'No sanctions in place' : s.pc < 5 ? 'Not enough capital' : null;
    default: return 'Unknown';
  }
}

function diplomacy(s, a) {
  const why = diploAvailable(s, a.action, a.target);
  if (why) return { ok: false, error: why };
  if (a.action === 'visit' || a.action === 'aid') return agendaAction(s, a);
  const them = ACTOR_MAP[a.target];
  const deal = (s.world.deals[a.target] ||= {});
  const share = them.gdp / (them.gdp + s.econ.gdp);
  switch (a.action) {
    case 'trade': {
      s.pc -= 12;
      deal.trade = true;
      const g = round(Math.min(0.25, 0.03 + share * 0.25), 2);
      addMod(s, 'growth', g, 0, `Trade deal with ${them.name}`);
      s.world.rel[a.target] += 8;
      blocShock(s, 'biz', 2);
      blocShock(s, 'work', -1);
      s.stats.tradeDeals++;
      pushNews(s, `Trade agreement signed with ${them.name}`, 1);
      break;
    }
    case 'pact':
      s.pc -= 15;
      deal.pact = true;
      addMod(s, 'mil', 3, 0, `Defence pact with ${them.name}`);
      s.world.rel[a.target] += 10;
      pushNews(s, `Defence pact signed with ${them.name}`, 1);
      break;
    case 'sanction':
      s.pc -= 8;
      deal.sanction = true;
      if (deal.trade) deal.trade = false;
      s.world.rel[a.target] -= 35;
      addMod(s, 'growth', -round(Math.min(0.2, 0.01 + share * 0.15), 2), 0, `Sanctions on ${them.name}`);
      addMod(s, 'prestige', them.regime === 'auto' ? 2 : -3, 24, `Sanctions on ${them.name}`);
      blocShock(s, 'trad', 1);
      pushNews(s, `${theName(cfgOf(s), true)} imposes sanctions on ${them.name}`, 0);
      break;
    case 'lift':
      s.pc -= 5;
      deal.sanction = false;
      s.world.rel[a.target] += 15;
      s.mods = s.mods.filter((m) => m.label !== `Sanctions on ${them.name}`);
      pushNews(s, `Sanctions on ${them.name} lifted`, 0);
      break;
    default:
      return { ok: false };
  }
  s.world.rel[a.target] = clamp(s.world.rel[a.target], -100, 100);
  refresh(s);
  return { ok: true };
}

// ── Legacy ──────────────────────────────────────────────────────────────────
export function legacy(s) {
  const st = s.start;
  const grade = (v) => (v >= 12 ? 'A' : v >= 5 ? 'B' : v >= -2 ? 'C' : v >= -9 ? 'D' : 'F');
  const avgGrowth = s.history.growth.length ? sum(s.history.growth) / s.history.growth.length : s.ind.growth;
  const dims = [
    { id: 'prosperity', name: 'Prosperity', v: (avgGrowth - s.econ.trend0) * 8 + (st.ind.unemp - s.ind.unemp) * 4 },
    { id: 'fairness', name: 'Fairness', v: (st.ind.gini - s.ind.gini) * 3 },
    { id: 'wellbeing', name: 'Health & education', v: (s.ind.health - st.ind.health) + (s.ind.edu - st.ind.edu) },
    { id: 'planet', name: 'Planet', v: (100 - s.ind.emis) * 0.8 },
    { id: 'freedom', name: 'Freedom', v: (s.ind.democ - st.ind.democ) + (s.ind.liberty - st.ind.liberty) * 0.7 },
    { id: 'security', name: 'Safety & security', v: (st.ind.crime - s.ind.crime) + (s.ind.mil - st.ind.mil) * 0.4 },
    { id: 'finances', name: 'Public finances', v: (st.econ.debt - s.econ.debt) * 0.8 - Math.max(0, s.econ.deficit - 3) * 2 },
    { id: 'standing', name: 'Standing in the world', v: (s.ind.prestige - st.ind.prestige) },
  ].map((d) => ({ ...d, grade: grade(d.v) }));
  const best = dims.slice().sort((a, b) => b.v - a.v)[0];
  const worst = dims.slice().sort((a, b) => a.v - b.v)[0];
  const EPITHETS = {
    prosperity: ['the Builder', 'the Squanderer'], fairness: ['the Equaliser', 'the Divider'], wellbeing: ['the Healer', 'the Neglectful'],
    planet: ['the Green', 'the Polluter'], freedom: ['the Liberator', 'the Autocrat'], security: ['the Guardian', 'the Lax'],
    finances: ['the Prudent', 'the Spendthrift'], standing: ['the Statesman', 'the Isolated'],
  };
  const epithet = Math.max(Math.abs(best.v), Math.abs(worst.v)) < 3 ? 'the Caretaker' : best.v > Math.abs(worst.v) ? EPITHETS[best.id][0] : EPITHETS[worst.id][1];
  const score = Math.round(sum(dims, (d) => clamp(d.v, -20, 20)) + s.stats.electionsWon * 15 + (s.turn / 12) * 4 + s.achievements.length * 3);
  return { dims, epithet, score, months: s.turn };
}
