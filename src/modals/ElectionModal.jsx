import { useEffect, useState } from 'react';
import Hemicycle from '../ui/Hemicycle.jsx';
import { cfgOf, majorityOf, partyOf, playerParty, theName } from '../engine/core.js';
import { PLEDGE_MAP } from '../data/meta.js';
import { fmtDate } from '../engine/util.js';

export default function ElectionModal({ s, onClose }) {
  const r = s.electionResult;
  const [stage, setStage] = useState(0);
  const c = cfgOf(s);
  const me = playerParty(s);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => setStage(1), reduce ? 0 : 2200);
    const t2 = setTimeout(() => setStage(2), reduce ? 0 : 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const parties = s.parties.filter((p) => r.shares[p.id] >= 1).sort((a, b) => r.shares[b.id] - r.shares[a.id]);
  const max = Math.max(...parties.map((p) => r.shares[p.id]));
  const ordered = [...s.parties].filter((p) => (r.seats[p.id] || 0) > 0).sort((a, b) => a.econ - b.econ);
  const hemi = ordered.map((p) => ({ id: p.id, color: p.color, seats: r.seats[p.id] }));
  const legislative = r.kind === 'legislative';
  const pres = r.presidential;
  const won = r.won;
  const headline = legislative
    ? won ? `${me.short} holds the ${c.legislature}` : `${me.short} loses the ${c.legislature}`
    : r.successor ? (won ? 'Your party keeps the presidency' : 'Your party loses the presidency')
    : s.over ? 'Defeat' : r.outcome === 'hung' ? 'A hung parliament' : `${s.player.name} wins`;
  const sub = legislative
    ? won ? 'Your majority survives the midterms.' : 'Divided government: every bill now needs the other side.'
    : pres ? `${partyOf(s, pres.me).short} ${pres.pct.toFixed(1)}%, ${partyOf(s, pres.rival).short} ${(100 - pres.pct).toFixed(1)}% in the final round.`
    : r.outcome === 'hung' ? `${me.short} won ${r.seats[me.id]} seats, short of the ${majorityOf(s)} needed. Coalition talks begin.` : `${me.short} won ${r.seats[me.id]} of ${c.seats} seats.`;

  return (
    <div className="scrim" style={{ background: 'radial-gradient(ellipse at center, rgba(12,26,45,0.95), rgba(3,8,15,0.98))' }}>
      <div className="modal night" role="dialog" aria-modal="true" aria-labelledby="night-title">
        {stage === 0 ? (
          <div className="closed">
            <div className="label">{fmtDate(r.turn)}</div>
            <div className="display" id="night-title">The polls have closed</div>
            <p className="dim" style={{ fontSize: 17, marginTop: 14 }}>{legislative ? 'Midterm elections' : `${theName(c, true)} has voted`}. The count has begun.</p>
          </div>
        ) : (
          <div className="modal-pad">
            <div className="label">Election night, {fmtDate(r.turn)}</div>
            <h2 className="h1" id="night-title" style={{ color: won ? 'var(--brass-hi)' : 'var(--text)' }}>{stage >= 2 ? headline : 'Results are coming in…'}</h2>
            {stage >= 2 && <p className="dim" style={{ fontSize: 16, marginTop: 6 }}>{sub}</p>}
            <div className="two-col" style={{ gap: 26, marginTop: 18, alignItems: 'center' }}>
              <div>
                {parties.map((p) => (
                  <div key={p.id} className="result-bar">
                    <span className="row" style={{ gap: 6 }}><i className="party-dot" style={{ background: p.color }} />{p.short}</span>
                    <div className="track"><i style={{ width: stage >= 1 ? `${(r.shares[p.id] / max) * 100}%` : 0, background: p.color }} /></div>
                    <span className="num" style={{ textAlign: 'right' }}>{r.shares[p.id].toFixed(1)}%</span>
                    <span className="num faint" style={{ textAlign: 'right' }}>{r.seats[p.id] || 0} seats</span>
                  </div>
                ))}
              </div>
              <div>
                <Hemicycle parties={hemi} total={c.seats} govIds={[me.id]} centerLabel={`${r.seats[me.id] || 0}`} centerSub={`${me.short} seats, ${majorityOf(s)} for a majority`} />
              </div>
            </div>
            {stage >= 2 && r.pledges && r.pledges.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="h3" style={{ marginBottom: 6 }}>Your pledges, judged</div>
                <div className="row wrap" style={{ gap: 6 }}>
                  {r.pledges.map((p) => (
                    <span key={p.id} className={`chip ${p.status === 'kept' ? 'good' : 'bad'}`}>{PLEDGE_MAP[p.id].name}: {p.status}</span>
                  ))}
                </div>
              </div>
            )}
            {stage >= 2 && (
              <div style={{ textAlign: 'right', marginTop: 22 }}>
                <button className="btn btn-primary btn-lg" onClick={onClose}>{s.over ? 'See your legacy' : s.phase === 'coalition' ? 'Begin coalition talks' : 'Continue governing'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
