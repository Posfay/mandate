// Declarative effect ops: apply them to state, or describe them for the UI.
import { EVENT_MAP } from '../data/events.js';
import { BLOC_MAP, ISSUE_MAP } from '../data/blocs.js';
import { POLICY_MAP, SPEND_LINES, TAX_LINES } from '../data/policies.js';
import { ACTOR_MAP, ACTORS } from '../data/world.js';
import { ROLE_MAP } from '../data/meta.js';
import { cfgOf, theName, partyOf, playerParty, blocOf, IND_LABELS, BAD_UP, partnerDemands, govSeats, majorityOf } from './core.js';
import { replaceMinister } from './cabinet.js';
import { rand, clamp, sum, dist, gauss } from './util.js';

export const SYSTEM_EVENTS = {};
export const getEvent = (id) => EVENT_MAP[id] || SYSTEM_EVENTS[id];

export function addMod(s, key, value, months, label) {
  s.mods.push({ key, value, until: months ? s.turn + months : 1e9, label });
}

export function blocShock(s, which, v) {
  const ids = which === 'all' ? s.blocs.map((b) => b.id) : Array.isArray(which) ? which : [which];
  for (const id of ids) {
    s.blocMods.push({ bloc: id, value: v });
    const b = blocOf(s, id);
    if (b) b.approval = clamp(b.approval + v * 0.5, 2, 98);
  }
  s.approval = sum(s.blocs, (b) => b.size * b.approval);
}

const OUTLETS = { pos: ['The Chronicle', 'National Broadcaster', 'The Ledger'], neg: ['Daily Courier', 'The Chronicle', 'Trending now'], neu: ['National Broadcaster', 'The Ledger', 'Wire services'] };
export function pushNews(s, text, tone = 0, outlet) {
  const pool = tone > 0 ? OUTLETS.pos : tone < 0 ? OUTLETS.neg : OUTLETS.neu;
  s.news.unshift({ turn: s.turn, text, tone, outlet: outlet || pool[(s.news.length + text.length) % pool.length] });
  if (s.news.length > 120) s.news.length = 120;
  s.monthNews.push({ text, tone });
}

export function rivalParty(s) {
  return s.parties.filter((p) => !s.gov.includes(p.id)).sort((a, b) => (s.polls[b.id] || 0) - (s.polls[a.id] || 0))[0];
}

export function fill(s, str, ctx = {}) {
  if (!str) return '';
  const c = cfgOf(s);
  const rival = rivalParty(s);
  const min = ctx.role ? s.cabinet[ctx.role] : null;
  const actor = ctx.actor ? ACTOR_MAP[ctx.actor] : null;
  const map = {
    country: theName(c), demonym: c.demonym, capital: c.capital, title: c.title, leader: s.player.name,
    party: playerParty(s).short, rival: rival ? rival.short : 'the opposition', legislature: c.legislature,
    min: ctx.minName || min?.name || 'the minister', minRole: ROLE_MAP[ctx.role]?.name || '',
    actor: actor?.name || 'a hostile state', actorLeader: actor ? leaderOf(s, actor.id) : '',
    partner: ctx.partner ? partyOf(s, ctx.partner)?.short : 'your partner', policy: ctx.policy ? POLICY_MAP[ctx.policy]?.name : '',
  };
  return str.replace(/\{(\w+)\}/g, (m, k) => String(map[k] ?? ctx[k] ?? m));
}

export function leaderOf(s, id) {
  const a = ACTOR_MAP[id];
  const l = s.world?.leaders?.[id] ?? a?.leader;
  return l || `the ${a?.ltitle?.toLowerCase() || 'government'}`;
}

const DEMOCRACIES = ACTORS.filter((a) => a.regime === 'dem').map((a) => a.id);
const FOREIGN_REACT = {
  digital_tax: (d) => [['USA', -8 * d]],
  courts: (d) => DEMOCRACIES.map((id) => [id, -8 * d]),
  pubmedia: (d) => DEMOCRACIES.map((id) => [id, -4 * d]),
  emergency: (d) => DEMOCRACIES.map((id) => [id, -7 * d]),
  media_law: (d) => DEMOCRACIES.map((id) => [id, -3 * Math.max(0, d)]),
  trade: (d) => (d > 0 ? ['USA', 'CHN', 'DEU', 'JPN', 'GBR', 'FRA'].map((id) => [id, -4 * d]) : []),
  carbon_tax: (d) => ['DEU', 'FRA', 'GBR', 'SWE', 'NLD'].map((id) => [id, 2 * d]),
};

