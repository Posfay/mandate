// Leader backgrounds, cabinet roles, manifesto pledges, achievements.
import { round } from '../engine/util.js';

export const BACKGROUNDS = [
  {
    id: 'economist', name: 'Economist', blurb: 'Former central banker. Markets trust you; the street finds you cold.',
    perks: ['Bond markets charge you less', 'Finance minister more competent', 'Professionals and business warm to you'],
    blocs: { prof: 4, biz: 3, work: -2, poor: -2 }, yieldBonus: -0.6, pc: 0,
  },
  {
    id: 'unionist', name: 'Union organiser', blurb: 'Twenty years on picket lines and at negotiating tables.',
    perks: ['Workers and public sector rally to you', 'Strikes are easier to settle', 'Business is wary'],
    blocs: { work: 6, pub: 5, poor: 3, biz: -6 }, pc: 0,
  },
  {
    id: 'founder', name: 'Tech founder', blurb: 'You built a company worth billions. Now you want to fix the state.',
    perks: ['Business confidence and innovation boost', 'Professionals impressed', 'Conflict-of-interest stories follow you'],
    blocs: { biz: 6, prof: 4, work: -3, ret: -2 }, ind: { innov: 4, conf: 4, integ: -4 }, pc: 0,
  },
  {
    id: 'general', name: 'Retired general', blurb: 'You commanded troops abroad. Order and duty are not slogans to you.',
    perks: ['Security crises handled with authority', 'Traditional voters and retirees approve', 'The young are suspicious'],
    blocs: { trad: 5, ret: 4, rural: 3, youth: -4, minor: -2 }, ind: { mil: 5 }, pc: 0,
  },
  {
    id: 'lawyer', name: 'Human rights lawyer', blurb: 'You sued the government more times than you can count. Now you are it.',
    perks: ['Young and minority voters inspired', 'Rights and freedoms improve', 'Rural and traditional voters sceptical'],
    blocs: { youth: 5, minor: 6, prof: 2, rural: -3, trad: -4 }, ind: { liberty: 3 }, pc: 0,
  },
  {
    id: 'insider', name: 'Party veteran', blurb: 'Three decades in parliament. You know where every body is buried.',
    perks: ['+2 political capital each month', 'Cheaper whipping and lobbying', 'Voters trust you less'],
    blocs: {}, pc: 2, lobby: 0.75, trust: -6,
  },
  {
    id: 'outsider', name: 'Celebrity outsider', blurb: 'A household name from television. No record to attack, no allies to call.',
    perks: ['Bigger honeymoon and higher trust', 'Media love you', 'Parliament does not: −1 capital a month, dearer lobbying'],
    blocs: { youth: 3, work: 3, poor: 3, prof: -1 }, pc: -1, lobby: 1.3, trust: 8, honeymoon: 6,
  },
  {
    id: 'doctor', name: 'Doctor', blurb: 'You ran an emergency ward through a pandemic. People remember.',
    perks: ['Health crises handled with credibility', 'Retirees and public sector approve', 'Health outcomes improve'],
    blocs: { ret: 4, pub: 4, poor: 2, biz: -1 }, ind: { health: 3 }, pc: 0,
  },
];
export const BACKGROUND_MAP = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

export const ROLES = [
  { id: 'finance', name: 'Finance', fx: { conf: 1.2 } },
  { id: 'foreign', name: 'Foreign Affairs', fx: { prestige: 1.2 } },
  { id: 'interior', name: 'Interior', fx: { crime: -1.4 } },
  { id: 'defense', name: 'Defence', fx: { mil: 1.2 } },
  { id: 'health', name: 'Health', fx: { health: 1.2 } },
  { id: 'education', name: 'Education', fx: { edu: 1.0 } },
  { id: 'environment', name: 'Environment & Energy', fx: { emis: -1.0, energy: 1.0 } },
  { id: 'economy', name: 'Economy & Labour', fx: { growth: 0.05, innov: 0.8 } },
];
export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.id, r]));

export const DIFFICULTIES = [
  { id: 'easy', name: 'Steady hand', blurb: 'Bigger majority, more political capital, gentler crises.', approval: 58, pc: 3, seatBonus: 6, events: 0.85 },
  { id: 'normal', name: 'Realist', blurb: 'Politics as it is: tight margins and hard trade-offs.', approval: 54, pc: 0, seatBonus: 3, events: 1 },
  { id: 'hard', name: 'Crisis mode', blurb: 'A razor-thin mandate, hostile markets and a world on fire.', approval: 49, pc: -1, seatBonus: 0.5, events: 1.25 },
];
export const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

// Pledges: evaluated at the next election. `check` returns { progress 0..1, met, label }.
const prog = (cur, start, target) => {
  if (start === target) return cur === target ? 1 : 0;
  return Math.max(0, Math.min(1, (cur - start) / (target - start)));
};

