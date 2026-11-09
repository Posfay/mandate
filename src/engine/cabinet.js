// Fictional cabinet members: generated people with competence, loyalty, ambition and integrity.
import { NAMES } from '../data/names.js';
import { ROLES } from '../data/meta.js';
import { rand, rint, pick, clamp, sum } from './util.js';

// Rough appearance mix per country so generated cabinets look plausible. Indices into the portrait palette.
const EU = [0.36, 0.34, 0.15, 0.07, 0.04, 0.03, 0.01];
const SKIN_MIX = {
  USA: [0.3, 0.3, 0.12, 0.1, 0.08, 0.07, 0.03], CAN: [0.32, 0.3, 0.14, 0.1, 0.07, 0.05, 0.02], AUS: [0.36, 0.3, 0.16, 0.1, 0.05, 0.02, 0.01],
  JPN: [0.3, 0.5, 0.2, 0, 0, 0, 0], KOR: [0.3, 0.5, 0.2, 0, 0, 0, 0], TUR: [0.1, 0.35, 0.4, 0.15, 0, 0, 0],
  IND: [0, 0.05, 0.2, 0.35, 0.3, 0.1, 0], BRA: [0.15, 0.2, 0.2, 0.2, 0.12, 0.1, 0.03], MEX: [0.08, 0.2, 0.35, 0.3, 0.07, 0, 0],
  ARG: [0.3, 0.4, 0.2, 0.1, 0, 0, 0], ZAF: [0.06, 0.06, 0.04, 0.06, 0.2, 0.33, 0.25],
};
const DARK_HAIR = new Set(['JPN', 'KOR', 'IND', 'TUR', 'MEX']);
export function appearance(s, r = () => rand(s)) {
  const mix = SKIN_MIX[s.countryId] || EU;
  let x = r();
  let skin = 0;
  for (; skin < mix.length - 1; skin++) {
    x -= mix[skin];
    if (x <= 0) break;
  }
  return { skin, darkHair: DARK_HAIR.has(s.countryId) || skin >= 3 };
}
export function makeMinister(s, partyId, opts = {}) {
  const pool = NAMES[s.countryId] || NAMES.GBR;
  const female = rand(s) < 0.45;
  let name;
  for (let tries = 0; tries < 8; tries++) {
    const first = pick(s, female ? pool.f : pool.m);
    const last = pick(s, pool.s);
    name = ['HUN', 'JPN', 'KOR'].includes(s.countryId) ? `${last} ${first}` : `${first} ${last}`;
    if (!s.usedNames.includes(name)) break;
  }
  s.usedNames.push(name);
  const m = {
    id: `m${(s.nextId = (s.nextId || 0) + 1)}`,
    name,
    female,
    age: rint(s, 34, 68),
    party: partyId,
    comp: clamp(Math.round(4 + rand(s) * 5 + (opts.compBonus || 0)), 1, 10),
    loyalty: rint(s, 35, 85),
    ambition: rint(s, 15, 90),
    integrity: rint(s, 25, 95),
    seed: rint(s, 1, 1e9),
    ...appearance(s),
  };
  return m;
}

// How many cabinet posts each governing party gets, roughly proportional to seats.
export function allocatePosts(s) {
  const gov = s.gov.map((id) => ({ id, seats: s.seats[id] || 0 }));
  const total = sum(gov, (g) => g.seats) || 1;
  const posts = {};
  let given = 0;
  for (const g of gov.slice(1)) {
    const n = Math.max(1, Math.round((ROLES.length * g.seats) / total * 0.9));
    posts[g.id] = n;
    given += n;
  }
  posts[s.gov[0]] = Math.max(3, ROLES.length - given);
  return posts;
}

export function formCabinet(s) {
  const posts = allocatePosts(s);
  // the player's party keeps finance, foreign and interior by tradition
  const order = ['finance', 'foreign', 'interior', 'defense', 'economy', 'health', 'education', 'environment'];
  const assign = {};
  const partnerQueue = [];
  for (const id of s.gov.slice(1)) for (let i = 0; i < (posts[id] || 0); i++) partnerQueue.push(id);
  // partners take from the end of the list (softer portfolios first, like real coalition deals)
  const roles = order.slice();
  for (let i = roles.length - 1; i >= 0 && partnerQueue.length; i--) {
    if (['finance', 'foreign'].includes(roles[i])) continue;
    assign[roles[i]] = partnerQueue.shift();
  }
  for (const r of roles) if (!assign[r]) assign[r] = s.gov[0];
  const fin = s.player.bg === 'economist' ? 2 : 0;
  const cab = {};
  for (const r of order) {
    const prev = s.cabinet?.[r];
    cab[r] = prev && prev.party === assign[r] ? prev : makeMinister(s, assign[r], { compBonus: r === 'finance' ? fin : 0 });
  }
  s.cabinet = cab;
  s.bench = [];
  for (let i = 0; i < 4; i++) s.bench.push(makeMinister(s, s.gov[0]));
}

export function replaceMinister(s, role, candidate) {
  const old = s.cabinet[role];
  const m = candidate || makeMinister(s, old?.party || s.gov[0]);
  s.cabinet[role] = m;
  s.bench = s.bench.filter((b) => b.id !== m.id);
  while (s.bench.length < 4) s.bench.push(makeMinister(s, s.gov[0]));
  return { old, m };
}