export function setPolicy(s, id, level, via = 'law') {
  const pol = POLICY_MAP[id];
  level = clamp(level, 0, pol.options.length - 1);
  const prev = s.policies[id];
  if (prev === level) return;
  s.policies[id] = level;
  if (pol.tax && level > prev && via !== 'coalition') s.flags.taxRaised = true;
  s.policyLog.unshift({ turn: s.turn, id, from: prev, to: level, via });
  const a = pol.options[prev].pos;
  const b = pol.options[level].pos;
  for (const pid of s.gov.slice(1)) {
    const p = partyOf(s, pid);
    if (!p) continue;
    p.sat = clamp(p.sat + (dist(p.econ, p.social, a[0], a[1]) - dist(p.econ, p.social, b[0], b[1])) * 18, 0, 100);
  }
  const me = playerParty(s);
  const drift = dist(me.econ, me.social, b[0], b[1]) - dist(me.econ, me.social, a[0], a[1]);
  if (drift > 0.3) s.unity = clamp(s.unity - drift * 6, 0, 100);
  const fr = FOREIGN_REACT[id];
  if (fr) for (const [cid, v] of fr(level - prev)) if (cid !== s.countryId && s.world.rel[cid] != null) s.world.rel[cid] = clamp(s.world.rel[cid] + v, -100, 100);
}

export function concede(s, partnerId) {
  const p = partyOf(s, partnerId);
  if (!p) return;
  const d = partnerDemands(s, p, 1)[0];
  if (d) {
    setPolicy(s, d.policy, d.to, 'coalition');
    pushNews(s, `${p.short} wins concession on ${POLICY_MAP[d.policy].name.toLowerCase()}`, 0);
  }
}

export function leaveCoalition(s, partnerId) {
  const p = partyOf(s, partnerId);
  if (!p || !s.gov.includes(partnerId) || s.gov[0] === partnerId) return;
  s.gov = s.gov.filter((id) => id !== partnerId);
  p.sat = 20;
  p.rel = clamp(p.rel - 20, 0, 100);
  for (const r in s.cabinet) if (s.cabinet[r]?.party === partnerId) replaceMinister(s, r);
  pushNews(s, `${p.short} quits the government`, -1);
  blocShock(s, 'all', -2);
  if (s.system !== 'presidential' && govSeats(s) < majorityOf(s)) {
    s.flags.minority = true;
    s.echoes.push({ at: s.turn + 1, event: 'no_confidence', ctx: {}, teaser: 'The opposition smells blood: a confidence vote is coming.' });
  }
}

export function gameOver(s, reason, text) {
  if (s.over) return;
  s.over = { reason, text, turn: s.turn };
  s.phase = 'over';
}

export function leadershipVote(s) {
  const support = 50 + (s.approval - 35) * 1.2 + (s.unity - 50) * 0.5 + (s.trust - 50) * 0.15 + gauss(s) * 8;
  s.voteResult = { kind: 'leadership', support: clamp(support, 5, 95), passed: support >= 50 };
  if (support >= 50) {
    s.unity = clamp(s.unity + 12, 0, 100);
    s.stats.survived++;
    pushNews(s, `${s.player.name} sees off leadership challenge with ${Math.round(clamp(support, 0, 100))}% of MPs`, 1);
  } else {
    gameOver(s, 'ousted', `Your own party removed you. Only ${Math.round(clamp(support, 0, 100))}% of your MPs stood by you.`);
  }
}

export function confidenceVote(s) {
  const c = cfgOf(s);
  const k = 2.5 + 7 * c.discipline;
  let against = 0;
  const byParty = {};
  for (const p of s.parties) {
    const seats = s.seats[p.id] || 0;
    if (!seats) continue;
    const gi = s.gov.indexOf(p.id);
    let st;
    if (gi === 0) st = 0.9 + (s.unity - 50) / 50;
    else if (gi > 0) st = (p.sat - 35) / 30;
    else st = -0.55 - (42 - s.approval) / 60 + (p.rel - 50) / 90 - (p.populist || 0) * 0.2;
    const supportFrac = 1 / (1 + Math.exp(-k * st));
    const y = clamp(Math.round(seats * (1 - supportFrac) + gauss(s) * Math.sqrt(seats) * 0.4), 0, seats);
    byParty[p.id] = { yes: y, no: seats - y };
    against += y;
  }
  const need = majorityOf(s);
  const passed = against >= need;
  s.voteResult = { kind: 'confidence', yes: against, no: c.seats - against, need, passed, byParty };
  if (passed) {
    pushNews(s, 'Government falls in confidence vote; snap election called', -1);
    s.nextElection = s.turn + 2;
    s.flags.caretaker = true;
    s.pc = Math.max(0, s.pc - 15);
  } else {
    s.stats.survived++;
    pushNews(s, `Government survives confidence vote, ${c.seats - against} to ${against}`, 1);
    s.pc = clamp(s.pc + 5, 0, 100);
  }
}