export const PLEDGES = [
  {
    id: 'jobs', name: 'Put people back to work', icon: 'jobs',
    target: (s) => round(Math.max(2.5, s.start.ind.unemp - Math.max(1, s.start.ind.unemp * 0.15)), 1),
    desc: (s, t) => `Bring unemployment down to ${t}%.`,
    check: (s, t) => ({ progress: prog(s.ind.unemp, s.start.ind.unemp, t), met: s.ind.unemp <= t, label: `${round(s.ind.unemp, 1)}% now` }),
  },
  {
    id: 'inflation', name: 'Tame prices', icon: 'cost',
    target: (s) => round(s.start.ind.infl > 4 ? Math.max(3, s.start.ind.infl * 0.5) : 2.5, 1),
    desc: (s, t) => `Get inflation to ${t}% or lower.`,
    check: (s, t) => ({ progress: s.start.ind.infl <= t ? (s.ind.infl <= t ? 1 : 0.5) : prog(s.ind.infl, s.start.ind.infl, t), met: s.ind.infl <= t, label: `${round(s.ind.infl, 1)}% now` }),
  },
  {
    id: 'balance', name: 'Balance the books', icon: 'taxes',
    target: () => 1, available: (s) => s.econ.deficit > 1.5,
    desc: () => 'Cut the deficit below 1% of GDP.',
    check: (s, t) => ({ progress: prog(s.econ.deficit, s.start.econ.deficit, t), met: s.econ.deficit <= t, label: `${round(s.econ.deficit, 1)}% deficit` }),
  },
  {
    id: 'notax', name: 'No new taxes', icon: 'taxes', breakable: true,
    target: () => 0,
    desc: () => 'Never raise a tax rate or introduce a new tax.',
    check: (s) => ({ progress: s.flags.taxRaised ? 0 : 1, met: !s.flags.taxRaised, label: s.flags.taxRaised ? 'Broken' : 'Holding' }),
  },
  {
    id: 'climate', name: 'Cut emissions', icon: 'environment',
    target: () => 85,
    desc: () => 'Cut national emissions by 15%.',
    check: (s, t) => ({ progress: prog(s.ind.emis, 100, t), met: s.ind.emis <= t, label: `${round(100 - s.ind.emis, 1)}% cut so far` }),
  },
  {
    id: 'health', name: 'Fix the hospitals', icon: 'health',
    target: (s) => Math.round(s.start.ind.health + 8),
    desc: (s, t) => `Raise the health index to ${t}.`,
    check: (s, t) => ({ progress: prog(s.ind.health, s.start.ind.health, t), met: s.ind.health >= t, label: `${Math.round(s.ind.health)} now` }),
  },
  {
    id: 'homes', name: 'Homes people can afford', icon: 'housing',
    target: (s) => Math.round(s.start.ind.housing + 10),
    desc: (s, t) => `Raise housing affordability to ${t}.`,
    check: (s, t) => ({ progress: prog(s.ind.housing, s.start.ind.housing, t), met: s.ind.housing >= t, label: `${Math.round(s.ind.housing)} now` }),
  },
  {
    id: 'crime', name: 'Safer streets', icon: 'crime',
    target: (s) => Math.round(s.start.ind.crime * 0.85),
    desc: (s, t) => `Bring the crime index down to ${t}.`,
    check: (s, t) => ({ progress: prog(s.ind.crime, s.start.ind.crime, t), met: s.ind.crime <= t, label: `${Math.round(s.ind.crime)} now` }),
  },
  {
    id: 'defence', name: 'Defend the nation', icon: 'security',
    target: (s) => round(Math.max(3.5, s.start.budget.spend.defense + 1), 1),
    desc: (s, t) => `Raise defence spending to ${t}% of GDP.`,
    check: (s, t) => ({ progress: prog(s.budget.spend.defense, s.start.budget.spend.defense, t), met: s.budget.spend.defense >= t - 0.001, label: `${round(s.budget.spend.defense, 1)}% now` }),
  },
  {
    id: 'clean', name: 'Clean up politics', icon: 'corruption',
    target: (s) => Math.round(s.start.ind.integ + 10),
    desc: (s, t) => `Raise the integrity index to ${t}.`,
    check: (s, t) => ({ progress: prog(s.ind.integ, s.start.ind.integ, t), met: s.ind.integ >= t, label: `${Math.round(s.ind.integ)} now` }),
  },
  {
    id: 'growth', name: 'Grow the economy', icon: 'economy',
    target: (s) => round(s.econ.trend0 + 0.5, 1),
    desc: (s, t) => `Average growth of ${t}% or better over the term.`,
    check: (s, t) => {
      const h = s.history.growth.slice(-Math.max(1, s.turn - s.termStart));
      const avg = h.length ? h.reduce((a, b) => a + b, 0) / h.length : s.ind.growth;
      return { progress: Math.max(0, Math.min(1, avg / t)), met: avg >= t, label: `${round(avg, 1)}% average` };
    },
  },
  {
    id: 'borders', name: 'Control the borders', icon: 'immigration',
    target: () => 0, available: (s) => s.policies.immigration > 0,
    desc: () => 'Make immigration policy restrictive.',
    check: (s) => ({ progress: s.policies.immigration === 0 ? 1 : 0, met: s.policies.immigration === 0, label: s.policies.immigration === 0 ? 'Done' : 'Not yet' }),
  },
  {
    id: 'universal', name: 'Healthcare for all', icon: 'health',
    target: () => 2, available: (s) => s.policies.healthcare < 2,
    desc: () => 'Introduce universal single-payer healthcare.',
    check: (s) => ({ progress: s.policies.healthcare / 2, met: s.policies.healthcare === 2, label: s.policies.healthcare === 2 ? 'Done' : 'Not yet' }),
  },
  {
    id: 'tuition', name: 'Free university', icon: 'education',
    target: () => 2, available: (s) => s.policies.tuition < 2,
    desc: () => 'Abolish university tuition fees.',
    check: (s) => ({ progress: s.policies.tuition / 2, met: s.policies.tuition === 2, label: s.policies.tuition === 2 ? 'Done' : 'Not yet' }),
  },
  {
    id: 'minwage', name: 'A pay rise for the lowest paid', icon: 'jobs',
    target: (s) => Math.min(4, s.start.policies.min_wage + 1), available: (s) => s.policies.min_wage < 4,
    desc: () => 'Raise the minimum wage by at least one level.',
    check: (s, t) => ({ progress: s.policies.min_wage >= t ? 1 : 0, met: s.policies.min_wage >= t, label: s.policies.min_wage >= t ? 'Done' : 'Not yet' }),
  },
  {
    id: 'debt', name: 'Pay down the debt', icon: 'taxes',
    target: (s) => Math.round(s.start.econ.debt - 5), available: (s) => s.econ.debt > 40,
    desc: (s, t) => `Bring public debt down to ${t}% of GDP.`,
    check: (s, t) => ({ progress: prog(s.econ.debt, s.start.econ.debt, t), met: s.econ.debt <= t, label: `${Math.round(s.econ.debt)}% now` }),
  },
  {
    id: 'democracy', name: 'Restore democracy', icon: 'liberty',
    target: (s) => Math.min(95, Math.round(s.start.ind.democ + 12)), available: (s) => s.ind.democ < 80,
    desc: (s, t) => `Raise the democracy index to ${t}.`,
    check: (s, t) => ({ progress: prog(s.ind.democ, s.start.ind.democ, t), met: s.ind.democ >= t, label: `${Math.round(s.ind.democ)} now` }),
  },
];
export const PLEDGE_MAP = Object.fromEntries(PLEDGES.map((p) => [p.id, p]));

