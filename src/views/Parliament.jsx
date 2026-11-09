import { useState } from 'react';
import Hemicycle from '../ui/Hemicycle.jsx';
import { Meter } from '../ui/bits.jsx';
import { cfgOf, govSeats, majorityOf, playerParty } from '../engine/core.js';
import { POLICY_MAP } from '../data/policies.js';
import { fmtDate, monthsLabel } from '../engine/util.js';
import { ideologyLabel } from '../screens/Start.jsx';

export default function ParliamentView({ s, act }) {
  const [hl, setHl] = useState(null);
  const c = cfgOf(s);
  const ordered = [...s.parties].filter((p) => (s.seats[p.id] || 0) > 0).sort((a, b) => a.econ - b.econ);
  const hemi = ordered.map((p) => ({ id: p.id, color: p.color, seats: s.seats[p.id] }));
  const gs = govSeats(s);
  const maj = majorityOf(s);
  const me = playerParty(s);
  const all = [...s.parties].sort((a, b) => (s.seats[b.id] || 0) - (s.seats[a.id] || 0) || s.polls[b.id] - s.polls[a.id]);
  const laws = s.policyLog.slice(0, 12);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">{c.seats} members, {maj} for a majority</div>
          <h1 className="h1">The {c.legislature}</h1>
        </div>
        <div className="row wrap">
          <span className={`chip ${gs >= maj ? 'good' : 'bad'}`}>{gs >= maj ? `Majority of ${gs - maj + 1}` : `Short by ${maj - gs}`}</span>
          {s.midterm && s.termStart + s.midterm > s.turn && <span className="chip">Midterms in {monthsLabel(s.termStart + s.midterm - s.turn)}</span>}
        </div>
      </div>
      <div className="two-col wl">
        <div className="panel panel-pad">
          <Hemicycle parties={hemi} total={c.seats} highlight={hl} govIds={s.gov} centerLabel={`${gs}`} centerSub={`government seats of ${c.seats}`} />
          <div className="row wrap" style={{ gap: '6px 14px', justifyContent: 'center', marginTop: 10 }}>
            {ordered.map((p) => (
              <span key={p.id} className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'default' }} onMouseEnter={() => setHl(p.id)} onMouseLeave={() => setHl(null)}>
                <i className="party-dot" style={{ background: p.color }} /> {p.short} <b className="num">{s.seats[p.id]}</b>
              </span>
            ))}
          </div>
          <hr className="rule" />
          <div className="h3" style={{ marginBottom: 8 }}>Recent changes in law</div>
          {laws.length === 0 && <p className="small faint">No laws changed yet. Draft bills from the Policy and Budget sections.</p>}
          {laws.map((l, i) => {
            const pol = POLICY_MAP[l.id];
            return (
              <div key={i} className="spread small" style={{ padding: '7px 0', borderBottom: '1px solid var(--hair-soft)' }}>
                <span>
                  <b>{pol.name}</b>: {pol.options[l.from].label} <span className="faint">to</span> {pol.options[l.to].label}
                </span>
                <span className="faint nowrap">{fmtDate(l.turn)}, {l.via === 'law' ? 'vote' : l.via}</span>
              </div>
            );
          })}
        </div>
        <div className="panel panel-pad">
          <div className="panel-head">
            <span className="h3">Parties</span>
            <span className="label">Relations decide close votes</span>
          </div>
          <table className="party-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Seats</th>
                <th>Poll</th>
                <th style={{ width: 120 }}>Relations</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p) => {
                const gi = s.gov.indexOf(p.id);
                return (
                  <tr key={p.id} onMouseEnter={() => setHl(p.id)} onMouseLeave={() => setHl(null)}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <i className="party-dot" style={{ background: p.color }} />
                        <div>
                          <b>{p.short}</b> {gi === 0 ? <span className="chip" style={{ padding: '0 6px' }}>Yours</span> : gi > 0 ? <span className="chip good" style={{ padding: '0 6px' }}>Partner</span> : null}
                          <div className="faint" style={{ fontSize: 11 }}>{ideologyLabel(p)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.seats[p.id] || 0}</td>
                    <td>{s.polls[p.id].toFixed(1)}%</td>
                    <td>
                      {gi === 0 ? (
                        <span className="small dim">Unity {Math.round(s.unity)}</span>
                      ) : gi > 0 ? (
                        <div title="Coalition satisfaction"><Meter value={p.sat} tone={p.sat < 30 ? 'bad' : 'good'} /><span className="faint" style={{ fontSize: 11 }}>Satisfaction {Math.round(p.sat)}</span></div>
                      ) : (
                        <div title="Relations with you"><Meter value={p.rel} /><span className="faint" style={{ fontSize: 11 }}>Relations {Math.round(p.rel)}</span></div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small faint" style={{ marginBottom: 0 }}>
            Opposition parties vote on ideology and on how they feel about you. Raise relations with the “Woo the opposition” agenda action, or lobby
            them on individual bills. {me.short} MPs rebel when bills stray far from the party line or unity falls.
          </p>
        </div>
      </div>
    </>
  );
}