function resolveParty(s, a) {
  if (a === 'rival') return rivalParty(s);
  if (a === 'own') return playerParty(s);
  return partyOf(s, a);
}

export function normalizeSal(s) {
  const t = sum(Object.values(s.sal));
  for (const k in s.sal) s.sal[k] /= t;
}

export function resolveOps(s, ch, ctx) {
  return typeof ch.ops === 'function' ? ch.ops(s, ctx) : ch.ops || [];
}

const sub = (ctx) => (x) => (typeof x === 'string' && x.startsWith('$') ? ctx[x.slice(1)] : x);

export function applyOps(s, ops, ctx = {}, label = 'Recent events') {
  for (const raw of ops) {
    const [t, a, b, c] = raw.map(sub(ctx));
    switch (t) {
      case 'bloc': blocShock(s, a, b); break;
      case 'mod': addMod(s, a, b, c, label); break;
      case 'econ': s.econ[a] = (s.econ[a] || 0) + b; break;
      case 'debt': s.econ.debt = Math.max(0, s.econ.debt + a); break;
      case 'spend': s.budget.spend[a] = Math.max(0, s.budget.spend[a] + b); break;
      case 'tax':
        s.budget.tax[a] = clamp(s.budget.tax[a] + b, 0, 90);
        if (b > 0) s.flags.taxRaised = true;
        break;
      case 'pc': s.pc = clamp(s.pc + a, 0, 100); break;
      case 'trust': s.trust = clamp(s.trust + a, 0, 100); break;
      case 'unity': s.unity = clamp(s.unity + a, 0, 100); break;
      case 'agenda': s.agenda = Math.max(0, s.agenda + a); break;
      case 'rel': if (a && s.world.rel[a] != null) s.world.rel[a] = clamp(s.world.rel[a] + b, -100, 100); break;
      case 'sal': if (s.sal[a] != null) { s.sal[a] = Math.max(0.01, s.sal[a] + b * 0.01); normalizeSal(s); } break;
      case 'heat': s.heat[a] = clamp((s.heat[a] || 0) + b, 0, 100); break;
      case 'party': {
        const p = resolveParty(s, a);
        if (p) {
          p[b] = (p[b] || 0) + c;
          if (b === 'sat' || b === 'rel') p[b] = clamp(p[b], 0, 100);
        }
        break;
      }
      case 'minister': {
        const m = s.cabinet[a];
        if (m) m[b] = clamp(m[b] + c, b === 'comp' ? 1 : 0, b === 'comp' ? 10 : 100);
        break;
      }
      case 'fire': {
        const old = s.cabinet[a];
        if (old) {
          replaceMinister(s, a);
          if (old.party === s.player.partyId) s.unity = clamp(s.unity - 2, 0, 100);
          pushNews(s, `${old.name} leaves the cabinet`, 0);
        }
        break;
      }
      case 'policy': setPolicy(s, a, b, 'event'); break;
      case 'revert': if (ctx.policy && ctx.prev != null) setPolicy(s, ctx.policy, ctx.prev, 'court'); break;
      case 'concede': concede(s, a); break;
      case 'leave': leaveCoalition(s, a); break;
      case 'echo': s.echoes.push({ at: s.turn + b, event: a, ctx: { ...ctx }, teaser: fill(s, c || '', ctx) }); break;
      case 'flag': s.flags[a] = b ?? true; break;
      case 'news': pushNews(s, fill(s, a, ctx), b ?? 0); break;
      case 'chance': if (rand(s) < a) applyOps(s, b, ctx, label); else if (c) applyOps(s, c, ctx, label); break;
      case 'leadershipVote': leadershipVote(s); break;
      case 'confidenceVote': confidenceVote(s); break;
      case 'snap': s.nextElection = s.turn + a; pushNews(s, `Snap election called for ${a} months’ time`, 0); break;
      case 'over': gameOver(s, a, b); break;
      case 'global': s.world.globals[a] += b; break;
      case 'campaign': {
        const me = playerParty(s);
        me.mom = (me.mom || 0) + a;
        break;
      }
      default: break;
    }
  }
}