export const ACHIEVEMENTS = [
  { id: 'first_bill', name: 'Order, order', desc: 'Pass your first bill.', check: (s) => s.stats.billsPassed >= 1 },
  { id: 'reformer', name: 'The reformer', desc: 'Pass 15 bills.', check: (s) => s.stats.billsPassed >= 15 },
  { id: 'popular', name: 'Beloved', desc: 'Reach 65% approval.', check: (s) => s.approval >= 65 },
  { id: 'surplus', name: 'Iron chancellor', desc: 'Run a budget surplus.', check: (s) => s.econ.deficit < 0 },
  { id: 'jobs', name: 'Full employment', desc: 'Bring unemployment under 4%.', check: (s) => s.ind.unemp < 4 && s.start.ind.unemp >= 4 },
  { id: 'green', name: 'Net-zero pathway', desc: 'Cut emissions by 25%.', check: (s) => s.ind.emis <= 75 },
  { id: 'statesman', name: 'Statesman', desc: 'Reach a prestige of 85.', check: (s) => s.ind.prestige >= 85 },
  { id: 'trader', name: 'Open for business', desc: 'Sign three trade agreements.', check: (s) => s.stats.tradeDeals >= 3 },
  { id: 'restorer', name: 'Restorer', desc: 'Raise the democracy index by 15.', check: (s) => s.ind.democ - s.start.ind.democ >= 15 },
  { id: 'strongman', name: 'The firm hand', desc: 'Control both the courts and the public broadcaster.', check: (s) => s.policies.courts === 1 && s.policies.pubmedia === 1 && (s.start.policies.courts === 0 || s.start.policies.pubmedia === 0) },
  { id: 'survivor', name: 'Survivor', desc: 'Survive a confidence vote or leadership challenge.', check: (s) => s.stats.survived >= 1 },
  { id: 'second', name: 'Four more years', desc: 'Win re-election.', check: (s) => s.stats.electionsWon >= 1 },
  { id: 'promises', name: 'A person of your word', desc: 'Keep every pledge through an election.', check: (s) => s.stats.allPledgesKept },
];
