// Coalition talks: assemble a majority, accept your partners' demands, or try to govern alone.
import { useState } from 'react';
import { store } from '../store.js';
import Hemicycle from '../ui/Hemicycle.jsx';
import { Icon } from '../ui/bits.jsx';
import { cfgOf, majorityOf, playerParty, partyOf } from '../engine/core.js';
import { POLICY_MAP } from '../data/policies.js';
import { ideologyLabel } from './Start.jsx';

export default function Coalition({ s }) {
  const [picked, setPicked] = useState([]);
  const [err, setErr] = useState(null);
  const c = cfgOf(s);
  const me = playerParty(s);
  const maj = majorityOf(s);
  const mine = s.seats[me.id];
  const total = mine + picked.reduce((a, id) => a + (s.seats[id] || 0), 0);
  const presidential = s.system !== 'parliamentary';
  const cands = s.coalition.candidates;
  const ordered = [...s.parties].filter((p) => (s.seats[p.id] || 0) > 0).sort((a, b) => a.econ - b.econ);
  const hemi = ordered.map((p) => ({ id: p.id, color: p.color, seats: s.seats[p.id] }));
  const toggle = (cand) => {
    if (cand.willing < 40) return;
    setPicked(picked.includes(cand.id) ? picked.filter((x) => x !== cand.id) : [...picked, cand.id]);
  };
  const form = (partners) => {
    const r = store.dispatch({ type: 'formGovernment', partners });
    if (r.ok === false) setErr(r.error);
  };
  const canMinority = s.coalition.minorityOk;

  return (
    <div className="shell" style={{ gridTemplateColumns: '1fr', gridTemplateRows: '1fr', gridTemplateAreas: "'stage'" }}>
      <main className="stage" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="view-head">
          <div>
            <div className="label">{presidential ? 'Building a working majority in the legislature' : 'No party has a majority'}</div>
            <h1 className="h1">{presidential ? `Allies in the ${c.legislature}` : 'Coalition talks'}</h1>
            <p className="lede" style={{ marginTop: 8 }}>
              {me.short} holds {mine} of {c.seats} seats; {maj} make a majority. Each partner wants concessions written into the agreement,
              and cabinet posts. Their demands become law the moment you sign.
            </p>
          </div>
        </div>
        <div className="two-col wr">
          <div className="panel panel-pad">
            <Hemicycle parties={hemi} total={c.seats} govIds={[me.id, ...picked]} centerLabel={`${total}`} centerSub={`seats in your bloc, ${maj} needed`} />
            <div className="majority-bar" style={{ marginTop: 14 }}>
              {[me.id, ...picked].map((id) => <i key={id} style={{ width: `${((s.seats[id] || 0) / c.seats) * 100}%`, background: partyOf(s, id).color }} />)}
              <span className="line" style={{ left: `${(maj / c.seats) * 100}%` }} />
            </div>
            <div className="spread small" style={{ marginTop: 6 }}>
              <span className={total >= maj ? 'good' : 'dim'}>{total >= maj ? `Majority of ${total - maj + 1}` : `${maj - total} seats short`}</span>
              <span className="faint">Majority line at {maj}</span>
            </div>
            {err && <p className="small bad">{err}</p>}
            <div className="row wrap" style={{ marginTop: 18, gap: 8 }}>
              <button className="btn btn-primary" disabled={!picked.length || (total < maj && !canMinority)} onClick={() => form(picked)}>
                {total >= maj ? 'Sign the coalition agreement' : 'Form a minority coalition'}
              </button>
              {canMinority && <button className="btn" onClick={() => form([])}>Govern alone as a minority</button>}
              {!canMinority && !s.coalition.initial && (
                <button className="btn btn-danger" onClick={() => store.dispatch({ type: 'concede', text: 'Coalition talks failed. The opposition formed the next government.' })}>Concede and go into opposition</button>
              )}
            </div>
            {canMinority && <p className="small faint" style={{ marginBottom: 0 }}>A minority government must win every vote by persuasion. Expect confidence votes.</p>}
          </div>
          <div>
            {cands.map((cand) => {
              const p = partyOf(s, cand.id);
              const on = picked.includes(cand.id);
              const no = cand.willing < 40;
              return (
                <div key={cand.id} className={`coal-row${on ? ' on' : ''}${no ? ' no' : ''}`} onClick={() => toggle(cand)} role="checkbox" aria-checked={on} tabIndex={0} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggle(cand)}>
                  <span className="check">{on && <Icon name="check" size={14} stroke={2.4} />}</span>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <i className="party-dot" style={{ background: p.color }} />
                      <b>{p.name}</b>
                    </div>
                    <div className="small faint">{ideologyLabel(p)}{p.populist >= 0.8 && !me.populist ? '. Allying with them will split your own party.' : ''}</div>
                    {!no && cand.demands.length > 0 && (
                      <div className="small" style={{ marginTop: 6 }}>
                        <span className="dim">Demands: </span>
                        {cand.demands.map((d, i) => (
                          <span key={i}>
                            {i > 0 && '; '}
                            {POLICY_MAP[d.policy].name.toLowerCase()} to <b>{POLICY_MAP[d.policy].options[d.to].label.toLowerCase()}</b>
                          </span>
                        ))}
                      </div>
                    )}
                    {!no && cand.demands.length === 0 && <div className="small dim" style={{ marginTop: 6 }}>Asks only for cabinet posts.</div>}
                    {no && <div className="small bad" style={{ marginTop: 6 }}>Refuses to serve under you.</div>}
                  </div>
                  <span className="num" style={{ textAlign: 'right' }}><b>{cand.seats}</b><div className="faint small">seats</div></span>
                  <span>
                    <div className="small faint">Willingness</div>
                    <div className="meter" style={{ marginTop: 4 }}><i style={{ width: `${cand.willing}%`, background: no ? 'var(--bad)' : 'var(--good)' }} /></div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