// ── Describing ops for the UI ───────────────────────────────────────────────
const SCALE = { growth: [0.1, 0.3], unemp: [0.1, 0.25], infl: [0.2, 0.5], gini: [0.5, 1.5], emis: [1, 3] };
const strength = (v, lo, hi) => (Math.abs(v) < lo ? 1 : Math.abs(v) < hi ? 2 : 3);
const ECON_LABEL = { cbBias: ['Interest rates', null], inflAnchor: ['Inflation expectations', false], riskMod: ['Market risk', false], rate: ['Interest rates', null] };

export function describeOps(s, ops, ctx = {}, uncertain = false) {
  const out = [];
  const push = (label, v, good, str, extra = {}) => out.push({ label, dir: Math.sign(v) || 1, good, strength: str, uncertain, ...extra });
  for (const raw of ops) {
    const [t, a, b, c] = raw.map(sub(ctx));
    switch (t) {
      case 'bloc': push(a === 'all' ? 'Everyone' : BLOC_MAP[a]?.short || a, b, b > 0, strength(b, 3, 6)); break;
      case 'mod': {
        const sc = SCALE[a] || [2, 5];
        const good = BAD_UP.has(a) ? b < 0 : b > 0;
        push(IND_LABELS[a] || a, b, good, strength(b, sc[0], sc[1]), { temp: !!c });
        break;
      }
      case 'econ': {
        const [lab, goodUp] = ECON_LABEL[a] || [a, null];
        push(lab, b, goodUp == null ? null : goodUp ? b > 0 : b < 0, strength(b, 0.4, 1));
        break;
      }
      case 'debt': push('Public debt', a, a < 0, strength(a, 0.08, 0.3)); break;
      case 'spend': push(`${SPEND_LINES.find((l) => l.id === a)?.name || a} spending`, b, null, strength(b, 0.08, 0.3)); break;
      case 'tax': push(TAX_LINES.find((l) => l.id === a)?.name || a, b, null, 2); break;
      case 'pc': push(`Political capital ${a > 0 ? '+' : '−'}${Math.abs(a)}`, a, a > 0, 0); break;
      case 'trust': push('Trust', a, a > 0, strength(a, 2, 4)); break;
      case 'unity': push('Party unity', a, a > 0, strength(a, 4, 9)); break;
      case 'agenda': push('Uses an agenda slot', a, null, 0); break;
      case 'rel': push(`Relations with ${ACTOR_MAP[a]?.name || 'them'}`, b, b > 0, strength(b, 6, 14)); break;
      case 'sal': push(`Attention on ${ISSUE_MAP[a]?.name.toLowerCase() || a}`, b, null, 1); break;
      case 'heat': {
        const lab = { scandal: 'Scandal', unrest: 'Unrest', migration: 'Migration pressure', disaster: 'Disaster coverage' }[a] || a;
        push(lab, b, a === 'disaster' ? null : b < 0, strength(b, 6, 15));
        break;
      }
      case 'party': {
        const p = resolveParty(s, a);
        if (!p) break;
        const own = s.gov.includes(p.id);
        if (b === 'mom') push(`${p.short} support`, c, own ? c > 0 : c < 0, strength(c, 0.06, 0.12));
        else push(`${p.short} ${b === 'sat' ? 'satisfaction' : 'relations'}`, c, c > 0, strength(c, 8, 16));
        break;
      }
      case 'minister': push(`${ROLE_MAP[a]?.name || ''} minister ${b}`, c, c > 0, 1); break;
      case 'fire': push(`Sack ${s.cabinet[a]?.name || 'minister'}`, -1, null, 0); break;
      case 'policy': push(`${POLICY_MAP[a].name}: ${POLICY_MAP[a].options[b].label}`, 1, null, 0); break;
      case 'revert': push('Decree is voided', -1, null, 0); break;
      case 'concede': push('Partner gets a policy concession', 1, null, 0); break;
      case 'leave': push('Partner quits the coalition', -1, false, 3); break;
      case 'echo': push('Consequences later', 1, null, 0, { later: true }); break;
      case 'chance': {
        out.push(...describeOps(s, b, ctx, true));
        if (c) out.push(...describeOps(s, c, ctx, true));
        break;
      }
      case 'leadershipVote': push('Party votes on your leadership', 1, null, 0, { uncertain: true }); break;
      case 'confidenceVote': push('Confidence vote', 1, null, 0, { uncertain: true }); break;
      case 'snap': push(`Election in ${a} months`, 1, null, 0); break;
      case 'over': push('Ends your time in office', -1, false, 3); break;
      default: break;
    }
  }
  // merge duplicates
  const merged = [];
  for (const o of out) {
    const m = merged.find((x) => x.label === o.label && x.uncertain === o.uncertain);
    if (m) m.strength = Math.max(m.strength, o.strength);
    else merged.push(o);
  }
  return merged;
}
