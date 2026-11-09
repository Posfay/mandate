// Determinism check: play a game with a varied bot, then rebuild it from (setup, actionLog) alone
// and confirm the two states are identical. This is the property lockstep multiplayer relies on.
// Usage: node tools/replaytest.mjs [countryId] [partyId] [months]
import { createGame, dispatch, billCost, DIPLO_ACTIONS } from '../src/engine/game.js';
import { getEvent } from '../src/engine/effects.js';
import { POLICIES } from '../src/data/policies.js';
import { ACTORS } from '../src/data/world.js';

const [countryId = 'GBR', partyId = 'LAB', months = '36'] = process.argv.slice(2);
const s = createGame({ countryId, partyId, name: 'Replay', bg: 'economist', difficulty: 'normal', pledges: ['jobs', 'health', 'notax'], seed: 20270101 });

let k = 0;
const next = () => (k = (k * 1103515245 + 12345) % 2147483648) / 2147483648; // bot's own RNG, separate from the game's
if (s.phase === 'coalition') dispatch(s, { type: 'formGovernment', partners: s.coalition.candidates.filter((c) => c.willing >= 40).slice(0, 2).map((c) => c.id) });
if (s.phase === 'coalition') dispatch(s, { type: 'formGovernment', partners: [] });

for (let m = 0; m < Number(months) && !s.over; m++) {
  if (s.phase === 'coalition') {
    const r = dispatch(s, { type: 'formGovernment', partners: s.coalition.candidates.filter((c) => c.willing >= 40).map((c) => c.id) });
    if (!r.ok) dispatch(s, { type: 'concede' });
    continue;
  }
  while (s.inbox.length) {
    const ev = s.inbox[0];
    const e = getEvent(ev.id);
    const ok = e.choices.map((c, i) => (!c.req || c.req(s) ? i : -1)).filter((i) => i >= 0);
    dispatch(s, { type: 'resolveEvent', uid: ev.uid, choice: ok[Math.floor(next() * ok.length)] });
  }
  if (next() < 0.6) {
    const pol = POLICIES[Math.floor(next() * POLICIES.length)];
    const to = Math.floor(next() * pol.options.length);
    if (to !== s.policies[pol.id] && s.pc >= billCost(s, pol.id, to) + 4) dispatch(s, { type: 'bill', draft: { kind: 'policy', policy: pol.id, to, lobby: { [s.parties[0].id]: 1 } } });
  }
  if (next() < 0.5) dispatch(s, { type: 'agenda', action: 'rally', target: s.blocs[Math.floor(next() * s.blocs.length)].id });
  if (next() < 0.2) dispatch(s, { type: 'diplomacy', action: DIPLO_ACTIONS[Math.floor(next() * 3)].id, target: ACTORS[Math.floor(next() * ACTORS.length)].id });
  if (next() < 0.1 && s.bench[0]) dispatch(s, { type: 'reshuffle', role: 'education', candidate: s.bench[0].id });
  dispatch(s, { type: 'endMonth' });
}

const r = createGame(s.setup);
for (const { a } of s.actionLog) dispatch(r, a);

const strip = (x) => JSON.stringify({ ...x, actionLog: x.actionLog.length });
const same = strip(s) === strip(r);
console.log(`${countryId}/${partyId}: ${s.actionLog.length} actions over ${s.turn} months, ${s.stats.billsPassed} bills passed`);
console.log(same ? 'Replay identical: the engine is deterministic.' : 'MISMATCH: replay diverged.');
if (!same) {
  const A = JSON.parse(strip(s));
  const B = JSON.parse(strip(r));
  for (const key of Object.keys(A)) if (JSON.stringify(A[key]) !== JSON.stringify(B[key])) console.log('  differs:', key);
  process.exit(1);
}
