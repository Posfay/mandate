import { useState } from 'react';
import Portrait from '../ui/Portrait.jsx';
import { Meter } from '../ui/bits.jsx';
import { ROLES } from '../data/meta.js';
import { partyOf } from '../engine/core.js';

const Stat = ({ k, v, tone }) => (
  <div className="stat-line">
    <span>{k}</span>
    <Meter value={v} tone={tone} />
    <span className="num" style={{ textAlign: 'right' }}>{Math.round(v)}</span>
  </div>
);

export default function CabinetView({ s, act }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Competent ministers move their portfolio; ambitious, disloyal ones move against you</div>
          <h1 className="h1">The cabinet</h1>
        </div>
        <span className="chip">Reshuffling a post costs 6 political capital</span>
      </div>
      <div className="cab-grid">
        {ROLES.map((r) => {
          const m = s.cabinet[r.id];
          if (!m) return null;
          const p = partyOf(s, m.party);
          const mine = m.party === s.player.partyId;
          const danger = m.ambition > 70 && m.loyalty < 40;
          return (
            <div key={r.id} className="panel panel-pad minister">
              <div className="top">
                <Portrait seed={m.seed} female={m.female} age={m.age} color={p?.color} size={60} skin={m.skin} darkHair={m.darkHair} />
                <div>
                  <span className="label">{r.name}</span>
                  <b>{m.name}</b>
                  <span className="small faint">{p?.short}, {m.age}</span>
                </div>
              </div>
              <div className="col" style={{ gap: 5 }}>
                <Stat k="Competence" v={m.comp * 10} tone={m.comp >= 7 ? 'good' : m.comp <= 3 ? 'bad' : ''} />
                <Stat k="Loyalty" v={m.loyalty} tone={m.loyalty < 35 ? 'bad' : ''} />
                <Stat k="Ambition" v={m.ambition} />
                <Stat k="Integrity" v={m.integrity} tone={m.integrity < 35 ? 'bad' : ''} />
              </div>
              {danger && <div className="small bad">Ambitious and restless. Watch this one.</div>}
              {mine ? (
                <button className="btn btn-sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Cancel' : 'Replace'}</button>
              ) : (
                <div className="small faint">Held by a coalition partner.</div>
              )}
              {open === r.id && (
                <div className="col" style={{ gap: 6 }}>
                  {s.bench.map((b) => (
                    <button
                      key={b.id}
                      className="choice-card"
                      style={{ padding: 8 }}
                      disabled={s.pc < 6}
                      onClick={() => {
                        act({ type: 'reshuffle', role: r.id, candidate: b.id }, `${b.name} appointed.`);
                        setOpen(null);
                      }}
                    >
                      <div className="row" style={{ gap: 10 }}>
                        <Portrait seed={b.seed} female={b.female} age={b.age} color={partyOf(s, b.party)?.color} size={36} skin={b.skin} darkHair={b.darkHair} />
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 13 }}>{b.name}</b>
                          <div className="faint" style={{ fontSize: 11 }}>
                            Competence {b.comp}, loyalty {b.loyalty}, ambition {b.ambition}, integrity {b.integrity}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
