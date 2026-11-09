// Headless balance test: plays every country with a simple bot and prints how the term went.
// Usage: node tools/simtest.mjs [countryId] [months]
import { COUNTRIES } from '../src/data/countries.js';
import { createGame, dispatch } from '../src/engine/game.js';
import { getEvent } from '../src/engine/effects.js';

const only = process.argv[2];
const months = Number(process.argv[3] || 50);
const rows = [];
for (const c of COUNTRIES) {
  if (only && c.id !== only) continue;
  for (const party of [c.parties[0].id, c.parties[1].id]) {
    const s = createGame({ countryId: c.id, partyId: party, name: 'Test', bg: 'insider', difficulty: 'normal', pledges: ['jobs', 'growth', 'health'], seed: 1234 });
    const startApproval = s.approval;
    const startSeats = s.seats[party];
    if (s.phase === 'coalition') {
      const willing = s.coalition.candidates.filter((x) => x.willing >= 40);
      const picks = [];
      let seats = s.seats[party];
      for (const w of willing) {
        if (seats >= Math.floor(c.seats / 2) + 1) break;
        picks.push(w.id);
        seats += w.seats;
      }
      const r = dispatch(s, { type: 'formGovernment', partners: picks });
      if (!r.ok) dispatch(s, { type: 'formGovernment', partners: [] });
    }
    let errors = 0;
    for (let m = 0; m < months && !s.over; m++) {
      if (s.phase === 'coalition') {
        const r = dispatch(s, { type: 'formGovernment', partners: s.coalition.candidates.filter((x) => x.willing >= 40).map((x) => x.id) });
        if (!r.ok) dispatch(s, { type: 'concede' });
        continue;
      }
      let guard = 0;
      while (s.inbox.length && guard++ < 10) {
        const ev = s.inbox[0];
        const e = getEvent(ev.id);
        const idx = e.choices.findIndex((ch) => !ch.req || ch.req(s));
        try {
          dispatch(s, { type: 'resolveEvent', uid: ev.uid, choice: Math.max(0, (m + guard) % e.choices.length === idx ? idx : idx) });
        } catch (err) {
          errors++;
          console.error('event error', ev.id, err.message);
          s.inbox.shift();
        }
      }
      try {
        const ok = dispatch(s, { type: 'endMonth' });
        if (!ok.ok && s.inbox.length === 0 && s.phase === 'play') { console.error('endMonth refused', c.id); break; }
      } catch (err) {
        errors++;
        console.error('endMonth error', c.id, err.stack);
        break;
      }
    }
    rows.push({
      c: c.id, party, seats0: `${startSeats}/${c.seats}`, gov: s.gov.join('+'), appr0: startApproval.toFixed(0), appr: s.approval.toFixed(0),
      growth: s.ind.growth.toFixed(1), unemp: s.ind.unemp.toFixed(1), infl: s.ind.infl.toFixed(1), rate: s.econ.rate.toFixed(1),
      debt: s.econ.debt.toFixed(0), def: s.econ.deficit.toFixed(1), pc: s.pc, poll: s.polls[party].toFixed(1), turn: s.turn, over: s.over?.reason || '', errors,
    });
  }
}
console.table(rows);
